import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  errors?: Record<string, string> | string[];

  constructor(message: string, statusCode: number = 400, errors?: Record<string, string> | string[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(err: Error | AppError, req: Request, res: Response, _next: NextFunction): void {
  console.error(`[Error] ${req.method} ${req.path}:`, err.message);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || [err.message]
    });
    return;
  }

  // Database constraint violation or generic error
  res.status(500).json({
    success: false,
    message: 'An unexpected internal server error occurred. Please try again later.',
    errors: [process.env.NODE_ENV === 'development' ? err.message : 'INTERNAL_SERVER_ERROR']
  });
}
