import { io, Socket } from 'socket.io-client';
import { MoveResult } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

export function connectGameSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(WS_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function disconnectGameSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}

export function sendMove(gameId: string, move: string, timeSpentMs?: number) {
  if (!socket) throw new Error('Socket not connected');
  socket.emit('move', { gameId, move, timeSpentMs });
}

export function rejoinGame(gameId: string) {
  if (!socket) throw new Error('Socket not connected');
  socket.emit('rejoin_game', { gameId });
}
