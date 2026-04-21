# Chess Game vs AI — Design Spec
**Date:** 2026-04-21  
**Status:** Approved

---

## Overview

A web app where users play chess against an AI opponent matched to their skill level. The AI adapts over time to keep games competitive. After each game, a comprehensive review helps the user understand where they can improve. Designed to be beginner and kid-friendly at the low end, while scaling up to intermediate/advanced players.

---

## Architecture

### Two-App Structure

**Frontend** — React + Vite SPA  
- Deployed to Vercel (or any static host)
- Communicates with backend via REST API + Socket.io WebSocket

**Backend** — Express + Node.js server  
- Runs on a VPS (Railway / DigitalOcean) or Mac Mini M4 (short-term)
- Manages auth, game logic, Stockfish worker pool, analysis, and PostgreSQL

```
Browser (React SPA)
    ↕ REST API + WebSocket (Socket.io)
Backend (Express + Node.js)
    ├── Auth service         (JWT-based)
    ├── Game service         (move validation via chess.js)
    ├── Stockfish pool       (4–16 persistent worker processes)
    ├── Analysis service     (post-game async review)
    └── PostgreSQL           (via Prisma ORM)
```

### Key Libraries

| Layer | Library | Purpose |
|-------|---------|---------|
| Frontend | `react-chessboard` | Board UI component |
| Frontend | `chess.js` | Move validation, game state |
| Frontend | `socket.io-client` | Real-time move communication |
| Backend | `stockfish` (npm) | Wraps native Stockfish binary |
| Backend | `chess.js` | Server-side move validation |
| Backend | `prisma` | PostgreSQL ORM |
| Backend | `socket.io` | WebSocket server |
| Backend | `jsonwebtoken` | JWT auth |

### Stockfish Platform Setup

Stockfish is a native binary — the path and installation differ by OS. The backend detects the platform at startup and resolves the binary path automatically:

```js
// Resolved in order: env var → platform default → error
const STOCKFISH_BINARY = process.env.STOCKFISH_BINARY_PATH ?? platformDefault();

function platformDefault() {
  switch (process.platform) {
    case 'darwin': return '/usr/local/bin/stockfish';   // macOS (Homebrew)
    case 'linux':  return '/usr/bin/stockfish';          // Linux (apt)
    case 'win32':  return 'C:\\stockfish\\stockfish.exe'; // Windows
    default: throw new Error('Unsupported platform — set STOCKFISH_BINARY_PATH');
  }
}
```

**Setup instructions per OS:**
- **macOS**: `brew install stockfish`
- **Linux**: `apt install stockfish` (or download binary from stockfishchess.org)
- **Windows**: Download `stockfish-windows-x86-64.exe` from stockfishchess.org, place at `C:\stockfish\`
- **Stockfish version**: Pin to **Stockfish 16** (stable). Document in `README.md`. Update via `STOCKFISH_VERSION` env var for future upgrades.

### WebSocket: Reconnection & Recovery

Connection drops mid-game are handled with a defined recovery protocol:

**Client-side (Socket.io auto-reconnect):**
- Socket.io client is configured with `reconnection: true`, `reconnectionAttempts: 10`, `reconnectionDelay: 1000ms`
- While disconnected, board is locked (no moves accepted) and a "Reconnecting..." overlay is shown
- On reconnect, client emits `rejoin_game` with `{ gameId, userId, lastMoveNumber }` to re-sync state

**Server-side recovery:**
- On `rejoin_game`, server responds with the full current game state (FEN + full move list from DB) — client replays from there
- If the AI made a move while client was disconnected, it is included in the recovery payload
- Game state is persisted to DB on every move — no in-memory-only state

**Timeout & abandonment:**
- If client is disconnected for **>5 minutes** mid-game, the game is marked `status = 'abandoned'` — no ELO change
- If client is disconnected for **<5 minutes** and reconnects, game resumes normally
- Server-side `setTimeout` per game, cleared on `rejoin_game` or game end

**Move conflict resolution:**
- Server is the source of truth. Client move is only applied after server ACK
- If client sends a move and disconnects before ACK, on reconnect the server state wins — client re-syncs from DB

### Rate Limiting & Abuse Protection

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/auth/register` | 5 requests | 15 min per IP |
| `POST /api/auth/login` | 10 requests | 15 min per IP |
| `POST /api/games` | 20 requests | 1 hour per user |
| `GET /api/games/:id/analysis` | 30 requests | 1 min per user |
| WebSocket connections | 5 concurrent | per user |
| WebSocket move events | 60 events | 1 min per connection |

