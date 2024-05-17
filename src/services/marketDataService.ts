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

	// if (typeof indicators !== 'undefined') {
	// 	for (const indicator of indicators) {
	// 		if (indicator.name === 'sma') {
	// 			const sma = simpleMovingAverage(
	// 				marketData,
	// 				indicator.parameters[0].value,
	// 			);
	// 			marketData.forEach((data, index) => {
	// 				data[`sma_${indicator.parameters[0].value}`] = sma[index];
	// 			});
	// 		} else if (indicator.name === 'ema') {
	// 			// Calculate EMA
	// 		} else if (indicator.name === 'rsi') {
	// 			// Calculate RSI
	// 		} else if (indicator.name === 'macd') {
	// 			// Calculate MACD
	// 		}
	// 	}
	// }

	marketData.data = marketData.data.slice(maxPeriod);

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

	return marketDataResponse.map((data) => data.array) as MarketDataBlock[];
};

// const simpleMovingAverage = (marketData: MarketDataBlock[], period: number) => {
// 	const sma = marketData.map((data, index) => {
// 		if (index < period - 1) {
// 			return null;
// 		}
// 		const sum = marketData
// 			.slice(index - period + 1, index + 1)
// 			.reduce((acc, data) => acc + data.close, 0);
// 		return sum / period;
// 	});
// 	return sma;
// };

const exponentialMovingAverage = async (
	marketData: MarketData,
	period: number,
) => {};
