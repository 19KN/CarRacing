import { useMemo } from 'react';
import * as THREE from 'three';
import { MODULAR_TILE_SCALE, getTrackCentroid } from '@indian-racing/shared';
import { buildRoadCenterline, buildArcLengthTable, sampleRoadAtDistance } from './roadPath';
import { generateSpeedBreakers } from './speedBreakers';
import { ModularRoadTrack } from './ModularRoadTrack';

const SHOULDER_W = 2;
const SIDEWALK_W = 2.5;
const ROAD_HALF = MODULAR_TILE_SCALE;
const TREE_OFFSET = ROAD_HALF + SHOULDER_W + SIDEWALK_W + 2;
const BUILDING_OFFSET = TREE_OFFSET + 6;

export const PLAYER_LANE_X = -ROAD_HALF * 0.32;
export const LEFT_CARRIAGEWAY_MIN_X = -ROAD_HALF * 0.95;
export const LEFT_CARRIAGEWAY_MAX_X = -ROAD_HALF * 0.05;
export const MEDIAN_MIN_X = -ROAD_HALF * 0.05;
export const MEDIAN_MAX_X = ROAD_HALF * 0.05;
export const RIGHT_CARRIAGEWAY_MIN_X = ROAD_HALF * 0.05;
export const RIGHT_CARRIAGEWAY_MAX_X = ROAD_HALF * 0.95;
export const TOTAL_ROAD_HALF = ROAD_HALF + SHOULDER_W;
const CAR_HALF_WIDTH = 0.95;
const DRIVABLE_HALF = ROAD_HALF + SHOULDER_W + SIDEWALK_W;
export const DRIVABLE_MIN_X = -DRIVABLE_HALF + CAR_HALF_WIDTH;
export const DRIVABLE_MAX_X = DRIVABLE_HALF - CAR_HALF_WIDTH;
export const TRAFFIC_LANE_OFFSETS = [
  -ROAD_HALF * 0.72,
  -ROAD_HALF * 0.28,
  ROAD_HALF * 0.28,
  ROAD_HALF * 0.72,
];

const SEG_LEN = 28;

function SpeedBreakerMesh() {
  return (
    <group>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[6.5, 0.12, 3.2]} />
        <meshStandardMaterial color="#d4c060" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <boxGeometry args={[6.2, 0.06, 2.8]} />
        <meshStandardMaterial color="#e8d878" roughness={0.8} />
      </mesh>
    </group>
  );
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function tex(color: string, noise = false): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 128);
  if (noise) {
    for (let i = 0; i < 500; i++) {
      const g = Math.random() * 40;
      ctx.fillStyle = `rgba(${g},${g},${g},0.3)`;
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function Tree({ scale = 1, seed = 0 }: { scale?: number; seed?: number }) {
  const h = (3 + seededRandom(seed) * 2) * scale;
  const foliageColor = seededRandom(seed + 1) > 0.5 ? '#2d7a2d' : '#3d9a3d';
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.15 * scale, 0.25 * scale, h, 6]} />
        <meshStandardMaterial color="#5c3d2e" />
      </mesh>
      <mesh position={[0, h + 1.2 * scale, 0]} castShadow>
        <sphereGeometry args={[1.5 * scale, 8, 8]} />
        <meshStandardMaterial color={foliageColor} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Building({ type, scale = 1, seed = 0 }: { type: number; scale?: number; seed?: number }) {
  const colors = ['#c9b896', '#b8a080', '#a89070', '#d4c4a8', '#8a9ab0', '#c07050'];
  const color = colors[type % colors.length];
  const w = (4 + seededRandom(seed) * 4) * scale;
  const h = (6 + seededRandom(seed + 1) * 12) * scale;
  const d = (4 + seededRandom(seed + 2) * 3) * scale;
  const windowCols = Math.floor(w / 1.8);
  const windowRows = Math.floor(h / 2.5);
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {Array.from({ length: windowRows }).map((_, row) =>
        Array.from({ length: windowCols }).map((_, col) => {
          const windowSeed = seed + row * 17 + col * 31;
          const lit = seededRandom(windowSeed + 3) > 0.7;
          return (
            <mesh
              key={`${row}-${col}`}
              position={[(col - windowCols / 2 + 0.5) * 1.8, row * 2.5 + 1.5, d / 2 + 0.01]}
            >
              <planeGeometry args={[1.2, 1.8]} />
              <meshStandardMaterial
                color={seededRandom(windowSeed) > 0.3 ? '#87ceeb' : '#334'}
                emissive={lit ? '#ffcc66' : '#000'}
                emissiveIntensity={lit ? 0.4 : 0}
              />
            </mesh>
          );
        }),
      )}
    </group>
  );
}

export function IndianHighwayRoad({ points }: { points: { x: number; y: number; z: number }[] }) {
  const grassTex = useMemo(() => tex('#3d6b35', true), []);
  const centerline = useMemo(() => buildRoadCenterline(points), [points]);
  const arcTable = useMemo(() => buildArcLengthTable(centerline), [centerline]);
  const roadLength = useMemo(() => arcTable.total, [arcTable]);
  const segCount = Math.ceil(roadLength / SEG_LEN);
  const grassCenter = useMemo(() => getTrackCentroid(points), [points]);

  useMemo(() => {
    generateSpeedBreakers(points, roadLength, arcTable, centerline);
  }, [points, roadLength, arcTable, centerline]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[grassCenter.x, -0.15, grassCenter.z - roadLength * 0.25]} receiveShadow>
        <planeGeometry args={[600, roadLength + 600]} />
        <meshStandardMaterial map={grassTex} color="#3d6b35" roughness={1} side={THREE.DoubleSide} />
      </mesh>

      <ModularRoadTrack startZ={30} />

      {Array.from({ length: segCount }).map((_, i) => {
        const dist = Math.min(roadLength - SEG_LEN * 0.5, 60 + i * SEG_LEN);
        const seed = i * 7 + 3;
        const path = sampleRoadAtDistance(centerline, arcTable, dist);
        const isStraight = Math.abs(path.rotation - Math.PI) < 0.35
          || Math.abs(path.rotation + Math.PI / 2) < 0.35
          || Math.abs(path.rotation - Math.PI / 2) < 0.35;

        return (
          <group key={i} position={[path.x, path.y, path.z]} rotation={[0, path.rotation, 0]}>
            {i % 3 === 0 && (
              <>
                <group position={[-TREE_OFFSET, 0, (seed % 10) - 5]}>
                  <Tree scale={0.8 + (seed % 5) * 0.1} seed={seed} />
                </group>
                <group position={[TREE_OFFSET, 0, ((seed + 5) % 10) - 5]}>
                  <Tree scale={0.9 + (seed % 4) * 0.1} seed={seed + 100} />
                </group>
              </>
            )}
            {i % 4 === 0 && (
              <group position={[-(BUILDING_OFFSET + (seed % 8)), 0, (seed % 15) - 7]}>
                <Building type={seed % 6} scale={0.7 + (seed % 3) * 0.15} seed={seed + 300} />
              </group>
            )}
            {i % 4 === 2 && (
              <group position={[BUILDING_OFFSET + (seed % 6), 0, ((seed + 3) % 15) - 7]}>
                <Building type={(seed + 2) % 6} scale={0.8 + (seed % 2) * 0.2} seed={seed + 400} />
              </group>
            )}
            {i % 4 === 1 && isStraight && (
              <group position={[PLAYER_LANE_X, 0.05, 0]}>
                <SpeedBreakerMesh />
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}
