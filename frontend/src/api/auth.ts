import { apiClient } from './client';
import type { User } from '../types';

export async function register(email: string, password: string, isBeginner: boolean) {
  const { data } = await apiClient.post<{ token: string; user: User }>('/api/auth/register', { email, password, isBeginner });
  return data;
}

export async function login(email: string, password: string) {
  const { data } = await apiClient.post<{ token: string; user: User }>('/api/auth/login', { email, password });
  return data;
}

export async function getMe() {
  const { data } = await apiClient.get<User>('/api/auth/me');
  return data;
}
