import { useMemo } from 'react';
import * as THREE from 'three';
import {
  AERIAL_FINISH_ALTITUDE,
  AERIAL_HELIPAD,
  AERIAL_RUNWAY_CENTER_X,
  AERIAL_RUNWAY_LENGTH,
  AERIAL_RUNWAY_START_Z,
  getAerialFinishPosition,
  getMapRoadLength,
  MapConfig,
} from '@indian-racing/shared';
import { BigTreeMesh } from '../props/BigTreeMesh';

function forestTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#2d5a28';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 400; i++) {
    const g = 35 + Math.random() * 45;
    ctx.fillStyle = `rgba(${g - 20},${g + 10},${g - 15},0.4)`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 3, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8, 8);
  return t;
}

function Helipad() {
  const hTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#444';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(128, 128, 100, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 128, 70, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#f5f5f5';
    ctx.font = 'bold 120px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', 128, 132);
    return new THREE.CanvasTexture(c);
  }, []);

  return (
    <group position={[AERIAL_HELIPAD.x, 0, AERIAL_HELIPAD.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[14, 32]} />
        <meshStandardMaterial map={hTex} color="#555" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[12, 13.5, 32]} />
        <meshStandardMaterial color="#eee" emissive="#fff" emissiveIntensity={0.3} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos(i * Math.PI / 2) * 16, 2.5, Math.sin(i * Math.PI / 2) * 16]}>
          <boxGeometry args={[0.3, 5, 0.3]} />
          <meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function Runway() {
  return (
    <group position={[AERIAL_RUNWAY_CENTER_X, 0, AERIAL_RUNWAY_START_Z - AERIAL_RUNWAY_LENGTH / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[22, AERIAL_RUNWAY_LENGTH]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.95} />
      </mesh>
      {Array.from({ length: 24 }).map((_, i) => (
        <mesh
          key={i}
          position={[0, 0.06, -AERIAL_RUNWAY_LENGTH / 2 + 8 + i * 4.5]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.8, 3]} />
          <meshStandardMaterial color="#f0f0f0" emissive="#fff" emissiveIntensity={0.2} />
        </mesh>
      ))}
      <mesh position={[-12, 0.5, -AERIAL_RUNWAY_LENGTH / 2 + 4]}>
        <boxGeometry args={[0.4, 1, 2]} />
        <meshStandardMaterial color="#ff3333" emissive="#ff0000" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[12, 0.5, AERIAL_RUNWAY_LENGTH / 2 - 4]}>
        <boxGeometry args={[0.4, 1, 2]} />
        <meshStandardMaterial color="#33ff33" emissive="#00ff00" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function ForestTrees({ roadLength }: { roadLength: number }) {
  const trees = useMemo(() => {
    const list: { x: number; z: number; scale: number; seed: number }[] = [];
    for (let i = 0; i < 180; i++) {
      const seed = i * 31 + 7;
      const z = -Math.random() * (roadLength + 400) + 80;
      const side = i % 2 === 0 ? 1 : -1;
      const x = side * (25 + (seed % 80));
      if (Math.abs(x - AERIAL_HELIPAD.x) < 20 && Math.abs(z - AERIAL_HELIPAD.z) < 20) continue;
      if (Math.abs(x - AERIAL_RUNWAY_CENTER_X) < 18 && z > -100 && z < 80) continue;
      list.push({ x, z, scale: 0.7 + (seed % 5) * 0.15, seed });
    }
    return list;
  }, [roadLength]);

  return (
    <>
      {trees.map((t) => (
        <group key={`${t.x}-${t.z}`} position={[t.x, 0, t.z]}>
          <BigTreeMesh scale={t.scale} />
        </group>
      ))}
    </>
  );
}

export function SkyFinishLine() {
  const finish = getAerialFinishPosition();
  const archHalf = 45;

  return (
    <group position={[finish.x, finish.y, finish.z]}>
      <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[archHalf, 0.4, 8, 32, Math.PI]} />
        <meshStandardMaterial color="#eee" emissive="#fff" emissiveIntensity={0.4} metalness={0.5} />
      </mesh>
      {[-archHalf, archHalf].map((x) => (
        <mesh key={x} position={[x, -4, 0]} castShadow>
          <boxGeometry args={[1, 8, 1]} />
          <meshStandardMaterial color="#ddd" metalness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 2, 0]}>
        <planeGeometry args={[12, 3]} />
        <meshStandardMaterial color="#111" emissive="#FF9933" emissiveIntensity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 3, 0]} color="#FFD700" intensity={2} distance={80} />
      <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[archHalf * 2, 8]} />
        <meshStandardMaterial color="#138808" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function AerialEnvironment({ map }: { map: MapConfig }) {
  const roadLength = getMapRoadLength(map);
  const grassMap = useMemo(() => forestTex(), []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, -roadLength / 2]} receiveShadow>
        <planeGeometry args={[600, roadLength + 800]} />
        <meshStandardMaterial map={grassMap} color="#2d6a28" roughness={1} />
      </mesh>

      <Helipad />
      <Runway />
      <ForestTrees roadLength={roadLength} />

      <SkyFinishLine />

    </group>
  );
}
