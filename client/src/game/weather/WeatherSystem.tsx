import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WeatherType, TimeOfDay } from '@indian-racing/shared';

const TIME_COLORS: Record<TimeOfDay, { sky: string; sun: string; ambient: number; sunIntensity: number; fogNear: number; fogFar: number }> = {
  morning: { sky: '#b0d4f1', sun: '#FFD700', ambient: 0.45, sunIntensity: 1.3, fogNear: 80, fogFar: 600 },
  afternoon: { sky: '#87CEEB', sun: '#FFF176', ambient: 0.55, sunIntensity: 1.6, fogNear: 100, fogFar: 800 },
  evening: { sky: '#e8a87c', sun: '#FF8F00', ambient: 0.4, sunIntensity: 0.9, fogNear: 60, fogFar: 500 },
  night: { sky: '#0a1628', sun: '#E0E0E0', ambient: 0.2, sunIntensity: 0.4, fogNear: 40, fogFar: 300 },
  sunrise: { sky: '#f5c6a0', sun: '#FF6D00', ambient: 0.35, sunIntensity: 1.0, fogNear: 50, fogFar: 450 },
  sunset: { sky: '#d4a0c8', sun: '#E65100', ambient: 0.35, sunIntensity: 0.8, fogNear: 50, fogFar: 450 },
};

export function WeatherSystem({ weather, timeOfDay }: { weather: WeatherType; timeOfDay: TimeOfDay }) {
  const timeConfig = TIME_COLORS[timeOfDay] || TIME_COLORS.morning;
  const rainRef = useRef<THREE.Points>(null);
  const birdsRef = useRef<THREE.Group>(null);

  const rainGeometry = useMemo(() => {
    const count = weather === 'rain' || weather === 'thunder' ? 5000 : 0;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = Math.random() * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [weather]);

  useFrame((state) => {
    if (rainRef.current && (weather === 'rain' || weather === 'thunder')) {
      const positions = rainRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= 0.5;
        if (positions[i + 1] < 0) positions[i + 1] = 50;
      }
      rainRef.current.geometry.attributes.position.needsUpdate = true;
    }

    if (birdsRef.current) {
      birdsRef.current.children.forEach((bird, i) => {
        bird.position.x += Math.sin(state.clock.elapsedTime + i) * 0.02;
        bird.position.z -= 0.05;
        if (bird.position.z < -200) bird.position.z = 50;
      });
    }
  });

  return (
    <group>
      <color attach="background" args={[timeConfig.sky]} />
      <fog attach="fog" args={[timeConfig.sky, weather === 'fog' ? 30 : timeConfig.fogNear, weather === 'fog' ? 120 : timeConfig.fogFar]} />
      <ambientLight intensity={timeConfig.ambient} />
      <hemisphereLight args={[timeConfig.sky, '#4a7c3f', 0.4]} />
      <directionalLight
        position={[80, 120, 40]}
        intensity={timeConfig.sunIntensity}
        color={timeConfig.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={300}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
      />

      {(weather === 'rain' || weather === 'thunder') && (
        <points ref={rainRef} geometry={rainGeometry}>
          <pointsMaterial size={0.1} color="#aaaacc" transparent opacity={0.6} />
        </points>
      )}

      {weather === 'thunder' && (
        <ambientLight intensity={Math.random() > 0.98 ? 2 : 0} color="#ffffff" />
      )}

      {/* Birds */}
      <group ref={birdsRef}>
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={i} position={[(i - 4) * 20, 15 + Math.random() * 10, -Math.random() * 100]}>
            <sphereGeometry args={[0.15, 4, 4]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        ))}
      </group>

      {/* Trees sway (wind) */}
      {weather === 'wind' && (
        <directionalLight position={[-30, 20, -10]} intensity={0.3} color="#ffffff" />
      )}
    </group>
  );
}
