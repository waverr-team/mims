import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import utc from 'dayjs/plugin/utc';
import type { marketDataSchema } from '../schemas/marketDataSchema';

dayjs.extend(duration);
dayjs.extend(utc);

const prisma = new PrismaClient();

type MarketData = {
	date: Date;
	close: number;
	open: number;
	high: number;
	low: number;
	volume: number;
	[key: string]: number | Date | null;
}[];

export default class MarketDataService {
	constructor(private prisma: PrismaClient) {
		this.prisma = prisma;
	}

	async getMarketData(
		body: marketDataSchema['body'],
		pairId: string,
	): Promise<MarketData> {
		const { start, end, interval, indicators } = body;

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

		const marketData = (await this.prisma.$queryRaw`
            SELECT
                date,
                close(candlestick) AS close,
                open(candlestick) AS open,
                high(candlestick) AS high,
                low(candlestick) AS low,
                volume(candlestick) AS volume

            FROM (
                SELECT
                    time_bucket(${interval}::interval, date) AS time_bucket,
                    rollup(candlestick(date, open, high, low, close, volume))
                FROM market_data
                where "pairId"= ${pairId} 
                AND date >= ${ajustedStart.toDate()} 
                AND date <= ${dayjs.utc(end).toDate()}
                group by time_bucket
            ) AS _(date, candlestick)
            order by date ASC;
        `) as MarketData;

		if (typeof indicators !== 'undefined') {
			for (const indicator of indicators) {
				if (indicator.name === 'sma') {
					const sma = this.simpleMovingAverage(
						marketData,
						indicator.parameters[0].value,
					);
					marketData.forEach((data, index) => {
						data[`sma_${indicator.parameters[0].value}`] = sma[index];
					});
				} else if (indicator.name === 'ema') {
					// Calculate EMA
				} else if (indicator.name === 'rsi') {
					// Calculate RSI
				} else if (indicator.name === 'macd') {
					// Calculate MACD
				}
			}
		}

		return marketData.slice(maxPeriod);
	}

	simpleMovingAverage(marketData: MarketData, period: number) {
		const sma = marketData.map((data, index) => {
			if (index < period - 1) {
				return null;
			}
			const sum = marketData
				.slice(index - period + 1, index + 1)
				.reduce((acc, data) => acc + data.close, 0);
			return sum / period;
		});
		return sma;
	}
}
