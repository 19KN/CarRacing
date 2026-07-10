import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VehicleConfig } from '@indian-racing/shared';
import { GLBVehicleMesh } from './GLBVehicleMesh';
import { GLB_VEHICLE_IDS } from './glbVehicleConfigs';
import { AircraftMesh } from './AircraftMesh';

interface VehicleMeshProps {
  config: VehicleConfig;
  color: string;
}

function Wheel({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.x += 0.05;
  });
  const r = 0.38 * scale;
  return (
    <group ref={ref} position={position}>
      {/* Tire */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[r, r, 0.28 * scale, 16]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.95} />
      </mesh>
      {/* Rim */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 0.65, r * 0.65, 0.3 * scale, 20]} />
        <meshStandardMaterial color="#888" metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Spokes */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh
          key={i}
          rotation={[0, 0, Math.PI / 2 + (i * Math.PI * 2) / 5]}
          position={[0, 0, 0]}
        >
          <boxGeometry args={[r * 0.55, 0.08 * scale, 0.04 * scale]} />
          <meshStandardMaterial color="#c8c8c8" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

/** Low-poly muscle / sports coupe — Mustang-inspired design */
function SportsCarMesh({ color, scale = 1 }: { color: string; scale?: number }) {
  const bodyColor = useMemo(() => new THREE.Color(color), [color]);
  const s = scale;
  const bodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.45, roughness: 0.35 }),
    [bodyColor],
  );
  const blackMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.6 }), []);
  const glassMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0a0a12', metalness: 0.9, roughness: 0.1 }),
    [],
  );

  return (
    <group scale={s}>
      {/* ── Lower body / chassis ── */}
      <mesh castShadow receiveShadow position={[0, 0.32, 0.1]} material={bodyMat}>
        <boxGeometry args={[1.92, 0.38, 4.2]} />
      </mesh>

      {/* Flared wheel arches */}
      {[
        [-1.05, 0.42, 1.35],
        [1.05, 0.42, 1.35],
        [-1.05, 0.42, -1.2],
        [1.05, 0.42, -1.2],
      ].map((pos, i) => (
        <mesh key={`arch-${i}`} castShadow position={pos as [number, number, number]} material={bodyMat}>
          <boxGeometry args={[0.35, 0.22, 0.9]} />
        </mesh>
      ))}

      {/* ── Hood (long, slightly raised) ── */}
      <mesh castShadow position={[0, 0.58, 1.35]} material={bodyMat}>
        <boxGeometry args={[1.78, 0.18, 1.6]} />
      </mesh>
      <mesh castShadow position={[0, 0.66, 1.1]} material={bodyMat}>
        <boxGeometry args={[0.7, 0.08, 1.1]} />
      </mesh>

      {/* ── Front fascia ── */}
      <mesh castShadow position={[0, 0.48, 2.15]} material={bodyMat}>
        <boxGeometry args={[1.85, 0.45, 0.25]} />
      </mesh>

      <mesh position={[0, 0.38, 2.28]} material={blackMat}>
        <boxGeometry args={[1.5, 0.55, 0.08]} />
      </mesh>
      <mesh position={[-0.55, 0.22, 2.26]} material={blackMat}>
        <boxGeometry args={[0.45, 0.18, 0.1]} />
      </mesh>
      <mesh position={[0.55, 0.22, 2.26]} material={blackMat}>
        <boxGeometry args={[0.45, 0.18, 0.1]} />
      </mesh>

      {/* Slim horizontal headlights */}
      <mesh position={[-0.72, 0.52, 2.22]} rotation={[0, 0.15, 0]}>
        <boxGeometry args={[0.45, 0.1, 0.12]} />
        <meshStandardMaterial color="#ffffee" emissive="#ffffcc" emissiveIntensity={2.5} />
      </mesh>
      <mesh position={[0.72, 0.52, 2.22]} rotation={[0, -0.15, 0]}>
        <boxGeometry args={[0.45, 0.1, 0.12]} />
        <meshStandardMaterial color="#ffffee" emissive="#ffffcc" emissiveIntensity={2.5} />
      </mesh>

      <mesh castShadow position={[0, 0.82, -0.15]} material={bodyMat}>
        <boxGeometry args={[1.62, 0.12, 1.8]} />
      </mesh>
      <mesh castShadow position={[0, 0.72, -1.15]} rotation={[0.35, 0, 0]} material={bodyMat}>
        <boxGeometry args={[1.58, 0.1, 1.3]} />
      </mesh>
      <mesh castShadow position={[0, 0.55, -1.85]} material={bodyMat}>
        <boxGeometry args={[1.7, 0.15, 0.5]} />
      </mesh>

      <mesh position={[0, 0.88, 0.55]} material={glassMat}>
        <boxGeometry args={[1.5, 0.42, 0.06]} />
      </mesh>
      <mesh position={[-0.82, 0.82, -0.1]} material={glassMat}>
        <boxGeometry args={[0.06, 0.35, 1.2]} />
      </mesh>
      <mesh position={[0.82, 0.82, -0.1]} material={glassMat}>
        <boxGeometry args={[0.06, 0.35, 1.2]} />
      </mesh>
      <mesh position={[0, 0.78, -1.05]} rotation={[0.35, 0, 0]} material={glassMat}>
        <boxGeometry args={[1.45, 0.35, 0.06]} />
      </mesh>

      <mesh position={[0, 0.18, 0]} material={blackMat}>
        <boxGeometry args={[1.95, 0.06, 3.8]} />
      </mesh>

      {/* Tail lights */}
      <mesh position={[-0.65, 0.48, -2.08]}>
        <boxGeometry args={[0.4, 0.12, 0.06]} />
        <meshStandardMaterial color="#ff1111" emissive="#ff0000" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0.65, 0.48, -2.08]}>
        <boxGeometry args={[0.4, 0.12, 0.06]} />
        <meshStandardMaterial color="#ff1111" emissive="#ff0000" emissiveIntensity={1.5} />
      </mesh>

      <mesh position={[0, 0.2, -2.1]} material={blackMat}>
        <boxGeometry args={[1.6, 0.08, 0.15]} />
      </mesh>

      {/* ── Wheels ── */}
      <Wheel position={[-0.92, 0.28, 1.35]} />
      <Wheel position={[0.92, 0.28, 1.35]} />
      <Wheel position={[-0.92, 0.28, -1.2]} />
      <Wheel position={[0.92, 0.28, -1.2]} />
    </group>
  );
}

