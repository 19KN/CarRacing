import { useMemo } from 'react';
import * as THREE from 'three';
import { buildSplinePathSamples, sampleSplineByZ } from '@indian-racing/shared';
import { BigTreeMesh } from '../props/BigTreeMesh';
import { buildAsphaltRibbon,
  buildEdgeLineRibbon,
  buildGrassHillRibbon,
  buildGrassShoulderRibbon,
  buildMarkingRibbon,
  buildPathFrames,
  buildTreePlacements,
  mirrorRibbonAcrossPath,
  mirrorTreePlacements,
  LEFT_BANK,
} from './ghatGeometry';
import {
  GHAT_ROAD_SURFACE_Y_OFFSET,
  GHAT_SINGLE_LANE_OFFSET,
  getGhatLanePosition as sharedGhatLanePosition,
} from '@indian-racing/shared';

const ROAD_W = 7;
const SHOULDER = 1.2;
const ROAD_HALF = ROAD_W / 2;
const CAR_HALF_WIDTH = 0.95;
const GHAT_DRIVABLE_HALF = ROAD_HALF + SHOULDER - 0.15;
const GHAT_MAX_LATERAL = GHAT_DRIVABLE_HALF - CAR_HALF_WIDTH;

export const GHAT_LANE_OFFSET = GHAT_SINGLE_LANE_OFFSET;

/** Player's right side — grass hills + trees (do not change). */
const PLAYER_RIGHT_BANK = LEFT_BANK;

const splineCache = new WeakMap<object, ReturnType<typeof buildSplinePathSamples>>();

export function getGhatSpline(points: { x: number; y: number; z: number }[]) {
  let spline = splineCache.get(points);
  if (!spline) {
    spline = buildSplinePathSamples(points, 14);
    splineCache.set(points, spline);
  }
  return spline;
}

function asphaltTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#141414';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 500; i++) {
    const g = Math.random() * 35;
    ctx.fillStyle = `rgba(${g},${g},${g},0.35)`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8, 32);
  return t;
}

function grassTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#3a7a32';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 500; i++) {
    const g = 40 + Math.random() * 50;
    ctx.fillStyle = `rgba(${g - 25},${g + 5},${g - 20},0.35)`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 8);
  return t;
}

function GhatForestTree({ seed, scale = 1 }: { seed: number; scale?: number }) {
  const h = (3.5 + (seed % 6)) * scale;
  const greens = ['#1e5c28', '#2d7a38', '#3a8f42', '#256b30'];
  const lean = (seed % 5) * 0.08 - 0.16;
  return (
    <group rotation={[0, lean, 0]}>
      <mesh position={[0, h * 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, h * 0.38, 5]} />
        <meshStandardMaterial color="#3d2817" roughness={0.95} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[
            (i % 2) * 0.35 - 0.17,
            h * (0.42 + i * 0.16),
            ((i + seed) % 3) * 0.25 - 0.25,
          ]}
          castShadow
        >
          <sphereGeometry args={[h * (0.2 - i * 0.03), 7, 6]} />
          <meshStandardMaterial color={greens[(seed + i) % 4]} roughness={0.88} />
        </mesh>
      ))}
      <mesh position={[0.2, h * 0.55, 0.15]} castShadow>
        <sphereGeometry args={[h * 0.16, 6, 5]} />
        <meshStandardMaterial color={greens[seed % 4]} roughness={0.9} />
      </mesh>
    </group>
  );
}

