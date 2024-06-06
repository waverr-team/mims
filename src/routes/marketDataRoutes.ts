import { Router } from 'express';
import {
	getMarketData,
	fetchMarketData,
} from '../controllers/marketDataController';
import { validateData } from '../middleware/validationMiddleware';
import {
	fetchMarketDataSchema,
	getMarketDataSchema,
} from '../schemas/marketDataSchema';

const marketDataRouter = Router();

marketDataRouter.post('/', validateData(getMarketDataSchema), getMarketData);
marketDataRouter.post(
	'/fetch',
	validateData(fetchMarketDataSchema),
	fetchMarketData,
);

export default marketDataRouter;
