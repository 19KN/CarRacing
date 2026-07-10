import { Vector3 } from './types';
import { getOuterCurveSide, PathSample } from './ghatPath';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function catmullRom(
  p0: Vector3,
  p1: Vector3,
  p2: Vector3,
  p3: Vector3,
  t: number,
): Vector3 {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    z: 0.5 * ((2 * p1.z) + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
  };
}

export interface SplinePathPoint {
  x: number;
  y: number;
  z: number;
  rotation: number;
  cliffSide: 1 | -1;
  dist: number;
}

/** Smooth Catmull-Rom spline through checkpoints — fixes jagged curves. */
export function buildSplinePathSamples(
  points: Vector3[],
  subdivisions = 14,
): SplinePathPoint[] {
  if (points.length < 2) return [];

  const raw: Vector3[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let j = 0; j < subdivisions; j++) {
      raw.push(catmullRom(p0, p1, p2, p3, j / subdivisions));
    }
  }
  raw.push(points[points.length - 1]);

  const samples: SplinePathPoint[] = [];
  let dist = 0;
  for (let i = 0; i < raw.length; i++) {
    const p = raw[i];
    const prev = raw[Math.max(0, i - 2)];
    const next = raw[Math.min(raw.length - 1, i + 2)];
    if (i > 0) {
      const prevP = raw[i - 1];
      dist += Math.hypot(p.x - prevP.x, p.y - prevP.y, p.z - prevP.z);
    }

    const rotation = Math.atan2(next.x - prev.x, next.z - prev.z);
    const prevSample: PathSample = {
      x: prev.x,
      y: prev.y,
      z: prev.z,
      rotation,
      curvature: 0,
    };
    const curSample: PathSample = {
      x: p.x,
      y: p.y,
      z: p.z,
      rotation,
      curvature: 0,
    };
    const nextSample: PathSample = {
      x: next.x,
      y: next.y,
      z: next.z,
      rotation,
      curvature: 0,
    };

    samples.push({
      x: p.x,
      y: p.y,
      z: p.z,
      rotation,
      cliffSide: getOuterCurveSide(prevSample, curSample, nextSample),
      dist,
    });
  }

  smoothCliffSides(samples);
  return samples;
}

/** Prevent rapid cliff-side flipping that causes stretched wall geometry. */
function smoothCliffSides(samples: SplinePathPoint[], flipThreshold = 8): void {
  if (samples.length === 0) return;
  let stable: 1 | -1 = samples[0].cliffSide;
  let pending = 0;

  for (let i = 0; i < samples.length; i++) {
    if (samples[i].cliffSide !== stable) {
      pending++;
      if (pending >= flipThreshold) {
        stable = samples[i].cliffSide;
        pending = 0;
      }
    } else {
      pending = 0;
    }
    samples[i].cliffSide = stable;
  }
}

/** Interpolate spline position at distance along path. */
export function sampleSplineByDistance(
  samples: SplinePathPoint[],
  distance: number,
): SplinePathPoint {
  if (samples.length === 0) {
    return { x: 0, y: 0, z: 0, rotation: Math.PI, cliffSide: 1, dist: 0 };
  }
  if (distance <= samples[0].dist) return samples[0];
  const last = samples[samples.length - 1];
  if (distance >= last.dist) return last;

  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    if (distance <= b.dist) {
      const t = (distance - a.dist) / Math.max(0.001, b.dist - a.dist);
      const prev = samples[Math.max(0, i - 3)];
      const next = samples[Math.min(samples.length - 1, i + 2)];
      const rotation = Math.atan2(next.x - prev.x, next.z - prev.z);
      return {
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t),
        z: lerp(a.z, b.z, t),
        rotation,
        cliffSide: t < 0.5 ? a.cliffSide : b.cliffSide,
        dist: distance,
      };
    }
  }
  return last;
}

/** Interpolate spline at world Z (player travels toward negative z). */
export function sampleSplineByZ(
  samples: SplinePathPoint[],
  z: number,
): SplinePathPoint {
  if (samples.length === 0) {
    return { x: 0, y: 0, z, rotation: Math.PI, cliffSide: 1, dist: 0 };
  }
  if (z > samples[0].z) return samples[0];
  const last = samples[samples.length - 1];
  if (z < last.z) return last;

  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    if (z <= a.z && z >= b.z) {
      const t = (a.z - z) / Math.max(0.001, a.z - b.z);
      const prev = samples[Math.max(0, i - 3)];
      const next = samples[Math.min(samples.length - 1, i + 2)];
      const rotation = Math.atan2(next.x - prev.x, next.z - prev.z);
      return {
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t),
        z: lerp(a.z, b.z, t),
        rotation,
        cliffSide: t < 0.5 ? a.cliffSide : b.cliffSide,
        dist: lerp(a.dist, b.dist, t),
      };
    }
  }
  return last;
}