function TwoWheelerMesh({ color, type }: { color: string; type: string }) {
  const bodyColor = useMemo(() => new THREE.Color(color), [color]);
  const isAuto = type === 'auto_rickshaw';
  return (
    <group>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[isAuto ? 1.3 : 0.5, 0.6, isAuto ? 1.8 : 1.6]} />
        <meshStandardMaterial color={bodyColor} metalness={0.5} roughness={0.4} />
      </mesh>
      {isAuto && (
        <mesh position={[0, 1.1, 0]}>
          <boxGeometry args={[1.2, 0.05, 1.4]} />
          <meshStandardMaterial color="#ffcc00" transparent opacity={0.7} />
        </mesh>
      )}
      <Wheel position={[-0.35, 0.2, 0.6]} scale={0.5} />
      <Wheel position={[0.35, 0.2, 0.6]} scale={0.5} />
      {!isAuto && <Wheel position={[0, 0.2, -0.6]} scale={0.5} />}
    </group>
  );
}

function CommercialMesh({ color, type }: { color: string; type: string }) {
  const bodyColor = useMemo(() => new THREE.Color(color), [color]);
  const sizes: Record<string, [number, number, number]> = {
    bus: [2.4, 2.6, 7.5],
    lorry: [2.4, 2.8, 6.5],
    mini_truck: [2, 2, 4.5],
    tractor: [2, 1.8, 3],
    pickup_truck: [2, 1.8, 5],
  };
  const [w, h, d] = sizes[type] || [2, 2, 4.5];
  return (
    <group>
      <mesh castShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h * 0.7, d]} />
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.6} />
      </mesh>
      <Wheel position={[-w / 2 + 0.2, 0.35, d * 0.35]} scale={0.9} />
      <Wheel position={[w / 2 - 0.2, 0.35, d * 0.35]} scale={0.9} />
      <Wheel position={[-w / 2 + 0.2, 0.35, -d * 0.35]} scale={0.9} />
      <Wheel position={[w / 2 - 0.2, 0.35, -d * 0.35]} scale={0.9} />
    </group>
  );
}

