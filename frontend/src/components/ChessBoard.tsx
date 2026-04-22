import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useState } from 'react';

interface ChessBoardProps {
  fen: string;
  disabled: boolean;
  onMove: (uciMove: string) => void;
}

export function ChessBoard({ fen, disabled, onMove }: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const chess = new Chess(fen);

  // Compute legal move highlights
  const legalMoveSquares: Record<string, { background: string }> = {};
  if (selectedSquare) {
    const moves = chess.moves({ square: selectedSquare as any, verbose: true });
    moves.forEach(m => {
      legalMoveSquares[m.to] = { background: 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)' };
    });
  }

  function onSquareClick(square: string) {
    if (disabled) return;
    if (selectedSquare) {
      const move = chess.move({ from: selectedSquare, to: square, promotion: 'q' });
      if (move) {
        onMove(`${selectedSquare}${square}${move.promotion ?? ''}`);
        setSelectedSquare(null);
        return;
      }
      setSelectedSquare(null);
    }
    const piece = chess.get(square as any);
    if (piece && piece.color === chess.turn()) setSelectedSquare(square);
  }

  function onPieceDrop(sourceSquare: string, targetSquare: string): boolean {
    if (disabled) return false;
    const chess2 = new Chess(fen);
    const move = chess2.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    if (!move) return false;
    onMove(`${sourceSquare}${targetSquare}${move.promotion ?? ''}`);
    return true;
  }

  return (
    <Chessboard
      position={fen}
      onSquareClick={onSquareClick}
      onPieceDrop={onPieceDrop}
      customSquareStyles={legalMoveSquares}
      boardWidth={Math.min(typeof window !== 'undefined' ? window.innerWidth - 48 : 480, 480)}
      arePiecesDraggable={!disabled}
    />
  );
}
