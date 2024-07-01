import { type Pair, PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import utc from 'dayjs/plugin/utc';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import type {
	FetchMarketDataSchema,
	GetMarketDataSchema,
} from '../schemas/marketDataSchema';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../middleware/errorMiddleware';
import type { MarketData, MarketDataBlock } from '../types/marketDataType';
import { indicatorsFunctions } from '../utils/indicators';
import { predictionPairs } from '../utils/constants/predictionPairs';
import env from '../env';

dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(isSameOrAfter);

const prisma = new PrismaClient();

export const getMarketData = async (
	body: GetMarketDataSchema['body'],
): Promise<MarketData> => {
	const { base, quote, broker, start, end, interval, indicators } = body;

	const pair = await prisma.pair.findFirst({
		where: {
			base,
			quote,
			broker: {
				name: broker,
			},
		},
	});

	if (!pair) {
		throw new AppError('Pair not found', StatusCodes.NOT_FOUND);
	}

	return queryMarketData(
		pair.id,
		dayjs.utc(start).toDate(),
		dayjs.utc(end).toDate(),
		interval,
		indicators,
	);
};

const queryMarketData = async (
	pairId: string,
	start: Date,
	end: Date,
	interval: string,
	indicators: GetMarketDataSchema['body']['indicators'],
): Promise<MarketData> => {
	let ajustedStart = dayjs.utc(start);

	let maxPeriod: number | undefined;
	const intervalDuration = dayjs.duration(interval);

	if (typeof indicators !== 'undefined') {
		maxPeriod = Math.max(
			...indicators.flatMap((indicator) =>
				indicator.parameters.map((p) => p.value),
			),
		);

		ajustedStart = ajustedStart.subtract(
			intervalDuration.asMinutes() * maxPeriod,
			'minutes',
		);
	}

	const rawMarketData = (await prisma.$queryRaw`
		SELECT
			ARRAY[extract(epoch from date)::double precision,
			close(candlestick),
			open(candlestick),
			high(candlestick),
			low(candlestick),
			volume(candlestick)]

		FROM (
			SELECT
				time_bucket(${interval}::interval, date) AS time_bucket,
				rollup(candlestick(date, open, high, low, close, volume))
			FROM market_data
			where "pairId"= ${pairId} 
			AND date >= ${ajustedStart.toDate()} 
			AND date < ${end}
			group by time_bucket
		) AS _(date, candlestick)
		order by date ASC;
	`) as { array: Array<number> }[];

	const marketData: MarketData = {
		indicators: [],

		data: rawMarketData.map((data) => {
			const [date, close, open, high, low, volume] = data.array;

			return [
				dayjs.utc(date * 1000).toISOString(),
				open,
				high,
				low,
				close,
				volume,
				{},
			];
		}),
	};

	if (typeof indicators !== 'undefined') {
		const indicatorsNeeded: string[] = [];

		for (const indicator of indicators) {
			indicatorsNeeded.push(
				indicatorsFunctions[indicator.name](
					marketData,
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					indicator.parameters as any,
				),
			);
		}

		// Remove unnecessary indicators in the indicatorKeys
		marketData.indicators = marketData.indicators.filter((ik) =>
			indicatorsNeeded.includes(ik.indicatorKey),
		);

		// Remove unnecessary indicators in the data
		marketData.data.map((data) => {
			data[6] = Object.fromEntries(
				Object.entries(data[6]).filter(([key]) =>
					indicatorsNeeded.includes(key),
				),
			);
		});
	}

	marketData.data = marketData.data.filter((data) =>
		dayjs.utc(data[0]).isSameOrAfter(start),
	);

	return marketData;
};

export const fetchMarketData = async (body: FetchMarketDataSchema['body']) => {
	const { date } = body;

	const pairs = await prisma.pair.findMany({
		where: {
			broker: {
				name: 'BINANCE',
			},
		},
		include: {
			broker: true,
		},
	});

	const getMarketData = async (pair: Pair, timestamp: number) => {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 10000);

		const sonarQuery = new URL(`${env.SONAR_URL}/binance/ohlcv`);
		sonarQuery.searchParams.append('symbol', `${pair.base}${pair.quote}`);
		sonarQuery.searchParams.append('start', timestamp.toString());
		sonarQuery.searchParams.append('limit', '1');

		const pairData = await fetch(sonarQuery, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
			signal: controller.signal,
		})
			.then((res) => res.json())
			.catch((err) => {
				clearTimeout(timeout);
				throw new AppError(
					'SONAR inaccessible',
					StatusCodes.SERVICE_UNAVAILABLE,
				);
			});

		return pairData[0] as {
			open: number;
			high: number;
			low: number;
			close: number;
			volume: number;
			timestamp: number;
		};
	};

	const fetches = pairs.map((pair) =>
		getMarketData(pair, dayjs.utc(date).valueOf()),
	);

	const marketData = await Promise.all(fetches);

	for (let i = 0; i < marketData.length; i++) {
		const pair = pairs[i];
		const data = marketData[i];

		await prisma.marketData.upsert({
			where: {
				pairId_date: {
					pairId: pair.id,
					date: dayjs.utc(data.timestamp).toISOString(),
				},
			},
			update: {
				open: data.open,
				high: data.high,
				low: data.low,
				close: data.close,
				volume: data.volume,
			},
			create: {
				pairId: pair.id,
				date: dayjs.utc(data.timestamp).toISOString(),
				open: data.open,
				high: data.high,
				low: data.low,
				close: data.close,
				volume: data.volume,
			},
		});
	}
};

