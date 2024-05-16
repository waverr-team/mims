import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import utc from 'dayjs/plugin/utc';
import { z } from 'zod';

dayjs.extend(duration);
dayjs.extend(utc);

export const marketDataSchema = z.object({
	body: z
		.object({
			start: z
				.string()
				.datetime()
				.refine((value) => {
					return (
						dayjs.utc(value).isBefore(dayjs.utc()) &&
						dayjs.utc(value).minute() % 15 === 0
					);
				}, 'Invalid start date, must be before now and multiple of 15m'),
			end: z
				.string()
				.datetime()
				.refine((value) => {
					return (
						dayjs.utc(value).isBefore(dayjs.utc()) &&
						dayjs.utc(value).minute() % 15 === 0
					);
				}, 'Invalid end date, must be before now and multiple of 15m'),
			interval: z
				.string()
				.duration()
				.refine((value) => {
					return (
						dayjs.duration(value) >= dayjs.duration(15, 'm') &&
						dayjs.duration(value) <= dayjs.duration(4, 'M') &&
						dayjs.duration(value).asMinutes() % 15 === 0
					);
				}, 'Invalid interval, must be between 15m and 4M and multiple of 15m'),

			base: z.string(),
			quote: z.string(),
			broker: z.string(),
			indicators: z
				.union([
					z.object({
						name: z.enum(['sma', 'ema', 'rsi']),
						parameters: z
							.array(
								z.object({
									name: z.enum(['period']),
									value: z.number().positive(),
								}),
							)
							.length(1),
					}),
					z.object({
						name: z.enum(['macd']),
						parameters: z
							.array(
								z.union([
									z.object({
										name: z.literal('longPeriod'),
										value: z.number().positive(),
									}),
									z.object({
										name: z.literal('shortPeriod'),
										value: z.number().positive(),
									}),
								]),
							)
							.length(2)
							.refine(
								(val) => {
									const keys = val.map((v) => v.name);
									return (
										keys.includes('longPeriod') && keys.includes('shortPeriod')
									);
								},
								{
									message:
										'Invalid parameters for MACD, shortPeriod and longPeriod are required',
								},
							),
					}),
				])
				.array()
				.nonempty()
				.optional(),
		})
		.refine((value) => {
			return dayjs.utc(value.start).isBefore(dayjs.utc(value.end));
		}, 'Start date must be before end date'),
});
export type MarketDataSchema = z.infer<typeof marketDataSchema>;
