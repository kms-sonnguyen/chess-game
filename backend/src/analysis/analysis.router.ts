import { Router, Response } from 'express';
import { analysisService } from './analysis.service';
import { requireAuth, AuthRequest } from '../auth/auth.middleware';
import { db } from '../db';
import { logger } from '../middleware/errorHandler';

export const analysisRouter = Router({ mergeParams: true });

analysisRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const analysis = await analysisService.getAnalysis(req.params.gameId);
    if (!analysis) { res.status(404).json({ error: 'Analysis not found' }); return; }
    res.json(analysis);
  } catch (err) {
    logger.error({ err }, 'Analysis router error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

analysisRouter.post('/retry', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const game = await db.game.findFirst({ where: { id: req.params.gameId, userId: req.userId } });
    if (!game) { res.status(404).json({ error: 'Game not found' }); return; }
    void analysisService.generateAnalysis(req.params.gameId);
    res.json({ status: 'pending' });
  } catch (err) {
    logger.error({ err }, 'Analysis router error');
    res.status(500).json({ error: 'Internal server error' });
  }
});
