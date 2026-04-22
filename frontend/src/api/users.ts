import { apiClient } from './client';
import { UserStats, User } from '../types';

export async function getStats() {
  const { data } = await apiClient.get<UserStats>('/api/users/me/stats');
  return data;
}

export async function updateProfile(updates: Partial<Pick<User, 'displayName' | 'clockEnabled' | 'theme'>>) {
  const { data } = await apiClient.patch<User>('/api/users/me', updates);
  return data;
}
