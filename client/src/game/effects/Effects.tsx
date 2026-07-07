import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MAX_MARKS = 200;
const MAX_SMOKE = 50;

export function TyreMarks() {
  const marksRef = useRef<THREE.InstancedMesh>(null);
  const countRef = useRef(0);

  const addMark = (x: number, z: number) => {
    if (!marksRef.current || countRef.current >= MAX_MARKS) return;
    const matrix = new THREE.Matrix4();
    matrix.setPosition(x, 0.02, z);
    marksRef.current.setMatrixAt(countRef.current, matrix);
    marksRef.current.instanceMatrix.needsUpdate = true;
    countRef.current++;
  };

  return { marksRef, addMark };
}

export function SmokeParticles({ active, position }: {
  active: boolean;
  position: [number, number, number];
}) {
  const ref = useRef<THREE.Points>(null);

  useFrame(() => {
    if (!ref.current || !active) return;
    const positions = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += 0.05;
      positions[i] += (Math.random() - 0.5) * 0.02;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={ref} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={20}
          array={new Float32Array(60).map((_, i) => i % 3 === 1 ? Math.random() * 2 : (Math.random() - 0.5) * 0.5)}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.3} color="#666" transparent opacity={0.5} />
    </points>
  );
}

export function SparkEffect({ active, position }: {
  active: boolean;
  position: [number, number, number];
}) {
  if (!active) return null;
  return (
    <group position={position}>
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[(Math.random() - 0.5) * 2, Math.random() * 1.5, (Math.random() - 0.5) * 2]}>
          <sphereGeometry args={[0.05, 4, 4]} />
          <meshStandardMaterial color="#ffaa00" emissive="#ff6600" emissiveIntensity={3} />
        </mesh>
      ))}
    </group>
  );
}

export function DustCloud({ active, position }: {
  active: boolean;
  position: [number, number, number];
}) {
  if (!active) return null;
  return (
    <mesh position={position}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial color="#c2b280" transparent opacity={0.3} />
    </mesh>
  );
}
