import { type Pair, PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import utc from 'dayjs/plugin/utc';
import type { MarketDataSchema } from '../schemas/marketDataSchema';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../middleware/errorMiddleware';
import type { MarketData, MarketDataBlock } from '../types/marketDataType';
import Interval from '../utils/interval';

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

	if (
		!(await checkMarketDataAvailability(pair, ajustedStart, dayjs.utc(end)))
	) {
		throw new AppError(
			'Market data not available, need to contact SONAR',
			StatusCodes.NOT_IMPLEMENTED,
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
			if (indicator.name === 'sma') {
				indicatorsNeeded.push(
					simpleMovingAverage(marketData, indicator.parameters[0].value),
				);
			} else if (indicator.name === 'ema') {
				indicatorsNeeded.push(
					exponentialMovingAverage(
						marketData,
						indicator.parameters.find((p) => p.name === 'smoothing')
							?.value as number,
						indicator.parameters.find((p) => p.name === 'period')
							?.value as number,
					),
				);
			} else if (indicator.name === 'rsi') {
				indicatorsNeeded.push(
					relativeStrengthIndex(marketData, indicator.parameters[0].value),
				);
			} else if (indicator.name === 'macd') {
				indicatorsNeeded.push(
					movingAverageConvergenceDivergence(
						marketData,
						indicator.parameters.find((p) => p.name === 'longPeriod')
							?.value as number,
						indicator.parameters.find((p) => p.name === 'shortPeriod')
							?.value as number,
						indicator.parameters.find((p) => p.name === 'smoothing')
							?.value as number,
					),
				);
			}
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

const checkMarketDataAvailability = async (
	pair: Pair,
	start: dayjs.Dayjs,
	end: dayjs.Dayjs,
) => {
	const requestInterval = new Interval(start, end);

	return Interval.fromArray(
		pair.ranges as {
			start: string;
			end: string;
		}[],
	).some((range) => requestInterval.minus(range).length === 0);
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

const simpleMovingAverage = (marketData: MarketData, period: number) => {
	const indicatorKey = `sma_${period}`;

	if (indicatorKey in marketData.indicatorKeys) {
		return indicatorKey;
	}

	marketData.indicatorKeys[indicatorKey] = {
		indicatorId: 1,
		parameters: [{ name: 'period', value: period }],
	};

	for (let i = 0; i < marketData.data.length; i++) {
		if (i < period - 1) {
			marketData.data[i][6] = {
				...marketData.data[i][6],
				[indicatorKey]: { value: null },
			};
		} else {
			let sum = 0;
			for (let j = i - period + 1; j <= i; j++) {
				sum += marketData.data[j][4];
			}
			marketData.data[i][6] = {
				...marketData.data[i][6],
				[indicatorKey]: { value: sum / period },
			};
		}
	}

	return indicatorKey;
};

const exponentialMovingAverage = (
	marketData: MarketData,
	smoothing: number,
	period: number,
) => {
	const indicatorKey = `ema_${period}_${smoothing}`;

	if (indicatorKey in marketData.indicatorKeys) {
		return indicatorKey;
	}

	marketData.indicatorKeys[indicatorKey] = {
		indicatorId: 2,
		parameters: [
			{ name: 'period', value: period },
			{ name: 'smoothing', value: smoothing },
		],
	};

	for (let i = 0; i < marketData.data.length; i++) {
		if (i < period - 1) {
			marketData.data[i][6] = {
				...marketData.data[i][6],
				[indicatorKey]: { value: null },
			};
		} else if (i === period - 1) {
			let sum = 0;
			for (let j = i - period + 1; j <= i; j++) {
				sum += marketData.data[j][4];
			}
			marketData.data[i][6] = {
				...marketData.data[i][6],
				[indicatorKey]: { value: sum / period },
			};
		} else {
			marketData.data[i][6] = {
				...marketData.data[i][6],
				[indicatorKey]: {
					value:
						(marketData.data[i - 1][6][indicatorKey].value as number) *
							(1 - smoothing / (period + 1)) +
						(smoothing / (period + 1)) * marketData.data[i][4],
				},
			};
		}
	}

	return indicatorKey;
};

const relativeStrengthIndex = (marketData: MarketData, period: number) => {
	const indicatorKey = `rsi_${period}`;

	if (indicatorKey in marketData.indicatorKeys) {
		return indicatorKey;
	}

	marketData.indicatorKeys[indicatorKey] = {
		indicatorId: 3,
		parameters: [{ name: 'period', value: period }],
	};

	for (let i = 0; i < marketData.data.length; i++) {
		if (i < period) {
			marketData.data[i][6] = {
				...marketData.data[i][6],
				[indicatorKey]: { value: null },
			};
		} else {
			const gains = [];
			const losses = [];

			for (let j = i - period + 1; j <= i; j++) {
				const diff = marketData.data[j][4] - marketData.data[j - 1][4];
				if (diff > 0) {
					gains.push(diff);
				} else {
					losses.push(-diff);
				}
			}

			const avgGain = gains.reduce((acc, curr) => acc + curr, 0) / period;
			const avgLoss = losses.reduce((acc, curr) => acc + curr, 0) / period;

			marketData.data[i][6] = {
				...marketData.data[i][6],
				[indicatorKey]: {
					value: 100 - 100 / (1 + avgGain / avgLoss),
				},
			};
		}
	}

	return indicatorKey;
};

const movingAverageConvergenceDivergence = (
	marketData: MarketData,
	longPeriod: number,
	shortPeriod: number,
	smoothing: number,
) => {
	const indicatorKey = `macd_${longPeriod}_${shortPeriod}_${smoothing}`;

	if (indicatorKey in marketData.indicatorKeys) {
		return indicatorKey;
	}

	exponentialMovingAverage(marketData, smoothing, longPeriod);
	exponentialMovingAverage(marketData, smoothing, shortPeriod);

	marketData.indicatorKeys[indicatorKey] = {
		indicatorId: 4,
		parameters: [
			{ name: 'longPeriod', value: longPeriod },
			{ name: 'shortPeriod', value: shortPeriod },
			{ name: 'smoothing', value: smoothing },
		],
	};

	for (let i = 0; i < marketData.data.length; i++) {
		marketData.data[i][6] = {
			...marketData.data[i][6],
			[indicatorKey]: {
				value:
					(marketData.data[i][6][`ema_${shortPeriod}_${smoothing}`]
						.value as number) -
					(marketData.data[i][6][`ema_${longPeriod}_${smoothing}`]
						.value as number),
			},
		};
	}

	return indicatorKey;
};
