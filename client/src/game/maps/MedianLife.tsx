import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RACE_START_Z } from '@indian-racing/shared';
import { medianRegistry, type MedianObstacle, updatePedestrianJumps, getPedestrianJumpOffset } from './medianCollision';
import { PedestrianMesh } from '../characters/PedestrianMesh';
import { BigTreeMesh } from '../props/BigTreeMesh';
import { PalmTreeMesh } from '../props/PalmTreeMesh';
import { SIDEWALK_X, TOTAL_ROAD_HALF } from './IndianHighwayRoad';

const SEG_LEN = 40;
const SHOULDER_W = 2;
const SIDEWALK_W = 2.5;
const GRASS_TREE_X = TOTAL_ROAD_HALF + SHOULDER_W + SIDEWALK_W + 1.5;

const MEDIAN_BIG_TREE_SPACING = 80;
const FOOTPATH_BIG_TREE_COUNT = 5;
const MEDIAN_PALM_COUNT = 4;
const FOOTPATH_PALM_PER_SIDE = 2;

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
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
  petColor?: string;
  locomotion?: 'walk' | 'run';
}

function personLocomotion(seed: number): { locomotion: 'walk' | 'run'; speed: number } {
  const running = seededRandom(seed) > 0.5;
  if (running) {
    return { locomotion: 'run', speed: 2.2 + seededRandom(seed + 1) * 1.0 };
  }
  return { locomotion: 'walk', speed: 1.0 + seededRandom(seed + 2) * 0.35 };
}

interface StaticDecor {
  type: 'median_big_tree' | 'footpath_big_tree' | 'median_palm_tree' | 'footpath_palm_tree' | 'pot';
  x: number;
  z: number;
  seed: number;
  scale?: number;
}

function buildStaticDecor(roadLength: number): StaticDecor[] {
  const trees: StaticDecor[] = [];
  const pots: StaticDecor[] = [];

  for (let z = RACE_START_Z - 35; z > -roadLength + 120; z -= MEDIAN_BIG_TREE_SPACING) {
    const seed = Math.round(Math.abs(z) * 3.7);
    trees.push({
      type: 'median_big_tree',
      x: 0,
      z,
      seed,
      scale: 0.55 + seededRandom(seed) * 0.1,
    });
  }

  const bigFootStartZ = RACE_START_Z - 45;
  const bigFootEndZ = -roadLength + 150;
  for (let i = 0; i < FOOTPATH_BIG_TREE_COUNT; i++) {
    const t = i / (FOOTPATH_BIG_TREE_COUNT - 1);
    const z = bigFootStartZ + t * (bigFootEndZ - bigFootStartZ);
    const seed = 200 + i * 19;
    trees.push({
      type: 'footpath_big_tree',
      x: -GRASS_TREE_X,
      z,
      seed,
      scale: 0.9 + seededRandom(seed) * 0.15,
    });
    trees.push({
      type: 'footpath_big_tree',
      x: GRASS_TREE_X,
      z: z - 20,
      seed: seed + 40,
      scale: 0.9 + seededRandom(seed + 1) * 0.15,
    });
  }

  const medianStart = RACE_START_Z - 55;
  const medianEnd = -roadLength + 200;
  for (let i = 0; i < MEDIAN_PALM_COUNT; i++) {
    const t = i / (MEDIAN_PALM_COUNT - 1);
    const z = medianStart + t * (medianEnd - medianStart);
    const seed = 10 + i * 23;
    trees.push({
      type: 'median_palm_tree',
      x: 0,
      z: z - 12,
      seed,
      scale: 0.42 + seededRandom(seed) * 0.08,
    });
  }

  const palmFootStartZ = RACE_START_Z - 60;
  const palmFootEndZ = -roadLength + 180;
  for (let i = 0; i < FOOTPATH_PALM_PER_SIDE; i++) {
    const t = i / (FOOTPATH_PALM_PER_SIDE - 1);
    const z = palmFootStartZ + t * (palmFootEndZ - palmFootStartZ);
    const seed = 100 + i * 17;
    trees.push({
      type: 'footpath_palm_tree',
      x: -SIDEWALK_X,
      z,
      seed,
      scale: 0.75 + seededRandom(seed) * 0.12,
    });
    trees.push({
      type: 'footpath_palm_tree',
      x: SIDEWALK_X,
      z: z - 30,
      seed: seed + 50,
      scale: 0.75 + seededRandom(seed + 1) * 0.12,
    });
  }

  const segCount = Math.ceil(roadLength / SEG_LEN);
  for (let i = 0; i < segCount; i++) {
    const z = 50 - i * SEG_LEN;
    const seed = i * 11 + 5;

    if (i % 4 === 0) {
      const potX = seededRandom(seed) > 0.5 ? -0.55 : 0.55;
      pots.push({ type: 'pot', x: potX, z: z - 18, seed: seed + 50 });
    }

    if (i % 3 === 1) {
      pots.push({ type: 'pot', x: SIDEWALK_X - 0.5, z: z - 5, seed: seed + 60 });
      pots.push({ type: 'pot', x: -SIDEWALK_X + 0.5, z: z - 22, seed: seed + 61 });
    }
  }

  return [...trees, ...pots];
}

