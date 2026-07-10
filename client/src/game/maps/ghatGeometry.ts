import * as THREE from 'three';
import type { SplinePathPoint } from '@indian-racing/shared';

export interface PathFrame {
  x: number;
  y: number;
  z: number;
  rightX: number;
  rightY: number;
  rightZ: number;
  forwardX: number;
  forwardY: number;
  forwardZ: number;
  cliffSide: 1 | -1;
  dist: number;
}

const _edge1 = new THREE.Vector3();
const _edge2 = new THREE.Vector3();

/** Vertical offset of the rendered asphalt ribbon above path centerline Y. */
export const GHAT_ROAD_SURFACE_Y_OFFSET = 0.36;

function isDegenerateQuad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3): boolean {
  _edge1.subVectors(b, a);
  _edge2.subVectors(d, a);
  const area1 = _edge1.cross(_edge2).length();
  _edge1.subVectors(c, a);
  const area2 = _edge1.cross(_edge2).length();
  return area1 < 0.05 && area2 < 0.05;
}

export function buildPathFrames(samples: SplinePathPoint[]): PathFrame[] {
  const frames: PathFrame[] = [];

  for (let i = 0; i < samples.length; i++) {
    const prev = samples[Math.max(0, i - 1)];
    const next = samples[Math.min(samples.length - 1, i + 1)];
    const rotation = Math.atan2(next.x - prev.x, next.z - prev.z);

    const forwardX = Math.sin(rotation);
    const forwardZ = Math.cos(rotation);
    const rightX = Math.cos(rotation);
    const rightZ = -Math.sin(rotation);

    frames.push({
      x: samples[i].x,
      y: samples[i].y,
      z: samples[i].z,
      rightX,
      rightY: 0,
      rightZ,
      forwardX,
      forwardY: 0,
      forwardZ,
      cliffSide: 1,
      dist: samples[i].dist,
    });
  }
  return frames;
}

