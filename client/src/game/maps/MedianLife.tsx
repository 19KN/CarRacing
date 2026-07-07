import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { medianRegistry, type MedianObstacle } from './medianCollision';

const SEG_LEN = 40;
const MEDIAN_W = 3;
const SHOULDER_W = 2;
const SIDEWALK_W = 2.5;
const CARRIAGE_W = 7;
const TOTAL_ROAD_HALF = CARRIAGE_W + MEDIAN_W / 2 + SHOULDER_W;
const SIDEWALK_X = TOTAL_ROAD_HALF + SHOULDER_W + SIDEWALK_W / 2;

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function MedianTree({ scale = 1, seed = 0 }: { scale?: number; seed?: number }) {
  const h = (2.5 + seededRandom(seed) * 1.5) * scale;
  const foliageColor = seededRandom(seed + 1) > 0.5 ? '#2d7a2d' : '#3d9a3d';
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.12 * scale, 0.2 * scale, h, 6]} />
        <meshStandardMaterial color="#5c3d2e" />
      </mesh>
      <mesh position={[0, h + 1 * scale, 0]} castShadow>
        <sphereGeometry args={[1.2 * scale, 8, 8]} />
        <meshStandardMaterial color={foliageColor} roughness={0.9} />
      </mesh>
    </group>
  );
}

function FlowerPot({ seed = 0 }: { seed?: number }) {
  const flowerColor = seededRandom(seed) > 0.5 ? '#e74c3c' : '#ff69b4';
  return (
    <group>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.28, 0.5, 8]} />
        <meshStandardMaterial color="#c45c26" />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <sphereGeometry args={[0.32, 6, 6]} />
        <meshStandardMaterial color="#2d5a1e" />
      </mesh>
      {[[-0.15, 0.85, 0], [0.12, 0.9, 0.05], [0, 0.95, -0.1]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.1, 6, 6]} />
          <meshStandardMaterial color={i === 0 ? flowerColor : '#ffcc00'} />
        </mesh>
      ))}
    </group>
  );
}

