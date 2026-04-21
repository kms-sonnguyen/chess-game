import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';

export interface AuthRequest extends Request {
  userId?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing auth token' }); return;
  }
  try {
    const token = header.slice(7);
    const { userId } = authService.verifyToken(token);
    req.userId = userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
