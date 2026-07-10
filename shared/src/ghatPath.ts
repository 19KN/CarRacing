import { Vector3 } from './types';

/** Tirupati-style ghat: hairpin bends climbing through hills. */
export function generateGhatCheckpoints(length: number, count = 42): Vector3[] {
  const points: Vector3[] = [];
  const hairpins = 14;

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const z = -t * length;
    const phase = t * hairpins * Math.PI * 2;
    const envelope = 0.55 + Math.sin(t * Math.PI) * 0.45;
    const x = Math.sin(phase) * (22 * envelope) + Math.sin(t * Math.PI * 5) * 6;
    const y = Math.pow(t, 1.15) * 90 + Math.sin(t * Math.PI * 10) * 3.5;
    points.push({ x, y, z });
  }

  return points;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

/** Find segment index for a given z (player travels toward negative z). */
function findSegmentForZ(points: Vector3[], z: number): number {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (z <= a.z && z >= b.z) return i;
  }
  if (z > points[0].z) return 0;
  return Math.max(0, points.length - 2);
}

export interface PathSample {
  x: number;
  y: number;
  z: number;
  rotation: number;
  curvature: number;
}

export function samplePathByZ(points: Vector3[], z: number): PathSample {
  if (points.length < 2) {
    return { x: 0, y: 0, z, rotation: Math.PI, curvature: 0 };
  }

  const idx = findSegmentForZ(points, z);
  const a = points[idx];
  const b = points[idx + 1];
  const t = clamp01((a.z - z) / Math.max(0.001, a.z - b.z));

  const x = lerp(a.x, b.x, t);
  const y = lerp(a.y, b.y, t);
  const dz = b.z - a.z;
  const dx = b.x - a.x;
  const rotation = Math.atan2(dx, dz);

  const prev = points[Math.max(0, idx - 1)];
  const next = points[Math.min(points.length - 1, idx + 2)];
  const curvature = Math.abs(next.x - prev.x);

  return { x, y, z, rotation, curvature };
}

export function getPathArcLength(points: Vector3[]): number {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    len += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  }
  return len;
}

export function samplePathByDistance(points: Vector3[], distance: number): PathSample {
  if (points.length < 2) {
    return { x: 0, y: 0, z: 0, rotation: Math.PI, curvature: 0 };
  }

  const totalLen = getPathArcLength(points);
  const clampedDist = Math.max(0, Math.min(distance, totalLen));
  let traveled = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    if (traveled + segLen >= clampedDist || i === points.length - 2) {
      const t = segLen > 0.001 ? clamp01((clampedDist - traveled) / segLen) : 0;
      const x = lerp(a.x, b.x, t);
      const y = lerp(a.y, b.y, t);
      const z = lerp(a.z, b.z, t);
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const rotation = Math.atan2(dx, dz);

      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 2)];
      const curvature = Math.abs(next.x - prev.x);

      return { x, y, z, rotation, curvature };
    }
    traveled += segLen;
  }

  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  return {
    x: last.x,
    y: last.y,
    z: last.z,
    rotation: Math.atan2(last.x - prev.x, last.z - prev.z),
    curvature: 0,
  };
}

export interface PathSegmentTransform {
  x: number;
  y: number;
  z: number;
  rotation: number;
  cliffSide: 1 | -1;
}

/** Which side of the path is the outside of a curve (barrier / cliff edge). */
export function getOuterCurveSide(
  prev: PathSample,
  sample: PathSample,
  next: PathSample,
): 1 | -1 {
  const lx = -(next.z - prev.z);
  const lz = next.x - prev.x;
  const ax = next.x - 2 * sample.x + prev.x;
  const az = next.z - 2 * sample.z + prev.z;
  const dot = ax * lx + az * lz;
  return (dot >= 0 ? 1 : -1) as 1 | -1;
}

/** Build overlapping road segment transforms along the ghat path. */
export function buildPathSegments(points: Vector3[], stepDist = 10): PathSegmentTransform[] {
  const segments: PathSegmentTransform[] = [];
  if (points.length < 2) return segments;

  const totalLen = getPathArcLength(points);
  for (let d = stepDist / 2; d <= totalLen + stepDist / 2; d += stepDist) {
    const dist = Math.min(d, totalLen);
    const sample = samplePathByDistance(points, dist);
    const prev = samplePathByDistance(points, Math.max(0, dist - 4));
    const next = samplePathByDistance(points, Math.min(totalLen, dist + 4));
    const rotation = Math.atan2(next.x - prev.x, next.z - prev.z);
    const cliffSide = getOuterCurveSide(prev, sample, next);

    segments.push({
      x: sample.x,
      y: sample.y,
      z: sample.z,
      rotation,
      cliffSide,
    });
  }

  return segments;
}

/** Dense samples for smooth walls that follow curves. */
export function buildPathWallSamples(points: Vector3[], stepDist = 2.5): PathSegmentTransform[] {
  const segments: PathSegmentTransform[] = [];
  if (points.length < 2) return segments;

  const totalLen = getPathArcLength(points);
  for (let d = 0; d <= totalLen; d += stepDist) {
    const dist = Math.min(d, totalLen);
    const sample = samplePathByDistance(points, dist);
    const prev = samplePathByDistance(points, Math.max(0, dist - 1.5));
    const next = samplePathByDistance(points, Math.min(totalLen, dist + 1.5));
    const rotation = Math.atan2(next.x - prev.x, next.z - prev.z);
    const cliffSide = getOuterCurveSide(prev, sample, next);

    segments.push({
      x: sample.x,
      y: sample.y,
      z: sample.z,
      rotation,
      cliffSide,
    });
  }

  return segments;
}