function Person({ shirtColor, skinTone }: { shirtColor: string; skinTone: string }) {
  return (
    <group>
      <mesh position={[0, 0.85, 0]} castShadow>
        <capsuleGeometry args={[0.18, 0.55, 4, 8]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>
      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color={skinTone} />
      </mesh>
      <mesh position={[-0.12, 0.35, 0]}>
        <capsuleGeometry args={[0.07, 0.35, 3, 6]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0.12, 0.35, 0]}>
        <capsuleGeometry args={[0.07, 0.35, 3, 6]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
}

function PetDog({ color }: { color: string }) {
  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[0.55, 0.28, 0.3]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.32, 0.32, 0]} castShadow>
        <sphereGeometry args={[0.14, 6, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.42, 0.38, 0]}>
        <sphereGeometry args={[0.06, 4, 4]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[-0.28, 0.3, 0]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[0.08, 0.2, 0.06]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

interface Walker {
  id: string;
  type: 'person' | 'pet';
  x: number;
  z: number;
  zMin: number;
  zMax: number;
  direction: number;
  speed: number;
  shirtColor?: string;
  skinTone?: string;
  petColor?: string;
}

interface StaticDecor {
  type: 'tree' | 'pot';
  x: number;
  z: number;
  seed: number;
  scale?: number;
}

export function MedianLife({ roadLength }: { roadLength: number }) {
  const segCount = Math.ceil(roadLength / SEG_LEN);
  const walkersRef = useRef<Walker[]>([]);
  const staticDecorRef = useRef<StaticDecor[]>([]);
  const treeObstaclesRef = useRef<MedianObstacle[]>([]);
  const groupRefs = useRef(new Map<string, THREE.Group>());

  useMemo(() => {
    const trees: StaticDecor[] = [];
    const pots: StaticDecor[] = [];
    const walkers: Walker[] = [];

    for (let i = 0; i < segCount; i++) {
      const z = 50 - i * SEG_LEN;
      const seed = i * 11 + 5;

      if (i % 2 === 0) {
        const treeX = seededRandom(seed) > 0.5 ? -0.5 : 0.5;
        trees.push({ type: 'tree', x: treeX, z: z - 10, seed, scale: 0.75 + seededRandom(seed) * 0.2 });
        if (i % 4 === 0) {
          pots.push({ type: 'pot', x: -treeX * 0.6, z: z - 18, seed: seed + 50 });
        }
      }

      if (i % 3 === 1) {
        pots.push({ type: 'pot', x: SIDEWALK_X - 0.5, z: z - 5, seed: seed + 60 });
        pots.push({ type: 'pot', x: -SIDEWALK_X + 0.5, z: z - 22, seed: seed + 61 });
      }

      if (i % 5 === 0) {
        const zStart = z - 15;
        walkers.push({
          id: `person_l_${i}`,
          type: 'person',
          x: -SIDEWALK_X,
          z: zStart,
          zMin: zStart - 18,
          zMax: zStart + 18,
          direction: seededRandom(seed) > 0.5 ? 1 : -1,
          speed: 1.2 + seededRandom(seed + 1) * 0.8,
          shirtColor: ['#ff9933', '#138808', '#3498db', '#e74c3c', '#9b59b6'][i % 5],
          skinTone: seededRandom(seed + 2) > 0.5 ? '#c68642' : '#8d5524',
        });
        walkers.push({
          id: `person_r_${i}`,
          type: 'person',
          x: SIDEWALK_X,
          z: zStart - 8,
          zMin: zStart - 26,
          zMax: zStart + 10,
          direction: seededRandom(seed + 3) > 0.5 ? 1 : -1,
          speed: 1 + seededRandom(seed + 4) * 0.6,
          shirtColor: ['#ffffff', '#2c3e50', '#e67e22', '#1abc9c'][i % 4],
          skinTone: seededRandom(seed + 5) > 0.5 ? '#d4a574' : '#6b4423',
        });
      }

      if (i % 4 === 2) {
        const zStart = z - 12;
        walkers.push({
          id: `dog_l_${i}`,
          type: 'pet',
          x: -SIDEWALK_X + 0.8,
          z: zStart,
          zMin: zStart - 12,
          zMax: zStart + 12,
          direction: 1,
          speed: 1.8 + seededRandom(seed) * 0.5,
          petColor: ['#8b6914', '#333', '#c4a35a', '#5a3e1b'][i % 4],
        });
        walkers.push({
          id: `dog_r_${i}`,
          type: 'pet',
          x: SIDEWALK_X - 0.8,
          z: zStart - 6,
          zMin: zStart - 18,
          zMax: zStart + 6,
          direction: -1,
          speed: 2 + seededRandom(seed + 1) * 0.4,
          petColor: ['#fff', '#222', '#a0522d'][i % 3],
        });
      }

      if (i % 6 === 3) {
        walkers.push({
          id: `person_median_${i}`,
          type: 'person',
          x: seededRandom(seed) > 0.5 ? -0.8 : 0.8,
          z: z - 8,
          zMin: z - 20,
          zMax: z + 4,
          direction: -1,
          speed: 0.9,
          shirtColor: '#ff9933',
          skinTone: '#c68642',
        });
      }
    }

    staticDecorRef.current = [...trees, ...pots];
    treeObstaclesRef.current = trees.map((t, idx) => ({
      id: `median_tree_${idx}`,
      type: 'tree' as const,
      position: { x: t.x, z: t.z },
      halfWidth: 1.1 * (t.scale ?? 1),
      halfLength: 1.1 * (t.scale ?? 1),
      rotation: 0,
    }));
    walkersRef.current = walkers;
  }, [segCount, roadLength]);

  useFrame((_, delta) => {
    const dynamicObstacles: MedianObstacle[] = [];

    for (const w of walkersRef.current) {
      w.z += w.direction * w.speed * delta;
      if (w.z > w.zMax) { w.z = w.zMax; w.direction = -1; }
      if (w.z < w.zMin) { w.z = w.zMin; w.direction = 1; }

      const g = groupRefs.current.get(w.id);
      if (g) {
        g.position.set(w.x, 0, w.z);
        g.rotation.y = w.direction > 0 ? Math.PI : 0;
      }

      dynamicObstacles.push({
        id: w.id,
        type: w.type,
        position: { x: w.x, z: w.z },
        halfWidth: w.type === 'person' ? 0.35 : 0.4,
        halfLength: w.type === 'person' ? 0.35 : 0.45,
        rotation: w.direction > 0 ? Math.PI : 0,
      });
    }

    medianRegistry.obstacles = [...treeObstaclesRef.current, ...dynamicObstacles];
  });

  return (
    <group>
      {staticDecorRef.current.map((d, i) => (
        <group key={`${d.type}-${i}`} position={[d.x, 0, d.z]}>
          {d.type === 'tree' ? (
            <MedianTree scale={d.scale} seed={d.seed} />
          ) : (
            <FlowerPot seed={d.seed} />
          )}
        </group>
      ))}
      {walkersRef.current.map((w) => (
        <group
          key={w.id}
          ref={(el) => { if (el) groupRefs.current.set(w.id, el); }}
          position={[w.x, 0, w.z]}
          rotation={[0, w.direction > 0 ? Math.PI : 0, 0]}
        >
          {w.type === 'person' ? (
            <Person shirtColor={w.shirtColor!} skinTone={w.skinTone!} />
          ) : (
            <PetDog color={w.petColor!} />
          )}
        </group>
      ))}
    </group>
  );
}
