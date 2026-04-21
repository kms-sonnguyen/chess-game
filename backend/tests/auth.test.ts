// tests/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../src/auth/auth.service';

// Use an in-memory mock for db in tests
const mockDb = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../src/db', () => ({ db: mockDb }));

const authService = new AuthService();

describe('AuthService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('register', () => {
    it('creates a user with hashed password', async () => {
      mockDb.user.findUnique.mockResolvedValue(null);
      mockDb.user.create.mockResolvedValue({
        id: 'user-1', email: 'test@test.com', displayName: null,
        elo: 800, isBeginner: false,
      });

      const result = await authService.register('test@test.com', 'password123', false);
      expect(result.email).toBe('test@test.com');
      expect(mockDb.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ email: 'test@test.com' }) })
      );
    });

    it('throws if email already exists', async () => {
      mockDb.user.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(authService.register('taken@test.com', 'pw', false))
        .rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('returns a JWT token on valid credentials', async () => {
      const hashed = await import('bcryptjs').then(b => b.hash('password123', 10));
      mockDb.user.findUnique.mockResolvedValue({
        id: 'user-1', email: 'test@test.com', passwordHash: hashed,
        elo: 800, isBeginner: false, displayName: null,
      });

      const result = await authService.login('test@test.com', 'password123');
      expect(result.token).toBeTruthy();
      expect(result.user.email).toBe('test@test.com');
    });

    it('throws on wrong password', async () => {
      const hashed = await import('bcryptjs').then(b => b.hash('correct', 10));
      mockDb.user.findUnique.mockResolvedValue({ passwordHash: hashed });
      await expect(authService.login('test@test.com', 'wrong'))
        .rejects.toThrow('Invalid credentials');
    });

    it('throws if user not found', async () => {
      mockDb.user.findUnique.mockResolvedValue(null);
      await expect(authService.login('nobody@test.com', 'pw'))
        .rejects.toThrow('Invalid credentials');
    });
  });
});
