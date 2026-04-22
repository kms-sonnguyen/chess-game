export interface User {
  id: string;
  email: string;
  displayName: string | null;
  elo: number;
  isBeginner: boolean;
  clockEnabled: boolean;
  theme: 'dark' | 'light';
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface GameSummary {
  id: string;
  result: 'win' | 'loss' | 'draw' | null;
  status: string;
  openingName: string | null;
  totalMoves: number | null;
  userEloBefore: number | null;
  userEloAfter: number | null;
  aiSkillLevel: number;
  timeStarted: string;
  analysis: { status: string; accuracyPct: number | null } | null;
}

export interface GameMove {
  moveNumber: number;
  move: string;
  fenAfter: string;
}

export interface GameState {
  id: string;
  status: string;
  result: string | null;
  moves: GameMove[];
  aiSkillLevel: number;
  timeStarted: string;
}

export interface MoveResult {
  playerMove: string;
  playerFen: string;
  aiMove: string | null;
  aiFen: string | null;
  gameOver: boolean;
  result: string | null;
}

export interface Analysis {
  id: string;
  gameId: string;
  status: 'pending' | 'completed' | 'failed';
  accuracyPct: number | null;
  blunders: number | null;
  mistakes: number | null;
  inaccuracies: number | null;
  bestMovesCount: number | null;
  openingScorePct: number | null;
  middlegameScorePct: number | null;
  endgameScorePct: number | null;
  tacticsScorePct: number | null;
  keyMoments: { moveNumber: number; type: 'great' | 'blunder' | 'notable'; description: string }[] | null;
  improvementTip: string | null;
}

export interface UserStats {
  elo: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  avgAccuracy: number | null;
  avgOpeningScore: number | null;
  avgMiddlegameScore: number | null;
  avgEndgameScore: number | null;
  avgTacticsScore: number | null;
}
