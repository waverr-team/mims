import { query } from 'express';
import { z } from 'zod';

export const addPairSchema = z.object({
	body: z.object({
		base: z.string(),
		quote: z.string(),
		broker: z.string(),
	}),
});

export const deletePairSchema = z.object({
	params: z.object({
		id: z.string(),
	}),
});

export const findPairSchema = z.object({
	query: z.object({
		base: z.string(),
		quote: z.string(),
		broker: z.string(),
	}),
});

export type addPairSchema = z.infer<typeof addPairSchema>;
export type deletePairSchema = z.infer<typeof deletePairSchema>;
export type findPairSchema = z.infer<typeof findPairSchema>;
