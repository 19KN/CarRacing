import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function ExplosionFire({ active }: { active: boolean }) {
  const flamesRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!active || !flamesRef.current) return;
    timeRef.current += delta;
    flamesRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      mesh.position.y = 0.4 + Math.sin(timeRef.current * 8 + i) * 0.15 + i * 0.12;
      mesh.scale.setScalar(0.8 + Math.sin(timeRef.current * 6 + i * 2) * 0.2);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2 + Math.sin(timeRef.current * 10 + i) * 0.8;
    });
  });

  if (!active) return null;

  const colors = ['#ff4400', '#ff8800', '#ffcc00', '#ff2200'];
  return (
    <group ref={flamesRef} position={[0, 0.3, 0]}>
      {colors.map((color, i) => (
        <mesh key={i} position={[(i - 1.5) * 0.35, 0.4 + i * 0.1, (i % 2) * 0.2 - 0.1]}>
          <sphereGeometry args={[0.35 + i * 0.08, 8, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={3}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.9, 10, 10]} />
        <meshStandardMaterial color="#111" emissive="#ff3300" emissiveIntensity={1.5} transparent opacity={0.6} />
      </mesh>
      <pointLight color="#ff6600" intensity={4} distance={8} position={[0, 1, 0]} />
    </group>
  );
}
