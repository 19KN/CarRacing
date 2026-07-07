import type { ArcLengthData, PathPoint } from './roadPath';
import { buildRoadCenterline, sampleRoadAtDistance } from './roadPath';

const MEDIAN_W = 3;
const CARRIAGE_W = 7;
const SEG_LEN = 28;
const LEFT_CARRIAGEWAY_CENTER_X = -(MEDIAN_W / 2 + CARRIAGE_W / 2);

export interface SpeedBreaker {
  id: string;
  x: number;
  z: number;
  rotation: number;
  halfWidth: number;
  halfLength: number;
}

export const speedBreakerRegistry = { breakers: [] as SpeedBreaker[] };

export function generateSpeedBreakers(
  checkpoints: PathPoint[],
  roadLength: number,
  arcTable: ArcLengthData,
  centerline: PathPoint[],
): SpeedBreaker[] {
  const segCount = Math.ceil(roadLength / SEG_LEN);
  const breakers: SpeedBreaker[] = [];

  for (let i = 0; i < segCount; i++) {
    if (i % 4 !== 1) continue;
    const dist = Math.min(roadLength - SEG_LEN * 0.5, i * SEG_LEN + SEG_LEN * 0.5);
    const sample = sampleRoadAtDistance(centerline, arcTable, dist);
    if (Math.abs(sample.rotation - Math.PI) > 0.35) continue;

    const cos = Math.cos(sample.rotation);
    const sin = Math.sin(sample.rotation);
    const worldX = sample.x + LEFT_CARRIAGEWAY_CENTER_X * cos;
    const worldZ = sample.z + LEFT_CARRIAGEWAY_CENTER_X * sin;

    breakers.push({
      id: `breaker_${i}`,
      x: worldX,
      z: worldZ,
      rotation: sample.rotation,
      halfWidth: 3.4,
      halfLength: 1.9,
    });
  }

  speedBreakerRegistry.breakers = breakers;
  return breakers;
}

export function findSpeedBreakerHit(
  px: number,
  pz: number,
  breakers: SpeedBreaker[],
): SpeedBreaker | null {
  for (const b of breakers) {
    const dx = px - b.x;
    const dz = pz - b.z;
    const cos = Math.cos(b.rotation);
    const sin = Math.sin(b.rotation);
    const localX = dx * cos + dz * sin;
    const localZ = -dx * sin + dz * cos;

    if (Math.abs(localX) < b.halfWidth && Math.abs(localZ) < b.halfLength) {
      return b;
    }
  }
  return null;
}

export function getSpeedBumpIntensity(speedKmh: number): number {
  if (speedKmh < 12) return 0;
  return Math.min(0.55, 0.12 + (speedKmh / 300) * 0.45);
}
