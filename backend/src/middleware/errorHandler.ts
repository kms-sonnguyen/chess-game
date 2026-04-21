import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

export const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
}
