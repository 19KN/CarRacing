import {
  VehicleConfig,
  getAircraftKind,
  AERIAL_COMBAT_MAX_ALTITUDE,
  AERIAL_COMBAT_ALT_SOFT,
  AERIAL_HELIPAD,
} from '@indian-racing/shared';

export interface AircraftInput {
  throttle: number;
  brake: number;
  pitch: number;
  yaw: number;
}

export interface AircraftState {
  position: { x: number; y: number; z: number };
  rotation: number;
  pitch: number;
  velocity: { x: number; y: number; z: number };
  speed: number;
  altitude: number;
  onGround: boolean;
  rotorSpeed: number;
  isFlying: boolean;
}

const GRAVITY = 9.8;
const MIN_FLY_ALT = 3;
const GROUND_Y = AERIAL_HELIPAD.y;

interface AerialTuning {
  forwardMul: number;
  liftMul: number;
  pitchForwardMul: number;
  pitchLiftMul: number;
  yawMul: number;
  minY: number;
}

const HELI_TUNING: AerialTuning = {
  forwardMul: 0.85,
  liftMul: 14,
  pitchForwardMul: 0.55,
  pitchLiftMul: 0,
  yawMul: 1.8,
  minY: MIN_FLY_ALT,
};

const PLANE_TUNING: AerialTuning = {
  forwardMul: 0.92,
  liftMul: 13,
  pitchForwardMul: 0.55,
  pitchLiftMul: 0.5,
  yawMul: 1.6,
  minY: GROUND_Y,
};

const JET_TUNING: AerialTuning = {
  forwardMul: 1.05,
  liftMul: 12,
  pitchForwardMul: 0.5,
  pitchLiftMul: 0.45,
  yawMul: 2,
  minY: GROUND_Y,
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function altitudeLiftDamp(altitude: number): number {
  if (altitude <= AERIAL_COMBAT_ALT_SOFT) return 1;
  const t = (altitude - AERIAL_COMBAT_ALT_SOFT) / (AERIAL_COMBAT_MAX_ALTITUDE - AERIAL_COMBAT_ALT_SOFT);
  return Math.max(0.05, 1 - clamp(t, 0, 1) * 0.95);
}

function applyCombatAltitudeCap(altitude: number, verticalVel: number, liftInput: number, delta: number): number {
  let vy = verticalVel;
  if (altitude >= AERIAL_COMBAT_MAX_ALTITUDE) {
    if (vy > 0) vy = 0;
    if (liftInput > 0.1) vy -= 6 * delta;
  }
  return vy;
}

export function createAircraftPhysics(config: VehicleConfig) {
  const kind = getAircraftKind(config.id, config.aircraftKind);
  const maxSpeedMs = config.stats.maxSpeed / 3.6;
  const accel = config.stats.acceleration / 100;
  const handling = config.stats.handling / 100;
  const tuning = kind === 'helicopter' ? HELI_TUNING : kind === 'jet' ? JET_TUNING : PLANE_TUNING;

  let x = 0;
  let y = tuning.minY;
  let z = 0;
  let rotation = Math.PI;
  let pitch = 0;
  let vx = 0;
  let vy = 0;
  let vz = 0;
  let speed = 0;
  let onGround = kind !== 'helicopter';
  let rotorSpeed = 0;
  let isFlying = kind === 'helicopter';

  const updateAerial = (input: AircraftInput, delta: number, health: number) => {
    const healthMul = health <= 0 ? 0 : health < 20 ? 0.25 : health < 50 ? 0.6 : 1;
    const throttle = input.throttle * healthMul;
    const brake = input.brake;
    const pitchInput = input.pitch;
    const liftInput = clamp(throttle + Math.max(0, pitchInput) * tuning.pitchLiftMul, 0, 1.2);

    rotorSpeed = clamp(rotorSpeed + (liftInput > 0.05 ? 10 : -2) * delta, 0, 1);
    if (liftInput > 0.05 && rotorSpeed < 0.25) rotorSpeed = 0.25;

    const lift = liftInput * accel * tuning.liftMul * Math.max(rotorSpeed, 0.3) * altitudeLiftDamp(y);
    const descend = brake * 12 + (1 - Math.max(rotorSpeed, liftInput)) * GRAVITY * 0.28;
    vy += (lift - descend - GRAVITY * 0.12 * (1 - liftInput * 0.45)) * delta;
    vy = clamp(vy, -8, 8);

    rotation += -input.yaw * handling * tuning.yawMul * delta;

    const forward = (throttle * tuning.forwardMul + pitchInput * tuning.pitchForwardMul) * maxSpeedMs * healthMul;
    const targetVx = Math.sin(rotation) * forward;
    const targetVz = Math.cos(rotation) * forward;

    vx += (targetVx - vx) * 2.5 * delta;
    vz += (targetVz - vz) * 2.5 * delta;

    const strafe = -input.yaw * maxSpeedMs * 0.2 * (1 - Math.abs(pitchInput));
    vx += Math.cos(rotation) * strafe * delta * 3;
    vz += Math.sin(rotation) * strafe * delta * 3;

    x += vx * delta;
    y += vy * delta;
    z += vz * delta;

    y = clamp(y, tuning.minY, AERIAL_COMBAT_MAX_ALTITUDE);
    vy = applyCombatAltitudeCap(y, vy, liftInput, delta);
    pitch = clamp(pitchInput * 0.35, -0.45, 0.45);
    onGround = false;
    isFlying = y > tuning.minY + 0.5 || liftInput > 0.08;
    speed = Math.sqrt(vx * vx + vz * vz + vy * vy) * 3.6;
  };

  return {
    update(input: AircraftInput, delta: number, health: number): AircraftState {
      updateAerial(input, delta, health);

      return {
        position: { x, y, z },
        rotation,
        pitch,
        velocity: { x: vx, y: vy, z: vz },
        speed,
        altitude: y,
        onGround,
        rotorSpeed,
        isFlying,
      };
    },

    setPosition(nx: number, ny: number, nz: number, rot: number) {
      x = nx;
      y = ny;
      z = nz;
      rotation = rot;
      vx = 0;
      vy = 0;
      vz = 0;
      speed = 0;
      pitch = 0;
      onGround = kind !== 'helicopter' && ny <= GROUND_Y + 0.1;
      isFlying = kind === 'helicopter' || ny > GROUND_Y + 0.5;
    },

    stopVehicle() {
      vx = 0;
      vy = 0;
      vz = 0;
      speed = 0;
      rotorSpeed = 0;
    },

    getState(): AircraftState {
      return {
        position: { x, y, z },
        rotation,
        pitch,
        velocity: { x: vx, y: vy, z: vz },
        speed,
        altitude: y,
        onGround,
        rotorSpeed,
        isFlying,
      };
    },
  };
}

export type AircraftPhysics = ReturnType<typeof createAircraftPhysics>;
