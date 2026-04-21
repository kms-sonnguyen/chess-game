import { db } from '../db';
import { getSkillWithSoftAdapt } from '../adaptive/difficulty';
import { StartGameResult, GameState } from './games.types';

export class GamesService {
  async startGame(userId: string): Promise<StartGameResult> {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const { skill, depth } = getSkillWithSoftAdapt(userId, user.elo);

    const game = await db.game.create({
      data: {
        userId,
        aiSkillLevel: skill,
        aiDepth: depth,
        userEloBefore: user.elo,
        status: 'ongoing',
      },
    });

    return { gameId: game.id, aiSkillLevel: skill, aiDepth: depth, userEloBefore: user.elo };
  }

  async getGame(gameId: string, userId: string): Promise<GameState> {
    const game = await db.game.findFirst({
      where: { id: gameId, userId },
      include: { moves: { orderBy: { moveNumber: 'asc' } } },
    });
    if (!game) throw new Error('Game not found');
    return {
      id: game.id,
      status: game.status,
      result: game.result,
      moves: game.moves.map((m: { moveNumber: number; move: string; fenAfter: string }) => ({ moveNumber: m.moveNumber, move: m.move, fenAfter: m.fenAfter })),
      aiSkillLevel: game.aiSkillLevel,
      timeStarted: game.timeStarted,
    };
  }

  async listGames(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const games = await db.game.findMany({
      where: { userId, status: { not: 'ongoing' } },
      orderBy: { timeStarted: 'desc' },
      skip,
      take: limit,
      include: { analysis: { select: { status: true, accuracyPct: true } } },
    });
    return games;
  }
}

export const gamesService = new GamesService();
