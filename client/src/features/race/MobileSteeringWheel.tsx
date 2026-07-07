import { useRef, useCallback } from 'react';

const MAX_WHEEL_ROT = 110;

interface MobileSteeringWheelProps {
  rotation: number;
  onRotationChange: (rotation: number, steer: number) => void;
  onRelease: () => void;
}

export function MobileSteeringWheel({ rotation, onRotationChange, onRelease }: MobileSteeringWheelProps) {
  const activeRef = useRef(false);
  const startAngleRef = useRef(0);
  const startRotationRef = useRef(0);
  const areaRef = useRef<HTMLDivElement>(null);

  const getAngle = useCallback((clientX: number, clientY: number) => {
    const el = areaRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx);
  }, []);

  const applyRotation = useCallback((rotDeg: number) => {
    const clamped = Math.max(-MAX_WHEEL_ROT, Math.min(MAX_WHEEL_ROT, rotDeg));
    onRotationChange(clamped, clamped / MAX_WHEEL_ROT);
  }, [onRotationChange]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    activeRef.current = true;
    startAngleRef.current = getAngle(e.clientX, e.clientY);
    startRotationRef.current = rotation;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!activeRef.current) return;
    e.preventDefault();
    const angle = getAngle(e.clientX, e.clientY);
    const delta = angle - startAngleRef.current;
    const deltaDeg = (delta * 180) / Math.PI;
    applyRotation(startRotationRef.current - deltaDeg);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    activeRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    onRelease();
  };

  const rot = rotation;

  return (
    <div
      ref={areaRef}
      className="relative w-40 h-40 pointer-events-auto touch-none select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-gray-800/80 to-black/80 border-2 border-white/20 shadow-xl" />

      <div
        className="absolute inset-2 transition-transform duration-75"
        style={{ transform: `rotate(${rot}deg)` }}
      >
        <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-md">
          <circle cx="60" cy="60" r="54" fill="#1a1a1a" stroke="#444" strokeWidth="3" />
          <circle cx="60" cy="60" r="46" fill="none" stroke="#555" strokeWidth="2" />
          <circle cx="60" cy="60" r="12" fill="#2a2a2a" stroke="#666" strokeWidth="2" />
          <rect x="56" y="18" width="8" height="30" rx="4" fill="#3d3d3d" stroke="#666" strokeWidth="1" />
          <rect x="56" y="72" width="8" height="30" rx="4" fill="#3d3d3d" stroke="#666" strokeWidth="1" />
          <rect x="18" y="56" width="30" height="8" rx="4" fill="#3d3d3d" stroke="#666" strokeWidth="1" />
          <rect x="72" y="56" width="30" height="8" rx="4" fill="#3d3d3d" stroke="#666" strokeWidth="1" />
          <circle cx="60" cy="24" r="4" fill="#ff9933" />
          <path d="M 20 60 Q 60 40 100 60" fill="none" stroke="#ff9933" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        </svg>
      </div>

      <div className="absolute bottom-1 left-0 right-0 text-center text-[10px] text-gray-400 pointer-events-none">
        STEER
      </div>
    </div>
  );
}
