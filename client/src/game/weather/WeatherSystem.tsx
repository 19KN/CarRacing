import { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { WeatherType, TimeOfDay, RACE_START_Z } from '@indian-racing/shared';
import { playerPositionRegistry } from '../core/playerPositionRegistry';

interface TimeLighting {
  sky: string;
  sun: string;
  ambient: number;
  sunIntensity: number;
  fillIntensity: number;
  fogNear: number;
  fogFar: number;
  sunOffset: [number, number, number];
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
    sunOffset: [55, 42, -120],
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
    sunOffset: [40, 95, -90],
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
    sunOffset: [-80, 28, -110],
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
    sunOffset: [50, 75, -80],
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
    sunOffset: [90, 24, -130],
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
    sunOffset: [-95, 26, -125],
    showSun: true,
  },
};

function VisibleSun({ color, isNight }: { color: string; isNight: boolean }) {
  const glowRef = useRef<THREE.Mesh>(null);
  const coreSize = isNight ? 5 : 7;

  useFrame(({ clock }) => {
    if (!glowRef.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.2) * 0.04;
    glowRef.current.scale.setScalar(14 * pulse);
  });

  return (
    <group>
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

export function WeatherSystem({
  weather,
  timeOfDay,
  mapId,
}: {
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  mapId?: string;
}) {
  const { scene } = useThree();
  const timeConfig = TIME_COLORS[timeOfDay] || TIME_COLORS.morning;
  const rainRef = useRef<THREE.Points>(null);
  const birdsRef = useRef<THREE.Group>(null);
  const sunGroupRef = useRef<THREE.Group>(null);
  const sunLightRef = useRef<THREE.DirectionalLight>(null);
  const fillLightRef = useRef<THREE.DirectionalLight>(null);
  const sunTarget = useMemo(() => new THREE.Object3D(), []);
  const isNight = timeOfDay === 'night';
  const clearChennaiSky = mapId === 'chennai_bangalore';

  useLayoutEffect(() => {
    scene.add(sunTarget);
    return () => {
      scene.remove(sunTarget);
    };
  }, [scene, sunTarget]);

  useLayoutEffect(() => {
    scene.background = new THREE.Color(timeConfig.sky);
    if (clearChennaiSky) {
      scene.fog = null;
    } else {
      const fogNear = weather === 'fog' ? 30 : timeConfig.fogNear;
      const fogFar = weather === 'fog' ? 120 : timeConfig.fogFar;
      scene.fog = new THREE.Fog(timeConfig.sky, fogNear, fogFar);
    }
    playerPositionRegistry.active = true;
    return () => {
      scene.fog = null;
      playerPositionRegistry.active = false;
    };
  }, [scene, timeConfig.sky, timeConfig.fogNear, timeConfig.fogFar, weather, clearChennaiSky]);

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
    const px = playerPositionRegistry.active ? playerPositionRegistry.x : 0;
    const pz = playerPositionRegistry.active ? playerPositionRegistry.z : RACE_START_Z;
    const [ox, oy, oz] = timeConfig.sunOffset;
    const sunX = px + ox;
    const sunY = oy;
    const sunZ = pz + oz;

    if (sunGroupRef.current) {
      sunGroupRef.current.position.set(sunX, sunY, sunZ);
    }
    if (sunLightRef.current) {
      sunLightRef.current.position.set(sunX, sunY, sunZ);
      sunTarget.position.set(px, 0.5, pz - 60);
      sunLightRef.current.target = sunTarget;
      sunLightRef.current.target.updateMatrixWorld();
    }
    if (fillLightRef.current) {
      fillLightRef.current.position.set(px - ox * 0.35, oy * 0.55, pz - oz * 0.25);
    }

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
        if (bird.position.z < pz - 220) bird.position.z = pz + 50;
      });
    }
  });

  return (
    <group>
      <ambientLight intensity={timeConfig.ambient} color={isNight ? '#b0c4ff' : '#fff8e7'} />
      <hemisphereLight
        args={[timeConfig.sky, '#6b8f4e', isNight ? 0.25 : 0.55]}
        position={[0, 80, 0]}
      />
      <directionalLight
        ref={sunLightRef}
        intensity={timeConfig.sunIntensity}
        color={timeConfig.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={320}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
      />
      <directionalLight
        ref={fillLightRef}
        intensity={timeConfig.fillIntensity}
        color={timeConfig.sky}
      />

      {timeConfig.showSun && (
        <group ref={sunGroupRef}>
          <VisibleSun color={timeConfig.sun} isNight={isNight} />
        </group>
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
