// tests/analysis.test.ts
import { describe, it, expect, vi } from 'vitest';
import { AnalysisService } from '../src/analysis/analysis.service';

const mockDb = vi.hoisted(() => ({
  game: { findUnique: vi.fn() },
  analysis: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
}));
vi.mock('../src/db', () => ({ db: mockDb }));
vi.mock('../src/stockfish/pool', () => ({
  stockfishPool: { getEvaluation: vi.fn().mockResolvedValue({ bestMove: 'e2e4', cpScore: 30 }) },
}));

const service = new AnalysisService();

describe('AnalysisService.classifyMove', () => {
  it('classifies blunder when centipawn loss > 200', () => {
    expect(service.classifyMove(500, 280)).toBe('blunder');
  });
  it('classifies mistake when centipawn loss 100-200', () => {
    expect(service.classifyMove(300, 150)).toBe('mistake');
  });
  it('classifies best when centipawn loss < 10', () => {
    expect(service.classifyMove(300, 295)).toBe('best');
  });
});