/** Compact hatchback — shorter sports coupe */
function HatchbackMesh({ color }: { color: string }) {
  const bodyColor = useMemo(() => new THREE.Color(color), [color]);
  const bodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.4, roughness: 0.4 }),
    [bodyColor],
  );
  const blackMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.6 }), []);
  const glassMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0a0a12', metalness: 0.9, roughness: 0.1 }),
    [],
  );

  return (
    <group scale={0.9}>
      <mesh castShadow position={[0, 0.35, 0]} material={bodyMat}>
        <boxGeometry args={[1.75, 0.42, 3.6]} />
      </mesh>
      {/* Short hood */}
      <mesh castShadow position={[0, 0.55, 1.1]} material={bodyMat}>
        <boxGeometry args={[1.7, 0.16, 1.1]} />
      </mesh>
      {/* Hatch rear — steep slope */}
      <mesh castShadow position={[0, 0.75, -0.5]} material={bodyMat}>
        <boxGeometry args={[1.65, 0.5, 1.4]} />
      </mesh>
      <mesh castShadow position={[0, 0.65, -1.4]} rotation={[0.5, 0, 0]} material={bodyMat}>
        <boxGeometry args={[1.6, 0.1, 0.9]} />
      </mesh>
      {/* Grille */}
      <mesh position={[0, 0.4, 1.85]} material={blackMat}>
        <boxGeometry args={[1.3, 0.4, 0.08]} />
      </mesh>
      {/* Headlights */}
      <mesh position={[-0.65, 0.48, 1.8]}>
        <boxGeometry args={[0.35, 0.1, 0.1]} />
        <meshStandardMaterial color="#ffffee" emissive="#ffffcc" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0.65, 0.48, 1.8]}>
        <boxGeometry args={[0.35, 0.1, 0.1]} />
        <meshStandardMaterial color="#ffffee" emissive="#ffffcc" emissiveIntensity={2} />
      </mesh>
      {/* Windows */}
      <mesh position={[0, 0.82, 0.35]} material={glassMat}>
        <boxGeometry args={[1.45, 0.38, 0.06]} />
      </mesh>
      <mesh position={[-0.78, 0.78, -0.15]} material={glassMat}>
        <boxGeometry args={[0.06, 0.32, 1]} />
      </mesh>
      <mesh position={[0.78, 0.78, -0.15]} material={glassMat}>
        <boxGeometry args={[0.06, 0.32, 1]} />
      </mesh>
      {/* Tail lights */}
      <mesh position={[-0.6, 0.45, -1.75]}>
        <boxGeometry args={[0.35, 0.1, 0.06]} />
        <meshStandardMaterial color="#ff2222" emissive="#ff0000" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0.6, 0.45, -1.75]}>
        <boxGeometry args={[0.35, 0.1, 0.06]} />
        <meshStandardMaterial color="#ff2222" emissive="#ff0000" emissiveIntensity={1.5} />
      </mesh>
      <Wheel position={[-0.85, 0.3, 1.1]} scale={0.85} />
      <Wheel position={[0.85, 0.3, 1.1]} scale={0.85} />
      <Wheel position={[-0.85, 0.3, -1]} scale={0.85} />
      <Wheel position={[0.85, 0.3, -1]} scale={0.85} />
    </group>
  );
}

/** Rugged off-road Jeep */
function JeepMesh({ color }: { color: string }) {
  const bodyColor = useMemo(() => new THREE.Color(color), [color]);
  const bodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.25, roughness: 0.65 }),
    [bodyColor],
  );
  const blackMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.7 }), []);

  return (
    <group>
      <mesh castShadow position={[0, 0.55, 0]} material={bodyMat}>
        <boxGeometry args={[1.85, 0.5, 3.8]} />
      </mesh>
      {/* Boxy cabin */}
      <mesh castShadow position={[0, 1.05, -0.2]} material={bodyMat}>
        <boxGeometry args={[1.7, 0.7, 2]} />
      </mesh>
      {/* Flat hood */}
      <mesh castShadow position={[0, 0.72, 1.3]} material={bodyMat}>
        <boxGeometry args={[1.75, 0.12, 1.2]} />
      </mesh>
      {/* Vertical grille slats */}
      {[-0.3, -0.1, 0.1, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.55, 1.95]} material={blackMat}>
          <boxGeometry args={[0.06, 0.35, 0.06]} />
        </mesh>
      ))}
      {/* Round headlights */}
      <mesh position={[-0.7, 0.58, 1.9]}>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshStandardMaterial color="#ffffee" emissive="#ffffcc" emissiveIntensity={2.5} />
      </mesh>
      <mesh position={[0.7, 0.58, 1.9]}>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshStandardMaterial color="#ffffee" emissive="#ffffcc" emissiveIntensity={2.5} />
      </mesh>
      {/* Open-style windows / roll bars */}
      <mesh position={[-0.88, 1.1, -0.2]} material={blackMat}>
        <boxGeometry args={[0.06, 0.65, 1.8]} />
      </mesh>
      <mesh position={[0.88, 1.1, -0.2]} material={blackMat}>
        <boxGeometry args={[0.06, 0.65, 1.8]} />
      </mesh>
      <mesh position={[0, 1.45, -0.2]} material={blackMat}>
        <boxGeometry args={[1.6, 0.06, 1.8]} />
      </mesh>
      {/* Windshield */}
      <mesh position={[0, 1.05, 0.75]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[1.55, 0.5, 0.06]} />
        <meshStandardMaterial color="#0a1520" metalness={0.8} roughness={0.15} />
      </mesh>
      {/* Spare tire on back */}
      <mesh position={[0, 0.7, -2.05]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.35, 0.35, 0.2, 12]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.7, -2.15]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.05, 8]} />
        <meshStandardMaterial color="#999" metalness={0.7} />
      </mesh>
      {/* Rugged fender flares */}
      {[[-1, 1.2], [1, 1.2], [-1, -1.1], [1, -1.1]].map(([x, z], i) => (
        <mesh key={i} castShadow position={[x * 0.95, 0.45, z]} material={bodyMat}>
          <boxGeometry args={[0.25, 0.2, 0.8]} />
        </mesh>
      ))}
      {/* Running boards */}
      <mesh position={[0, 0.25, 0]} material={blackMat}>
        <boxGeometry args={[2, 0.05, 3.5]} />
      </mesh>
      <Wheel position={[-0.95, 0.42, 1.2]} scale={1.1} />
      <Wheel position={[0.95, 0.42, 1.2]} scale={1.1} />
      <Wheel position={[-0.95, 0.42, -1.1]} scale={1.1} />
      <Wheel position={[0.95, 0.42, -1.1]} scale={1.1} />
    </group>
  );
}

