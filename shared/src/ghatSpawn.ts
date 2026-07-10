import { Vector3 } from './types';
import { buildSplinePathSamples, sampleSplineByZ } from './ghatSpline';
import { RACE_ROW_SPACING, SpawnPosition } from './spawnPositions';

export const GHAT_ROAD_SURFACE_Y_OFFSET = 0.36;
/** Match flat highway ride height above asphalt top. */
export const GHAT_VEHICLE_CLEARANCE = 0.4;
export const GHAT_SINGLE_LANE_OFFSET = -1.55;
/** Side-by-side pair on the 7 m ghat carriageway. */
export const GHAT_SPAWN_LATERAL_PAIR = [-1.1, 1.1] as const;
/** Hill road combat mode — all vehicles capped for missile fights. */
export const GHAT_COMBAT_MAX_SPEED_KMH = 90;
export const GHAT_COMBAT_RESPAWN_HEALTH = 100;
export const DEFAULT_RESPAWN_HEALTH = 50;
export const GHAT_COMBAT_START_RULES = [
  'Ghat combat mode',
  `Max speed ${GHAT_COMBAT_MAX_SPEED_KMH} km/h for all vehicles`,
  'Hold F to fire missiles at friends',
  'Respawn with full health after explosion',
] as const;
/** Hill road begins here (first checkpoint). */
export const GHAT_START_Z = 0;

const splineCache = new WeakMap<object, ReturnType<typeof buildSplinePathSamples>>();

function getGhatSpline(points: Vector3[]) {
  let spline = splineCache.get(points);
  if (!spline) {
    spline = buildSplinePathSamples(points, 14);
    splineCache.set(points, spline);
  }
  return spline;
}

export function getGhatLanePosition(
  points: Vector3[],
  z: number,
  laneOffset = GHAT_SINGLE_LANE_OFFSET,
): { x: number; y: number; z: number; rotation: number; pitch: number } {
  const spline = getGhatSpline(points);
  const sample = sampleSplineByZ(spline, z);
  const ahead = sampleSplineByZ(spline, z - 5);
  const perpX = Math.cos(sample.rotation);
  const run = Math.hypot(ahead.x - sample.x, ahead.z - sample.z);
  const rise = ahead.y - sample.y;
  const pitch = run > 0.05 ? -Math.atan2(rise, run) : 0;

  return {
    x: sample.x + perpX * laneOffset,
    y: sample.y + GHAT_ROAD_SURFACE_Y_OFFSET + GHAT_VEHICLE_CLEARANCE,
    z: sample.z,
    rotation: sample.rotation,
    pitch,
  };
}

/**
 * Ghat grid spawn on the original hill road — no flat runway added.
 * 4 players → 2 side-by-side at the start, 2 side-by-side one row ahead on the road.
 */
export function getMapRespawnHealth(roadType?: string): number {
  return roadType === 'hill' ? GHAT_COMBAT_RESPAWN_HEALTH : DEFAULT_RESPAWN_HEALTH;
}

export function getGhatSpawnPosition(
  playerIndex: number,
  totalPlayers: number,
  checkpoints: Vector3[],
): SpawnPosition {
  const startZ = checkpoints[0]?.z ?? GHAT_START_Z;

  if (totalPlayers <= 1) {
    const lane = getGhatLanePosition(checkpoints, startZ);
    return { x: lane.x, y: lane.y, z: lane.z, rotation: lane.rotation };
  }

  const col = playerIndex % 2;
  const row = Math.floor(playerIndex / 2);
  const lateral = GHAT_SPAWN_LATERAL_PAIR[col];
  const z = startZ - row * RACE_ROW_SPACING;
  const lane = getGhatLanePosition(checkpoints, z, lateral);

  return { x: lane.x, y: lane.y, z: lane.z, rotation: lane.rotation };
}
