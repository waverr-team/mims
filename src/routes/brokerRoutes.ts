import { Router } from 'express';
import {
	createBroker,
	deleteBroker,
	getBrokers,
} from '../controllers/brokerController';
import { validateData } from '../middleware/validationMiddleware';
import { addBrokerSchema, deleteBrokerSchema } from '../schemas/brokerSchema';

const brokerRouter = Router();

brokerRouter.get('/', getBrokers);
brokerRouter.post('/', validateData(addBrokerSchema), createBroker);
brokerRouter.delete('/:id', validateData(deleteBrokerSchema), deleteBroker);

export default brokerRouter;
