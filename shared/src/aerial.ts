import type { AircraftKind, Vector3 } from './types';
import type { SpawnPosition } from './spawnPositions';

/** Forest airfield layout for Chennai → Bangalore aerial map. */
export const AERIAL_HELIPAD = { x: -38, y: 2.2, z: 18 };
export const AERIAL_RUNWAY_CENTER_X = 42;
export const AERIAL_RUNWAY_START_Z = 28;
export const AERIAL_RUNWAY_LENGTH = 120;
export const AERIAL_CRUISE_ALTITUDE = 52;
export const AERIAL_FINISH_ALTITUDE = 58;
export const AERIAL_COMBAT_MAX_ALTITUDE = 60;
export const AERIAL_COMBAT_ALT_SOFT = 48;
export const AERIAL_FINISH_Z = -3950;
export const AERIAL_RACE_DISTANCE = 4000;

export function isAircraftVehicle(vehicleId: string, category?: string): boolean {
  return category === 'aircraft' || vehicleId === 'helicopter' || vehicleId === 'airplane' || vehicleId === 'fighter_jet';
}

export function getAircraftKind(vehicleId: string, aircraftKind?: AircraftKind): AircraftKind {
  if (aircraftKind) return aircraftKind;
  if (vehicleId === 'helicopter') return 'helicopter';
  if (vehicleId === 'fighter_jet') return 'jet';
  return 'airplane';
}

export function generateAerialCheckpoints(count = 14, length = AERIAL_RACE_DISTANCE): Vector3[] {
  const points: Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const z = 20 - t * length;
    const x = Math.sin(t * Math.PI * 1.8) * 120;
    const y = AERIAL_CRUISE_ALTITUDE + Math.sin(t * Math.PI * 3) * 12;
    points.push({ x, y, z });
  }
  return points;
}

export function getAerialSpawnPosition(
  vehicleId: string,
  aircraftKind: AircraftKind | undefined,
  playerIndex: number,
): SpawnPosition {
  const kind = getAircraftKind(vehicleId, aircraftKind);
  const row = Math.floor(playerIndex / 2);
  const side = playerIndex % 2;

  if (kind === 'helicopter') {
    return {
      x: AERIAL_HELIPAD.x,
      y: AERIAL_HELIPAD.y,
      z: AERIAL_HELIPAD.z - row * 16,
      rotation: Math.PI,
    };
  }

  return {
    x: AERIAL_RUNWAY_CENTER_X + (side === 0 ? -6 : 6),
    y: AERIAL_HELIPAD.y,
    z: AERIAL_RUNWAY_START_Z - row * 14,
    rotation: Math.PI,
  };
}

export function getAerialFinishPosition(): Vector3 {
  return { x: 0, y: AERIAL_FINISH_ALTITUDE, z: AERIAL_FINISH_Z };
}

/** Progress along aerial route (0 at start, 1 at finish). */
export function getAerialRaceProgress(z: number, y: number): number {
  const startZ = 20;
  const traveled = startZ - z;
  const progress = traveled / AERIAL_RACE_DISTANCE;
  const altBonus = Math.max(0, y - 25) / AERIAL_CRUISE_ALTITUDE * 0.05;
  return Math.min(1, Math.max(0, progress + altBonus * 0.02));
}

export function getAerialDistanceRemaining(z: number): number {
  const traveled = 20 - z;
  return Math.max(0, AERIAL_RACE_DISTANCE - traveled);
}

export function hasCrossedAerialFinish(x: number, y: number, z: number): boolean {
  return z <= AERIAL_FINISH_Z + 40 && y >= 8 && Math.abs(x) < 180;
}

export const MISSILE_DAMAGE = 28;
export const MISSILE_COOLDOWN_SEC = 0.12;
