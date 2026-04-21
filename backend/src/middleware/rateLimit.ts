import rateLimit from 'express-rate-limit';

export const registerLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { error: 'Too many registration attempts' } });
export const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many login attempts' } });
export const startGameLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: { error: 'Game limit reached for this hour' } });
export const analysisLimit = rateLimit({ windowMs: 60 * 1000, max: 30, message: { error: 'Analysis request rate limit exceeded' } });
