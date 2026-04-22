import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { startGame, listGames } from '../api/games';
import { useAuthStore } from '../store/authStore';
import { StatCard } from '../components/StatCard';
import { GameSummary } from '../types';

export function Home() {
  const user = useAuthStore(s => s.user);
  const clearAuth = useAuthStore(s => s.clearAuth);
  const navigate = useNavigate();
  const [recentGames, setRecentGames] = useState<GameSummary[]>([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    listGames().then(setRecentGames).catch(console.error);
  }, []);

  async function handlePlay() {
    setStarting(true);
    try {
      const { gameId } = await startGame();
      navigate(`/game/${gameId}`);
    } catch (err) {
      setStarting(false);
    }
  }

  const winRate = user && user.gamesPlayed > 0
    ? Math.round((user.wins / user.gamesPlayed) * 100)
    : 0;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <span style={{ fontSize: 20, fontWeight: 700 }}>♟ ChessMate</span>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/profile">Profile</Link>
          <Link to="/settings">Settings</Link>
          <button onClick={() => { clearAuth(); navigate('/login'); }} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>

      {/* Play CTA */}
      <button
        onClick={handlePlay}
        disabled={starting}
        style={{ width: '100%', padding: '20px 0', fontSize: 20, fontWeight: 700, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', marginBottom: 24 }}
      >
        {starting ? 'Starting game...' : '♟  PLAY NOW  ♟'}
      </button>

      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <StatCard label="ELO" value={user?.elo ?? '–'} />
        <StatCard label="Win Rate" value={`${winRate}%`} subtext={`${user?.wins}W ${user?.losses}L ${user?.draws}D`} />
        <StatCard label="Games" value={user?.gamesPlayed ?? 0} />
      </div>

      {/* Recent games */}
      {recentGames.length > 0 && (
        <div>
          <h3 style={{ marginBottom: 12 }}>Recent Games</h3>
          {recentGames.slice(0, 5).map(game => (
            <Link to={`/review/${game.id}`} key={game.id} style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#1a1a2e', borderRadius: 8, marginBottom: 8, color: '#ccc' }}>
                <span style={{ color: game.result === 'win' ? '#4ade80' : game.result === 'loss' ? '#f87171' : '#888' }}>
                  {game.result === 'win' ? '✓ Won' : game.result === 'loss' ? '✗ Lost' : '– Draw'}
                </span>
                <span>vs AI Skill {game.aiSkillLevel}</span>
                <span style={{ color: game.result === 'win' ? '#4ade80' : '#f87171' }}>
                  {game.userEloAfter && game.userEloBefore
                    ? `${game.userEloAfter - game.userEloBefore > 0 ? '+' : ''}${game.userEloAfter - game.userEloBefore} ELO`
                    : ''}
                </span>
                <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
