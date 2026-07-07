import { useEffect, useRef, useCallback } from 'react';

const MAX_TILT_DEG = 32;

export function useTiltSteering(
  enabled: boolean,
  sensitivity: number,
  onSteer: (value: number) => void,
) {
  const onSteerRef = useRef(onSteer);
  onSteerRef.current = onSteer;

  useEffect(() => {
    if (!enabled) {
      onSteerRef.current(0);
      return;
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const gamma = event.gamma ?? 0;
      const steer = Math.max(-1, Math.min(1, (gamma / MAX_TILT_DEG) * sensitivity));
      onSteerRef.current(Math.abs(steer) < 0.06 ? 0 : steer);
    };

    const attach = () => {
      window.addEventListener('deviceorientation', handleOrientation, true);
    };

    const setup = async () => {
      const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
      };

      if (typeof DOE.requestPermission === 'function') {
        try {
          const permission = await DOE.requestPermission();
          if (permission === 'granted') attach();
        } catch {
          onSteerRef.current(0);
        }
        return;
      }

      attach();
    };

    void setup();

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
      onSteerRef.current(0);
    };
  }, [enabled, sensitivity]);
}

export async function requestTiltPermission(): Promise<boolean> {
  const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
  };
  if (typeof DOE.requestPermission !== 'function') return true;
  try {
    return (await DOE.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}