export async function fetchPrediction(body: FetchMarketDataSchema['body']) {
	const { date } = body;

	const ethPair = (await prisma.pair.findFirst({
		where: {
			base: 'ETH',
			quote: 'USDT',
			broker: {
				name: 'BINANCE',
			},
		},
	})) as Pair;

	if (!ethPair) {
		throw new AppError(
			'ETH/USDT pair needed for prediction not found',
			StatusCodes.NOT_FOUND,
		);
	}

	const ethData = (
		await queryMarketData(
			ethPair.id,
			dayjs.utc(date).subtract(1, 'day').toDate(),
			dayjs.utc(date).toDate(),
			dayjs.duration({ minutes: 15 }).toISOString(),
			[
				{
					name: 'rsi',
					parameters: [
						{
							name: 'period',
							value: 14,
						},
					],
				},
			],
		)
	).data.map((data) => ({
		timestamp: data[0],
		ETHUSDT_close: data[4],
		ETHUSDT_volume: data[5],
		ETHUSDT_rsi: data[6].rsi_14?.value,
	}));

	const predictionPromises = predictionPairs.map(async (pair) => {
		const targetPair = (await prisma.pair.findFirst({
			where: {
				base: pair.base,
				quote: pair.quote,
				broker: {
					name: 'BINANCE',
				},
			},
		})) as Pair;

		if (!targetPair) {
			throw new AppError('Pair not found', StatusCodes.NOT_FOUND);
		}

		const targetData = (
			await queryMarketData(
				targetPair.id,
				dayjs.utc(date).subtract(1, 'day').toDate(),
				dayjs.utc(date).toDate(),
				dayjs.duration({ minutes: 15 }).toISOString(),
				[
					{
						name: 'sma',
						parameters: [
							{
								name: 'period',
								value: 26,
							},
						],
					},
					{
						name: 'sma',
						parameters: [
							{
								name: 'period',
								value: 12,
							},
						],
					},
					{
						name: 'rsi',
						parameters: [
							{
								name: 'period',
								value: 14,
							},
						],
					},
				],
			)
		).data.map((data) => ({
			timestamp: data[0],
			target_open: data[1],
			target_high: data[2],
			target_low: data[3],
			target_close: data[4],
			target_volume: data[5],
			target_rsi: data[6].rsi_14?.value,
			target_sma_12: data[6].sma_12?.value,
			target_sma_26: data[6].sma_26?.value,
			...ethData.find((d) => d.timestamp === data[0]),
		}));

		const prediction = await fetch(`${env.PREDATOR_URL}/predict`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				market_data: targetData,
				symbol: `${pair.base}${pair.quote}`,
			}),
		})
			.then((res) => res.json())
			.catch((err) => {
				throw new AppError(
					'PREDATOR inaccessible',
					StatusCodes.SERVICE_UNAVAILABLE,
				);
			});

		console.log(prediction);
	});

	await Promise.all(predictionPromises);
}
