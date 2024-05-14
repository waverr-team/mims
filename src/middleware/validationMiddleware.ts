import type { NextFunction, Request, Response } from 'express';
import { ZodError, type z } from 'zod';

import { StatusCodes } from 'http-status-codes';

export function validateData(
	schema: z.AnyZodObject | z.ZodOptional<z.AnyZodObject>,
) {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			await schema.parseAsync({
				body: req.body,
				query: req.query,
				params: req.params,
			});
			next();
		} catch (error) {
			if (error instanceof ZodError) {
				res.status(StatusCodes.BAD_REQUEST).json({
					error: 'Bad Request',
					details: error.errors,
				});
			} else {
				res
					.status(StatusCodes.INTERNAL_SERVER_ERROR)
					.json({ error: 'Internal Server Error' });
			}
		}
	};
}
