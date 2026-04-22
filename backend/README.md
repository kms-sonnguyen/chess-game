# Chess Game Backend

Express + Node.js backend with Socket.io, Stockfish worker pool, and PostgreSQL.

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Stockfish 16

### Install Stockfish

**macOS:**
```bash
brew install stockfish
```

**Ubuntu/Debian:**
```bash
sudo apt install stockfish
```

**Windows:** Download from https://stockfishchess.org/download/ and set `STOCKFISH_BINARY_PATH` in `.env`.

## Setup

1. Copy environment file and fill in values:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run database migration (requires PostgreSQL running):
   ```bash
   npm run db:migrate
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

Server starts at `http://localhost:3001`.

## API Endpoints

- `POST /api/auth/register` — Register new account
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user
- `POST /api/games` — Start new game
- `GET /api/games` — List completed games
- `GET /api/games/:id` — Get game details
- `GET /api/games/:id/analysis` — Get post-game analysis
- `POST /api/games/:id/analysis/retry` — Retry failed analysis
- `GET /api/users/me/stats` — Get player statistics
- `PATCH /api/users/me` — Update profile settings
- `GET /api/health` — Health check

## WebSocket Events

Connect with JWT: `{ auth: { token: '<jwt>' } }`

- Emit `move` → `{ gameId, move: 'e2e4', timeSpentMs? }`
- Listen `move_result` → `{ playerMove, playerFen, aiMove, aiFen, gameOver, result }`
- Listen `game_over` → `{ result: 'win'|'loss'|'draw' }`
- Emit `rejoin_game` → `{ gameId }` to reconnect after disconnect
- Listen `game_state` → full game state for recovery

## Tests

```bash
npm test
npm run test:coverage
```
