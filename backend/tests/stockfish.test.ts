// tests/stockfish.test.ts
import { describe, it, expect, vi } from 'vitest';
import { StockfishWorker } from '../src/stockfish/worker';
import { EventEmitter } from 'events';

// Mock child_process
const { mockProcess } = vi.hoisted(() => {
  const EventEmitter = require('events').EventEmitter;
  const mp = new EventEmitter();
  mp.stdin = { write: () => {} };
  mp.stdout = new EventEmitter();
  mp.stderr = new EventEmitter();
  return { mockProcess: mp };
});

vi.mock('child_process', () => ({
  spawn: vi.fn(() => mockProcess),
}));

describe('StockfishWorker', () => {
  it('resolves best move from UCI output', async () => {
    const worker = new StockfishWorker('/usr/bin/stockfish');

    const movePromise = worker.getBestMove(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      { depth: 10, skillLevel: 5 }
    );

    // Simulate Stockfish UCI output
    mockProcess.stdout.emit('data', Buffer.from('info depth 10 score cp 30\n'));
    mockProcess.stdout.emit('data', Buffer.from('bestmove e7e5 ponder g1f3\n'));

    const move = await movePromise;
    expect(move).toBe('e7e5');
  });

  it('extracts move from bestmove line', () => {
    const worker = new StockfishWorker('/usr/bin/stockfish');
    expect(worker.parseBestMove('bestmove e7e5 ponder g1f3')).toBe('e7e5');
    expect(worker.parseBestMove('bestmove (none)')).toBeNull();
  });
});
