import { useEffect, useMemo } from 'react';
import { formatTime } from '../../utils/progression';

const COLORS = ['#FF9933', '#138808', '#FFD700', '#ffffff', '#ff4444', '#4488ff', '#ff66cc'];

function ConfettiPiece({ index }: { index: number }) {
  const style = useMemo(() => ({
    left: `${(index * 17 + 7) % 100}%`,
    animationDelay: `${(index % 10) * 0.12}s`,
    animationDuration: `${2.2 + (index % 5) * 0.3}s`,
    backgroundColor: COLORS[index % COLORS.length],
    width: `${6 + (index % 4) * 3}px`,
    height: `${8 + (index % 3) * 4}px`,
  }), [index]);

  return <div className="confetti-piece" style={style} />;
}

export function FinishCelebration({
  finishTimeMs,
  mapName,
  onComplete,
}: {
  finishTimeMs: number;
  mapName?: string;
  onComplete: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 4500);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 60 }).map((_, i) => (
          <ConfettiPiece key={i} index={i} />
        ))}
      </div>

      <div className="relative text-center animate-bounce-in px-6 py-8 rounded-2xl bg-black/75 border border-saffron/40 backdrop-blur-md shadow-2xl">
        <div className="text-6xl mb-2">🏁</div>
        <h2 className="text-4xl font-display font-bold text-saffron mb-1">FINISH!</h2>
        <p className="text-xl text-white font-semibold mb-1">You Made It!</p>
        {mapName && <p className="text-sm text-gray-400 mb-3">{mapName}</p>}
        <div className="text-3xl font-display font-bold text-game-gold">{formatTime(finishTimeMs)}</div>
        <p className="text-xs text-gray-500 mt-2">Great drive — on time!</p>
      </div>

      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.6; }
        }
        @keyframes bounce-in {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); }
        }
        .confetti-piece {
          position: absolute;
          top: -20px;
          border-radius: 2px;
          animation: confetti-fall linear infinite;
        }
        .animate-bounce-in {
          animation: bounce-in 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
