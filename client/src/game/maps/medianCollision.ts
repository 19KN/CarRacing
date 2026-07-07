import type { CollisionSeverity } from '@indian-racing/shared';
import { HEALTH_DAMAGE } from '@indian-racing/shared';
import { detectCollisionSeverity } from '../physics/vehiclePhysics';

export interface MedianObstacle {
  id: string;
  type: 'tree' | 'person' | 'pet';
  position: { x: number; z: number };
  halfWidth: number;
  halfLength: number;
  rotation: number;
}

export const medianRegistry = { obstacles: [] as MedianObstacle[] };

const PLAYER_HALF_WIDTH = 0.95;
const PLAYER_HALF_LENGTH = 2.1;

export function findMedianObstacleCollision(
  px: number,
  pz: number,
  obstacles: MedianObstacle[],
): MedianObstacle | null {
  for (const obs of obstacles) {
    const dx = px - obs.position.x;
    const dz = pz - obs.position.z;
    const cos = Math.cos(obs.rotation);
    const sin = Math.sin(obs.rotation);
    const localX = dx * cos + dz * sin;
    const localZ = -dx * sin + dz * cos;

    if (
      Math.abs(localX) < PLAYER_HALF_WIDTH + obs.halfWidth
      && Math.abs(localZ) < PLAYER_HALF_LENGTH + obs.halfLength
    ) {
      return obs;
    }
  }
  return null;
}

export function getMedianCollisionDamage(
  type: MedianObstacle['type'],
  speedKmh: number,
): { severity: CollisionSeverity; damage: number } {
  let severity = detectCollisionSeverity(speedKmh);
  if (type === 'tree' && speedKmh > 60) severity = 'heavy';
  if (type === 'person' && speedKmh > 40) severity = 'large';
  const base = HEALTH_DAMAGE[severity] ?? 4;
  const multiplier = type === 'tree' ? 1.2 : type === 'person' ? 1 : 0.6;
  return { severity, damage: Math.round(base * multiplier) };
}
