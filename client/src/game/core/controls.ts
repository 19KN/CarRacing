import { useRef, useEffect } from 'react';
import { VehicleInput } from '../physics/vehiclePhysics';

export function useVehicleControls() {
  const inputRef = useRef<VehicleInput>({
    accelerate: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
  });
  const hornRef = useRef(false);
  const nitroRef = useRef(false);
  const keysRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const applyKeys = () => {
      const k = keysRef.current;
      inputRef.current.accelerate = (k['KeyW'] || k['ArrowUp']) ? 1 : 0;
      inputRef.current.brake = (k['KeyS'] || k['ArrowDown']) ? 1 : 0;
      let steer = 0;
      if (k['KeyA'] || k['ArrowLeft']) steer -= 1;
      if (k['KeyD'] || k['ArrowRight']) steer += 1;
      inputRef.current.steer = steer;
      inputRef.current.handbrake = !!k['Space'];
      hornRef.current = !!k['KeyH'];
      nitroRef.current = !!k['KeyN'];
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
      if (gp) {
        inputRef.current.accelerate = gp.buttons[7]?.value || (gp.buttons[0]?.pressed ? 1 : 0);
        inputRef.current.brake = gp.buttons[6]?.value || (gp.buttons[1]?.pressed ? 1 : 0);
        inputRef.current.steer = gp.axes[0] || 0;
        inputRef.current.handbrake = gp.buttons[2]?.pressed || false;
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
  const inputRef = useRef<VehicleInput>({
    accelerate: 0, brake: 0, steer: 0, handbrake: false,
  });

  const setAccelerate = (v: number) => { inputRef.current.accelerate = v; };
  const setBrake = (v: number) => { inputRef.current.brake = v; };
  const setSteer = (v: number) => { inputRef.current.steer = v; };
  const setHandbrake = (v: boolean) => { inputRef.current.handbrake = v; };

  return { inputRef, setAccelerate, setBrake, setSteer, setHandbrake };
}
