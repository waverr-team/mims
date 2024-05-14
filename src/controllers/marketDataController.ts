import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { PrismaClient } from '@prisma/client';
import Prisma from '@prisma/client';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import utc from 'dayjs/plugin/utc';
import type { marketDataSchema } from '../schemas/marketDataSchema';
import MarketDataService from '../services/marketDataService';

dayjs.extend(duration);
dayjs.extend(utc);

const prisma = new PrismaClient();

const marketDataService = new MarketDataService(prisma);

export const getMarketData = async (req: Request, res: Response) => {
	const { base, quote, broker, start, end, interval, indicators } =
		req.body as unknown as marketDataSchema['body'];

	const pair = await prisma.pair.findFirst({
		where: {
			base,
			quote,
			broker: {
				name: broker,
			},
		},
	});

	if (!pair) {
		res.status(StatusCodes.NOT_FOUND).json({
			error: 'Pair not found',
		});
		return;
	}

	const marketData = await marketDataService.getMarketData(
		req.body as unknown as marketDataSchema['body'],
		pair.id,
	);

	res.json(marketData);
};
