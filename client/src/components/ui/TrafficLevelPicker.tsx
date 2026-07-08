import { TrafficLevel, TRAFFIC_LEVELS, TRAFFIC_LEVEL_LABELS } from '@indian-racing/shared';

export function TrafficLevelPicker({
  value,
  onChange,
  className = '',
}: {
  value: TrafficLevel;
  onChange: (level: TrafficLevel) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <h3 className="font-display font-semibold text-saffron mb-3">Traffic Level</h3>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {TRAFFIC_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={`py-3 px-2 rounded-lg text-sm font-semibold transition-all ${
              value === level
                ? 'bg-saffron/20 border-2 border-saffron text-white'
                : 'bg-game-dark border border-game-border text-gray-300 hover:border-saffron/50'
            }`}
          >
            {TRAFFIC_LEVEL_LABELS[level]}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        {value === 'less' && 'Fewer AI vehicles on the road — easier practice runs.'}
        {value === 'medium' && 'Balanced traffic — typical highway conditions.'}
        {value === 'high' && 'Heavy traffic — more cars, buses, and obstacles.'}
      </p>
    </div>
  );
}
