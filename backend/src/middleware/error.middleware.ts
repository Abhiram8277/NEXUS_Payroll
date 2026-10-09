import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof ZodError) {
    const errorDetails = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    const detailedMessage = err.errors.map((e) => `${e.path.length ? `${e.path.join('.')}: ` : ''}${e.message}`).join(', ') || 'Validation failed';
    return sendError(res, detailedMessage, errorDetails, 422);
  }

  // Handle Prisma unique constraint error
  if (err?.code === 'P2002') {
    const target = (err.meta?.target as string[])?.join(', ') || 'field';
    return sendError(res, `A record with this ${target} already exists`, [err.message], 409);
  }

  // Handle Prisma not found
  if (err?.code === 'P2025') {
    return sendError(res, 'Record not found', [err.message], 404);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return sendError(
    res,
    message,
    process.env.NODE_ENV === 'development' ? [err.stack] : [],
    statusCode
  );
}

export function notFoundHandler(req: Request, res: Response) {
  return sendError(res, `API route not found: ${req.method} ${req.originalUrl}`, [], 404);
}
