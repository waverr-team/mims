import { Prisma, PrismaClient } from '@prisma/client';
import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import type {
	addPairSchema,
	deletePairSchema,
	findPairSchema,
} from '../schemas/pairSchema';

const prisma = new PrismaClient();

export const createPair = async (req: Request, res: Response) => {
	const pairInput = req.body as addPairSchema['body'];

	const broker = await prisma.broker.findFirst({
		where: {
			name: pairInput.broker,
		},
	});

	if (!broker) {
		res.status(StatusCodes.BAD_REQUEST).json({
			error: 'Broker not found',
		});
		return;
	}

	const pairExists = await prisma.pair.findFirst({
		where: {
			base: pairInput.base,
			quote: pairInput.quote,
			brokerId: broker.id,
		},
	});

	if (pairExists) {
		res.status(StatusCodes.BAD_REQUEST).json({
			error: 'Pair already exists',
		});
		return;
	}

	const pair = await prisma.pair.create({
		data: {
			base: pairInput.base,
			quote: pairInput.quote,
			brokerId: broker.id,
		},
	});

	res.json(pair);
};

export const deletePair = async (req: Request, res: Response) => {
	const pairId = req.params.id as deletePairSchema['params']['id'];

	const pair = await prisma.pair.findUnique({
		where: {
			id: pairId,
		},
	});

	if (!pair) {
		res.status(StatusCodes.NOT_FOUND).json({
			error: 'Pair not found',
		});
		return;
	}

	await prisma.pair.delete({
		where: {
			id: pair.id,
		},
	});

	res.json(pair);
};

export const getPairs = async (req: Request, res: Response) => {
	const pairs = await prisma.pair.findMany({
		include: {
			broker: true,
		},
	});

	res.json(pairs);
};

export const findPair = async (req: Request, res: Response) => {
	const { base, quote, broker } = req.query as findPairSchema['query'];

	const pair = await prisma.pair.findFirst({
		where: {
			base,
			quote,
			broker: {
				name: broker,
			},
		},
		include: {
			broker: true,
		},
	});

	if (!pair) {
		res.status(StatusCodes.NOT_FOUND).json({
			error: 'Pair not found',
		});
		return;
	}

	res.json(pair);
};
