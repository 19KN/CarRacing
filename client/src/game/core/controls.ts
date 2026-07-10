import { useRef, useEffect } from 'react';
import { VehicleInput } from '../physics/vehiclePhysics';

export interface ExtendedVehicleInput extends VehicleInput {
  pitch: number;
  fireMissile: boolean;
}

/** Shared vehicle + aircraft input */
export const vehicleInputState: ExtendedVehicleInput = {
  accelerate: 0,
  brake: 0,
  steer: 0,
  handbrake: false,
  pitch: 0,
  fireMissile: false,
};

const touchDriveRef = { accel: false, brake: false, steer: false };

export function setTouchPedal(pedal: 'accel' | 'brake', active: boolean) {
  if (pedal === 'accel') touchDriveRef.accel = active;
  if (pedal === 'brake') touchDriveRef.brake = active;
  vehicleInputState.accelerate = touchDriveRef.accel ? 1 : 0;
  vehicleInputState.brake = touchDriveRef.brake ? 1 : 0;
}

export function setTouchSteer(value: number) {
  touchDriveRef.steer = value !== 0;
  vehicleInputState.steer = Math.max(-1, Math.min(1, value));
}

export function clearTouchSteer() {
  touchDriveRef.steer = false;
  vehicleInputState.steer = 0;
}

export function useVehicleControls() {
  const inputRef = useRef(vehicleInputState);
  const hornRef = useRef(false);
  const nitroRef = useRef(false);
  const keysRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const applyKeys = () => {
      if (touchDriveRef.accel || touchDriveRef.brake || touchDriveRef.steer) {
        if (!touchDriveRef.accel) vehicleInputState.accelerate = 0;
        if (!touchDriveRef.brake) vehicleInputState.brake = 0;
        if (!touchDriveRef.steer) vehicleInputState.steer = 0;
        if (touchDriveRef.accel) vehicleInputState.accelerate = 1;
        if (touchDriveRef.brake) vehicleInputState.brake = 1;
      } else {
        const k = keysRef.current;
        vehicleInputState.accelerate = k['KeyW'] ? 1 : 0;
        vehicleInputState.brake = k['KeyS'] ? 1 : 0;
        let steer = 0;
        if (k['KeyA'] || k['ArrowLeft']) steer -= 1;
        if (k['KeyD'] || k['ArrowRight']) steer += 1;
        vehicleInputState.steer = steer;
        let pitch = 0;
        if (k['ArrowUp']) pitch += 1;
        if (k['ArrowDown']) pitch -= 1;
        vehicleInputState.pitch = pitch;
      }
      vehicleInputState.handbrake = !!keysRef.current['Space'];
      hornRef.current = !!keysRef.current['KeyH'];
      nitroRef.current = !!keysRef.current['KeyN'];
      vehicleInputState.fireMissile = !!keysRef.current['KeyF'];
    };

    const handleDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      applyKeys();
    };
    const handleUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
      applyKeys();
    };
    const handleBlur = () => {
      keysRef.current = {};
      applyKeys();
    };

    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    window.addEventListener('blur', handleBlur);

    let raf = 0;
    const pollGamepad = () => {
      const gp = navigator.getGamepads?.()[0];
      if (gp && !touchDriveRef.accel && !touchDriveRef.brake && !touchDriveRef.steer) {
        vehicleInputState.accelerate = gp.buttons[7]?.value || (gp.buttons[0]?.pressed ? 1 : 0);
        vehicleInputState.brake = gp.buttons[6]?.value || (gp.buttons[1]?.pressed ? 1 : 0);
        vehicleInputState.steer = gp.axes[0] || 0;
        vehicleInputState.handbrake = gp.buttons[2]?.pressed || false;
      }
      raf = requestAnimationFrame(pollGamepad);
    };
    pollGamepad();

    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
      window.removeEventListener('blur', handleBlur);
      cancelAnimationFrame(raf);
    };
  }, []);

  return { inputRef, hornRef, nitroRef };
}

export function useTouchControls() {
  const inputRef = useRef(vehicleInputState);
  return {
    inputRef,
    setAccelerate: (v: number) => setTouchPedal('accel', v > 0),
    setBrake: (v: number) => setTouchPedal('brake', v > 0),
    setSteer: setTouchSteer,
    setHandbrake: (v: boolean) => { vehicleInputState.handbrake = v; },
  };
}
