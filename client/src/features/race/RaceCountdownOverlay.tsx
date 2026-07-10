export function RaceCountdownOverlay({
  value,
  rules,
}: {
  value: number;
  rules?: readonly string[];
}) {
  const label = value === 0 ? 'RACE!' : String(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
      <div className="relative text-center animate-bounce-in max-w-lg px-6">
        <p className="text-sm uppercase tracking-[0.35em] text-saffron/90 mb-2 font-semibold">
          Get Ready
        </p>
        <div className="text-[8rem] leading-none font-display font-bold text-saffron drop-shadow-[0_0_40px_rgba(255,153,51,0.55)]">
          {label}
        </div>
        <p className="text-gray-300 mt-4 text-lg">
          {value === 0 ? 'All players — go!' : 'All players get ready...'}
        </p>
        {rules && rules.length > 0 && (
          <div className="mt-6 pt-4 border-t border-white/10 space-y-1.5">
            {rules.map((rule) => (
              <p key={rule} className="text-sm text-gray-200">{rule}</p>
            ))}
          </div>
        )}
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

export function StartLineInfoOverlay({ rules }: { rules: readonly string[] }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" />
      <div className="relative text-center animate-bounce-in max-w-lg px-6">
        <p className="text-sm uppercase tracking-[0.35em] text-saffron/90 mb-3 font-semibold">
          Starting Line
        </p>
        <div className="space-y-2">
          {rules.map((rule) => (
            <p key={rule} className="text-base text-gray-100">{rule}</p>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes bounce-in {
          0% { transform: scale(0.92); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.35s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
