import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MovesService } from '../src/moves/moves.service';

const mockDb = vi.hoisted(() => ({
  game: { findFirst: vi.fn(), update: vi.fn() },
  move: { create: vi.fn(), findMany: vi.fn() },
  user: { findUnique: vi.fn(), update: vi.fn() },
}));
vi.mock('../src/db', () => ({ db: mockDb }));
vi.mock('../src/stockfish/pool', () => ({
  stockfishPool: { getBestMove: vi.fn().mockResolvedValue('e7e5') },
}));

const movesService = new MovesService();

describe('MovesService.applyMove', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an illegal move', async () => {
    mockDb.game.findFirst.mockResolvedValue({
      id: 'g1', status: 'ongoing', aiSkillLevel: 5, aiDepth: 10,
      moves: [],
    });

    await expect(movesService.applyMove('g1', 'u1', 'e2e2'))
      .rejects.toThrow('Illegal move');
  });

  it('returns AI move after valid player move', async () => {
    mockDb.game.findFirst.mockResolvedValue({
      id: 'g1', status: 'ongoing', aiSkillLevel: 5, aiDepth: 10,
      moves: [],
    });
    mockDb.move.create.mockResolvedValue({});
    mockDb.game.update.mockResolvedValue({});

    const result = await movesService.applyMove('g1', 'u1', 'e2e4');
    expect(result.playerMove).toBe('e2e4');
    expect(result.aiMove).toBe('e7e5');
  });
});
