import { apiClient } from './client';
import { Analysis } from '../types';

export async function getAnalysis(gameId: string) {
  const { data } = await apiClient.get<Analysis>(`/api/games/${gameId}/analysis`);
  return data;
}

export async function retryAnalysis(gameId: string) {
  await apiClient.post(`/api/games/${gameId}/analysis/retry`);
}