**Implementation:** `express-rate-limit` for REST endpoints; custom Socket.io middleware for WebSocket rate limiting.

---

## Adaptive Difficulty System

### Internal ELO Rating
- New users start at ELO **200** if they select "Beginner / I'm new", otherwise **800**
- ELO updates after every game using standard ELO formula (K=32)
- ELO is stored server-side and never exposed to manipulation

### AI Virtual ELO Mapping

For ELO calculation purposes, each Stockfish skill level maps to a virtual opponent ELO:

| Stockfish Skill | Virtual Opponent ELO | Formula |
|-----------------|---------------------|---------|
| 0 | 200 | `skill * 150 + 200` |
| 1 | 350 | |
| 3 | 650 | |
| 5 | 950 | |
| 8 | 1400 | |
| 12 | 2000 | |
| 15 | 2450 | |
| 18 | 2900 | |

ELO delta = `K * (score - expected)` where `expected = 1 / (1 + 10^((opponentElo - playerElo)/400))`.

### AI Strength Mapping (Player ELO → Stockfish)

| Player ELO | Stockfish Skill (0–20) | Search Depth | Notes |
|------------|----------------------|--------------|-------|
| < 400 | 0 | 4 | Intentionally makes mistakes — genuinely beatable for kids |
| 400–600 | 1 | 5 | Learning tier |
| 600–800 | 3 | 7 | |
| 800–1000 | 5 | 10 | Default starting tier |
| 1000–1200 | 8 | 12 | |
| 1200–1400 | 12 | 14 | |
| 1400–1600 | 15 | 16 | |
| 1600+ | 18 | 18 | |

### Soft Adaptation (per-session, resets on logout)

- Tracks a `sessionStreak` counter (in-memory, not persisted): `+1` on win, `-1` on loss, reset to 0 on draw
- `sessionStreak >= +2` → next game bumps one tier up (does not change ELO)
- `sessionStreak <= -2` → next game drops one tier down (does not change ELO)
- Resets to 0 when the tier shifts, or when the session ends (logout / browser close)
- **After a break** (>24h since last game): soft adaptation resets; user plays at their confirmed ELO tier

### Beginner / Kid-Friendly Features
- **Onboarding mode**: new players or self-identified beginners start at ELO 200
- **Hint button**: 1 hint per game (shallow Stockfish depth), highlights a candidate move
- **Positive review language**: "Here's a move that could have been even stronger!" not "Blunder"
- **Clock off by default**: no time pressure for new players; optional for experienced ones

---

## Stockfish Worker Pool

Single Stockfish process is a bottleneck under concurrent load. The backend manages a pool:

```
Incoming requests
       ↓
  Worker Pool Manager
  ├── Stockfish Worker #1  (busy: live move calculation)
  ├── Stockfish Worker #2  (busy: post-game analysis)
  ├── Stockfish Worker #3  (idle)
  └── Queue: [pending requests...]
```

- **Default pool size**: 4 workers (configurable via env var `STOCKFISH_POOL_SIZE`)
- **Mac Mini M4**: safely runs 8–16 workers (handles ~50 concurrent players)
- Live move requests take priority over post-game analysis requests
- Each worker is a persistent Node.js child process — no cold starts

---

## Data Model

