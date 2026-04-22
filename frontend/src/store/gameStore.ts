import { create } from 'zustand';
import { Chess } from 'chess.js';
import type { GameMove } from '../types';

interface GameStoreState {
  gameId: string | null;
  fen: string;
  moves: GameMove[];
  aiSkillLevel: number;
  isPlayerTurn: boolean;
  isGameOver: boolean;
  result: string | null;
  isReconnecting: boolean;
  hintsUsed: number;

  initGame: (gameId: string, aiSkillLevel: number, initialFen?: string, moves?: GameMove[]) => void;
  applyMoveResult: (result: { playerFen: string; aiMove: string | null; aiFen: string | null; gameOver: boolean; result: string | null; playerMove: string }) => void;
  recoverFromServer: (payload: { currentFen: string; moves: GameMove[]; aiSkillLevel: number }) => void;
  setReconnecting: (val: boolean) => void;
  useHint: () => void;
  reset: () => void;
}

const INITIAL_FEN = new Chess().fen();

export const useGameStore = create<GameStoreState>((set) => ({
  gameId: null,
  fen: INITIAL_FEN,
  moves: [],
  aiSkillLevel: 5,
  isPlayerTurn: true,
  isGameOver: false,
  result: null,
  isReconnecting: false,
  hintsUsed: 0,

  initGame: (gameId, aiSkillLevel, initialFen = INITIAL_FEN, moves = []) =>
    set({ gameId, aiSkillLevel, fen: initialFen, moves, isPlayerTurn: true, isGameOver: false, result: null, hintsUsed: 0 }),

  applyMoveResult: (r) =>
    set((state) => {
      const newMoves: GameMove[] = [
        ...state.moves,
        { moveNumber: state.moves.length + 1, move: r.playerMove, fenAfter: r.playerFen },
        ...(r.aiMove && r.aiFen ? [{ moveNumber: state.moves.length + 2, move: r.aiMove, fenAfter: r.aiFen }] : []),
      ];
      return {
        fen: r.aiFen ?? r.playerFen,
        moves: newMoves,
        isPlayerTurn: !r.gameOver,
        isGameOver: r.gameOver,
        result: r.result,
      };
    }),

  recoverFromServer: (payload) =>
    set({ fen: payload.currentFen, moves: payload.moves, aiSkillLevel: payload.aiSkillLevel, isReconnecting: false, isPlayerTurn: true }),

  setReconnecting: (val) => set({ isReconnecting: val }),

  useHint: () => set((state) => ({ hintsUsed: state.hintsUsed + 1 })),

  reset: () => set({ gameId: null, fen: INITIAL_FEN, moves: [], isGameOver: false, result: null, hintsUsed: 0 }),
}));
