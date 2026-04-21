import { Server, Socket } from 'socket.io';
import { movesService } from './moves.service';
import { db } from '../db';

const ABANDONMENT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const abandonmentTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function registerMoveHandlers(io: Server, socket: Socket, userId: string) {
  // Track the active gameId for this socket connection (for abandonment on disconnect)
  let activeGameId: string | null = null;

  socket.on('move', async ({ gameId, move, timeSpentMs }: { gameId: string; move: string; timeSpentMs?: number }) => {
    activeGameId = gameId;
    try {
      const result = await movesService.applyMove(gameId, userId, move, timeSpentMs);
      socket.emit('move_result', result);
      if (result.gameOver) {
        socket.emit('game_over', { result: result.result });
        activeGameId = null;
        void triggerAnalysis(gameId);
      }
    } catch (err: any) {
      socket.emit('move_error', { error: err.message });
    }
  });

  socket.on('rejoin_game', async ({ gameId }: { gameId: string }) => {
    try {
      activeGameId = gameId;
      clearAbandonmentTimer(gameId);
      const payload = await movesService.buildRecoveryPayload(gameId, userId);
      socket.emit('game_state', payload);
    } catch (err: any) {
      socket.emit('error', { error: err.message });
    }
  });

  socket.on('disconnect', () => {
    if (!activeGameId) return;
    const gameId = activeGameId;
    // Mark game as abandoned after 5 minutes if client doesn't reconnect
    const timer = setTimeout(async () => {
      await db.game.updateMany({
        where: { id: gameId, status: 'ongoing' },
        data: { status: 'abandoned', timeEnded: new Date() },
      });
      abandonmentTimers.delete(gameId);
    }, ABANDONMENT_TIMEOUT_MS);
    abandonmentTimers.set(gameId, timer);
  });
}

function clearAbandonmentTimer(gameId: string) {
  const timer = abandonmentTimers.get(gameId);
  if (timer) {
    clearTimeout(timer);
    abandonmentTimers.delete(gameId);
  }
}

async function triggerAnalysis(gameId: string) {
  const { analysisService } = await import('../analysis/analysis.service');
  analysisService.generateAnalysis(gameId).catch(console.error);
}