```sql
users
  id            UUID PRIMARY KEY
  email         TEXT UNIQUE NOT NULL
  password_hash TEXT NOT NULL
  display_name  TEXT
  elo           INTEGER DEFAULT 800
  is_beginner   BOOLEAN DEFAULT false  -- set during onboarding; enables positive review language
  games_played  INTEGER DEFAULT 0
  wins          INTEGER DEFAULT 0
  losses        INTEGER DEFAULT 0
  draws         INTEGER DEFAULT 0
  clock_enabled BOOLEAN DEFAULT false  -- user preference: clock on/off
  theme         TEXT DEFAULT 'dark'    -- 'dark' | 'light'
  created_at    TIMESTAMP

games
  id              UUID PRIMARY KEY
  user_id         UUID REFERENCES users(id)
  status          TEXT NOT NULL DEFAULT 'ongoing'
                  -- ENUM: 'ongoing' | 'completed' | 'abandoned'
  result          TEXT                             -- 'win' | 'loss' | 'draw' | NULL if ongoing
  opening_name    TEXT                             -- ECO detection from first 10 moves
  total_moves     INTEGER
  user_elo_before INTEGER
  user_elo_after  INTEGER
  ai_skill_level  INTEGER
  ai_depth        INTEGER
  time_started    TIMESTAMP NOT NULL DEFAULT NOW()
  time_ended      TIMESTAMP                        -- NULL while ongoing

moves
  id            UUID PRIMARY KEY
  game_id       UUID REFERENCES games(id)
  move_number   INTEGER   -- 1-indexed, counts half-moves (ply):
                          -- move 1 = White's first move, move 2 = Black's first reply
  move          TEXT      -- UCI notation e.g. "e2e4"
  fen_after     TEXT      -- full board state snapshot after this move
  time_spent_ms INTEGER

analysis
  id                   UUID PRIMARY KEY
  game_id              UUID REFERENCES games(id) UNIQUE
  status               TEXT NOT NULL DEFAULT 'pending'
                       -- ENUM: 'pending' | 'completed' | 'failed'
  accuracy_pct         INTEGER
  blunders             INTEGER
  mistakes             INTEGER
  inaccuracies         INTEGER
  best_moves_count     INTEGER
  opening_score_pct    INTEGER
  middlegame_score_pct INTEGER
  endgame_score_pct    INTEGER
  tactics_score_pct    INTEGER  -- % of tactical opportunities correctly handled
  key_moments          JSONB    -- [{move_number, type: 'great'|'blunder'|'notable', description}]
  improvement_tip      TEXT     -- one personalized focus area
  error_message        TEXT     -- populated if status = 'failed'
  generated_at         TIMESTAMP
```

**Notes:**
- `moves.move_number` is **1-indexed half-moves (ply)**: move 1 = White's first move, move 2 = Black's first reply, etc.
- `moves.fen_after` enables replaying any position without recalculation
- `analysis.status` starts as `'pending'` immediately when game ends; transitions to `'completed'` or `'failed'`
- `games.opening_name` detected against ECO opening database from first ~10 moves

---

## UI Design

### Screen 1: Home / Dashboard

**Layout:** Hybrid — Play CTA dominant, compact stats strip below, recent games list

```
┌─────────────────────────────────────┐
│  ♟ ChessMate              [Son ▾]  │
├─────────────────────────────────────┤
│                                     │
│     ┌───────────────────────────┐   │
│     │      ♟  PLAY NOW  ♟      │   │  ← primary CTA, visually dominant
│     └───────────────────────────┘   │
│                                     │
│  ELO: 1042  │ Accuracy: 84% │ 62%W  │  ← compact 3-stat strip
│                                     │
│  ── Recent Games ───────────────    │
│  ✓ Won  vs AI-Skill 8  +12 ELO  →  │
│  ✗ Lost vs AI-Skill 9   -8 ELO  →  │
│  ✓ Won  vs AI-Skill 7  +10 ELO  →  │
│                                     │
│  📌 Focus: Middlegame tactics       │  ← latest improvement tip
└─────────────────────────────────────┘
```

### Screen 2: Game Screen

**Layout:** Responsive — board-centered on mobile, sidebar + move list on desktop

**Mobile / tablet:**
```
┌─────────────────────────────┐
│ ← Back    ♟ ChessMate       │
├─────────────────────────────┤
│ 🤖 AI Skill 8    ⏱ 12:34   │
├─────────────────────────────┤
│   ┌─────────────────────┐   │
│   │                     │   │
│   │   BOARD (square)    │   │
│   │                     │   │
│   └─────────────────────┘   │
│ 🙂 You (ELO 1042) ⏱ 08:51  │
├─────────────────────────────┤
│ Moves: e4 e5 Nf3 Nc6 Bb5…  │
├──────────────┬──────────────┤
│  [💡 Hint]   │  [⚑ Resign]  │
└──────────────┴──────────────┘
```

