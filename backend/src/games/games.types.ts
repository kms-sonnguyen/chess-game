export interface StartGameResult {
  gameId: string;
  aiSkillLevel: number;
  aiDepth: number;
  userEloBefore: number;
}

export interface GameState {
  id: string;
  status: string;
  result: string | null;
  moves: { moveNumber: number; move: string; fenAfter: string }[];
  aiSkillLevel: number;
  timeStarted: Date;
}
