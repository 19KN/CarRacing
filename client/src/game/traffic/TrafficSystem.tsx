import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TrafficSignalState, VEHICLES, getVehicleById } from '@indian-racing/shared';
import { TRAFFIC_LANE_OFFSETS } from '../maps/IndianHighwayRoad';
import { VehicleMesh } from '../vehicles/VehicleMesh';
import { buildTrafficSpawnBounds } from './trafficCollision';

export interface TrafficVehicle {
  id: string;
  vehicleId: string;
  position: THREE.Vector3;
  speed: number;
  lane: number;
  rotation: number;
  color: string;
  halfWidth: number;
  halfLength: number;
}

const TRAFFIC_VEHICLE_IDS = VEHICLES.map((v) => v.id);
const TRAFFIC_COLORS = [
  '#ffffff', '#c8c8c8', '#2a4a8a', '#8b1a1a', '#ff9933',
  '#1a1a1a', '#2d7a3a', '#e8c840', '#6a4a8a', '#d45a20',
];

/** Shared registry — read each frame for player collision checks */
export const trafficRegistry = { vehicles: [] as TrafficVehicle[] };

const TrafficVehicleVisual = memo(function TrafficVehicleVisual({
  vehicleId,
  color,
}: {
  vehicleId: string;
  color: string;
}) {
  const config = getVehicleById(vehicleId);
  if (!config) return null;
  return <VehicleMesh config={config} color={color} />;
});

export function TrafficSystem({
  density,
  signalState,
}: {
  path: { x: number; y: number; z: number }[];
  density: number;
  signalState: TrafficSignalState;
}) {
  const vehiclesRef = useRef<TrafficVehicle[]>([]);
  const groupRef = useRef<THREE.Group>(null);

  useMemo(() => {
    const count = Math.floor(density * 30) + 12;
    const usedSlots = new Set<string>();

    vehiclesRef.current = Array.from({ length: count }, (_, i) => {
      const vehicleId = TRAFFIC_VEHICLE_IDS[i % TRAFFIC_VEHICLE_IDS.length];
      const lane = TRAFFIC_LANE_OFFSETS[i % TRAFFIC_LANE_OFFSETS.length];
      const goingForward = lane < 0;

      let z = -80 - (i * 55) - Math.random() * 40;
      const slotKey = `${lane}:${Math.floor(z / 35)}`;
      if (usedSlots.has(slotKey)) z -= 25;
      usedSlots.add(slotKey);

      const bounds = buildTrafficSpawnBounds(vehicleId);

      return {
        id: `traffic_${i}`,
        vehicleId,
        position: new THREE.Vector3(lane, 0.5, z),
        speed: 10 + Math.random() * 18,
        lane,
        rotation: goingForward ? Math.PI : 0,
        color: TRAFFIC_COLORS[i % TRAFFIC_COLORS.length],
        halfWidth: bounds.halfWidth,
        halfLength: bounds.halfLength,
      };
    });

    trafficRegistry.vehicles = vehiclesRef.current;
  }, [density]);

  useFrame((_, delta) => {
    const shouldStop = signalState === 'red' || signalState === 'yellow';

    vehiclesRef.current.forEach((v) => {
      const goingForward = v.lane < 0;
      if (!shouldStop || v.position.z < -180) {
        v.position.z += goingForward ? -v.speed * delta : v.speed * delta;
      }

      if (goingForward && v.position.z < -5000) {
        v.position.z = 40 + Math.random() * 30;
        v.speed = 10 + Math.random() * 18;
      }
      if (!goingForward && v.position.z > 40) {
        v.position.z = -4800 - Math.random() * 200;
        v.speed = 10 + Math.random() * 18;
      }

      v.position.x = v.lane;
    });

    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const v = vehiclesRef.current[i];
        if (!v) return;
        child.position.copy(v.position);
        child.rotation.y = v.rotation;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {vehiclesRef.current.map((v) => (
        <group key={v.id}>
          <TrafficVehicleVisual vehicleId={v.vehicleId} color={v.color} />
        </group>
      ))}
    </group>
  );
}

export function TrafficLight({ state, position }: { state: TrafficSignalState; position: [number, number, number] }) {
  const colors = { red: '#ff0000', yellow: '#ffff00', green: '#00ff00' };
  return (
    <group position={position}>
      <mesh position={[0, 4.5, 0]}>
        <boxGeometry args={[0.6, 1.8, 0.3]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {(['red', 'yellow', 'green'] as const).map((c, i) => (
        <mesh key={c} position={[0, 5.2 - i * 0.5, 0.16]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial
            color={colors[c]}
            emissive={colors[c]}
            emissiveIntensity={state === c ? 3 : 0.1}
          />
        </mesh>
      ))}
    </group>
  );
}
