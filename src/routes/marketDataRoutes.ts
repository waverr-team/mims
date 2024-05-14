import { Router } from 'express';
import { getMarketData } from '../controllers/marketDataController';
import { validateData } from '../middleware/validationMiddleware';
import { marketDataSchema } from '../schemas/marketDataSchema';

const marketDataRouter = Router();

marketDataRouter.post('/', validateData(marketDataSchema), getMarketData);

export default marketDataRouter;
