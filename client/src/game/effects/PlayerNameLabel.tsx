import { Html } from '@react-three/drei';

export function PlayerNameLabel({
  name,
  isLocal = false,
  metersToFinish,
}: {
  name: string;
  isLocal?: boolean;
  metersToFinish?: number | null;
}) {
  return (
    <Html
      position={[0, 2.8, 0]}
      center
      distanceFactor={14}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div
        style={{
          background: isLocal ? 'rgba(255, 153, 51, 0.92)' : 'rgba(15, 15, 25, 0.82)',
          color: '#fff',
          padding: '3px 10px',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          textAlign: 'center',
          border: isLocal ? '2px solid #fff' : '1px solid rgba(255,153,51,0.5)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {name}
        {metersToFinish != null && (
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              marginTop: '2px',
              color: isLocal ? '#fff' : '#FF9933',
            }}
          >
            {metersToFinish}m to go
          </div>
        )}
      </div>
    </Html>
  );
}
