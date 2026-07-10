import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { missileRegistry, updateMissiles } from './missileSystem';

export function MissileVisuals() {
  const groupRef = useRef<THREE.Group>(null);
  const meshPool = useRef<THREE.Mesh[]>([]);

  useFrame((_, delta) => {
    updateMissiles(delta);
    const group = groupRef.current;
    if (!group) return;

    while (meshPool.current.length < missileRegistry.missiles.length) {
      const mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.15, 0.8, 4, 8),
        new THREE.MeshStandardMaterial({ color: '#ff4400', emissive: '#ff2200', emissiveIntensity: 0.8 }),
      );
      mesh.rotation.x = Math.PI / 2;
      group.add(mesh);
      meshPool.current.push(mesh);
    }

    for (let i = 0; i < meshPool.current.length; i++) {
      const mesh = meshPool.current[i];
      const m = missileRegistry.missiles[i];
      if (m) {
        mesh.visible = true;
        mesh.position.set(m.x, m.y, m.z);
        mesh.rotation.y = Math.atan2(m.vx, m.vz);
      } else {
        mesh.visible = false;
      }
    }
  });

  return <group ref={groupRef} />;
}
