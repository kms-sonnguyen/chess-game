const ELO_TIERS = [
  { maxElo: 400,  skill: 0,  depth: 4  },
  { maxElo: 600,  skill: 1,  depth: 5  },
  { maxElo: 800,  skill: 3,  depth: 7  },
  { maxElo: 1000, skill: 5,  depth: 10 },
  { maxElo: 1200, skill: 8,  depth: 12 },
  { maxElo: 1400, skill: 12, depth: 14 },
  { maxElo: 1600, skill: 15, depth: 16 },
  { maxElo: Infinity, skill: 18, depth: 18 },
];

export function eloToSkill(elo: number): { skill: number; depth: number } {
  const tier = ELO_TIERS.find(t => elo < t.maxElo)!;
  return { skill: tier.skill, depth: tier.depth };
}

export function aiVirtualElo(skill: number): number {
  return skill * 150 + 200;
}

export function computeEloChange(
  playerElo: number,
  opponentElo: number,
  result: 'win' | 'loss' | 'draw'
): number {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
  return Math.round(K * (score - expected));
}

// In-memory soft adaptation per user session (keyed by userId)
const sessionStreaks = new Map<string, number>();

export function softAdaptStreak(userId: string, result: 'win' | 'loss' | 'draw'): number {
  const current = sessionStreaks.get(userId) ?? 0;
  let next = result === 'win' ? current + 1 : result === 'loss' ? current - 1 : 0;
  sessionStreaks.set(userId, next);
  return next;
}

export function getSkillWithSoftAdapt(userId: string, baseElo: number): { skill: number; depth: number } {
  const streak = sessionStreaks.get(userId) ?? 0;
  let adjustedElo = baseElo;
  if (streak >= 2) adjustedElo += 200;       // bump one tier
  if (streak <= -2) adjustedElo = Math.max(0, adjustedElo - 200); // drop one tier
  return eloToSkill(adjustedElo);
}

export function clearSessionStreak(userId: string) {
  sessionStreaks.delete(userId);
}
