import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not Found' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'ValidationError',
      details: err.flatten()
    });
  }
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  const status = (err as any)?.status ?? 500;
  res.status(status).json({ error: message });
}