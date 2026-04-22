import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { GameSummary } from '../types';

interface EloChartProps {
  games: GameSummary[];
}

export function EloChart({ games }: EloChartProps) {
  const data = games
    .filter(g => g.userEloAfter !== null)
    .slice(-20)
    .reverse()
    .map((g, i) => ({ game: i + 1, elo: g.userEloAfter }));

  if (data.length === 0) return <div style={{ color: '#555', fontSize: 13 }}>Play more games to see your ELO trend</div>;

  return (
    <ResponsiveContainer width="100%" height={80}>
      <LineChart data={data}>
        <XAxis dataKey="game" hide />
        <YAxis domain={['dataMin - 50', 'dataMax + 50']} hide />
        <Tooltip formatter={(v) => [`${v} ELO`, '']} />
        <Line type="monotone" dataKey="elo" stroke="#4f46e5" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
