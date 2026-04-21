import { Router, Request, Response } from 'express';
import { authService } from './auth.service';
import { requireAuth, AuthRequest } from './auth.middleware';
import { db } from '../db';

export const authRouter = Router();

authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, isBeginner = false } = req.body;
    if (!email || !password) { res.status(400).json({ error: 'email and password required' }); return; }
    const user = await authService.register(email, password, isBeginner);
    const { token } = await authService.login(email, password);
    res.status(201).json({ token, user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) { res.status(400).json({ error: 'email and password required' }); return; }
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

authRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await db.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, displayName: true, elo: true, isBeginner: true,
              gamesPlayed: true, wins: true, losses: true, draws: true,
              clockEnabled: true, theme: true },
  });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(user);
});
