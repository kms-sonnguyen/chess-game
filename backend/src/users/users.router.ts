import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../auth/auth.middleware';
import { db } from '../db';

export const usersRouter = Router();

usersRouter.get('/me/stats', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.user.findUnique({
      where: { id: req.userId },
      select: { elo: true, gamesPlayed: true, wins: true, losses: true, draws: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const analyses = await db.analysis.findMany({
      where: { game: { userId: req.userId }, status: 'completed' },
      select: { accuracyPct: true, openingScorePct: true, middlegameScorePct: true, endgameScorePct: true, tacticsScorePct: true },
    });

    const avg = (vals: (number | null)[]) => {
      const nums = vals.filter((v): v is number => v !== null);
      return nums.length > 0 ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
    };

    type AnalysisRow = { accuracyPct: number | null; openingScorePct: number | null; middlegameScorePct: number | null; endgameScorePct: number | null; tacticsScorePct: number | null };
    res.json({
      elo: user.elo,
      gamesPlayed: user.gamesPlayed,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws,
      winRate: user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0,
      avgAccuracy: avg((analyses as AnalysisRow[]).map(a => a.accuracyPct)),
      avgOpeningScore: avg((analyses as AnalysisRow[]).map(a => a.openingScorePct)),
      avgMiddlegameScore: avg((analyses as AnalysisRow[]).map(a => a.middlegameScorePct)),
      avgEndgameScore: avg((analyses as AnalysisRow[]).map(a => a.endgameScorePct)),
      avgTacticsScore: avg((analyses as AnalysisRow[]).map(a => a.tacticsScorePct)),
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

usersRouter.patch('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { displayName, clockEnabled, theme } = req.body;
    const user = await db.user.update({
      where: { id: req.userId },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(clockEnabled !== undefined && { clockEnabled }),
        ...(theme !== undefined && { theme }),
      },
      select: { id: true, email: true, displayName: true, elo: true, clockEnabled: true, theme: true },
    });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});
