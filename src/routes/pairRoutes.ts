import { Router } from 'express';

import {
	createPair,
	deletePair,
	findPair,
	getPairs,
} from '../controllers/pairController';
import { validateData } from '../middleware/validationMiddleware';
import {
	addPairSchema,
	deletePairSchema,
	findPairSchema,
} from '../schemas/pairSchema';

const pairRouter = Router();

pairRouter.get('/', getPairs);
pairRouter.post('/', validateData(addPairSchema), createPair);
pairRouter.delete('/:id', validateData(deletePairSchema), deletePair);
pairRouter.get('/search', validateData(findPairSchema), findPair);

export default pairRouter;
