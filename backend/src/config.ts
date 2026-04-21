function resolveStockfishPath(): string {
  if (process.env.STOCKFISH_BINARY_PATH) {
    return process.env.STOCKFISH_BINARY_PATH;
  }
  switch (process.platform) {
    case 'darwin': return '/usr/local/bin/stockfish';
    case 'linux':  return '/usr/bin/stockfish';
    case 'win32':  return 'C:\\stockfish\\stockfish.exe';
    default: throw new Error('Unsupported platform — set STOCKFISH_BINARY_PATH env var');
  }
}

export const config = {
  port: parseInt(process.env.PORT ?? '', 10) || 3001,
  jwtSecret: process.env.JWT_SECRET ?? (() => { throw new Error('JWT_SECRET not set'); })(),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  stockfishBinaryPath: resolveStockfishPath(),
  stockfishPoolSize: parseInt(process.env.STOCKFISH_POOL_SIZE ?? '', 10) || 4,
};
