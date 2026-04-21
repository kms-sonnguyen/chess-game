import { Chess } from 'chess.js';
import { db } from '../db';
import { stockfishPool } from '../stockfish/pool';
import { softAdaptStreak, aiVirtualElo, computeEloChange } from '../adaptive/difficulty';

export interface MoveResult {
  playerMove: string;
  playerFen: string;
  aiMove: string | null;
  aiFen: string | null;
  gameOver: boolean;
  result: string | null;
}

export class MovesService {
  private async loadGame(gameId: string, userId: string) {
    const game = await db.game.findFirst({
      where: { id: gameId, userId, status: 'ongoing' },
      include: { moves: { orderBy: { moveNumber: 'asc' } } },
    });
    if (!game) throw new Error('Game not found or already ended');
    return game;
  }

  private replayToFen(moves: { move: string }[]): Chess {
    const chess = new Chess();
    try {
      for (const m of moves) {
        const result = chess.move({ from: m.move.slice(0, 2), to: m.move.slice(2, 4), promotion: m.move[4] });
        if (!result) throw new Error('Invalid move in history');
      }
    } catch {
      throw new Error('Failed to replay game moves');
    }
    return chess;
  }

  async applyMove(gameId: string, userId: string, uciMove: string, timeSpentMs?: number): Promise<MoveResult> {
    const game = await this.loadGame(gameId, userId);
    const chess = this.replayToFen(game.moves);

    // Validate player move
    let moveResult;
    try {
      moveResult = chess.move({ from: uciMove.slice(0, 2), to: uciMove.slice(2, 4), promotion: uciMove[4] });
    } catch {
      throw new Error('Illegal move');
    }
    if (!moveResult) throw new Error('Illegal move');

    const playerFen = chess.fen();
    const moveNumber = game.moves.length + 1;
    await db.move.create({ data: { gameId, moveNumber, move: uciMove, fenAfter: playerFen, timeSpentMs } });

    // Check if game over after player move
    if (chess.isGameOver()) {
      const gameResult = chess.isCheckmate() ? 'win' : 'draw';
      await this.finaliseGame(game, userId, gameResult);
      return { playerMove: uciMove, playerFen, aiMove: null, aiFen: null, gameOver: true, result: gameResult };
    }

    // Get AI move
    const aiUciMove = await stockfishPool.getBestMove(playerFen, { depth: game.aiDepth, skillLevel: game.aiSkillLevel }, 'high');
    if (!aiUciMove) throw new Error('Stockfish returned no move');

    chess.move({ from: aiUciMove.slice(0, 2), to: aiUciMove.slice(2, 4), promotion: aiUciMove[4] });
    const aiFen = chess.fen();
    await db.move.create({ data: { gameId, moveNumber: moveNumber + 1, move: aiUciMove, fenAfter: aiFen } });

    if (chess.isGameOver()) {
      const gameResult = chess.isCheckmate() ? 'loss' : 'draw';
      await this.finaliseGame(game, userId, gameResult);
      return { playerMove: uciMove, playerFen, aiMove: aiUciMove, aiFen, gameOver: true, result: gameResult };
    }

    return { playerMove: uciMove, playerFen, aiMove: aiUciMove, aiFen, gameOver: false, result: null };
  }

  private async finaliseGame(game: any, userId: string, result: 'win' | 'loss' | 'draw') {
    const user = await db.user.findUnique({ where: { id: userId }, select: { elo: true } });
    if (!user) return;

    const aiElo = aiVirtualElo(game.aiSkillLevel);
    const eloDelta = computeEloChange(user.elo, aiElo, result);
    const newElo = Math.max(100, user.elo + eloDelta);
    softAdaptStreak(userId, result);

    await db.game.update({
      where: { id: game.id },
      data: { status: 'completed', result, userEloAfter: newElo, timeEnded: new Date(), totalMoves: game.moves.length + 2 },
    });
    await db.user.update({
      where: { id: userId },
      data: {
        elo: newElo,
        gamesPlayed: { increment: 1 },
        wins: result === 'win' ? { increment: 1 } : undefined,
        losses: result === 'loss' ? { increment: 1 } : undefined,
        draws: result === 'draw' ? { increment: 1 } : undefined,
      },
    });
  }

  async buildRecoveryPayload(gameId: string, userId: string) {
    const game = await this.loadGame(gameId, userId);
    const moves = game.moves.map((m: { moveNumber: number; move: string; fenAfter: string }) => ({
      moveNumber: m.moveNumber, move: m.move, fenAfter: m.fenAfter
    }));
    const lastFen = moves.length > 0 ? moves[moves.length - 1].fenAfter : new Chess().fen();
    return { gameId, moves, currentFen: lastFen, aiSkillLevel: game.aiSkillLevel };
  }
}

export const movesService = new MovesService();
