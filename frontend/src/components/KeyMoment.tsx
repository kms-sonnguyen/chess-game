interface KeyMomentProps {
  moveNumber: number;
  type: 'great' | 'blunder' | 'notable';
  description: string;
  isBeginner: boolean;
}

const BORDER_COLORS = { great: '#4ade80', blunder: '#f87171', notable: '#60a5fa' };
const BEGINNER_LABELS = { blunder: 'Tougher moment', great: 'Great move!', notable: 'Interesting moment' };

export function KeyMoment({ moveNumber, type, description, isBeginner }: KeyMomentProps) {
  const label = isBeginner ? BEGINNER_LABELS[type] : type.charAt(0).toUpperCase() + type.slice(1);
  return (
    <div style={{ display: 'flex', gap: 10, padding: 8, background: '#0f0f1a', borderRadius: 6, borderLeft: `3px solid ${BORDER_COLORS[type]}`, marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap', paddingTop: 2 }}>Move {moveNumber}</span>
      <div>
        <span style={{ fontSize: 12, color: BORDER_COLORS[type], fontWeight: 600 }}>{label} — </span>
        <span style={{ fontSize: 13, color: '#ccc' }}>{description}</span>
      </div>
    </div>
  );
}
