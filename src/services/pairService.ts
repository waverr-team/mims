import { StatusCodes } from 'http-status-codes';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorMiddleware';

const prisma = new PrismaClient();

export const createPair = async (
	base: string,
	quote: string,
	brokerId: string,
) => {
	const broker = await prisma.broker.findFirst({
		where: {
			name: brokerId,
		},
	});

	if (!broker) {
		throw new AppError('Invalid broker id', StatusCodes.BAD_REQUEST);
	}

	const pairExists = await prisma.pair.findFirst({
		where: {
			base,
			quote,
			brokerId: broker.id,
		},
	});

	if (pairExists) {
		throw new AppError('Pair already exists', StatusCodes.BAD_REQUEST);
	}

	const pair = await prisma.pair.create({
		data: {
			base,
			quote,
			broker: {
				connect: {
					id: broker.id,
				},
			},
		},
	});
};

export const getPairs = async () => {
	const pairs = await prisma.pair.findMany({
		include: {
			broker: true,
		},
	});

	return pairs;
};

export const deletePair = async (id: string) => {
	const pair = await prisma.pair.findUnique({
		where: {
			id,
		},
	});

	if (!pair) {
		throw new AppError('Pair not found', StatusCodes.NOT_FOUND);
	}

	await prisma.pair.delete({
		where: {
			id,
		},
	});
};

export const findPair = async (base: string, quote: string, broker: string) => {
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
		throw new AppError('Pair not found', StatusCodes.NOT_FOUND);
	}

	return pair;
};
