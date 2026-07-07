export interface PathPoint {
  x: number;
  y: number;
  z: number;
}

export interface RoadSample {
  x: number;
  y: number;
  z: number;
  rotation: number;
  distance: number;
}

export interface ArcLengthData {
  cumulative: number[];
  total: number;
}

/** Build drivable centerline from race start through map checkpoints */
export function buildRoadCenterline(checkpoints: PathPoint[], startZ = 30): PathPoint[] {
  if (checkpoints.length === 0) return [{ x: 0, y: 0, z: startZ }];
  const first = checkpoints[0];
  return [
    { x: first.x * 0.08, y: 0, z: startZ },
    { x: first.x * 0.35, y: first.y * 0.15, z: startZ - 25 },
    ...checkpoints,
  ];
}

export function buildArcLengthTable(centerline: PathPoint[]): ArcLengthData {
  const cumulative = [0];
  for (let i = 1; i < centerline.length; i++) {
    const a = centerline[i - 1];
    const b = centerline[i];
    cumulative.push(cumulative[i - 1] + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
  }
  return { cumulative, total: cumulative[cumulative.length - 1] ?? 0 };
}

function interpolateSegment(
  a: PathPoint,
  b: PathPoint,
  t: number,
  distA: number,
  distB: number,
): RoadSample {
  const x = a.x + (b.x - a.x) * t;
  const y = a.y + (b.y - a.y) * t;
  const z = a.z + (b.z - a.z) * t;
  const rotation = Math.atan2(b.x - a.x, a.z - b.z);
  return { x, y, z, rotation, distance: distA + (distB - distA) * t };
}

export function sampleRoadAtDistance(
  centerline: PathPoint[],
  arc: ArcLengthData,
  distance: number,
): RoadSample {
  if (centerline.length === 0) return { x: 0, y: 0, z: 0, rotation: Math.PI, distance: 0 };
  if (centerline.length === 1) {
    return { ...centerline[0], rotation: Math.PI, distance: 0 };
  }

  const d = Math.max(0, Math.min(distance, arc.total));
  for (let i = 0; i < centerline.length - 1; i++) {
    const distA = arc.cumulative[i];
    const distB = arc.cumulative[i + 1];
    if (d >= distA && d <= distB) {
      const segLen = distB - distA || 1;
      const t = (d - distA) / segLen;
      return interpolateSegment(centerline[i], centerline[i + 1], t, distA, distB);
    }
  }

  const last = centerline[centerline.length - 1];
  const prev = centerline[centerline.length - 2];
  return {
    ...last,
    rotation: Math.atan2(last.x - prev.x, prev.z - last.z),
    distance: arc.total,
  };
}

export function sampleRoadNearest(
  centerline: PathPoint[],
  arc: ArcLengthData,
  x: number,
  z: number,
): RoadSample {
  if (centerline.length < 2) {
    return { x: 0, y: 0, z, rotation: Math.PI, distance: 0 };
  }

  let bestDistSq = Infinity;
  let best: RoadSample = { x: 0, y: 0, z, rotation: Math.PI, distance: 0 };

  for (let i = 0; i < centerline.length - 1; i++) {
    const a = centerline[i];
    const b = centerline[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const segLenSq = dx * dx + dz * dz;
    const t = segLenSq > 0
      ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / segLenSq))
      : 0;

    const px = a.x + dx * t;
    const pz = a.z + dz * t;
    const distSq = (x - px) ** 2 + (z - pz) ** 2;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      const distA = arc.cumulative[i];
      const distB = arc.cumulative[i + 1];
      best = interpolateSegment(a, b, t, distA, distB);
    }
  }

  return best;
}

/** @deprecated Use sampleRoadAtDistance or sampleRoadNearest */
export function sampleRoadAtZ(centerline: PathPoint[], z: number): RoadSample {
  const arc = buildArcLengthTable(centerline);
  let best = sampleRoadAtDistance(centerline, arc, 0);
  let bestDz = Infinity;
  for (let d = 0; d <= arc.total; d += 20) {
    const s = sampleRoadAtDistance(centerline, arc, d);
    const dz = Math.abs(s.z - z);
    if (dz < bestDz) {
      bestDz = dz;
      best = s;
    }
  }
  return best;
}

export function getRoadLengthFromPoints(points: PathPoint[]): number {
  return buildArcLengthTable(buildRoadCenterline(points)).total;
}

export function offsetFromRoadSample(
  sample: RoadSample,
  localX: number,
  localZ = 0,
): { x: number; z: number } {
  const cos = Math.cos(sample.rotation);
  const sin = Math.sin(sample.rotation);
  return {
    x: sample.x + localX * cos - localZ * sin,
    z: sample.z + localX * sin + localZ * cos,
  };
}
