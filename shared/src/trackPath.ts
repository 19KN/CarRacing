import { Vector3 } from './types';

export const MODULAR_TILE_SCALE = 10;
const STRAIGHT_TILES = 2; // each split piece spans 2 units on Z
const CURVE_RADIUS = 1; // one tile radius in the kit

export type ModularSegment =
  | { type: 'straight'; tiles: number }
  | { type: 'curveRight' }
  | { type: 'curveLeft' };

const F1_MODULAR_LAYOUT: ModularSegment[] = [
  { type: 'straight', tiles: 10 },
  { type: 'curveRight' },
  { type: 'straight', tiles: 5 },
  { type: 'curveLeft' },
  { type: 'straight', tiles: 4 },
  { type: 'curveRight' },
  { type: 'curveRight' },
  { type: 'straight', tiles: 6 },
  { type: 'curveLeft' },
  { type: 'straight', tiles: 5 },
  { type: 'curveRight' },
  { type: 'straight', tiles: 8 },
];

interface Cursor {
  x: number;
  y: number;
  z: number;
  heading: number;
}

function rightVector(heading: number) {
  return { x: -Math.cos(heading), z: Math.sin(heading) };
}

function forwardVector(heading: number) {
  return { x: Math.sin(heading), z: Math.cos(heading) };
}

function appendStraight(points: Vector3[], cursor: Cursor, tiles: number) {
  const length = tiles * STRAIGHT_TILES * MODULAR_TILE_SCALE;
  const steps = Math.max(4, tiles * 3);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const fwd = forwardVector(cursor.heading);
    points.push({
      x: cursor.x + fwd.x * length * t,
      y: 0,
      z: cursor.z + fwd.z * length * t,
    });
  }
  const fwd = forwardVector(cursor.heading);
  cursor.x += fwd.x * length;
  cursor.z += fwd.z * length;
}

function appendCurve(points: Vector3[], cursor: Cursor, turn: 'curveRight' | 'curveLeft') {
  const radius = CURVE_RADIUS * MODULAR_TILE_SCALE;
  const sweep = turn === 'curveRight' ? -Math.PI / 2 : Math.PI / 2;
  const right = rightVector(cursor.heading);
  const centerX = cursor.x + right.x * radius;
  const centerZ = cursor.z + right.z * radius;
  const startAngle = Math.atan2(cursor.x - centerX, cursor.z - centerZ);
  const steps = 14;

  for (let i = 1; i <= steps; i++) {
    const angle = startAngle + (sweep * i) / steps;
    points.push({
      x: centerX + Math.sin(angle) * radius,
      y: Math.sin((i / steps) * Math.PI) * 0.1,
      z: centerZ + Math.cos(angle) * radius,
    });
  }

  const endAngle = startAngle + sweep;
  cursor.x = centerX + Math.sin(endAngle) * radius;
  cursor.z = centerZ + Math.cos(endAngle) * radius;
  cursor.heading += sweep;
}

export function buildModularTrackLayout(): ModularSegment[] {
  return F1_MODULAR_LAYOUT;
}

export function buildModularCenterline(startZ = 30, intensity = 1): Vector3[] {
  const layout = F1_MODULAR_LAYOUT;
  const points: Vector3[] = [{ x: 0, y: 0, z: startZ }];
  const cursor: Cursor = { x: 0, y: 0, z: startZ, heading: Math.PI };

  for (const segment of layout) {
    const tileMul = Math.max(0.75, intensity);
    if (segment.type === 'straight') {
      appendStraight(points, cursor, Math.max(1, Math.round(segment.tiles * tileMul)));
    } else {
      appendCurve(points, cursor, segment.type);
    }
  }

  return points;
}

export function generateF1TrackCheckpoints(targetLength: number, intensity = 1, startZ = 30): Vector3[] {
  return buildModularCenterline(startZ, intensity);
}

export function estimateTrackLength(points: Vector3[]): number {
  if (points.length < 2) return 4000;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    total += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  }
  return total;
}

export function getTrackCentroid(points: Vector3[]): { x: number; z: number } {
  if (points.length === 0) return { x: 0, z: 0 };
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, z: acc.z + p.z }), { x: 0, z: 0 });
  return { x: sum.x / points.length, z: sum.z / points.length };
}
