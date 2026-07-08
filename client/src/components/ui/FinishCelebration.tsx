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

function rankLabel(rank: number) {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `${rank}th`;
}

function rankMedal(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '🏁';
}

export function FinishCelebration({
  finishTimeMs,
  mapName,
  standings = [],
  localPlayerId,
  onComplete,
}: {
  finishTimeMs?: number;
  mapName?: string;
  standings?: { playerId: string; username: string; rank: number; finishTime: number }[];
  localPlayerId?: string;
  onComplete: () => void;
}) {
  const isMultiplayer = standings.length > 0;
  const localStanding = standings.find((s) => s.playerId === localPlayerId);
  const latestFinisher = standings[standings.length - 1];

  const headline = useMemo(() => {
    if (!isMultiplayer) return 'You Made It!';
    if (localStanding?.rank === 1) return 'Victory!';
    if (localStanding) return 'You Finished!';
    if (latestFinisher) return `${latestFinisher.username} finished ${rankLabel(latestFinisher.rank)}!`;
    return 'Race Update';
  }, [isMultiplayer, localStanding, latestFinisher]);

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

      <div className="relative text-center animate-bounce-in px-6 py-8 rounded-2xl bg-black/75 border border-saffron/40 backdrop-blur-md shadow-2xl min-w-[280px] max-w-md">
        <div className="text-6xl mb-2">🏁</div>
        <h2 className="text-4xl font-display font-bold text-saffron mb-1">FINISH!</h2>
        <p className="text-xl text-white font-semibold mb-1">{headline}</p>
        {mapName && <p className="text-sm text-gray-400 mb-3">{mapName}</p>}

        {isMultiplayer ? (
          <div className="mt-3 space-y-2 text-left">
            <p className="text-xs text-gray-500 uppercase tracking-wide text-center mb-2">Standings</p>
            {standings.map((s) => (
              <div
                key={s.playerId}
                className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg ${
                  s.playerId === localPlayerId ? 'bg-saffron/20 border border-saffron/50' : 'bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">{rankMedal(s.rank)}</span>
                  <span className={`font-semibold truncate ${s.playerId === localPlayerId ? 'text-saffron' : 'text-white'}`}>
                    {s.username}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-game-gold">{rankLabel(s.rank)}</div>
                  <div className="text-xs text-gray-400">{formatTime(s.finishTime)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : finishTimeMs !== undefined && (
          <>
            <div className="text-3xl font-display font-bold text-game-gold">{formatTime(finishTimeMs)}</div>
            <p className="text-xs text-gray-500 mt-2">Great drive — on time!</p>
          </>
        )}
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
