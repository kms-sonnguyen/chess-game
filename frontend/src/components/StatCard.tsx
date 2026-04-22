interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
}

export function StatCard({ label, value, subtext }: StatCardProps) {
  return (
    <div style={{ background: '#1a1a2e', borderRadius: 8, padding: '12px 16px', textAlign: 'center', minWidth: 100 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#888', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{value}</div>
      {subtext && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{subtext}</div>}
    </div>
  );
}
