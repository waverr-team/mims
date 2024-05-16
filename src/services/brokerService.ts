import { AppError } from '../middleware/errorMiddleware';
import { PrismaClient } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';

const prisma = new PrismaClient();

export const createBroker = async (name: string) => {
	const broker = await prisma.broker.create({
		data: {
			name,
		},
	});

	return broker;
};

export const getBrokers = async () => {
	const brokers = await prisma.broker.findMany();

	return brokers;
};

export const deleteBroker = async (id: string) => {
	const broker = await prisma.broker.findUnique({
		where: {
			id,
		},
	});

	if (!broker) {
		throw new AppError('Invalid broker id', StatusCodes.BAD_REQUEST);
	}

	await prisma.broker.delete({
		where: {
			id,
		},
	});

	return broker;
};
