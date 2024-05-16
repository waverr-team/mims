import type { Request, Response } from 'express';
import type {
	AddPairSchema,
	DeletePairSchema,
	FindPairSchema,
} from '../schemas/pairSchema';
import * as pairService from '../services/pairService';

export const createPair = async (req: Request, res: Response) => {
	const { base, quote, broker } = req.body as AddPairSchema['body'];

	const pair = await pairService.createPair(base, quote, broker);

	res.json(pair);
};

export const deletePair = async (req: Request, res: Response) => {
	const pairId = req.params.id as DeletePairSchema['params']['id'];

	const pair = await pairService.deletePair(pairId);

	res.json(pair);
};

export const getPairs = async (req: Request, res: Response) => {
	const pairs = await pairService.getPairs();

	res.json(pairs);
};

export const findPair = async (req: Request, res: Response) => {
	const { base, quote, broker } = req.query as FindPairSchema['query'];

	const pair = await pairService.findPair(base, quote, broker);

	res.json(pair);
};
