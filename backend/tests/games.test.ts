// tests/games.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GamesService } from '../src/games/games.service';

const mockDb = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  game: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
}));
vi.mock('../src/db', () => ({ db: mockDb }));
vi.mock('../src/adaptive/difficulty', () => ({
  getSkillWithSoftAdapt: vi.fn().mockReturnValue({ skill: 5, depth: 10 }),
}));

const gamesService = new GamesService();

describe('GamesService.startGame', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a game with correct AI skill for user ELO', async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: 'u1', elo: 850, isBeginner: false });
    mockDb.game.create.mockResolvedValue({
      id: 'game-1', aiSkillLevel: 5, aiDepth: 10, userEloBefore: 850,
    });

    const result = await gamesService.startGame('u1');
    expect(result.gameId).toBe('game-1');
    expect(result.aiSkillLevel).toBe(5);
  });

  it('throws if user not found', async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    await expect(gamesService.startGame('bad-id')).rejects.toThrow('User not found');
  });
});