export function GhatRoad({ points }: { points: { x: number; y: number; z: number }[] }) {
  const spline = useMemo(() => getGhatSpline(points), [points]);
  const frames = useMemo(() => buildPathFrames(spline), [spline]);

  const asphaltGeo = useMemo(() => buildAsphaltRibbon(frames, ROAD_HALF, SHOULDER), [frames]);
  const centerGeo = useMemo(() => buildMarkingRibbon(frames), [frames]);
  const leftLineGeo = useMemo(() => buildEdgeLineRibbon(frames, ROAD_HALF, -1), [frames]);
  const rightLineGeo = useMemo(() => buildEdgeLineRibbon(frames, ROAD_HALF, 1), [frames]);

  const rightGrassHillGeo = useMemo(
    () => buildGrassHillRibbon(frames, ROAD_HALF, PLAYER_RIGHT_BANK),
    [frames],
  );
  const rightGrassShoulderGeo = useMemo(
    () => buildGrassShoulderRibbon(frames, ROAD_HALF, PLAYER_RIGHT_BANK),
    [frames],
  );
  const rightTrees = useMemo(
    () => buildTreePlacements(frames, ROAD_HALF, PLAYER_RIGHT_BANK, 0),
    [frames],
  );

  const leftGrassHillGeo = useMemo(
    () => mirrorRibbonAcrossPath(rightGrassHillGeo, frames),
    [rightGrassHillGeo, frames],
  );
  const leftGrassShoulderGeo = useMemo(
    () => mirrorRibbonAcrossPath(rightGrassShoulderGeo, frames),
    [rightGrassShoulderGeo, frames],
  );
  const leftTrees = useMemo(
    () => mirrorTreePlacements(rightTrees, frames),
    [rightTrees, frames],
  );

  const grassMap = useMemo(() => grassTex(), []);
  const asphaltMap = useMemo(() => asphaltTex(), []);

  const bounds = useMemo(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    }
    return {
      cx: (minX + maxX) / 2,
      cz: (minZ + maxZ) / 2,
      spanX: maxX - minX + 120,
      spanZ: maxZ - minZ + 300,
    };
  }, [points]);

  const renderTrees = (list: typeof rightTrees) =>
    list.map((t) => (
      <group key={`tree-${t.seed}-${t.x.toFixed(0)}`} position={[t.x, t.y, t.z]}>
        {t.useBig ? (
          <BigTreeMesh scale={t.scale * 0.85} />
        ) : (
          <GhatForestTree seed={t.seed} scale={t.scale} />
        )}
      </group>
    ));

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bounds.cx, -42, bounds.cz - bounds.spanZ / 2]} receiveShadow>
        <planeGeometry args={[bounds.spanX + 400, bounds.spanZ + 600]} />
        <meshStandardMaterial map={grassMap} color="#2d6a28" roughness={1} />
      </mesh>

      <mesh geometry={rightGrassHillGeo} receiveShadow castShadow>
        <meshStandardMaterial map={grassMap} color="#3a8a38" roughness={0.95} fog={false} />
      </mesh>
      <mesh geometry={rightGrassShoulderGeo} receiveShadow>
        <meshStandardMaterial map={grassMap} color="#4a9a42" roughness={0.98} fog={false} />
      </mesh>
      {renderTrees(rightTrees)}

      <mesh geometry={leftGrassHillGeo} receiveShadow castShadow>
        <meshStandardMaterial map={grassMap} color="#3a8a38" roughness={0.95} fog={false} />
      </mesh>
      <mesh geometry={leftGrassShoulderGeo} receiveShadow>
        <meshStandardMaterial map={grassMap} color="#4a9a42" roughness={0.98} fog={false} />
      </mesh>
      {renderTrees(leftTrees)}

      <mesh geometry={asphaltGeo} receiveShadow renderOrder={10}>
        <meshStandardMaterial
          map={asphaltMap}
          color="#0a0a0a"
          roughness={0.96}
          metalness={0}
          fog={false}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      <mesh geometry={centerGeo} renderOrder={11}>
        <meshBasicMaterial color="#ffffff" fog={false} toneMapped={false} />
      </mesh>
      <mesh geometry={leftLineGeo} renderOrder={11}>
        <meshBasicMaterial color="#eeeeee" fog={false} toneMapped={false} />
      </mesh>
      <mesh geometry={rightLineGeo} renderOrder={11}>
        <meshBasicMaterial color="#eeeeee" fog={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function getGhatLanePosition(
  points: { x: number; y: number; z: number }[],
  z: number,
  laneOffset = GHAT_LANE_OFFSET,
): { x: number; y: number; z: number; rotation: number; pitch: number } {
  return sharedGhatLanePosition(points, z, laneOffset);
}

export { GHAT_ROAD_SURFACE_Y_OFFSET };

export function clampGhatToRoad(
  points: { x: number; y: number; z: number }[],
  x: number,
  z: number,
): {
  x: number;
  z: number;
  perpX: number;
  perpZ: number;
  hitMin: boolean;
  hitMax: boolean;
} {
  const spline = getGhatSpline(points);
  const sample = sampleSplineByZ(spline, z);
  const perpX = Math.cos(sample.rotation);
  const perpZ = -Math.sin(sample.rotation);

  const dx = x - sample.x;
  const dz = z - sample.z;
  const lateral = dx * perpX + dz * perpZ;

  let clampedLat = lateral;
  let hitMin = false;
  let hitMax = false;

  if (lateral < -GHAT_MAX_LATERAL) {
    clampedLat = -GHAT_MAX_LATERAL;
    hitMin = true;
  } else if (lateral > GHAT_MAX_LATERAL) {
    clampedLat = GHAT_MAX_LATERAL;
    hitMax = true;
  }

  return {
    x: sample.x + perpX * clampedLat,
    z: sample.z + perpZ * clampedLat,
    perpX,
    perpZ,
    hitMin,
    hitMax,
  };
}
