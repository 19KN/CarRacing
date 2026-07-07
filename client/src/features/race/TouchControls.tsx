import { useCallback, useEffect, useRef, useState } from 'react';
import { setTouchPedal, setTouchSteer, clearTouchSteer, useVehicleControls } from '../../game/core/controls';
import { useSettingsStore } from '../../stores';
import { MobileSteeringWheel } from './MobileSteeringWheel';
import { requestTiltPermission, useTiltSteering } from './useTiltSteering';

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const narrow = window.innerWidth <= 1024;
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  return touch && (narrow || mobileUa);
}

export function TouchControls() {
  useVehicleControls();
  const mobileSettings = useSettingsStore((s) => s.settings.mobile);
  const updateMobile = useSettingsStore((s) => s.updateMobile);
  const steeringMode = mobileSettings?.steeringMode ?? 'wheel';
  const tiltSensitivity = mobileSettings?.tiltSensitivity ?? 1.2;

  const [isMobile, setIsMobile] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const wheelSteerRef = useRef(0);

  useEffect(() => {
    const check = () => setIsMobile(isMobileDevice());
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const setSteer = useCallback((value: number) => {
    setTouchSteer(value);
  }, []);

  const handleWheelRotation = useCallback((_rot: number, steer: number) => {
    wheelSteerRef.current = steer;
    if (steeringMode === 'wheel') setSteer(steer);
  }, [setSteer, steeringMode]);

  const handleWheelRelease = useCallback(() => {
    wheelSteerRef.current = 0;
    setWheelRotation(0);
    if (steeringMode === 'wheel') clearTouchSteer();
  }, [steeringMode]);

  useTiltSteering(
    isMobile && steeringMode === 'tilt',
    tiltSensitivity,
    setSteer,
  );

  useEffect(() => {
    if (steeringMode === 'wheel') {
      setSteer(wheelSteerRef.current);
    } else {
      setWheelRotation(0);
      wheelSteerRef.current = 0;
      clearTouchSteer();
    }
  }, [steeringMode, setSteer]);

  if (!isMobile) return null;

  const pedalBtn = 'w-16 h-16 rounded-xl bg-black/55 border border-white/25 flex items-center justify-center text-3xl font-bold text-white active:bg-saffron/40 active:scale-95 pointer-events-auto select-none touch-none shadow-lg';

  const bindPedal = (pedal: 'accel' | 'brake') => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setTouchPedal(pedal, true);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      setTouchPedal(pedal, false);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    },
    onPointerCancel: (e: React.PointerEvent) => {
      e.preventDefault();
      setTouchPedal(pedal, false);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        setTouchPedal(pedal, false);
      }
    },
  });

  const switchMode = async (mode: 'wheel' | 'tilt') => {
    if (mode === 'tilt') await requestTiltPermission();
    updateMobile({ steeringMode: mode });
    clearTouchSteer();
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      <div className="absolute bottom-44 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto">
        <button
          type="button"
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${steeringMode === 'wheel' ? 'bg-saffron/80 border-saffron text-black' : 'bg-black/50 border-white/20 text-gray-300'}`}
          onClick={() => void switchMode('wheel')}
        >
          Wheel
        </button>
        <button
          type="button"
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${steeringMode === 'tilt' ? 'bg-saffron/80 border-saffron text-black' : 'bg-black/50 border-white/20 text-gray-300'}`}
          onClick={() => void switchMode('tilt')}
        >
          Tilt
        </button>
      </div>

      <div className="absolute bottom-6 left-4 flex flex-col items-center gap-2">
        {steeringMode === 'wheel' ? (
          <MobileSteeringWheel
            rotation={wheelRotation}
            onRotationChange={(rot, steer) => {
              setWheelRotation(rot);
              handleWheelRotation(rot, steer);
            }}
            onRelease={handleWheelRelease}
          />
        ) : (
          <div className="w-40 h-40 rounded-full bg-black/35 border border-white/15 flex flex-col items-center justify-center text-center px-3 pointer-events-auto">
            <div className="text-3xl mb-2">↔</div>
            <div className="text-xs text-gray-300 font-semibold">TILT TO STEER</div>
            <div className="text-[10px] text-gray-500 mt-1">Tip your phone left / right</div>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 right-4 flex flex-col gap-3 pointer-events-auto">
        <button type="button" className={pedalBtn} aria-label="Accelerate" {...bindPedal('accel')}>
          ▲
        </button>
        <button type="button" className={pedalBtn} aria-label="Brake" {...bindPedal('brake')}>
          ▼
        </button>
      </div>
    </div>
  );
}
