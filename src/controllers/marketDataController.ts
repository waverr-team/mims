import type { Request, Response } from 'express';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import utc from 'dayjs/plugin/utc';
import type {
	FetchMarketDataSchema,
	GetMarketDataSchema,
} from '../schemas/marketDataSchema';
import * as marketDataService from '../services/marketDataService';
import type { MarketData } from '../types/marketDataType';

dayjs.extend(duration);
dayjs.extend(utc);

export const getMarketData = async (
	req: Request,
	res: Response<MarketData>,
) => {
	const marketData = await marketDataService.getMarketData(
		req.body as GetMarketDataSchema['body'],
	);

	res.json(marketData);
};

export const fetchMarketData = async (req: Request, res: Response) => {
	const status = await marketDataService.fetchMarketData(
		req.body as FetchMarketDataSchema['body'],
	);

	res.json(status);
};
