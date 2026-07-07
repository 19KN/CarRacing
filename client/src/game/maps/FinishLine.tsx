import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TOTAL_ROAD_HALF } from './IndianHighwayRoad';

function CheckeredBanner({ width, height }: { width: number; height: number }) {
  const material = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 32;
    const ctx = c.getContext('2d')!;
    const cell = 8;
    for (let y = 0; y < c.height; y += cell) {
      for (let x = 0; x < c.width; x += cell) {
        const dark = ((x / cell) + (y / cell)) % 2 === 0;
        ctx.fillStyle = dark ? '#111' : '#fff';
        ctx.fillRect(x, y, cell, cell);
      }
    }
    const texture = new THREE.CanvasTexture(c);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(width / 2, height / 2);
    return new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide });
  }, [width, height]);

  return (
    <mesh material={material}>
      <planeGeometry args={[width, height]} />
    </mesh>
  );
}

function WinnerFlag({ side }: { side: -1 | 1 }) {
  const flagRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!flagRef.current) return;
    flagRef.current.rotation.y = Math.sin(clock.elapsedTime * 4 + side) * 0.25;
  });

  return (
    <group position={[side * (TOTAL_ROAD_HALF + 1.2), 0, 0]}>
      <mesh position={[0, 3.5, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 7, 8]} />
        <meshStandardMaterial color="#ccc" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh ref={flagRef} position={[side * 0.9, 6.2, 0]} rotation={[0, side * 0.3, 0]}>
        <planeGeometry args={[1.6, 1.1]} />
        <meshStandardMaterial
          color={side < 0 ? '#FF9933' : '#138808'}
          emissive={side < 0 ? '#FF6600' : '#0a5c06'}
          emissiveIntensity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[side * 0.3, 7.5, 0]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.8} metalness={0.6} />
      </mesh>
    </group>
  );
}

export function FinishLine({ z }: { z: number }) {
  const archHalf = TOTAL_ROAD_HALF + 1.5;

  return (
    <group position={[0, 0, z]}>
      {/* Run-out pavement past finish */}
      <mesh position={[0, 0.05, -60]} receiveShadow>
        <boxGeometry args={[archHalf * 2 + 4, 0.1, 120]} />
        <meshStandardMaterial color="#333" roughness={0.9} />
      </mesh>

      {/* Checkered ground strip */}
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[archHalf * 2, 6]} />
        <CheckeredBanner width={archHalf * 2} height={6} />
      </mesh>

      {/* Arch pillars */}
      {[-archHalf, archHalf].map((x) => (
        <mesh key={x} position={[x, 3.2, 0]} castShadow>
          <boxGeometry args={[0.5, 6.4, 0.5]} />
          <meshStandardMaterial color="#ddd" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}

      {/* Arch top beam */}
      <mesh position={[0, 6.5, 0]} castShadow>
        <boxGeometry args={[archHalf * 2 + 1, 0.6, 0.6]} />
        <meshStandardMaterial color="#eee" metalness={0.4} roughness={0.35} />
      </mesh>

      {/* Checkered banner across arch */}
      <group position={[0, 5.2, 0]}>
        <CheckeredBanner width={archHalf * 2} height={1.4} />
      </group>

      {/* FINISH text */}
      <mesh position={[0, 4.2, 0.35]}>
        <planeGeometry args={[5, 1.2]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[-1.5, 4.2, 0.36]}>
        <planeGeometry args={[0.7, 0.8]} />
        <meshStandardMaterial color="#FF9933" emissive="#FF6600" emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0, 4.2, 0.36]}>
        <planeGeometry args={[0.7, 0.8]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[1.5, 4.2, 0.36]}>
        <planeGeometry args={[0.7, 0.8]} />
        <meshStandardMaterial color="#138808" emissive="#0a5c06" emissiveIntensity={1.2} />
      </mesh>

      <WinnerFlag side={-1} />
      <WinnerFlag side={1} />

      {/* Side crowd banners */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (archHalf + 2), 2.5, -2]} rotation={[0, side * 0.2, 0]}>
          <planeGeometry args={[2.5, 1.5]} />
          <meshStandardMaterial
            color={side < 0 ? '#FF9933' : '#138808'}
            emissive={side < 0 ? '#cc5500' : '#0a5c06'}
            emissiveIntensity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
