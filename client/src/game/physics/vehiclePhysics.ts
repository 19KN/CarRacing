import { VehicleConfig, type CollisionSeverity } from '@indian-racing/shared';
import { DRIVABLE_MIN_X, DRIVABLE_MAX_X } from '../maps/IndianHighwayRoad';

export const GAME_MAX_SPEED_KMH = 300;

export interface VehicleInput {
  accelerate: number;
  brake: number;
  steer: number;
  handbrake: boolean;
}

export interface VehiclePhysicsState {
  position: { x: number; y: number; z: number };
  rotation: number;
  velocity: { x: number; y: number; z: number };
  speed: number;
  rpm: number;
  gear: number;
  isDrifting: boolean;
}

const WHEEL_BASE = 2.6;
const STEER_RATE = 3.2;
const STEER_RETURN = 5.5;
const BASE_MAX_STEER = 0.52;

export function createVehiclePhysics(config: VehicleConfig) {
  const stats = config.stats;
  let state: VehiclePhysicsState = {
    position: { x: 0, y: 0.5, z: 0 },
    rotation: 0,
    velocity: { x: 0, y: 0, z: 0 },
    speed: 0,
    rpm: 800,
    gear: 1,
    isDrifting: false,
  };
  let steeringAngle = 0;

  const cappedMaxKmh = Math.min(stats.maxSpeed, GAME_MAX_SPEED_KMH);
  const maxSpeedMs = cappedMaxKmh / 3.6;
  const accelForce = stats.acceleration * 0.7;
  const brakeForce = stats.brakePower * 0.35;
  const handlingFactor = stats.handling / 100;
  const massFactor = Math.max(0.92, 1400 / stats.weight);
  const rollingResistance = 0.998;
  const dragCoeff = 0.00012 * (stats.weight / 1000);

  function update(input: VehicleInput, delta: number, health: number): VehiclePhysicsState {
    const dt = Math.min(delta, 0.05);
    const healthMultiplier = health > 50 ? 1 : health > 20 ? 0.6 : health > 0 ? 0.25 : 0;
    const effectiveMaxSpeed = maxSpeedMs * healthMultiplier;
    const effectiveAccel = accelForce * healthMultiplier * massFactor;

    const headingX = Math.sin(state.rotation);
    const headingZ = Math.cos(state.rotation);
    const rightX = -headingZ;
    const rightZ = headingX;

    const forwardVel = state.velocity.x * headingX + state.velocity.z * headingZ;
    const lateralVel = state.velocity.x * rightX + state.velocity.z * rightZ;
    const speed = Math.sqrt(state.velocity.x ** 2 + state.velocity.z ** 2);
    const speedKmh = speed * 3.6;

    const maxSteerAtSpeed = BASE_MAX_STEER * handlingFactor
      * Math.max(0.22, 1 - speedKmh / 260);

    if (Math.abs(input.steer) > 0 && speed > 0.4) {
      const targetSteer = input.steer * maxSteerAtSpeed;
      const rate = STEER_RATE * (input.handbrake ? 1.35 : 1);
      steeringAngle += (targetSteer - steeringAngle) * Math.min(1, rate * dt);
    } else {
      steeringAngle *= Math.max(0, 1 - STEER_RETURN * dt);
      if (Math.abs(steeringAngle) < 0.002) steeringAngle = 0;
    }

    if (speed > 0.4) {
      const yawRate = (forwardVel / WHEEL_BASE) * Math.tan(steeringAngle);
      const yawMul = input.handbrake ? 1.25 : 1;
      state.rotation -= yawRate * dt * yawMul;
    }

    let driveForce = 0;
    if (input.accelerate > 0) driveForce = effectiveAccel * input.accelerate;
    if (input.brake > 0) driveForce = -brakeForce * input.brake * massFactor;

    let newForwardVel = forwardVel + driveForce * dt;
    const drag = rollingResistance * Math.max(1 - dragCoeff * Math.abs(newForwardVel) * dt, 0.992);
    newForwardVel *= drag;

    if (Math.abs(newForwardVel) > effectiveMaxSpeed) {
      newForwardVel = Math.sign(newForwardVel) * effectiveMaxSpeed;
    }

    if (input.handbrake && speed > 3) {
      newForwardVel *= 0.97;
    }

    const grip = input.handbrake
      ? handlingFactor * 0.3
      : handlingFactor * 0.94;
    const newLateralVel = lateralVel * Math.pow(1 - grip * 0.12, dt * 60);

    state.velocity.x = headingX * newForwardVel + rightX * newLateralVel;
    state.velocity.z = headingZ * newForwardVel + rightZ * newLateralVel;

    state.isDrifting = input.handbrake && speed > 8 && Math.abs(steeringAngle) > 0.08;

    state.position.x += state.velocity.x * dt;
    state.position.z += state.velocity.z * dt;
    state.position.y = 0.5;

    if (state.position.x < DRIVABLE_MIN_X) {
      state.position.x = DRIVABLE_MIN_X;
      state.velocity.x = Math.max(0, state.velocity.x);
    } else if (state.position.x > DRIVABLE_MAX_X) {
      state.position.x = DRIVABLE_MAX_X;
      state.velocity.x = Math.min(0, state.velocity.x);
    }

    state.speed = Math.sqrt(state.velocity.x ** 2 + state.velocity.z ** 2) * 3.6;
    state.rpm = 800 + (state.speed / cappedMaxKmh) * 6200;
    state.gear = Math.min(Math.floor(state.speed / (cappedMaxKmh / 6)) + 1, 6);

    return { ...state };
  }

  function setPosition(x: number, y: number, z: number, rot: number) {
    state.position = {
      x: Math.min(DRIVABLE_MAX_X, Math.max(DRIVABLE_MIN_X, x)),
      y,
      z,
    };
    state.rotation = rot;
    state.velocity = { x: 0, y: 0, z: 0 };
    steeringAngle = 0;
  }

  function applyTrafficCollision(severity: CollisionSeverity, trafficX: number) {
    const headingX = Math.sin(state.rotation);
    const headingZ = Math.cos(state.rotation);
    const rightX = -headingZ;
    const rightZ = headingX;

    const forwardVel = state.velocity.x * headingX + state.velocity.z * headingZ;
    const retention: Record<CollisionSeverity, number> = {
      small: 0.5,
      medium: 0.32,
      large: 0.18,
      heavy: 0.08,
    };
    const lateralPush: Record<CollisionSeverity, number> = {
      small: 1.5,
      medium: 3.5,
      large: 6,
      heavy: 9,
    };

    const newForward = forwardVel * (retention[severity] ?? 0.3);
    const pushDir = Math.sign(state.position.x - trafficX) || 1;
    const push = (lateralPush[severity] ?? 3) * pushDir;

    state.velocity.x = headingX * newForward + rightX * push;
    state.velocity.z = headingZ * newForward + rightZ * push;
    steeringAngle *= 0.4;
  }

  function stopVehicle() {
    state.velocity = { x: 0, y: 0, z: 0 };
    steeringAngle = 0;
  }

  function getState() { return { ...state }; }

  return { update, setPosition, getState, applyTrafficCollision, stopVehicle };
}

export type VehiclePhysics = ReturnType<typeof createVehiclePhysics>;

export function detectCollisionSeverity(speed: number): 'small' | 'medium' | 'large' | 'heavy' {
  if (speed < 20) return 'small';
  if (speed < 50) return 'medium';
  if (speed < 80) return 'large';
  return 'heavy';
}
