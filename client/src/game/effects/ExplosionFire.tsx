import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function ExplosionFire({ active }: { active: boolean }) {
  const flamesRef = useRef<THREE.Group>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!active) {
      timeRef.current = 0;
      return;
    }
    timeRef.current += delta;

    if (flashRef.current) {
      const flashScale = 1 + timeRef.current * 6;
      flashRef.current.scale.setScalar(Math.max(0.1, 3.5 - flashScale));
      const mat = flashRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = Math.max(0, 0.95 - timeRef.current * 1.8);
    }

    if (!flamesRef.current) return;
    flamesRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const rise = Math.min(timeRef.current * 2.5, 4);
      mesh.position.y = 0.6 + Math.sin(timeRef.current * 8 + i) * 0.25 + i * 0.18 + rise * 0.15;
      const pulse = 1 + Math.sin(timeRef.current * 6 + i * 2) * 0.25;
      const grow = 1 + Math.min(timeRef.current * 0.8, 1.5);
      mesh.scale.setScalar((0.9 + i * 0.15) * pulse * grow);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2.5 + Math.sin(timeRef.current * 10 + i) * 1.2;
      mat.opacity = Math.max(0.35, 0.95 - timeRef.current * 0.12);
    });
  });

  if (!active) return null;

  const colors = ['#ff2200', '#ff6600', '#ffaa00', '#ff4400', '#ff8800'];
  return (
    <group position={[0, 0.2, 0]}>
      <mesh ref={flashRef}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshStandardMaterial
          color="#fff4cc"
          emissive="#ffaa00"
          emissiveIntensity={6}
          transparent
          opacity={0.95}
        />
      </mesh>
      <group ref={flamesRef}>
        {colors.map((color, i) => (
          <mesh key={i} position={[(i - 2) * 0.45, 0.5 + i * 0.12, ((i % 3) - 1) * 0.35]}>
            <sphereGeometry args={[0.55 + i * 0.12, 10, 10]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={4}
              transparent
              opacity={0.9}
            />
          </mesh>
        ))}
        <mesh position={[0, 0.35, 0]}>
          <sphereGeometry args={[1.4, 12, 12]} />
          <meshStandardMaterial color="#1a0800" emissive="#ff3300" emissiveIntensity={2.5} transparent opacity={0.75} />
        </mesh>
      </group>
      <pointLight color="#ff6600" intensity={12} distance={18} position={[0, 1.5, 0]} />
      <pointLight color="#ffaa00" intensity={8} distance={12} position={[0, 2.5, 0]} />
    </group>
  );
}
