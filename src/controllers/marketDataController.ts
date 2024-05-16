import type { Request, Response } from 'express';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import utc from 'dayjs/plugin/utc';
import type { MarketDataSchema } from '../schemas/marketDataSchema';
import * as marketDataService from '../services/marketDataService';

dayjs.extend(duration);
dayjs.extend(utc);

export const getMarketData = async (req: Request, res: Response) => {
	const marketData = await marketDataService.getMarketData(
		req.body as unknown as MarketDataSchema['body'],
	);

	res.json(marketData);
};