function pushQuad(
  positions: number[],
  normals: number[],
  uvs: number[],
  indices: number[],
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  d: THREE.Vector3,
  normal: THREE.Vector3,
  u0: number,
  u1: number,
) {
  if (isDegenerateQuad(a, b, c, d)) return;

  const base = positions.length / 3;
  const push = (v: THREE.Vector3, u: number, vCoord: number) => {
    positions.push(v.x, v.y, v.z);
    normals.push(normal.x, normal.y, normal.z);
    uvs.push(u, vCoord);
  };
  push(a, u0, 0);
  push(b, u0, 1);
  push(c, u1, 1);
  push(d, u1, 0);
  indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

export function buildRoadRibbon(
  frames: PathFrame[],
  roadHalf: number,
  shoulderW: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const totalHalf = roadHalf + shoulderW;
  const normal = new THREE.Vector3(0, 1, 0);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const d = new THREE.Vector3();
  const yOff = 0.22;

  for (let i = 0; i < frames.length - 1; i++) {
    const f0 = frames[i];
    const f1 = frames[i + 1];
    const u0 = f0.dist / 8;
    const u1 = f1.dist / 8;

    const setCorner = (f: PathFrame, lat: number, out: THREE.Vector3) => {
      out.set(
        f.x + f.rightX * lat,
        f.y + yOff,
        f.z + f.rightZ * lat,
      );
    };

    setCorner(f0, -totalHalf, a);
    setCorner(f0, totalHalf, b);
    setCorner(f1, totalHalf, c);
    setCorner(f1, -totalHalf, d);
    pushQuad(positions, normals, uvs, indices, a, b, c, d, normal, u0, u1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

/** Black asphalt — full road width including shoulders. */
export function buildAsphaltRibbon(
  frames: PathFrame[],
  roadHalf: number,
  shoulderW: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const normal = new THREE.Vector3(0, 1, 0);
  const totalHalf = roadHalf + shoulderW;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const d = new THREE.Vector3();
  const yOff = GHAT_ROAD_SURFACE_Y_OFFSET;

  for (let i = 0; i < frames.length - 1; i++) {
    const f0 = frames[i];
    const f1 = frames[i + 1];
    const u0 = f0.dist / 6;
    const u1 = f1.dist / 6;

    a.set(f0.x + f0.rightX * -totalHalf, f0.y + yOff, f0.z + f0.rightZ * -totalHalf);
    b.set(f0.x + f0.rightX * totalHalf, f0.y + yOff, f0.z + f0.rightZ * totalHalf);
    c.set(f1.x + f1.rightX * totalHalf, f1.y + yOff, f1.z + f1.rightZ * totalHalf);
    d.set(f1.x + f1.rightX * -totalHalf, f1.y + yOff, f1.z + f1.rightZ * -totalHalf);
    if (isDegenerateQuad(a, b, c, d)) continue;

    const base = positions.length / 3;
    const push = (v: THREE.Vector3, u: number, vCoord: number) => {
      positions.push(v.x, v.y, v.z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(u, vCoord);
    };
    push(a, u0, 0); push(b, u0, 1); push(c, u1, 1); push(d, u1, 0);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

export function buildMarkingRibbon(
  frames: PathFrame[],
  dashLen = 3,
  gapLen = 4,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const normal = new THREE.Vector3(0, 1, 0);
  const yOff = 0.4;
  const halfW = 0.06;
  const cycle = dashLen + gapLen;

  for (let i = 0; i < frames.length - 1; i++) {
    const f0 = frames[i];
    const f1 = frames[i + 1];
    const phase = f0.dist % cycle;
    if (phase > dashLen) continue;

    const a = new THREE.Vector3(f0.x - f0.rightX * halfW, f0.y + yOff, f0.z - f0.rightZ * halfW);
    const b = new THREE.Vector3(f0.x + f0.rightX * halfW, f0.y + yOff, f0.z + f0.rightZ * halfW);
    const c = new THREE.Vector3(f1.x + f1.rightX * halfW, f1.y + yOff, f1.z + f1.rightZ * halfW);
    const d = new THREE.Vector3(f1.x - f1.rightX * halfW, f1.y + yOff, f1.z - f1.rightZ * halfW);
    const base = positions.length / 3;
    const push = (v: THREE.Vector3) => {
      positions.push(v.x, v.y, v.z);
      normals.push(normal.x, normal.y, normal.z);
    };
    push(a); push(b); push(c); push(d);
    if (isDegenerateQuad(a, b, c, d)) {
      positions.splice(-12, 12);
      normals.splice(-12, 12);
      continue;
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  return geo;
}

export function buildEdgeLineRibbon(
  frames: PathFrame[],
  roadHalf: number,
  side: -1 | 1,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const normal = new THREE.Vector3(0, 1, 0);
  const yOff = 0.4;
  const halfW = 0.05;
  const lat = side * roadHalf;

  for (let i = 0; i < frames.length - 1; i++) {
    const f0 = frames[i];
    const f1 = frames[i + 1];
    const a = new THREE.Vector3(
      f0.x + f0.rightX * (lat - halfW),
      f0.y + yOff,
      f0.z + f0.rightZ * (lat - halfW),
    );
    const b = new THREE.Vector3(
      f0.x + f0.rightX * (lat + halfW),
      f0.y + yOff,
      f0.z + f0.rightZ * (lat + halfW),
    );
    const c = new THREE.Vector3(
      f1.x + f1.rightX * (lat + halfW),
      f1.y + yOff,
      f1.z + f1.rightZ * (lat + halfW),
    );
    const d = new THREE.Vector3(
      f1.x + f1.rightX * (lat - halfW),
      f1.y + yOff,
      f1.z + f1.rightZ * (lat - halfW),
    );
    const base = positions.length / 3;
    const push = (v: THREE.Vector3) => {
      positions.push(v.x, v.y, v.z);
      normals.push(normal.x, normal.y, normal.z);
    };
    push(a); push(b); push(c); push(d);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  return geo;
}

/** Right side = rocky cliff hill (always). */
export const RIGHT_BANK: 1 = 1;
/** Left side = grass + trees (always). */
export const LEFT_BANK: -1 = -1;

export function buildCliffRibbon(
  frames: PathFrame[],
  roadHalf: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const d = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const side = RIGHT_BANK;

  for (let i = 0; i < frames.length - 1; i++) {
    const f0 = frames[i];
    const f1 = frames[i + 1];
    const edge0 = roadHalf + 0.4;
    const edge1 = roadHalf + 14;
    const rise0 = 14 + (i % 3) * 2;
    const rise1 = 14 + ((i + 1) % 3) * 2;
    const u0 = f0.dist / 12;
    const u1 = f1.dist / 12;

    a.set(f0.x + f0.rightX * side * edge0, f0.y, f0.z + f0.rightZ * side * edge0);
    b.set(f0.x + f0.rightX * side * edge1, f0.y + rise0, f0.z + f0.rightZ * side * edge1);
    c.set(f1.x + f1.rightX * side * edge1, f1.y + rise1, f1.z + f1.rightZ * side * edge1);
    d.set(f1.x + f1.rightX * side * edge0, f1.y, f1.z + f1.rightZ * side * edge0);
    if (isDegenerateQuad(a, b, c, d)) continue;

    normal.set(f0.rightX * side, 0.2, f0.rightZ * side).normalize();

    const base = positions.length / 3;
    const push = (v: THREE.Vector3, u: number, vCoord: number) => {
      positions.push(v.x, v.y, v.z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(u, vCoord);
    };
    push(a, u0, 0); push(b, u0, 1); push(c, u1, 1); push(d, u1, 0);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

export function buildGrassShoulderRibbon(
  frames: PathFrame[],
  roadHalf: number,
  bankSide: 1 | -1,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const normal = new THREE.Vector3(0, 1, 0);
  const near = roadHalf + 0.3;
  const far = roadHalf + 4.5;

  for (let i = 0; i < frames.length - 1; i++) {
    const f0 = frames[i];
    const f1 = frames[i + 1];
    const u0 = f0.dist / 10;
    const u1 = f1.dist / 10;

    const a = new THREE.Vector3(f0.x + f0.rightX * bankSide * near, f0.y, f0.z + f0.rightZ * bankSide * near);
    const b = new THREE.Vector3(f0.x + f0.rightX * bankSide * far, f0.y - 0.5, f0.z + f0.rightZ * bankSide * far);
    const c = new THREE.Vector3(f1.x + f1.rightX * bankSide * far, f1.y - 0.5, f1.z + f1.rightZ * bankSide * far);
    const d = new THREE.Vector3(f1.x + f1.rightX * bankSide * near, f1.y, f1.z + f1.rightZ * bankSide * near);
    if (isDegenerateQuad(a, b, c, d)) continue;

    const base = positions.length / 3;
    const push = (v: THREE.Vector3, u: number, vCoord: number) => {
      positions.push(v.x, v.y, v.z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(u, vCoord);
    };
    push(a, u0, 0); push(b, u0, 1); push(c, u1, 1); push(d, u1, 0);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

/** Grassy hill + valley fill on one side of the road. */
export function buildGrassHillRibbon(
  frames: PathFrame[],
  roadHalf: number,
  bankSide: 1 | -1,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const normal = new THREE.Vector3(0, 1, 0);
  const side = bankSide;

  const pushStrip = (
    f0: PathFrame,
    f1: PathFrame,
    near: number,
    far: number,
    y0a: number,
    y0b: number,
    y1a: number,
    y1b: number,
    u0: number,
    u1: number,
  ) => {
    const a = new THREE.Vector3(
      f0.x + f0.rightX * side * near,
      f0.y + y0a,
      f0.z + f0.rightZ * side * near,
    );
    const b = new THREE.Vector3(
      f0.x + f0.rightX * side * far,
      f0.y + y0b,
      f0.z + f0.rightZ * side * far,
    );
    const c = new THREE.Vector3(
      f1.x + f1.rightX * side * far,
      f1.y + y1b,
      f1.z + f1.rightZ * side * far,
    );
    const d = new THREE.Vector3(
      f1.x + f1.rightX * side * near,
      f1.y + y1a,
      f1.z + f1.rightZ * side * near,
    );
    if (isDegenerateQuad(a, b, c, d)) return;

    const base = positions.length / 3;
    const push = (v: THREE.Vector3, u: number, vCoord: number) => {
      positions.push(v.x, v.y, v.z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(u, vCoord);
    };
    push(a, u0, 0); push(b, u0, 1); push(c, u1, 1); push(d, u1, 0);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  for (let i = 0; i < frames.length - 1; i++) {
    const f0 = frames[i];
    const f1 = frames[i + 1];
    const u0 = f0.dist / 12;
    const u1 = f1.dist / 12;
    const h0 = 8 + (i % 4);
    const h1 = 8 + ((i + 1) % 4);

    pushStrip(f0, f1, roadHalf + 0.15, roadHalf + 8, 0, 0, 0, 0, u0, u1);
    pushStrip(f0, f1, roadHalf + 8, roadHalf + 25, 0, h0 * 0.3, 0, h1 * 0.3, u0, u1);
    pushStrip(f0, f1, roadHalf + 25, roadHalf + 50, h0 * 0.3, h0 * 0.7, h1 * 0.3, h1 * 0.7, u0, u1);
    pushStrip(f0, f1, roadHalf + 50, roadHalf + 80, h0 * 0.7, h0, h1 * 0.7, h1, u0, u1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

function nearestFrameIndex(frames: PathFrame[], x: number, z: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const dx = x - f.x;
    const dz = z - f.z;
    const d = dx * dx + dz * dz;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** Mirror ribbon geometry from one roadside to the other (exact copy of hills). */
export function mirrorRibbonAcrossPath(
  source: THREE.BufferGeometry,
  frames: PathFrame[],
): THREE.BufferGeometry {
  const srcPos = source.getAttribute('position');
  const srcNorm = source.getAttribute('normal');
  const srcUv = source.getAttribute('uv');
  const srcIdx = source.getIndex();
  if (!srcPos || srcPos.count === 0) return source.clone();

  const positions = new Float32Array(srcPos.count * 3);
  const normals = new Float32Array(srcNorm.count * 3);

  for (let i = 0; i < srcPos.count; i++) {
    const px = srcPos.getX(i);
    const py = srcPos.getY(i);
    const pz = srcPos.getZ(i);
    const f = frames[nearestFrameIndex(frames, px, pz)];
    const dx = px - f.x;
    const dz = pz - f.z;
    const lateral = dx * f.rightX + dz * f.rightZ;

    positions[i * 3] = f.x - f.rightX * lateral;
    positions[i * 3 + 1] = py;
    positions[i * 3 + 2] = f.z - f.rightZ * lateral;

    const nx = srcNorm.getX(i);
    const ny = srcNorm.getY(i);
    const nz = srcNorm.getZ(i);
    const nLat = nx * f.rightX + nz * f.rightZ;
    normals[i * 3] = nx - 2 * nLat * f.rightX;
    normals[i * 3 + 1] = ny;
    normals[i * 3 + 2] = nz - 2 * nLat * f.rightZ;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  if (srcUv) {
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(srcUv.array as ArrayLike<number>), 2));
  }
  if (srcIdx) {
    const idx = new Uint32Array(srcIdx.count);
    for (let i = 0; i < srcIdx.count; i += 3) {
      idx[i] = srcIdx.getX(i);
      idx[i + 1] = srcIdx.getX(i + 2);
      idx[i + 2] = srcIdx.getX(i + 1);
    }
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  geo.computeBoundingSphere();
  return geo;
}

export function mirrorTreePlacements(trees: TreePlacement[], frames: PathFrame[]): TreePlacement[] {
  return trees.map((t) => {
    const f = frames[nearestFrameIndex(frames, t.x, t.z)];
    const dx = t.x - f.x;
    const dz = t.z - f.z;
    const lateral = dx * f.rightX + dz * f.rightZ;
    const forward = dx * f.forwardX + dz * f.forwardZ;
    return {
      ...t,
      x: f.x - f.rightX * lateral + f.forwardX * forward,
      z: f.z - f.rightZ * lateral + f.forwardZ * forward,
    };
  });
}

/** Build matching grass hills on both sides of the road. */
export function buildDualGrassHillRibbon(frames: PathFrame[], roadHalf: number): THREE.BufferGeometry {
  const left = buildGrassHillRibbon(frames, roadHalf, LEFT_BANK);
  const right = buildGrassHillRibbon(frames, roadHalf, RIGHT_BANK);
  const leftPos = left.getAttribute('position');
  const rightPos = right.getAttribute('position');
  if (!leftPos || leftPos.count === 0) return right;
  if (!rightPos || rightPos.count === 0) return left;

  const pos = new Float32Array(leftPos.count * 3 + rightPos.count * 3);
  pos.set(leftPos.array as Float32Array, 0);
  pos.set(rightPos.array as Float32Array, leftPos.count * 3);

  const norm = new Float32Array(leftPos.count * 3 + rightPos.count * 3);
  const leftNorm = left.getAttribute('normal')!;
  const rightNorm = right.getAttribute('normal')!;
  norm.set(leftNorm.array as Float32Array, 0);
  norm.set(rightNorm.array as Float32Array, leftNorm.count * 3);

  const leftUv = left.getAttribute('uv')!;
  const rightUv = right.getAttribute('uv')!;
  const uv = new Float32Array(leftUv.count * 2 + rightUv.count * 2);
  uv.set(leftUv.array as Float32Array, 0);
  uv.set(rightUv.array as Float32Array, leftUv.count * 2);

  const leftIdx = left.getIndex()!;
  const rightIdx = right.getIndex()!;
  const idx = new Uint32Array(leftIdx.count + rightIdx.count);
  idx.set(leftIdx.array as Uint32Array, 0);
  for (let i = 0; i < rightIdx.count; i++) {
    idx[leftIdx.count + i] = rightIdx.getX(i) + leftPos.count;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  return geo;
}

/** Tall grass wall on one side to block sky gaps. */
export function buildGrassBackdropWall(
  frames: PathFrame[],
  roadHalf: number,
  bankSide: 1 | -1,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const out = new THREE.Vector3();

  for (let i = 0; i < frames.length - 1; i++) {
    const f0 = frames[i];
    const f1 = frames[i + 1];
    const near = roadHalf + 1;
    const far = roadHalf + 70;
    const u0 = f0.dist / 10;
    const u1 = f1.dist / 10;

    out.set(f0.rightX * bankSide, 0, f0.rightZ * bankSide).normalize();

    const bl = new THREE.Vector3(
      f0.x + f0.rightX * bankSide * near, f0.y - 18, f0.z + f0.rightZ * bankSide * near,
    );
    const tl = new THREE.Vector3(
      f0.x + f0.rightX * bankSide * near, f0.y + 28, f0.z + f0.rightZ * bankSide * near,
    );
    const tr = new THREE.Vector3(
      f1.x + f1.rightX * bankSide * near, f1.y + 28, f1.z + f1.rightZ * bankSide * near,
    );
    const br = new THREE.Vector3(
      f1.x + f1.rightX * bankSide * near, f1.y - 18, f1.z + f1.rightZ * bankSide * near,
    );

    const base = positions.length / 3;
    const push = (v: THREE.Vector3, u: number, vCoord: number) => {
      positions.push(v.x, v.y, v.z);
      normals.push(out.x, out.y, out.z);
      uvs.push(u, vCoord);
    };
    push(bl, u0, 0); push(tl, u0, 1); push(tr, u1, 1); push(br, u1, 0);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);

    const bl2 = new THREE.Vector3(
      f0.x + f0.rightX * bankSide * far, f0.y - 22, f0.z + f0.rightZ * bankSide * far,
    );
    const tl2 = tl.clone();
    const tr2 = tr.clone();
    const br2 = new THREE.Vector3(
      f1.x + f1.rightX * bankSide * far, f1.y - 22, f1.z + f1.rightZ * bankSide * far,
    );
    const base2 = positions.length / 3;
    push(bl2, u0, 0); push(tl2, u0, 0.5); push(tr2, u1, 0.5); push(br2, u1, 0);
    indices.push(base2, base2 + 1, base2 + 2, base2, base2 + 2, base2 + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

/** @deprecated use buildGrassHillRibbon */
export function buildLeftGrassHillRibbon(frames: PathFrame[], roadHalf: number) {
  return buildGrassHillRibbon(frames, roadHalf, LEFT_BANK);
}

export function buildHillsideRibbon(
  frames: PathFrame[],
  roadHalf: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const normal = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < frames.length - 1; i++) {
    const f0 = frames[i];
    const f1 = frames[i + 1];
    if (f0.cliffSide !== f1.cliffSide) continue;

    const side = -f0.cliffSide;
    const near = roadHalf + 0.5;
    const far = roadHalf + 18;
    const rise0 = 7 + (i % 4);
    const rise1 = 7 + ((i + 1) % 4);
    const u0 = f0.dist / 16;
    const u1 = f1.dist / 16;

    const a = new THREE.Vector3(f0.x + f0.rightX * side * near, f0.y, f0.z + f0.rightZ * side * near);
    const b = new THREE.Vector3(f0.x + f0.rightX * side * far, f0.y + rise0 * 0.35, f0.z + f0.rightZ * side * far);
    const c = new THREE.Vector3(f1.x + f1.rightX * side * far, f1.y + rise1 * 0.35, f1.z + f1.rightZ * side * far);
    const d = new THREE.Vector3(f1.x + f1.rightX * side * near, f1.y, f1.z + f1.rightZ * side * near);
    if (isDegenerateQuad(a, b, c, d)) continue;

    const base = positions.length / 3;
    const push = (v: THREE.Vector3, u: number, vCoord: number) => {
      positions.push(v.x, v.y, v.z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(u, vCoord);
    };
    push(a, u0, 0); push(b, u0, 1); push(c, u1, 1); push(d, u1, 0);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);

    const a2 = b.clone();
    const b2 = new THREE.Vector3(f0.x + f0.rightX * side * (far + 8), f0.y + rise0, f0.z + f0.rightZ * side * (far + 8));
    const c2 = new THREE.Vector3(f1.x + f1.rightX * side * (far + 8), f1.y + rise1, f1.z + f1.rightZ * side * (far + 8));
    const d2 = c.clone();
    if (!isDegenerateQuad(a2, b2, c2, d2)) {
      const base2 = positions.length / 3;
      push(a2, u0, 0); push(b2, u0, 1); push(c2, u1, 1); push(d2, u1, 0);
      indices.push(base2, base2 + 1, base2 + 2, base2, base2 + 2, base2 + 3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

export function buildBarrierRibbon(
  frames: PathFrame[],
  roadHalf: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < frames.length - 1; i++) {
    const f0 = frames[i];
    const f1 = frames[i + 1];
    const side = RIGHT_BANK;
    const lat = side * (roadHalf + 0.55);
    const h = 0.85;
    const u0 = f0.dist / 4;
    const u1 = f1.dist / 4;

    const bl = new THREE.Vector3(f0.x + f0.rightX * lat, f0.y + 0.02, f0.z + f0.rightZ * lat);
    const tl = new THREE.Vector3(f0.x + f0.rightX * lat, f0.y + h, f0.z + f0.rightZ * lat);
    const tr = new THREE.Vector3(f1.x + f1.rightX * lat, f1.y + h, f1.z + f1.rightZ * lat);
    const br = new THREE.Vector3(f1.x + f1.rightX * lat, f1.y + 0.02, f1.z + f1.rightZ * lat);
    const out = new THREE.Vector3(f0.rightX * side, 0, f0.rightZ * side);

    const base = positions.length / 3;
    const push = (v: THREE.Vector3, u: number, vCoord: number) => {
      positions.push(v.x, v.y, v.z);
      normals.push(out.x, out.y, out.z);
      uvs.push(u, vCoord);
    };
    push(bl, u0, 0); push(tl, u0, 1); push(tr, u1, 1); push(br, u1, 0);
    if (isDegenerateQuad(bl, tl, tr, br)) {
      positions.splice(-12, 12);
      normals.splice(-12, 12);
      uvs.splice(-8, 8);
      continue;
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

export interface TreePlacement {
  x: number;
  y: number;
  z: number;
  seed: number;
  scale: number;
  useBig: boolean;
}

export function buildTreePlacements(
  frames: PathFrame[],
  _roadHalf: number,
  bankSide: 1 | -1 = LEFT_BANK,
  seedOffset = 0,
): TreePlacement[] {
  const trees: TreePlacement[] = [];
  let lastTree = -8;
  const grassSide = bankSide;

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if (f.dist - lastTree < 4) continue;
    const seed = i * 17 + Math.floor(f.dist) + seedOffset;
    const depth = 8 + (seed % 20);
    const along = ((seed % 7) - 3) * 1.2;
    const scale = 0.75 + (seed % 5) * 0.14;
    const hillRise = 2 + (seed % 4);

    trees.push({
      x: f.x + f.rightX * grassSide * depth + f.forwardX * along,
      y: f.y + hillRise * 0.4,
      z: f.z + f.rightZ * grassSide * depth + f.forwardZ * along,
      seed,
      scale,
      useBig: seed % 6 === 0,
    });
    lastTree = f.dist;

    if (seed % 3 === 0) {
      trees.push({
        x: f.x + f.rightX * grassSide * (depth + 6 + (seed % 8)) + f.forwardX * (along + 2),
        y: f.y + hillRise * 0.55,
        z: f.z + f.rightZ * grassSide * (depth + 6 + (seed % 8)) + f.forwardZ * (along + 2),
        seed: seed + 31,
        scale: scale * 0.9,
        useBig: false,
      });
    }
  }

  return trees;
}
