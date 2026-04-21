import { Chess } from 'chess.js';
import { db } from '../db';
import { stockfishPool } from '../stockfish/pool';

type MoveClass = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export class AnalysisService {
  classifyMove(scoreBefore: number, scoreAfter: number): MoveClass {
    const loss = scoreBefore - scoreAfter;
    if (loss < 10) return 'best';
    if (loss < 50) return 'good';
    if (loss < 100) return 'inaccuracy';
    if (loss < 200) return 'mistake';
    return 'blunder';
  }

  async generateAnalysis(gameId: string): Promise<void> {
    // Create pending record
    await db.analysis.upsert({
      where: { gameId },
      create: { gameId, status: 'pending' },
      update: { status: 'pending', errorMessage: null },
    });

    try {
      const game = await db.game.findUnique({
        where: { id: gameId },
        include: { moves: { orderBy: { moveNumber: 'asc' } } },
      });
      if (!game) throw new Error('Game not found');

      const chess = new Chess();
      let blunders = 0, mistakes = 0, inaccuracies = 0, bestMoves = 0;
      const keyMoments: { moveNumber: number; type: string; description: string }[] = [];

      // Score each position (player moves only — odd move numbers are player's)
      for (const m of game.moves) {
        const isPlayerMove = m.moveNumber % 2 === 1;
        if (!isPlayerMove) {
          chess.move({ from: m.move.slice(0, 2), to: m.move.slice(2, 4), promotion: m.move[4] });
          continue;
        }

        // Score before move
        const fenBefore = chess.fen();
        chess.move({ from: m.move.slice(0, 2), to: m.move.slice(2, 4), promotion: m.move[4] });
        const fenAfter = chess.fen();

        // Evaluate position before and after player move
        const evalBefore = await stockfishPool.getEvaluation(fenBefore, 18);
        const evalAfter = await stockfishPool.getEvaluation(fenAfter, 15);

        const classification = this.classifyMove(evalBefore.cpScore, evalAfter.cpScore);

        if (classification === 'best') bestMoves++;
        else if (classification === 'inaccuracy') inaccuracies++;
        else if (classification === 'mistake') mistakes++;
        else if (classification === 'blunder') {
          blunders++;
          keyMoments.push({ moveNumber: m.moveNumber, type: 'blunder', description: `Move ${m.move} lost significant advantage` });
        }
      }

      const totalPlayerMoves = Math.ceil(game.moves.length / 2);
      const accuracyPct = totalPlayerMoves > 0 ? Math.round((bestMoves / totalPlayerMoves) * 100) : 0;

      await db.analysis.update({
        where: { gameId },
        data: {
          status: 'completed',
          accuracyPct,
          blunders,
          mistakes,
          inaccuracies,
          bestMovesCount: bestMoves,
          keyMoments,
          improvementTip: this.generateTip(blunders, mistakes),
          generatedAt: new Date(),
        },
      });
    } catch (err: any) {
      await db.analysis.update({
        where: { gameId },
        data: { status: 'failed', errorMessage: err.message },
      });
    }
  }

  private generateTip(blunders: number, mistakes: number): string {
    if (blunders > 2) return 'Focus on checking your moves before playing — take a moment to ask: "Can my opponent take anything after this?"';
    if (mistakes > 3) return 'You had several inaccurate moments. Try to calculate one move further before deciding.';
    return 'Solid game overall. Keep working on your middlegame planning.';
  }

  async getAnalysis(gameId: string) {
    return db.analysis.findUnique({ where: { gameId } });
  }
}

export const analysisService = new AnalysisService();
