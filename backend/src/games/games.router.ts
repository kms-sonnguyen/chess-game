import { Router, Response } from 'express';
import { gamesService } from './games.service';
import { requireAuth, AuthRequest } from '../auth/auth.middleware';

export const gamesRouter = Router();

gamesRouter.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await gamesService.startGame(req.userId!);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

gamesRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string ?? '1', 10) || 1;
    const games = await gamesService.listGames(req.userId!, page);
    res.json(games);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

gamesRouter.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const game = await gamesService.getGame(req.params.id, req.userId!);
    res.json(game);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});
