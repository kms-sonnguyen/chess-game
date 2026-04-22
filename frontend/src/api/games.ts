import { apiClient } from './client';
import { GameState, GameSummary } from '../types';

export async function startGame() {
  const { data } = await apiClient.post<{ gameId: string; aiSkillLevel: number; userEloBefore: number }>('/api/games');
  return data;
}

export async function getGame(gameId: string) {
  const { data } = await apiClient.get<GameState>(`/api/games/${gameId}`);
  return data;
}

export async function listGames(page = 1) {
  const { data } = await apiClient.get<GameSummary[]>('/api/games', { params: { page } });
  return data;
}
