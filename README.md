# Chess Game

A full-stack chess application where players compete against a Stockfish AI engine. The AI adapts to the player's ELO rating, and post-game analysis provides move-by-move feedback powered by Stockfish.

## Stack

- **Frontend**: React 19 + Vite, Zustand, react-chessboard, Socket.IO client
- **Backend**: Express, Socket.IO, Prisma (PostgreSQL), Stockfish (via child process)

## Prerequisites

- Node.js 22+
- PostgreSQL
- Stockfish installed and on PATH
  - macOS: `brew install stockfish`
  - Linux: `apt install stockfish`

## Setup

```bash
# Backend
cd backend
cp .env.example .env    # fill in DATABASE_URL and JWT_SECRET
npm install
npm run db:migrate
npm run dev             # :3001

# Frontend (separate terminal)
cd frontend
npm install
npm run dev             # :5173
```

## Features

- **Adaptive AI difficulty** — Stockfish skill/depth adjusts to your ELO. Win streaks temporarily increase difficulty; losing streaks reduce it, without permanently affecting your rating.
- **Real-time gameplay** — Moves are sent over WebSocket. The session auto-recovers on reconnection; a 5-minute disconnect results in the game being marked abandoned.
- **Post-game analysis** — After each game, Stockfish re-evaluates every player move (depth 15–18) and classifies each as best/good/inaccuracy/mistake/blunder with an overall accuracy percentage.
- **ELO system** — Standard K=32 Elo formula against a virtual opponent rating derived from the AI skill level. ELO floor is 100.

## Project Structure

```
chess-game/
├── backend/
│   ├── src/
│   │   ├── adaptive/      # ELO ↔ skill mapping, streak adaptation
│   │   ├── analysis/      # Post-game Stockfish analysis
│   │   ├── auth/          # JWT auth
│   │   ├── games/         # Game creation and retrieval
│   │   ├── moves/         # Move validation, AI replies, WebSocket handlers
│   │   ├── stockfish/     # Worker pool, UCI protocol
│   │   └── users/         # Profile and settings
│   ├── prisma/schema.prisma
│   └── tests/
└── frontend/
    ├── src/
    │   ├── api/           # Axios client + REST calls
    │   ├── components/    # Reusable UI components
    │   ├── pages/         # Route-level pages
    │   ├── socket/        # WebSocket connection and event emitters
    │   └── store/         # Zustand stores (auth, game state)
    └── tests/
```
