import { z } from 'zod';

export const addBrokerSchema = z.object({
	body: z.object({
		name: z.string(),
	}),
});

export const deleteBrokerSchema = z.object({
	params: z.object({
		id: z.string(),
	}),
});

export type addBrokerSchema = z.infer<typeof addBrokerSchema>;
export type deleteBrokerSchema = z.infer<typeof deleteBrokerSchema>;
