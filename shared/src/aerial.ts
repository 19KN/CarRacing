import type { AircraftKind, Vector3 } from './types';
import type { SpawnPosition } from './spawnPositions';
import { buildSplinePathSamples, sampleSplineByZ } from './ghatSpline';

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
/** Combat speed cap — same as ghat mode for missile fights. */
export const AERIAL_COMBAT_MAX_SPEED_KMH = 90;
/** Lateral half-width of the aerial race corridor (stay on the sky route). */
export const AERIAL_CORRIDOR_HALF_WIDTH = 55;
/** Minimum altitude to count as crossing the sky finish arch. */
export const AERIAL_FINISH_CROSS_MIN_Y = AERIAL_FINISH_ALTITUDE - 10;
export const AERIAL_FINISH_ARCH_HALF_WIDTH = 48;
export const AERIAL_COMBAT_START_RULES = [
  'Aerial combat mode',
  `Max speed ${AERIAL_COMBAT_MAX_SPEED_KMH} km/h for all aircraft`,
  'Stay inside the sky corridor — fly forward to the finish arch',
  'Hold F to fire missiles at friends',
  'Cross the sky finish line — flying below it does not count',
] as const;

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
  const finish = getAerialFinishPosition();
  if (z > finish.z) return false;
  if (y < AERIAL_FINISH_CROSS_MIN_Y) return false;
  if (Math.abs(x - finish.x) > AERIAL_FINISH_ARCH_HALF_WIDTH) return false;
  return true;
}

const aerialSplineCache = new WeakMap<object, ReturnType<typeof buildSplinePathSamples>>();

function getAerialSpline(points: Vector3[]) {
  let spline = aerialSplineCache.get(points);
  if (!spline) {
    spline = buildSplinePathSamples(points, 12);
    aerialSplineCache.set(points, spline);
  }
  return spline;
}

/** Center of the aerial corridor at world Z. */
export function sampleAerialCorridor(checkpoints: Vector3[], z: number) {
  return sampleSplineByZ(getAerialSpline(checkpoints), z);
}

/** Keep aircraft inside the sky route (like lane limits on a road). */
export function clampAerialToCorridor(
  checkpoints: Vector3[],
  x: number,
  z: number,
): {
  x: number;
  centerX: number;
  hitMin: boolean;
  hitMax: boolean;
} {
  const sample = sampleAerialCorridor(checkpoints, z);
  const centerX = sample.x;
  const minX = centerX - AERIAL_CORRIDOR_HALF_WIDTH;
  const maxX = centerX + AERIAL_CORRIDOR_HALF_WIDTH;

  let clampedX = x;
  let hitMin = false;
  let hitMax = false;
  if (x < minX) {
    clampedX = minX;
    hitMin = true;
  } else if (x > maxX) {
    clampedX = maxX;
    hitMax = true;
  }

  return { x: clampedX, centerX, hitMin, hitMax };
}

export const MISSILE_DAMAGE = 28;
export const MISSILE_COOLDOWN_SEC = 0.12;
