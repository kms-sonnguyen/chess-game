import { useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChessBoard } from '../components/ChessBoard';
import { MoveList } from '../components/MoveList';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { connectGameSocket, sendMove, rejoinGame } from '../socket/gameSocket';
import { getGame } from '../api/games';
import type { MoveResult } from '../types';

export function Game() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const token = useAuthStore(s => s.token);
  const { fen, moves, isPlayerTurn, isGameOver, isReconnecting,
          initGame, applyMoveResult, recoverFromServer, setReconnecting } = useGameStore();
  const moveStartTime = useRef<number>(Date.now());

  useEffect(() => {
    if (!gameId || !token) return;

    // Connect socket
    const socket = connectGameSocket(token);

    // Load initial game state
    getGame(gameId).then(game => {
      const lastFen = game.moves.length > 0 ? game.moves[game.moves.length - 1].fenAfter : undefined;
      initGame(game.id, game.aiSkillLevel, lastFen, game.moves);
    });

    socket.on('move_result', (data: MoveResult) => {
      applyMoveResult(data);
      if (data.gameOver) navigate(`/review/${gameId}`);
    });

    socket.on('game_state', recoverFromServer);

    socket.on('connect', () => {
      setReconnecting(false);
      if (gameId) rejoinGame(gameId);
    });

    socket.on('disconnect', () => setReconnecting(true));

    socket.on('move_error', ({ error }: { error: string }) => {
      console.error('Move error:', error);
    });

    return () => {
      socket.off('move_result');
      socket.off('game_state');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('move_error');
    };
  }, [gameId, token]);

  const handleMove = useCallback((uciMove: string) => {
    if (!gameId || !isPlayerTurn || isGameOver) return;
    const timeSpentMs = Date.now() - moveStartTime.current;
    moveStartTime.current = Date.now();
    sendMove(gameId, uciMove, timeSpentMs);
  }, [gameId, isPlayerTurn, isGameOver]);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={() => navigate('/')}>← Back</button>
        <span>♟ ChessMate</span>
      </div>

      <div style={{ marginBottom: 8, color: '#888', fontSize: 13 }}>
        AI Skill {useGameStore.getState().aiSkillLevel}
      </div>

      {isReconnecting && (
        <div style={{ background: '#7c3aed', padding: 8, borderRadius: 6, marginBottom: 8, textAlign: 'center' }}>
          Reconnecting...
        </div>
      )}

      <ChessBoard
        fen={fen}
        disabled={!isPlayerTurn || isGameOver || isReconnecting}
        onMove={handleMove}
      />

      <div style={{ marginTop: 8, marginBottom: 8, color: '#888', fontSize: 13 }}>
        You {isPlayerTurn && !isGameOver ? '(your turn)' : ''}
      </div>

      <MoveList moves={moves} />

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          onClick={() => navigate(`/review/${gameId}`)}
          style={{ flex: 1, padding: 10, background: '#374151', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Resign
        </button>
      </div>
    </div>
  );
}
