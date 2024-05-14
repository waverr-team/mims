import { PrismaClient } from '@prisma/client';
import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import type {
	addBrokerSchema,
	deleteBrokerSchema,
} from '../schemas/brokerSchema';

const prisma = new PrismaClient();

export const getBrokers = async (req: Request, res: Response) => {
	const brokers = await prisma.broker.findMany();

	res.json(brokers);
};

export const createBroker = async (req: Request, res: Response) => {
	const brokerInput = req.body as addBrokerSchema['body'];

	const existingBroker = await prisma.broker.findFirst({
		where: {
			name: brokerInput.name,
		},
	});

	if (existingBroker) {
		res.status(StatusCodes.BAD_REQUEST).json({
			error: 'Broker already exists',
		});
		return;
	}

	const broker = await prisma.broker.create({
		data: {
			name: brokerInput.name,
		},
	});

	res.json(broker);
};

export const deleteBroker = async (req: Request, res: Response) => {
	const brokerId = req.params.id as deleteBrokerSchema['params']['id'];

	const broker = await prisma.broker.findUnique({
		where: {
			id: brokerId,
		},
	});

	if (!broker) {
		res.status(StatusCodes.NOT_FOUND).json({
			error: 'Broker not found',
		});
		return;
	}

	await prisma.broker.delete({
		where: {
			id: brokerId,
		},
	});

	res.json(broker);
};
