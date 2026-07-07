import { Vector3 } from './types';

interface TrackSection {
  straightFrac?: number;
  arcRadius?: number;
  sweepDeg?: number;
}

const F1_TRACK_TEMPLATE: TrackSection[] = [
  { straightFrac: 0.22 },
  { arcRadius: 82, sweepDeg: 52 },
  { straightFrac: 0.09 },
  { arcRadius: 46, sweepDeg: -68 },
  { straightFrac: 0.07 },
  { arcRadius: 38, sweepDeg: 88 },
  { straightFrac: 0.08 },
  { arcRadius: 28, sweepDeg: -115 },
  { straightFrac: 0.11 },
  { arcRadius: 105, sweepDeg: 38 },
  { straightFrac: 0.08 },
  { arcRadius: 58, sweepDeg: -48 },
  { straightFrac: 0.13 },
];

function arcLength(radius: number, sweepDeg: number): number {
  return radius * Math.abs(sweepDeg) * (Math.PI / 180);
}

function walkStraight(
  points: Vector3[],
  x: number,
  y: number,
  z: number,
  heading: number,
  length: number,
): { x: number; y: number; z: number } {
  let px = x;
  let py = y;
  let pz = z;
  let remaining = length;
  while (remaining > 0) {
    const step = Math.min(remaining, 35);
    px += Math.sin(heading) * step;
    pz += Math.cos(heading) * step;
    remaining -= step;
    points.push({ x: px, y: py, z: pz });
  }
  return { x: px, y: py, z: pz };
}

function walkArc(
  points: Vector3[],
  x: number,
  y: number,
  z: number,
  heading: number,
  radius: number,
  sweepDeg: number,
): { x: number; y: number; z: number; heading: number } {
  const sweep = (sweepDeg * Math.PI) / 180;
  const len = arcLength(radius, sweepDeg);
  const steps = Math.max(5, Math.ceil(len / 22));
  const dAngle = sweep / steps;
  let px = x;
  let py = y;
  let pz = z;
  let h = heading;

  for (let i = 0; i < steps; i++) {
    const midH = h + dAngle / 2;
    const chord = 2 * radius * Math.sin(Math.abs(dAngle) / 2);
    px += Math.sin(midH) * chord;
    pz += Math.cos(midH) * chord;
    py += Math.sin((i / steps) * Math.PI) * 0.12;
    h += dAngle;
    points.push({ x: px, y: py, z: pz });
  }

  return { x: px, y: py, z: pz, heading: h };
}

/** F1-style track: long straights + hairpins, chicanes, and sweepers */
export function generateF1TrackCheckpoints(
  targetLength: number,
  intensity = 1,
  startZ = 30,
): Vector3[] {
  const points: Vector3[] = [{ x: 0, y: 0, z: startZ }];

  let arcTotal = 0;
  let straightFracTotal = 0;
  for (const s of F1_TRACK_TEMPLATE) {
    if (s.straightFrac) straightFracTotal += s.straightFrac;
    if (s.arcRadius && s.sweepDeg) {
      arcTotal += arcLength(s.arcRadius / intensity, s.sweepDeg * intensity);
    }
  }

  const straightBudget = Math.max(targetLength - arcTotal, targetLength * 0.35);
  let x = 0;
  let y = 0;
  let z = startZ;
  let heading = Math.PI;

  for (const section of F1_TRACK_TEMPLATE) {
    if (section.straightFrac) {
      const len = straightBudget * (section.straightFrac / straightFracTotal);
      const next = walkStraight(points, x, y, z, heading, len);
      x = next.x;
      y = next.y;
      z = next.z;
    } else if (section.arcRadius && section.sweepDeg) {
      const result = walkArc(
        points,
        x,
        y,
        z,
        heading,
        section.arcRadius / intensity,
        section.sweepDeg * intensity,
      );
      x = result.x;
      y = result.y;
      z = result.z;
      heading = result.heading;
    }
  }

  return points;
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
