// tests/gameStore.test.ts
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/store/gameStore';
import { Chess } from 'chess.js';

describe('gameStore', () => {
  beforeEach(() => useGameStore.getState().reset());

  it('initialises with correct game id and skill level', () => {
    useGameStore.getState().initGame('game-1', 8);
    expect(useGameStore.getState().gameId).toBe('game-1');
    expect(useGameStore.getState().aiSkillLevel).toBe(8);
  });

  it('applies move result and updates fen', () => {
    useGameStore.getState().initGame('game-1', 5);
    const chess = new Chess();
    chess.move({ from: 'e2', to: 'e4' });
    const playerFen = chess.fen();
    useGameStore.getState().applyMoveResult({
      playerMove: 'e2e4', playerFen, aiMove: null, aiFen: null, gameOver: false, result: null,
    });

    expect(useGameStore.getState().fen).toBe(playerFen);
    expect(useGameStore.getState().moves).toHaveLength(1);
  });

  it('marks game over when result is set', () => {
    useGameStore.getState().initGame('game-1', 5);
    useGameStore.getState().applyMoveResult({
      playerMove: 'e2e4', playerFen: 'fen', aiMove: null, aiFen: null, gameOver: true, result: 'win',
    });
    expect(useGameStore.getState().isGameOver).toBe(true);
    expect(useGameStore.getState().result).toBe('win');
  });
});
