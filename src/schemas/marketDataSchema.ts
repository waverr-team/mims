import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import utc from 'dayjs/plugin/utc';
import { z } from 'zod';

dayjs.extend(duration);
dayjs.extend(utc);

export const getMarketDataSchema = z.object({
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
						name: z.enum(['sma', 'rsi', 'shift', 'fib']),
						parameters: z
							.array(
								z.object({
									name: z.enum(['period']),
									value: z.number().int().positive(),
								}),
							)
							.length(1),
					}),
					z.object({
						name: z.literal('ema'),
						parameters: z
							.array(
								z.union([
									z.object({
										name: z.literal('period'),
										value: z.number().int().positive(),
									}),
									z.object({
										name: z.literal('smoothing'),
										value: z.number().int().positive(),
									}),
								]),
							)
							.length(2)
							.refine(
								(val) => {
									const keys = val.map((v) => v.name);
									return keys.includes('period') && keys.includes('smoothing');
								},
								{
									message:
										'Invalid parameters for EMA, smoothing and period are required',
								},
							),
					}),

					z.object({
						name: z.literal('macd'),
						parameters: z
							.array(
								z.union([
									z.object({
										name: z.literal('longPeriod'),
										value: z.number().int().positive(),
									}),
									z.object({
										name: z.literal('shortPeriod'),
										value: z.number().int().positive(),
									}),
									z.object({
										name: z.literal('smoothing'),
										value: z.number().int().positive(),
									}),
								]),
							)
							.length(3)
							.refine(
								(val) => {
									const keys = val.map((v) => v.name);
									return (
										keys.includes('longPeriod') &&
										keys.includes('shortPeriod') &&
										keys.includes('smoothing')
									);
								},
								{
									message:
										'Invalid parameters for MACD, longPeriod, shortPeriod and smoothing are required',
								},
							),
					}),
				])
				.array()
				.nonempty()
				.optional(),
		})
		.superRefine((val, ctx) => {
			if (dayjs.utc(val.start).isAfter(dayjs.utc(val.end))) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'End date must be after start date',
				});
			}

			if (
				dayjs.utc(val.end).diff(dayjs.utc(val.start), 'minute') <
				dayjs.duration(val.interval).asMinutes()
			) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message:
						'Interval must be inferior to the difference between start and end',
				});
			}
		}),
});

export const fetchMarketDataSchema = z.object({
	body: z.object({
		date: z
			.string()
			.datetime()
			.refine((value) => {
				const date = dayjs.utc(value);
				return date.isBefore(dayjs.utc()) && date.minute() % 15 === 0;
			}, 'Invalid start date, must be before now and multiple of 15m'),
	}),
});

export type GetMarketDataSchema = z.infer<typeof getMarketDataSchema>;
export type FetchMarketDataSchema = z.infer<typeof fetchMarketDataSchema>;