function getCarScale(config: VehicleConfig): number {
  switch (config.id) {
    case 'hatchback': return 0.88;
    case 'sedan': return 0.95;
    case 'wagon': return 1.0;
    case 'suv': return 1.08;
    case 'jeep': return 1.05;
    case 'sports_car': return 1.0;
    case 'formula_car': return 0.92;
    case 'police_car': return 1.0;
    case 'ambulance': return 1.05;
    case 'toy_car': return 0.55;
    default: return 1.0;
  }
}

export function VehicleMesh({ config, color, rotorSpeed, pitch, onGround, visualRef }: VehicleMeshProps & {
  rotorSpeed?: number;
  pitch?: number;
  onGround?: boolean;
  visualRef?: React.MutableRefObject<{ rotorSpeed: number; pitch: number; onGround: boolean }>;
}) {
  if (config.category === 'aircraft') {
    return (
      <AircraftMesh
        vehicleId={config.id}
        color={color}
        rotorSpeed={rotorSpeed}
        pitch={pitch}
        onGround={onGround}
        visualRef={visualRef}
      />
    );
  }
  if (GLB_VEHICLE_IDS.has(config.id)) {
    return <GLBVehicleMesh vehicleId={config.id} color={color} />;
  }
  if (config.category === 'two_wheeler' || config.id === 'auto_rickshaw') {
    return <TwoWheelerMesh color={color} type={config.id} />;
  }
  if (config.category === 'commercial') {
    return <CommercialMesh color={color} type={config.id} />;
  }
  if (config.id === 'formula_car') {
    return (
      <group>
        <SportsCarMesh color={color} scale={0.85} />
        <mesh position={[0, 0.95, 0]}>
          <boxGeometry args={[1.4, 0.15, 0.8]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </group>
    );
  }
  if (config.id === 'police_car') {
    return (
      <group>
        <SportsCarMesh color={color} scale={1} />
        <mesh position={[-0.15, 1.05, 0]}>
          <boxGeometry args={[0.25, 0.08, 0.35]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={3} />
        </mesh>
        <mesh position={[0.15, 1.05, 0]}>
          <boxGeometry args={[0.25, 0.08, 0.35]} />
          <meshStandardMaterial color="#0000ff" emissive="#0000ff" emissiveIntensity={3} />
        </mesh>
      </group>
    );
  }
  if (config.id === 'ambulance') {
    return (
      <group scale={1.05}>
        <SportsCarMesh color="#ffffff" scale={1} />
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[1.5, 0.5, 2]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0.85, 1.1]}>
          <boxGeometry args={[0.3, 0.3, 0.05]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1} />
        </mesh>
      </group>
    );
  }
  if (config.id === 'hatchback') {
    return <HatchbackMesh color={color} />;
  }
  if (config.id === 'jeep') {
    return <JeepMesh color={color} />;
  }
  if (config.id === 'sports_car') {
    return <SportsCarMesh color={color} scale={1} />;
  }

  // Other standard cars use the muscle/sports coupe design
  return <SportsCarMesh color={color} scale={getCarScale(config)} />;
}
