import { useMemo } from 'react';
import * as THREE from 'three';

const LANE_W = 3.5;
const LANES = 2;
const CARRIAGE_W = LANE_W * LANES;       // 7m per side
const MEDIAN_W = 3;
const SHOULDER_W = 2;
const SIDEWALK_W = 2.5;
const TREE_OFFSET = CARRIAGE_W + MEDIAN_W / 2 + SHOULDER_W + SIDEWALK_W + 1;
const BUILDING_OFFSET = TREE_OFFSET + 4;

export const PLAYER_LANE_X = -(MEDIAN_W / 2 + LANE_W * 0.5);
export const LEFT_CARRIAGEWAY_MIN_X = -(MEDIAN_W / 2 + CARRIAGE_W);
export const LEFT_CARRIAGEWAY_MAX_X = -(MEDIAN_W / 2);
export const MEDIAN_MIN_X = -(MEDIAN_W / 2);
export const MEDIAN_MAX_X = MEDIAN_W / 2;
export const RIGHT_CARRIAGEWAY_MIN_X = MEDIAN_W / 2;
export const RIGHT_CARRIAGEWAY_MAX_X = MEDIAN_W / 2 + CARRIAGE_W;
export const TOTAL_ROAD_HALF = CARRIAGE_W + MEDIAN_W / 2 + SHOULDER_W;
const CAR_HALF_WIDTH = 0.95;
/** Drivable: shoulders, sidewalks, both carriageways, and median */
const DRIVABLE_HALF = TOTAL_ROAD_HALF + SHOULDER_W + SIDEWALK_W;
export const DRIVABLE_MIN_X = -DRIVABLE_HALF + CAR_HALF_WIDTH;
export const DRIVABLE_MAX_X = DRIVABLE_HALF - CAR_HALF_WIDTH;
export const TRAFFIC_LANE_OFFSETS = [
  -(MEDIAN_W / 2 + LANE_W * 1.5),
  -(MEDIAN_W / 2 + LANE_W * 0.5),
  MEDIAN_W / 2 + LANE_W * 0.5,
  MEDIAN_W / 2 + LANE_W * 1.5,
];

const SEG_LEN = 40;

function getRoadLengthFromPoints(points: { z: number }[]): number {
  const lastZ = points[points.length - 1]?.z ?? -4000;
  return Math.abs(lastZ) + 600;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function seededRange(seed: number, min: number, max: number): number {
  return min + seededRandom(seed) * (max - min);
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
  t.repeat.set(1, 4);
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
      {/* Shop sign for ground floor */}
      {type % 3 === 0 && (
        <mesh position={[0, 1.2, d / 2 + 0.02]}>
          <planeGeometry args={[w * 0.7, 0.8]} />
          <meshStandardMaterial color="#ff6600" />
        </mesh>
      )}
    </group>
  );
}

function TrafficSignalPole({ state }: { state: 'red' | 'yellow' | 'green' }) {
  const colors = { red: '#ff0000', yellow: '#ffcc00', green: '#00cc00' };
  return (
    <group>
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 5, 8]} />
        <meshStandardMaterial color="#444" metalness={0.5} />
      </mesh>
      <mesh position={[1.5, 4.5, 0]}>
        <boxGeometry args={[3, 0.1, 0.1]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      <mesh position={[2.8, 3.8, 0]}>
        <boxGeometry args={[0.4, 1.2, 0.4]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {(['red', 'yellow', 'green'] as const).map((c, i) => (
        <mesh key={c} position={[2.8, 4.3 - i * 0.38, 0.21]}>
          <sphereGeometry args={[0.12, 10, 10]} />
          <meshStandardMaterial
            color={colors[c]}
            emissive={colors[c]}
            emissiveIntensity={state === c ? 3 : 0.05}
          />
        </mesh>
      ))}
    </group>
  );
}

