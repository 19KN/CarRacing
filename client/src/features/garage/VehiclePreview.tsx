import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { getVehicleById } from '@indian-racing/shared';
import { VehicleMesh } from '../../game/vehicles/VehicleMesh';

interface VehiclePreviewProps {
  vehicleId: string;
  color: string;
  className?: string;
}

function PreviewScene({ vehicleId, color }: VehiclePreviewProps) {
  const config = getVehicleById(vehicleId);
  if (!config) return null;

  return (
    <>
      <Environment preset="city" />
      <ambientLight intensity={0.85} />
      <directionalLight position={[5, 10, 5]} intensity={1.6} castShadow />
      <directionalLight position={[-4, 6, -3]} intensity={0.7} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[5, 48]} />
        <meshStandardMaterial color="#2a2a3e" roughness={0.85} metalness={0.1} />
      </mesh>
      <group position={[0, 0, 0]} rotation={[0, -0.4, 0]}>
        <VehicleMesh config={config} color={color} />
      </group>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        autoRotate
        autoRotateSpeed={1}
        target={[0, 0.45, 0]}
      />
    </>
  );
}

export function VehiclePreview({ vehicleId, color, className }: VehiclePreviewProps) {
  return (
    <div className={`w-full h-64 md:h-80 rounded-xl overflow-hidden bg-gradient-to-b from-[#1a1a2e] to-game-dark border border-game-border ${className ?? ''}`}>
      <Canvas camera={{ position: [4, 1.4, 5], fov: 42 }} shadows>
        <Suspense fallback={null}>
          <PreviewScene vehicleId={vehicleId} color={color} />
        </Suspense>
      </Canvas>
    </div>
  );
}
