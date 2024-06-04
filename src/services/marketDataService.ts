import { type Pair, PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import utc from 'dayjs/plugin/utc';
import type { MarketDataSchema } from '../schemas/marketDataSchema';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../middleware/errorMiddleware';
import type { MarketData, MarketDataBlock } from '../types/marketDataType';
import { indicatorsFunctions } from '../utils/indicators';

dayjs.extend(duration);
dayjs.extend(utc);

const prisma = new PrismaClient();

export const getMarketData = async (
	body: MarketDataSchema['body'],
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

	const marketData: MarketData = {
		indicatorKeys: {},

		data: await queryMarketData(
			pair.id,
			ajustedStart.toDate(),
			dayjs.utc(end).toDate(),
			interval,
		),
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

		marketData.data.map((data) => {
			data[6] = Object.fromEntries(
				Object.entries(data[6]).filter(([key]) =>
					indicatorsNeeded.includes(key),
				),
			);
		});

		marketData.indicatorKeys = Object.fromEntries(
			Object.entries(marketData.indicatorKeys).filter(([key]) =>
				indicatorsNeeded.includes(key),
			),
		);
	}

	marketData.data = marketData.data.filter((data) =>
		dayjs.utc(data[0]).isAfter(start),
	);

	return marketData;
};

const queryMarketData = async (
	pairId: string,
	start: Date,
	end: Date,
	interval: string,
) => {
	const marketDataResponse = (await prisma.$queryRaw`
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
			AND date >= ${start} 
			AND date < ${end}
			group by time_bucket
		) AS _(date, candlestick)
		order by date ASC;
	`) as { array: Array<number> }[];

	return marketDataResponse.map((data) => {
		const [date, close, open, high, low, volume] = data.array;

		return [
			dayjs.utc(date * 1000).toISOString(),
			open,
			high,
			low,
			close,
			volume,
			{},
		] as MarketDataBlock;
	});
};
