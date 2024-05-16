import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';

export class AppError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
	}
}

export function errorMiddleware(
	error: Error,
	req: Request,
	res: Response,
	next: NextFunction,
) {
	if (error instanceof ZodError) {
		res.status(StatusCodes.BAD_REQUEST).json({
			error: error.errors,
		});
		return;
	}

	if (error instanceof AppError) {
		res.status(error.status).json({
			error: error.message,
		});
		return;
	}

	res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
		error: 'Internal server error',
	});
}
