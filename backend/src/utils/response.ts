import { Response } from 'express';

export function sendSuccess<T = any>(
  res: Response,
  message: string,
  data: T = {} as T,
  statusCode: number = 200
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(
  res: Response,
  message: string,
  errors: any[] = [],
  statusCode: number = 400
): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}

export function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}
