import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { listGames, startGame } from '../api/games';
import { getStats } from '../api/users';
import { useAuthStore } from '../store/authStore';
import { EloChart } from '../components/EloChart';
import { GameSummary, UserStats } from '../types';

export function Profile() {
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    listGames().then(setGames).catch(console.error);
    getStats().then(setStats).catch(console.error);
  }, []);

  async function handlePlay() {
    setStarting(true);
    const { gameId } = await startGame();
    navigate(`/game/${gameId}`);
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <button onClick={() => navigate('/')}>← Back</button>
        <button onClick={handlePlay} disabled={starting} style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          {starting ? '...' : '▶ Play Now'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
        {/* Left: user summary */}
        <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 16, minWidth: 160 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{user?.displayName ?? user?.email}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#4f46e5', marginBottom: 4 }}>{user?.elo}</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>ELO Rating</div>
          <div style={{ fontSize: 13, color: '#ccc' }}>{stats?.gamesPlayed ?? 0} games</div>
          <div style={{ fontSize: 13, color: '#ccc' }}>{stats?.wins}W · {stats?.losses}L · {stats?.draws}D</div>
          <div style={{ fontSize: 13, color: '#ccc' }}>Win rate: {stats?.winRate ?? 0}%</div>
          <div style={{ fontSize: 13, color: '#ccc', marginTop: 4 }}>Avg accuracy: {stats?.avgAccuracy ?? '–'}%</div>
        </div>

        {/* Right: ELO chart + strengths */}
        <div style={{ flex: 1 }}>
          <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>ELO Progress</div>
            <EloChart games={games} />
          </div>
          <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#4ade80', marginBottom: 6 }}>Strengths</div>
                {[['Opening', stats?.avgOpeningScore], ['Endgame', stats?.avgEndgameScore]]
                  .filter(([, v]) => v !== null && (v as number) >= 75)
                  .map(([label, val]) => (
                    <div key={label as string} style={{ fontSize: 13, color: '#ccc' }}>✓ {label} {val}%</div>
                  ))}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#fb923c', marginBottom: 6 }}>Needs Work</div>
                {[['Middlegame', stats?.avgMiddlegameScore], ['Tactics', stats?.avgTacticsScore]]
                  .filter(([, v]) => v !== null && (v as number) < 75)
                  .map(([label, val]) => (
                    <div key={label as string} style={{ fontSize: 13, color: '#ccc' }}>⚠ {label} {val}%</div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game history */}
      <h3 style={{ marginBottom: 12 }}>Game History</h3>
      {games.map(game => (
        <Link to={`/review/${game.id}`} key={game.id} style={{ textDecoration: 'none' }}>
          <div style={{ padding: '12px 16px', background: '#1a1a2e', borderRadius: 8, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: game.result === 'win' ? '#4ade80' : game.result === 'loss' ? '#f87171' : '#888', fontWeight: 600 }}>
                {game.result === 'win' ? '✓ Won' : game.result === 'loss' ? '✗ Lost' : '– Draw'}
              </span>
              <span style={{ color: '#888', fontSize: 12 }}>vs AI Skill {game.aiSkillLevel} · {game.totalMoves} moves · {game.analysis?.accuracyPct ?? '–'}% acc</span>
              <span style={{ color: game.result === 'win' ? '#4ade80' : '#f87171' }}>
                {game.userEloAfter && game.userEloBefore ? `${game.userEloAfter - game.userEloBefore > 0 ? '+' : ''}${game.userEloAfter - game.userEloBefore}` : ''}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#555' }}>
              {game.openingName ?? 'Unknown opening'} · {new Date(game.timeStarted).toLocaleDateString()}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