function buildWalkers(roadLength: number): Walker[] {
  const segCount = Math.ceil(roadLength / SEG_LEN);
  const walkers: Walker[] = [];

  walkers.push({
    id: 'person_start_l',
    type: 'person',
    x: -SIDEWALK_X,
    z: RACE_START_Z - 25,
    zMin: RACE_START_Z - 45,
    zMax: RACE_START_Z - 5,
    direction: -1,
    speed: 1.15,
    locomotion: 'walk',
    shirtColor: '#ff9933',
  });

  walkers.push({
    id: 'person_start_r',
    type: 'person',
    x: SIDEWALK_X,
    z: RACE_START_Z - 35,
    zMin: RACE_START_Z - 55,
    zMax: RACE_START_Z - 15,
    direction: -1,
    speed: 2.6,
    locomotion: 'run',
    shirtColor: '#3498db',
  });

  for (let i = 0; i < segCount; i++) {
    const z = 50 - i * SEG_LEN;
    const seed = i * 11 + 5;

    if (i % 5 === 0) {
      const zStart = z - 15;
      const leftMove = personLocomotion(seed);
      const rightMove = personLocomotion(seed + 7);
      walkers.push({
        id: `person_l_${i}`,
        type: 'person',
        x: -SIDEWALK_X,
        z: zStart,
        zMin: zStart - 18,
        zMax: zStart + 18,
        direction: seededRandom(seed) > 0.5 ? 1 : -1,
        speed: leftMove.speed,
        locomotion: leftMove.locomotion,
        shirtColor: ['#ff9933', '#138808', '#3498db', '#e74c3c', '#9b59b6'][i % 5],
      });
      walkers.push({
        id: `person_r_${i}`,
        type: 'person',
        x: SIDEWALK_X,
        z: zStart - 8,
        zMin: zStart - 26,
        zMax: zStart + 10,
        direction: seededRandom(seed + 3) > 0.5 ? 1 : -1,
        speed: rightMove.speed,
        locomotion: rightMove.locomotion,
        shirtColor: ['#ffffff', '#2c3e50', '#e67e22', '#1abc9c'][i % 4],
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
      const medianMove = personLocomotion(seed + 30);
      walkers.push({
        id: `person_median_${i}`,
        type: 'person',
        x: 0,
        z: z - 8,
        zMin: z - 20,
        zMax: z + 4,
        direction: -1,
        speed: medianMove.speed,
        locomotion: medianMove.locomotion,
        shirtColor: '#ff9933',
      });
    }
  }

  return walkers;
}

export function MedianLife({ roadLength }: { roadLength: number }) {
  const staticDecor = useMemo(() => buildStaticDecor(roadLength), [roadLength]);
  const initialWalkers = useMemo(() => buildWalkers(roadLength), [roadLength]);
  const walkersRef = useRef<Walker[]>(initialWalkers);
  const treeObstaclesRef = useRef<MedianObstacle[]>([]);
  const groupRefs = useRef(new Map<string, THREE.Group>());

  useMemo(() => {
    walkersRef.current = initialWalkers;
    treeObstaclesRef.current = staticDecor
      .filter((t) => t.type === 'median_big_tree' || t.type === 'median_palm_tree')
      .map((t, idx) => ({
        id: `median_tree_${idx}`,
        type: 'tree' as const,
        position: { x: t.x, z: t.z },
        halfWidth: 1.4 * (t.scale ?? 1),
        halfLength: 1.4 * (t.scale ?? 1),
        rotation: 0,
      }));
  }, [initialWalkers, staticDecor]);

  useFrame((_, delta) => {
    updatePedestrianJumps(delta);
    const dynamicObstacles: MedianObstacle[] = [];

    for (const w of walkersRef.current) {
      w.z += w.direction * w.speed * delta;
      if (w.z > w.zMax) { w.z = w.zMax; w.direction = -1; }
      if (w.z < w.zMin) { w.z = w.zMin; w.direction = 1; }

      const jumpY = w.type === 'person' ? getPedestrianJumpOffset(w.id) : 0;
      const g = groupRefs.current.get(w.id);
      if (g) {
        g.position.set(w.x, jumpY, w.z);
        g.rotation.y = w.direction > 0 ? 0 : Math.PI;
      }

      dynamicObstacles.push({
        id: w.id,
        type: w.type,
        position: { x: w.x, z: w.z },
        halfWidth: w.type === 'person' ? 0.35 : 0.4,
        halfLength: w.type === 'person' ? 0.35 : 0.45,
        rotation: w.direction > 0 ? 0 : Math.PI,
      });
    }

    medianRegistry.obstacles = [...treeObstaclesRef.current, ...dynamicObstacles];
  });

  return (
    <group>
      {staticDecor.map((d, i) => (
        <group key={`${d.type}-${i}`} position={[d.x, 0, d.z]}>
          {d.type === 'pot' ? (
            <FlowerPot seed={d.seed} />
          ) : d.type === 'median_palm_tree' || d.type === 'footpath_palm_tree' ? (
            <Suspense fallback={null}>
              <PalmTreeMesh scale={d.scale} />
            </Suspense>
          ) : (
            <Suspense fallback={null}>
              <BigTreeMesh scale={d.scale} />
            </Suspense>
          )}
        </group>
      ))}
      {initialWalkers.map((w) => (
        <group
          key={w.id}
          ref={(el) => { if (el) groupRefs.current.set(w.id, el); }}
          position={[w.x, 0, w.z]}
          rotation={[0, w.direction > 0 ? 0 : Math.PI, 0]}
        >
          {w.type === 'person' ? (
            <Suspense fallback={null}>
              <PedestrianMesh color={w.shirtColor!} locomotion={w.locomotion ?? 'walk'} />
            </Suspense>
          ) : (
            <PetDog color={w.petColor!} />
          )}
        </group>
      ))}
    </group>
  );
}