**Desktop (≥1024px):** Board centered, move list sidebar appears on right

**Interaction specs:**
- Drag-and-drop piece movement (with click-to-move fallback)
- Legal move highlights on piece selection (dots on valid squares)
- Last move highlighted on board
- Hint: highlights suggested square with a glow effect, uses 1 of 1 available hints
- Clock is optional, disabled by default for beginners

**Error states:**
- **Network disconnect mid-game**: board locks, "Reconnecting..." overlay shown with spinner; auto-recovers on reconnect (see WebSocket Recovery section)
- **Invalid move attempt**: piece snaps back to origin square with a brief shake animation; no error message (the board enforces legality visually)
- **AI taking too long** (>8s): "AI is thinking..." spinner replaces AI clock; board remains locked; if >30s timeout, game resumes with a random legal move and logs a warning
- **Analysis generation failure**: review screen shows "Analysis failed — try again" with a retry button that re-triggers `POST /api/games/:id/analysis/retry`

**Loading states:**
- **Post-game analysis**: after game ends, review screen shows a progress indicator: "Analyzing your game... (this takes 10–30 seconds)". Frontend polls `GET /api/games/:id/analysis` every 3s until `status = 'completed'` or `'failed'`.

### Screen 3: Post-Game Review

```
┌─────────────────────────────────────────────┐
│  Game Review · You Won · +12 ELO            │
├──────────┬──────────┬───────────┬───────────┤
│ Accuracy │ Blunders │ Mistakes  │ Best Moves│
│   87%    │    1     │     2     │    34     │
├─────────────────────────────────────────────┤
│  Phase Performance                          │
│  Opening    ████████████░  92%              │
│  Middlegame ██████████░░░  78%              │
│  Endgame    █████████████  95%              │
├─────────────────────────────────────────────┤
│  Key Moments                                │
│  ▌Move 12  Great move! Nf5 put pressure...  │  ← green left border
│  ▌Move 21  Blunder — Bxf3 allowed...        │  ← red left border
│  ▌Move 34  Excellent endgame technique...   │  ← blue left border
├─────────────────────────────────────────────┤
│  Focus for Next Game                        │
│  Your middlegame could use work — you tend  │
│  to trade pieces too early...               │
└─────────────────────────────────────────────┘
```

**Board replayer** sits alongside this panel — user can step through all moves with engine eval bar.

**Beginner/kids variant:** Triggered when `users.is_beginner = true` (set during onboarding) OR `users.elo < 600`. All language is positive-framed. "Blunder" becomes "Tougher moment — here's what could have worked even better."

### Screen 4: Game History & Profile

```
┌─────────────────────────────────────────────────────────┐
│ ← Back    Son's Profile                    [▶ Play Now] │
├──────────────────┬──────────────────────────────────────┤
│  🙂 Son N.       │  ELO Progress (last 30 days)         │
│  ELO: 1042       │  [sparkline chart]                   │
│  13 games        │  980 ──────────────────────── 1042   │
│  8W · 4L · 1D    │                                      │
│  Win rate: 62%   │  Strengths        Needs Work         │
│  Avg acc: 84%    │  ✓ Endgame  92%  ⚠ Middlegame 74%   │
│                  │  ✓ Opening  89%  ⚠ Tactics    71%   │
├──────────────────┴──────────────────────────────────────┤
│  Game History                   [Filter ▾] [Sort ▾]    │
├─────────────────────────────────────────────────────────┤
│  ✓ Won   vs AI Skill 8 · 42 moves · 87% acc  +12  →   │
│    Sicilian Defense · Apr 21 · Middlegame: 78%          │
├─────────────────────────────────────────────────────────┤
│  ✗ Lost  vs AI Skill 9 · 31 moves · 71% acc   -8  →   │
│    Italian Game · Apr 20 · Blunder on move 21           │
└─────────────────────────────────────────────────────────┘
```

