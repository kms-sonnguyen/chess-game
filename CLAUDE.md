# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (`backend/`)
```bash
npm run dev          # start with hot-reload (tsx watch)
npm run build        # tsc compile to dist/
npm test             # run all tests (requires JWT_SECRET env var)
npx vitest run tests/auth.test.ts   # run a single test file
npm run db:migrate   # apply schema changes (dev)
npm run db:generate  # regenerate Prisma client after schema edit
```

Backend tests require `JWT_SECRET` to be set. Use a `.env` file copied from `.env.example`, or prefix with `JWT_SECRET=test`:
```bash
JWT_SECRET=test npx vitest run
```

### Frontend (`frontend/`)
```bash
npm run dev          # Vite dev server on :5173
npm run build        # tsc + Vite production build
npx vitest run tests/gameStore.test.ts   # run a single test file
```

Frontend uses Vitest. The rolldown native binary requires Node 22+; on Node 20 the test runner will crash. Run tests from within `frontend/` with `npx vitest run` if `npm test` fails.

### Required environment (backend)
Copy `backend/.env.example` to `backend/.env`. Stockfish must be installed separately:
- macOS: `brew install stockfish` → binary at `/usr/local/bin/stockfish`
- Linux: `apt install stockfish` → binary at `/usr/bin/stockfish`

## Architecture

This is a **monorepo** with two separate npm workspaces: `backend/` (Express + Socket.IO + Prisma) and `frontend/` (React + Vite + Zustand). There is no shared package; types are duplicated.

### Data flow for a game move

1. **Frontend** sends `move` event over WebSocket (`frontend/src/socket/gameSocket.ts`)
2. **`moves.socket.ts`** receives it, calls `movesService.applyMove()`
3. **`moves.service.ts`** replays the full move history from DB via `chess.js` to reconstruct the board (no FEN stored as source of truth mid-game — moves are canonical)
4. After the player move is validated and saved, Stockfish is queried via **`stockfish/pool.ts`** for the AI reply
5. The AI move is saved and the result is emitted back to the client as `move_result`
6. On game over, `triggerAnalysis()` fires asynchronously — `analysis.service.ts` re-evaluates every player position with Stockfish at higher depth

### Stockfish integration

`StockfishPool` manages N worker processes (`STOCKFISH_POOL_SIZE`, default 4). `StockfishWorker` spawns `stockfish` as a child process and communicates via UCI protocol over stdin/stdout. Moves use priority `'high'` (front of queue); post-game analysis uses `'low'` (back of queue).

### Adaptive difficulty

Player ELO maps to a `(skill, depth)` pair in `adaptive/difficulty.ts`. `softAdaptStreak` tracks in-memory win/loss streaks per user session and temporarily bumps or drops the AI tier without changing the user's persistent ELO. ELO itself is updated via standard K=32 Elo formula after each game, with `aiVirtualElo(skill)` used as the opponent rating.

### Frontend state

- **`authStore`** (Zustand + persist): JWT token and user object, persisted to localStorage under key `chess-auth`
- **`gameStore`** (Zustand, ephemeral): live game state — FEN, move list, turn status. Populated by WebSocket events; `recoverFromServer` handles reconnection
- All REST calls go through `api/client.ts` (axios), which injects the JWT from authStore automatically

### WebSocket reconnection

The socket has `reconnectionAttempts: 10`. On reconnect, the frontend emits `rejoin_game` → backend responds with `game_state` containing full move history and current FEN, which `recoverFromServer` applies to the store. If a user disconnects without rejoining, a 5-minute timer in `moves.socket.ts` marks the game as `abandoned`.

### Database schema key points

- Moves are stored in UCI notation (e.g. `e2e4`) as half-moves (ply), 1-indexed. Move 1 = player, move 2 = AI, etc.
- `Analysis` is a 1:1 relation to `Game`, written asynchronously after game completion with `status: pending | completed | failed`
- User ELO floor is 100 (enforced in `moves.service.ts`)
