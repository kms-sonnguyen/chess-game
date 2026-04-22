import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAnalysis, retryAnalysis } from '../api/analysis';
import { getGame } from '../api/games';
import { useAuthStore } from '../store/authStore';
import { StatCard } from '../components/StatCard';
import { PhaseBar } from '../components/PhaseBar';
import { KeyMoment } from '../components/KeyMoment';
import { Analysis, GameState } from '../types';

export function Review() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!gameId) return;
    getGame(gameId).then(setGame).catch(console.error);
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !polling) return;
    const interval = setInterval(async () => {
      try {
        const data = await getAnalysis(gameId);
        setAnalysis(data);
        if (data.status === 'completed' || data.status === 'failed') {
          setPolling(false);
          clearInterval(interval);
        }
      } catch {
        setPolling(false);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [gameId, polling]);

  const isBeginner = (user?.isBeginner ?? false) || (user?.elo ?? 999) < 600;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <button onClick={() => navigate('/')}>← Home</button>
        <span style={{ fontWeight: 700 }}>
          Game Review · {game?.result === 'win' ? '✓ You Won' : game?.result === 'loss' ? '✗ You Lost' : '– Draw'}
        </span>
      </div>

      {polling && analysis?.status !== 'completed' && (
        <div style={{ padding: 16, background: '#1a1a2e', borderRadius: 8, marginBottom: 16, textAlign: 'center', color: '#888' }}>
          Analyzing your game... (this takes 10–30 seconds)
        </div>
      )}

      {analysis?.status === 'failed' && (
        <div style={{ padding: 16, background: '#1a1a2e', borderRadius: 8, marginBottom: 16, textAlign: 'center' }}>
          <span style={{ color: '#f87171' }}>Analysis failed. </span>
          <button onClick={() => { retryAnalysis(gameId!); setPolling(true); }}>Try again</button>
        </div>
      )}

      {analysis?.status === 'completed' && (
        <>
          {/* Score cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <StatCard label="Accuracy" value={`${analysis.accuracyPct ?? '–'}%`} />
            <StatCard label={isBeginner ? 'Tough Moves' : 'Blunders'} value={analysis.blunders ?? '–'} />
            <StatCard label="Mistakes" value={analysis.mistakes ?? '–'} />
            <StatCard label="Best Moves" value={analysis.bestMovesCount ?? '–'} />
          </div>

          {/* Phase performance */}
          <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#888', marginBottom: 12 }}>Phase Performance</div>
            <PhaseBar label="Opening" pct={analysis.openingScorePct} />
            <PhaseBar label="Middlegame" pct={analysis.middlegameScorePct} />
            <PhaseBar label="Endgame" pct={analysis.endgameScorePct} />
          </div>

          {/* Key moments */}
          {analysis.keyMoments && analysis.keyMoments.length > 0 && (
            <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#888', marginBottom: 12 }}>Key Moments</div>
              {analysis.keyMoments.map((km, i) => (
                <KeyMoment key={i} moveNumber={km.moveNumber} type={km.type} description={km.description} isBeginner={isBeginner} />
              ))}
            </div>
          )}

          {/* Focus tip */}
          {analysis.improvementTip && (
            <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 16, border: '1px solid #2d2d4e' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#888', marginBottom: 8 }}>Focus for Next Game</div>
              <p style={{ margin: 0, color: '#ccc', fontSize: 13 }}>{analysis.improvementTip}</p>
            </div>
          )}
        </>
      )}

      <button
        onClick={() => navigate('/')}
        style={{ width: '100%', marginTop: 20, padding: 12, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15, fontWeight: 600 }}
      >
        ▶ Play Again
      </button>
    </div>
  );
}
