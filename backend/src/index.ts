import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { config } from './config';
import { logger, errorHandler } from './middleware/errorHandler';
import { authRouter } from './auth/auth.router';
import { gamesRouter } from './games/games.router';
import { analysisRouter } from './analysis/analysis.router';
import { usersRouter } from './users/users.router';
import { registerMoveHandlers } from './moves/moves.socket';
import { authService } from './auth/auth.service';
import { registerLimit, loginLimit, startGameLimit, analysisLimit } from './middleware/rateLimit';
import { db } from './db';
import { stockfishPool } from './stockfish/pool';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: config.frontendUrl, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: config.frontendUrl }));
app.use(express.json());
app.use(pinoHttp({ logger }));

// Routes
app.use('/api/auth/register', registerLimit);
app.use('/api/auth/login', loginLimit);
app.use('/api/auth', authRouter);
app.use('/api/games', startGameLimit);
app.use('/api/games', gamesRouter);
app.use('/api/games/:gameId/analysis', analysisLimit, analysisRouter);
app.use('/api/users', usersRouter);

// Health endpoint
app.get('/api/health', async (_req, res) => {
  let dbConnected = false;
  try { await db.$queryRaw`SELECT 1`; dbConnected = true; } catch {}
  const workers = (stockfishPool as any).workers as any[];
  const busyWorkers = workers?.filter((w: any) => w.busy).length ?? 0;
  res.json({ status: 'ok', dbConnected, stockfishWorkersBusy: busyWorkers });
});

app.use(errorHandler);

// WebSocket auth + handlers
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token as string;
    const { userId } = authService.verifyToken(token);
    (socket as any).userId = userId;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  const userId = (socket as any).userId as string;
  logger.info({ userId, socketId: socket.id }, 'Client connected');
  registerMoveHandlers(io, socket, userId);
  socket.on('disconnect', () => logger.info({ userId }, 'Client disconnected'));
});

httpServer.listen(config.port, () => {
  logger.info({ port: config.port }, 'Server started');
});

export { app, httpServer };
