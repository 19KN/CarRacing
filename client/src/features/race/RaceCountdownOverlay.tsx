export function RaceCountdownOverlay({ value }: { value: number }) {
  const label = value === 0 ? 'RACE!' : String(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
      <div className="relative text-center animate-bounce-in">
        <p className="text-sm uppercase tracking-[0.35em] text-saffron/90 mb-2 font-semibold">
          Get Ready
        </p>
        <div className="text-[8rem] leading-none font-display font-bold text-saffron drop-shadow-[0_0_40px_rgba(255,153,51,0.55)]">
          {label}
        </div>
        <p className="text-gray-300 mt-4 text-lg">
          {value === 0 ? 'All players — go!' : 'All players get ready...'}
        </p>
      </div>
      <style>{`
        @keyframes bounce-in {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); }
        }
        .animate-bounce-in {
          animation: bounce-in 0.45s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