export function IndianHighwayRoad({ points }: { points: { x: number; y: number; z: number }[] }) {
  const asphaltTex = useMemo(() => tex('#2e2e2e', true), []);
  const grassTex = useMemo(() => tex('#3d6b35', true), []);
  const sidewalkTex = useMemo(() => tex('#b0b0b0', true), []);
  const dirtTex = useMemo(() => tex('#9a8b6a', true), []);

  const roadLength = useMemo(() => getRoadLengthFromPoints(points), [points]);
  const segCount = Math.ceil(roadLength / SEG_LEN);
  const totalRoadHalf = CARRIAGE_W + MEDIAN_W / 2 + SHOULDER_W;

  return (
    <group>
      {/* Grass base - below road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, -roadLength / 2]} receiveShadow>
        <planeGeometry args={[120, roadLength + 200]} />
        <meshStandardMaterial map={grassTex} color="#3d6b35" roughness={1} side={THREE.DoubleSide} />
      </mesh>

      {Array.from({ length: segCount }).map((_, i) => {
        const z = 50 - i * SEG_LEN;
        const seed = i * 7 + 3;

        return (
          <group key={i} position={[0, 0, z]}>
            {/* ── LEFT CARRIAGEWAY (player direction) ── */}
            <mesh position={[-(MEDIAN_W / 2 + CARRIAGE_W / 2), 0.05, 0]} receiveShadow>
              <boxGeometry args={[CARRIAGE_W, 0.1, SEG_LEN]} />
              <meshStandardMaterial map={asphaltTex} color="#333" roughness={0.9} side={THREE.DoubleSide} />
            </mesh>

            {/* ── MEDIAN DIVIDER (flat — drivable) ── */}
            <mesh position={[0, 0.05, 0]} receiveShadow>
              <boxGeometry args={[MEDIAN_W, 0.1, SEG_LEN]} />
              <meshStandardMaterial color="#4a4a4a" roughness={0.85} side={THREE.DoubleSide} />
            </mesh>
            {/* Median center dashes */}
            {Array.from({ length: Math.floor(SEG_LEN / 8) }).map((_, d) => (
              <mesh
                key={`median-dash-${d}`}
                position={[0, 0.11, -SEG_LEN / 2 + d * 8 + 2]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <planeGeometry args={[0.12, 3]} />
                <meshStandardMaterial color="#ffcc00" emissive="#ffcc00" emissiveIntensity={0.15} side={THREE.DoubleSide} />
              </mesh>
            ))}

            {/* ── RIGHT CARRIAGEWAY (oncoming) ── */}
            <mesh position={[MEDIAN_W / 2 + CARRIAGE_W / 2, 0.05, 0]} receiveShadow>
              <boxGeometry args={[CARRIAGE_W, 0.1, SEG_LEN]} />
              <meshStandardMaterial map={asphaltTex} color="#333" roughness={0.9} side={THREE.DoubleSide} />
            </mesh>

            {/* ── SHOULDERS (dirt) ── */}
            <mesh position={[-(totalRoadHalf + SHOULDER_W / 2), 0.03, 0]} receiveShadow>
              <boxGeometry args={[SHOULDER_W, 0.06, SEG_LEN]} />
              <meshStandardMaterial map={dirtTex} color="#8a7a5a" roughness={1} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[totalRoadHalf + SHOULDER_W / 2, 0.03, 0]} receiveShadow>
              <boxGeometry args={[SHOULDER_W, 0.06, SEG_LEN]} />
              <meshStandardMaterial map={dirtTex} color="#8a7a5a" roughness={1} side={THREE.DoubleSide} />
            </mesh>

            {/* ── SIDEWALKS ── */}
            <mesh position={[-(totalRoadHalf + SHOULDER_W + SIDEWALK_W / 2), 0.12, 0]} receiveShadow>
              <boxGeometry args={[SIDEWALK_W, 0.15, SEG_LEN]} />
              <meshStandardMaterial map={sidewalkTex} color="#aaa" roughness={0.7} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[totalRoadHalf + SHOULDER_W + SIDEWALK_W / 2, 0.12, 0]} receiveShadow>
              <boxGeometry args={[SIDEWALK_W, 0.15, SEG_LEN]} />
              <meshStandardMaterial map={sidewalkTex} color="#aaa" roughness={0.7} side={THREE.DoubleSide} />
            </mesh>

            {/* ── LANE MARKINGS (dashed white) ── */}
            {Array.from({ length: Math.floor(SEG_LEN / 8) }).map((_, d) => (
              <group key={`dash-${d}`}>
                {/* Left carriageway center dash */}
                <mesh position={[-(MEDIAN_W / 2 + CARRIAGE_W / 2), 0.11, -SEG_LEN / 2 + d * 8 + 2]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[0.12, 3]} />
                  <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.2} side={THREE.DoubleSide} />
                </mesh>
                {/* Right carriageway center dash */}
                <mesh position={[MEDIAN_W / 2 + CARRIAGE_W / 2, 0.11, -SEG_LEN / 2 + d * 8 + 2]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[0.12, 3]} />
                  <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.2} side={THREE.DoubleSide} />
                </mesh>
              </group>
            ))}

            {/* Edge solid lines */}
            <mesh position={[-(MEDIAN_W / 2 + CARRIAGE_W), 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.1, SEG_LEN]} />
              <meshStandardMaterial color="#eee" side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[MEDIAN_W / 2 + CARRIAGE_W, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.1, SEG_LEN]} />
              <meshStandardMaterial color="#eee" side={THREE.DoubleSide} />
            </mesh>

            {/* ── TREES along sidewalk ── */}
            {i % 3 === 0 && (
              <>
                <group position={[-(totalRoadHalf + SHOULDER_W + SIDEWALK_W + 1.5), 0, (seed % 10) - 5]}>
                  <Tree scale={0.8 + (seed % 5) * 0.1} seed={seed} />
                </group>
                <group position={[totalRoadHalf + SHOULDER_W + SIDEWALK_W + 1.5, 0, ((seed + 5) % 10) - 5]}>
                  <Tree scale={0.9 + (seed % 4) * 0.1} seed={seed + 100} />
                </group>
              </>
            )}
            {i % 5 === 2 && (
              <>
                <group position={[-(totalRoadHalf + SHOULDER_W + SIDEWALK_W + 3), 0, -10]}>
                  <Tree scale={1.1} seed={seed + 200} />
                </group>
                <group position={[totalRoadHalf + SHOULDER_W + SIDEWALK_W + 3, 0, 8]}>
                  <Tree scale={1} seed={seed + 201} />
                </group>
              </>
            )}

            {/* ── BUILDINGS near road ── */}
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

            {/* Tea shop / small shop near sidewalk */}
            {i % 8 === 0 && (
              <group position={[-(totalRoadHalf + SHOULDER_W + SIDEWALK_W + BUILDING_OFFSET / 2), 0, 0]}>
                <mesh position={[0, 1, 0]} castShadow>
                  <boxGeometry args={[3, 2, 3]} />
                  <meshStandardMaterial color="#d2691e" />
                </mesh>
                <mesh position={[0, 2.3, 0]}>
                  <boxGeometry args={[3.5, 0.15, 3.5]} />
                  <meshStandardMaterial color="#ff6600" />
                </mesh>
              </group>
            )}

            {/* Street lamp */}
            {i % 6 === 0 && (
              <group position={[-(totalRoadHalf + SHOULDER_W + SIDEWALK_W / 2), 0, 0]}>
                <mesh position={[0, 3, 0]}>
                  <cylinderGeometry args={[0.06, 0.08, 6, 6]} />
                  <meshStandardMaterial color="#555" metalness={0.6} />
                </mesh>
                <mesh position={[0.5, 5.8, 0]}>
                  <boxGeometry args={[1, 0.12, 0.25]} />
                  <meshStandardMaterial color="#888" emissive="#ffeecc" emissiveIntensity={0.6} />
                </mesh>
              </group>
            )}

            {/* Traffic signal every ~400m */}
            {i % 10 === 5 && (
              <group position={[-(totalRoadHalf + 4), 0, 0]}>
                <TrafficSignalPole state={(['red', 'yellow', 'green'] as const)[i % 3]} />
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}
