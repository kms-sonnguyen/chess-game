interface PhaseBarProps {
  label: string;
  pct: number | null;
}

export function PhaseBar({ label, pct }: PhaseBarProps) {
  const value = pct ?? 0;
  const color = value >= 85 ? '#4ade80' : value >= 70 ? '#fb923c' : '#f87171';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <span style={{ width: 90, fontSize: 13, color: '#ccc' }}>{label}</span>
      <div style={{ flex: 1, background: '#0f0f1a', borderRadius: 4, height: 10 }}>
        <div style={{ width: `${value}%`, background: color, borderRadius: 4, height: 10 }} />
      </div>
      <span style={{ fontSize: 13, color, width: 36, textAlign: 'right' }}>{pct ?? '–'}%</span>
    </div>
  );
}