### Screen 5: Settings

Accessible via avatar menu → Settings.

```
┌─────────────────────────────────────┐
│ ← Back    Settings                  │
├─────────────────────────────────────┤
│  Gameplay                           │
│  Clock          [OFF ●────────]     │
│  Clock time     [10 min ▾]          │
│  Show hints     [ON  ────● ]        │
│  Difficulty     [Auto-adapt ▾]      │
│    (override: Manual skill 1–20)    │
├─────────────────────────────────────┤
│  Display                            │
│  Theme          [Dark ●] [Light ○]  │
│  Board style    [Classic ▾]         │
│  Piece set      [Standard ▾]        │
├─────────────────────────────────────┤
│  Sound                              │
│  Move sounds    [ON  ────● ]        │
│  Game end sound [ON  ────● ]        │
├─────────────────────────────────────┤
│  Account                            │
│  Display name   [Son N.         ]   │
│  [Change password]  [Delete account]│
└─────────────────────────────────────┘
```

Settings are persisted to the `users` table where applicable (`clock_enabled`, `theme`). Piece set and board style are stored in `localStorage` (cosmetic, no server round-trip needed).

---

## API Endpoints

### Auth
- `POST /api/auth/register` — create account
- `POST /api/auth/login` — returns JWT
- `GET  /api/auth/me` — current user profile

### Games
- `POST /api/games` — start a new game, returns game ID + AI skill level
- `GET  /api/games/:id` — get game state
- `GET  /api/games` — list user's game history (paginated)

### Moves (via WebSocket)
- `ws: move` event — client sends move in UCI notation, server validates + returns AI response move
- `ws: game_over` event — server signals end of game
- `ws: rejoin_game` event — client sends `{ gameId, lastMoveNumber }` after reconnect; server responds with full game state

### Analysis
- `GET  /api/games/:id/analysis` — returns analysis with `status` field (`pending` | `completed` | `failed`)
- `POST /api/games/:id/analysis/retry` — re-trigger analysis if status is `failed`

### User
- `GET   /api/users/me/stats` — ELO, win rate, accuracy averages, phase scores
- `PATCH /api/users/me` — update display name, clock preference, theme

---

## Deployment

| Component | Target |
|-----------|--------|
| Frontend | Vercel (free tier) |
| Backend | Mac Mini M4 (short-term) → Railway or DigitalOcean ($6–10/month) |
| Database | PostgreSQL on same server, or Supabase free tier |
| Stockfish | Stockfish 16 native binary, managed as Node child process |

**Environment variables (backend):**
```
DATABASE_URL=
JWT_SECRET=
STOCKFISH_POOL_SIZE=4
STOCKFISH_BINARY_PATH=          # optional — auto-detected by platform if unset
STOCKFISH_VERSION=16            # for documentation/validation only
FRONTEND_URL=https://your-app.vercel.app
```

### CI/CD Pipeline

- **GitHub Actions** for both repos
- **Frontend**: on push to `main` → lint → build → auto-deploy to Vercel
- **Backend**: on push to `main` → lint → tests → deploy to Railway (or SSH deploy to Mac Mini)
- **Database migrations**: `prisma migrate deploy` runs as part of backend deploy step

### Logging & Monitoring

- **Backend logging**: `pino` (structured JSON logs) — log every API request, Stockfish errors, and WebSocket events
- **Error tracking**: Sentry (free tier) on both frontend and backend
- **Uptime monitoring**: UptimeRobot (free) pings `/api/health` every 5 minutes; alerts via email on downtime
- **Health endpoint**: `GET /api/health` returns `{ status: 'ok', stockfishWorkers: N, dbConnected: true }`

### Database Backup

- **Automated daily backup** via `pg_dump` cron job (daily at 3am), stored to a local directory + synced to a cloud bucket (Backblaze B2 or S3)
- Retain last 30 daily backups
- Document restore procedure in `README.md`

---

## Out of Scope (v1)

- Multiplayer (human vs human)
- Opening explorer / study mode
- Puzzle training
- Social features (friends, leaderboard)
- Mobile native app
