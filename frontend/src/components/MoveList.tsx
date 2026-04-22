import type { GameMove } from '../types';

interface MoveListProps {
  moves: GameMove[];
  onSelectMove?: (index: number) => void;
}

export function MoveList({ moves, onSelectMove }: MoveListProps) {
  // Group into pairs (White move + Black move)
  const pairs: { number: number; white: string; black?: string }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i].move,
      black: moves[i + 1]?.move,
    });
  }

  return (
    <div style={{ height: 200, overflowY: 'auto', background: '#0f0f1a', borderRadius: 8, padding: 8 }}>
      {pairs.map(pair => (
        <div key={pair.number} style={{ display: 'flex', gap: 8, padding: '2px 4px', fontSize: 13 }}>
          <span style={{ color: '#555', width: 24 }}>{pair.number}.</span>
          <span style={{ cursor: 'pointer', color: '#ccc', minWidth: 50 }} onClick={() => onSelectMove?.(pair.number * 2 - 2)}>{pair.white}</span>
          {pair.black && <span style={{ cursor: 'pointer', color: '#ccc' }} onClick={() => onSelectMove?.(pair.number * 2 - 1)}>{pair.black}</span>}
        </div>
      ))}
    </div>
  );
}
