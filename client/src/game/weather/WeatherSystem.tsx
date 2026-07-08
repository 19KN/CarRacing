import { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { WeatherType, TimeOfDay } from '@indian-racing/shared';

interface TimeLighting {
  sky: string;
  sun: string;
  ambient: number;
  sunIntensity: number;
  fillIntensity: number;
  fogNear: number;
  fogFar: number;
  sunPosition: [number, number, number];
  showSun: boolean;
}

const TIME_COLORS: Record<TimeOfDay, TimeLighting> = {
  morning: {
    sky: '#8ec8f5',
    sun: '#FFD54F',
    ambient: 0.72,
    sunIntensity: 2.4,
    fillIntensity: 0.35,
    fogNear: 120,
    fogFar: 900,
    sunPosition: [110, 42, -140],
    showSun: true,
  },
  afternoon: {
    sky: '#87CEEB',
    sun: '#FFF176',
    ambient: 0.78,
    sunIntensity: 2.8,
    fillIntensity: 0.25,
    fogNear: 140,
    fogFar: 1000,
    sunPosition: [60, 120, -80],
    showSun: true,
  },
  evening: {
    sky: '#e8a87c',
    sun: '#FF8F00',
    ambient: 0.5,
    sunIntensity: 1.4,
    fillIntensity: 0.2,
    fogNear: 70,
    fogFar: 550,
    sunPosition: [-130, 28, -120],
    showSun: true,
  },
  night: {
    sky: '#0a1628',
    sun: '#E8EAF6',
    ambient: 0.22,
    sunIntensity: 0.35,
    fillIntensity: 0.08,
    fogNear: 40,
    fogFar: 320,
    sunPosition: [80, 90, -60],
    showSun: true,
  },
  sunrise: {
    sky: '#f5c6a0',
    sun: '#FF6D00',
    ambient: 0.55,
    sunIntensity: 1.8,
    fillIntensity: 0.28,
    fogNear: 60,
    fogFar: 500,
    sunPosition: [150, 22, -160],
    showSun: true,
  },
  sunset: {
    sky: '#d4a0c8',
    sun: '#E65100',
    ambient: 0.48,
    sunIntensity: 1.2,
    fillIntensity: 0.22,
    fogNear: 55,
    fogFar: 480,
    sunPosition: [-150, 24, -150],
    showSun: true,
  },
};

function VisibleSun({ position, color, isNight }: { position: [number, number, number]; color: string; isNight: boolean }) {
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!glowRef.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.2) * 0.04;
    glowRef.current.scale.setScalar(14 * pulse);
  });

  const coreSize = isNight ? 5 : 7;

  return (
    <group position={position}>
      <mesh renderOrder={-2}>
        <sphereGeometry args={[coreSize, 24, 24]} />
        <meshBasicMaterial color={color} fog={false} toneMapped={false} />
      </mesh>
      <mesh ref={glowRef} renderOrder={-3}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isNight ? 0.35 : 0.55}
          fog={false}
          toneMapped={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <pointLight color={color} intensity={isNight ? 0.6 : 1.4} distance={500} decay={1.2} />
    </group>
  );
}

export function WeatherSystem({ weather, timeOfDay }: { weather: WeatherType; timeOfDay: TimeOfDay }) {
  const { scene } = useThree();
  const timeConfig = TIME_COLORS[timeOfDay] || TIME_COLORS.morning;
  const rainRef = useRef<THREE.Points>(null);
  const birdsRef = useRef<THREE.Group>(null);
  const sunTarget = useMemo(() => new THREE.Vector3(0, 0, -200), []);
  const isNight = timeOfDay === 'night';

  useLayoutEffect(() => {
    const fogNear = weather === 'fog' ? 30 : timeConfig.fogNear;
    const fogFar = weather === 'fog' ? 120 : timeConfig.fogFar;
    scene.background = new THREE.Color(timeConfig.sky);
    scene.fog = new THREE.Fog(timeConfig.sky, fogNear, fogFar);
    return () => {
      scene.fog = null;
    };
  }, [scene, timeConfig.sky, timeConfig.fogNear, timeConfig.fogFar, weather]);

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

  const [sx, sy, sz] = timeConfig.sunPosition;

  return (
    <group>
      <ambientLight intensity={timeConfig.ambient} color={isNight ? '#b0c4ff' : '#fff8e7'} />
      <hemisphereLight
        args={[timeConfig.sky, '#6b8f4e', isNight ? 0.25 : 0.55]}
        position={[0, 80, 0]}
      />
      <directionalLight
        position={timeConfig.sunPosition}
        intensity={timeConfig.sunIntensity}
        color={timeConfig.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={320}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
      >
        <object3D position={sunTarget} attach="target" />
      </directionalLight>
      <directionalLight
        position={[-sx * 0.4, sy * 0.5, -sz * 0.3]}
        intensity={timeConfig.fillIntensity}
        color={timeConfig.sky}
      />

      {timeConfig.showSun && (
        <VisibleSun position={timeConfig.sunPosition} color={timeConfig.sun} isNight={isNight} />
      )}

      {(weather === 'rain' || weather === 'thunder') && (
        <points ref={rainRef} geometry={rainGeometry}>
          <pointsMaterial size={0.1} color="#aaaacc" transparent opacity={0.6} />
        </points>
      )}

      {weather === 'thunder' && (
        <ambientLight intensity={Math.random() > 0.98 ? 2 : 0} color="#ffffff" />
      )}

      <group ref={birdsRef}>
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={i} position={[(i - 4) * 20, 15 + Math.random() * 10, -Math.random() * 100]}>
            <sphereGeometry args={[0.15, 4, 4]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        ))}
      </group>

      {weather === 'wind' && (
        <directionalLight position={[-30, 20, -10]} intensity={0.3} color="#ffffff" />
      )}
    </group>
  );
}
