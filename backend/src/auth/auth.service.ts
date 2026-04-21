import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { config } from '../config';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  elo: number;
  isBeginner: boolean;
}

export class AuthService {
  async register(email: string, password: string, isBeginner: boolean): Promise<AuthUser> {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) throw new Error('Email already registered');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        elo: isBeginner ? 200 : 800,
        isBeginner,
      },
      select: { id: true, email: true, displayName: true, elo: true, isBeginner: true },
    });
    return user;
  }

  async login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) throw new Error('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('Invalid credentials');

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '30d' });
    return {
      token,
      user: { id: user.id, email: user.email, displayName: user.displayName, elo: user.elo, isBeginner: user.isBeginner },
    };
  }

  verifyToken(token: string): { userId: string } {
    return jwt.verify(token, config.jwtSecret) as { userId: string };
  }
}

export const authService = new AuthService();
