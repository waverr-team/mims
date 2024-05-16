import { PrismaClient } from '@prisma/client';
import type { Request, Response } from 'express';
import * as brokerService from '../services/brokerService';

import type {
	AddBrokerSchema,
	DeleteBrokerSchema,
} from '../schemas/brokerSchema';

const prisma = new PrismaClient();

export const getBrokers = async (req: Request, res: Response) => {
	const brokers = await brokerService.getBrokers();

	res.json(brokers);
};

export const createBroker = async (req: Request, res: Response) => {
	const brokerInput = req.body as AddBrokerSchema['body'];

	const broker = await brokerService.createBroker(brokerInput.name);

	res.json(broker);
};

export const deleteBroker = async (req: Request, res: Response) => {
	const brokerId = req.params.id as DeleteBrokerSchema['params']['id'];

	const broker = await brokerService.deleteBroker(brokerId);

	res.json(broker);
};
