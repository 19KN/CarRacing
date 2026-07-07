import { useRef, useState, useEffect, useMemo, Suspense, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { getVehicleById, getMapById, DEFAULT_MAP_ID, DEFAULT_VEHICLE_ID, getMapRaceDistance, RACE_START_Z } from '@indian-racing/shared';
import { getFinishLineZ } from '../../utils/soloRace';
import { VehicleMesh } from '../vehicles/VehicleMesh';
import { MapEnvironment } from '../maps/MapEnvironment';
import { PLAYER_LANE_X } from '../maps/IndianHighwayRoad';
import { buildRoadCenterline, sampleRoadNearest, buildArcLengthTable } from '../maps/roadPath';
import { speedBreakerRegistry, findSpeedBreakerHit } from '../maps/speedBreakers';
import { WeatherSystem } from '../weather/WeatherSystem';
import { TrafficSystem, trafficRegistry } from '../traffic/TrafficSystem';
import { findTrafficCollision, getCollisionDamage } from '../traffic/trafficCollision';
import { findPlayerCollision } from '../network/playerCollision';
import { medianRegistry, findMedianObstacleCollision, getMedianCollisionDamage, triggerPedestrianJump } from '../maps/medianCollision';
import { SmokeParticles } from '../effects/Effects';
import { PlayerNameLabel } from '../effects/PlayerNameLabel';
import { triggerCollisionFeedback } from '../effects/collisionFeedback';
import { useCameraController, useCameraSwitcher } from '../camera/CameraController';
import { useVehicleControls } from '../core/controls';
import { createVehiclePhysics } from '../physics/vehiclePhysics';
import { useAudioManager } from '../audio/AudioManager';
import { useNetworkSync, RemotePlayer } from '../network/NetworkSync';
import { useAuthStore, useRaceStore, useLobbyStore, useSettingsStore } from '../../stores';
import { getSocket, SocketEvents } from '../../utils/socket';
import { CameraMode } from '@indian-racing/shared';

function PlayerVehicle({
  vehicleId,
  vehicleColor,
  mapId,
  isSolo,
  spawnPosition,
  username,
}: {
  vehicleId: string;
  vehicleColor: string;
  mapId: string;
  isSolo: boolean;
  spawnPosition: { x: number; y: number; z: number; rotation: number };
  username: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const config = getVehicleById(vehicleId) || getVehicleById(DEFAULT_VEHICLE_ID)!;
  const physics = useRef(createVehiclePhysics(config));
  const activeVehicleId = useRef(vehicleId);
  const { inputRef, hornRef, nitroRef } = useVehicleControls();
  const { indexRef } = useCameraSwitcher();
  const [cameraMode, setCameraMode] = useState<CameraMode>('thirdPerson');
  const health = useRaceStore((s) => s.health);
  const { playEngine, playSound, playCollisionImpact, playCelebration, stopEngine } = useAudioManager();
  const posRef = useRef({ x: spawnPosition.x, y: spawnPosition.y, z: spawnPosition.z });
  const rotRef = useRef(spawnPosition.rotation);
  const velRef = useRef({ x: 0, y: 0, z: 0 });
  const checkpointRef = useRef(0);
  const hornCooldown = useRef(0);
  const lastSpeedReport = useRef(0);
  const speedReportTimer = useRef(0);
  const collisionCooldown = useRef(0);
  const trafficHitTimes = useRef(new Map<string, number>());
  const playerHitTimes = useRef(new Map<string, number>());
  const medianHitTimes = useRef(new Map<string, number>());
  const bumpHitTimes = useRef(new Map<string, number>());
  const raceStartZ = useRef(spawnPosition.z);
  const lastDistanceReport = useRef(-1);
  const finishedRef = useRef(false);
  const maxSpeedRef = useRef(0);
  const map = getMapById(mapId) || getMapById(DEFAULT_MAP_ID)!;
  const centerline = useMemo(
    () => buildRoadCenterline(map.checkpoints.map((p) => ({ x: p.x, y: p.y, z: p.z }))),
    [mapId],
  );
  const arcTable = useMemo(() => buildArcLengthTable(centerline), [centerline]);
  const totalRaceDistance = getMapRaceDistance(map);
  const finishZ = getFinishLineZ(totalRaceDistance, raceStartZ.current);

  useCameraController(cameraMode, groupRef);
  useNetworkSync(posRef, rotRef, velRef, !isSolo);

  useEffect(() => {
    if (activeVehicleId.current !== vehicleId) {
      activeVehicleId.current = vehicleId;
      const nextConfig = getVehicleById(vehicleId) || getVehicleById(DEFAULT_VEHICLE_ID)!;
      physics.current = createVehiclePhysics(nextConfig);
    }
    physics.current.setPosition(spawnPosition.x, spawnPosition.y, spawnPosition.z, spawnPosition.rotation);
    if (groupRef.current) {
      groupRef.current.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z);
      groupRef.current.rotation.y = spawnPosition.rotation;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyC') {
        const modes: CameraMode[] = ['thirdPerson', 'firstPerson', 'topView', 'freeCamera', 'cinematic'];
        setCameraMode(modes[(indexRef.current + 1) % modes.length]);
        indexRef.current = (indexRef.current + 1) % modes.length;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => { stopEngine(); window.removeEventListener('keydown', handleKey); };
  }, [spawnPosition.x, spawnPosition.y, spawnPosition.z, spawnPosition.rotation, vehicleId]);

  useFrame((_, delta) => {
    if (useRaceStore.getState().isRaceFinished) return;

    const health = useRaceStore.getState().health;
    const roadSample = sampleRoadNearest(centerline, arcTable, posRef.current.x, posRef.current.z);
    const surfaceY = roadSample.y + 0.5;
    const state = physics.current.update(inputRef.current, delta, health, surfaceY, roadSample.x);
    posRef.current = state.position;
    rotRef.current = state.rotation;
    velRef.current = state.velocity;

    const bumpHit = findSpeedBreakerHit(
      state.position.x,
      state.position.z,
      speedBreakerRegistry.breakers,
    );
    if (bumpHit && state.speed >= 12) {
      const now = Date.now();
      const lastHit = bumpHitTimes.current.get(bumpHit.id) ?? 0;
      if (now - lastHit > 900) {
        bumpHitTimes.current.set(bumpHit.id, now);
        physics.current.applySpeedBump(state.speed);
        playSound('brake');
        triggerCollisionFeedback('small', state.speed * 0.55);
      }
    }

    const renderState = physics.current.getState();

    if (groupRef.current) {
      groupRef.current.position.set(renderState.position.x, renderState.position.y, renderState.position.z);
      groupRef.current.rotation.y = renderState.rotation;
    }

    speedReportTimer.current += delta;
    const roundedSpeed = Math.round(state.speed);
    if (speedReportTimer.current >= 0.12 && roundedSpeed !== lastSpeedReport.current) {
      useRaceStore.getState().setSpeed(state.speed);
      lastSpeedReport.current = roundedSpeed;
      speedReportTimer.current = 0;
    }

    if (state.speed > maxSpeedRef.current) {
      maxSpeedRef.current = state.speed;
      useRaceStore.getState().setMaxRaceSpeed(state.speed);
    }

    const traveled = Math.max(0, raceStartZ.current - state.position.z);
    const remaining = Math.max(0, totalRaceDistance - traveled);
    const roundedRemaining = Math.round(remaining);
    if (roundedRemaining !== lastDistanceReport.current) {
      useRaceStore.getState().setDistanceRemaining(remaining);
      lastDistanceReport.current = roundedRemaining;
    }

    if (!finishedRef.current && state.position.z <= finishZ + 10) {
      finishedRef.current = true;
      physics.current.stopVehicle();
      const startedAt = useRaceStore.getState().race?.startedAt ?? Date.now();
      const finishTimeMs = Date.now() - startedAt;
      useRaceStore.getState().setDistanceRemaining(0);
      useRaceStore.getState().setRaceFinished(finishTimeMs);
      playCelebration();
      if (!isSolo) getSocket().emit(SocketEvents.RACE_FINISH);
    }

    playEngine(
      state.speed,
      config.stats.maxSpeed,
      health,
      inputRef.current.accelerate,
      inputRef.current.brake,
    );

    if (hornRef.current && hornCooldown.current <= 0) {
      playSound('horn');
      hornCooldown.current = 0.5;
      if (!isSolo) getSocket().emit(SocketEvents.HORN);
    }
    hornCooldown.current -= delta;

    if (nitroRef.current) {
      playSound('nitro');
      if (!isSolo) getSocket().emit(SocketEvents.NITRO);
    }

    if (state.isDrifting) playSound('skid');

    collisionCooldown.current = Math.max(0, collisionCooldown.current - delta);
    if (collisionCooldown.current <= 0 && state.speed > 3) {
      const hit = findTrafficCollision(
        state.position.x,
        state.position.z,
        trafficRegistry.vehicles,
      );
      const medianHit = !hit
        ? findMedianObstacleCollision(state.position.x, state.position.z, medianRegistry.obstacles)
        : null;

      if (hit) {
        const now = Date.now();
        const lastHit = trafficHitTimes.current.get(hit.id) ?? 0;
        if (now - lastHit > 1200) {
          trafficHitTimes.current.set(hit.id, now);
          collisionCooldown.current = 0.5;
          const { severity, damage } = getCollisionDamage(state.speed);
          const newHealth = Math.max(0, health - damage);
          useRaceStore.getState().setHealth(newHealth);
          physics.current.applyTrafficCollision(severity, hit.position.x);
          playCollisionImpact(severity, state.speed);
          triggerCollisionFeedback(severity, state.speed);

          if (!isSolo) {
            getSocket().emit(SocketEvents.COLLISION, {
              playerId: useAuthStore.getState().profile.id,
              severity,
              position: { ...state.position },
            });
          }
        }
      } else if (medianHit) {
        const now = Date.now();
        const lastHit = medianHitTimes.current.get(medianHit.id) ?? 0;
        if (now - lastHit > 900 && state.speed > 5) {
          medianHitTimes.current.set(medianHit.id, now);
          collisionCooldown.current = 0.35;

          if (medianHit.type === 'person') {
            triggerPedestrianJump(medianHit.id, state.speed);
            playSound('brake');
            triggerCollisionFeedback('small', state.speed * 0.25);
          } else {
            const { severity, damage } = getMedianCollisionDamage(medianHit.type, state.speed);
            const newHealth = Math.max(0, health - damage);
            useRaceStore.getState().setHealth(newHealth);
            physics.current.applyTrafficCollision(severity, medianHit.position.x);
            playCollisionImpact(severity, state.speed);
            triggerCollisionFeedback(severity, state.speed);

            if (!isSolo) {
              getSocket().emit(SocketEvents.COLLISION, {
                playerId: useAuthStore.getState().profile.id,
                severity,
                position: { ...state.position },
              });
            }
          }
        }
      } else if (!isSolo) {
        const remotePlayers = useRaceStore.getState().remotePlayers;
        const hitPlayerId = findPlayerCollision(state.position.x, state.position.z, remotePlayers);
        if (hitPlayerId) {
          const now = Date.now();
          const lastHit = playerHitTimes.current.get(hitPlayerId) ?? 0;
          if (now - lastHit > 1200) {
            playerHitTimes.current.set(hitPlayerId, now);
            collisionCooldown.current = 0.5;
            const { severity, damage } = getCollisionDamage(state.speed);
            const newHealth = Math.max(0, health - damage);
            useRaceStore.getState().setHealth(newHealth);
            physics.current.applyTrafficCollision(severity, remotePlayers[hitPlayerId].position.x);
            playCollisionImpact(severity, state.speed);
            triggerCollisionFeedback(severity, state.speed);

            getSocket().emit(SocketEvents.COLLISION, {
              playerId: useAuthStore.getState().profile.id,
              targetPlayerId: hitPlayerId,
              severity,
              position: { ...state.position },
            });
          }
        }
      }
    }

    const checkpoints = map.checkpoints;
    const nextCp = checkpoints[checkpointRef.current + 1];
    if (nextCp) {
      const dx = state.position.x - nextCp.x;
      const dz = state.position.z - nextCp.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 30) {
        checkpointRef.current++;
        if (!isSolo) {
          getSocket().emit(SocketEvents.CHECKPOINT, { checkpointIndex: checkpointRef.current });
        }
        if (checkpointRef.current >= checkpoints.length - 1) {
          if (!isSolo) getSocket().emit(SocketEvents.RACE_FINISH);
        }
      }
    }
  });

  return (
    <group ref={groupRef}>
      <VehicleMesh key={vehicleId} config={config} color={vehicleColor} />
      <SmokeParticles active={health < 50 && health > 0} position={[0, 0.5, -1]} />
      {!isSolo && <PlayerNameLabel name={username} isLocal />}
    </group>
  );
}

function GameWorld({
  vehicleId,
  vehicleColor,
  mapId,
  isSolo,
}: {
  vehicleId: string;
  vehicleColor: string;
  mapId: string;
  isSolo: boolean;
}) {
  const map = getMapById(mapId) || getMapById(DEFAULT_MAP_ID)!;
  const weather = useRaceStore((s) => s.weather) as 'clear' | 'rain' | 'fog' | 'thunder' | 'wind';
  const timeOfDay = useRaceStore((s) => s.timeOfDay) as 'morning' | 'afternoon' | 'evening' | 'night' | 'sunrise' | 'sunset';
  const race = useRaceStore((s) => s.race);
  const playerId = useAuthStore((s) => s.profile.id);
  const localPlayerId = useLobbyStore((s) => s.localPlayerId);
  const username = useAuthStore((s) => s.profile.username);
  const [signalState, setSignalState] = useState<'red' | 'yellow' | 'green'>('green');
  const isMultiplayer = (race?.players.length ?? 0) >= 2;
  const resolvedPlayerId = localPlayerId || playerId;
  const myRacePlayer = race?.players.find((p) => p.playerId === resolvedPlayerId);
  const spawnPosition = myRacePlayer
    ? { x: myRacePlayer.position.x, y: myRacePlayer.position.y, z: myRacePlayer.position.z, rotation: myRacePlayer.rotation }
    : { x: PLAYER_LANE_X, y: 0.5, z: RACE_START_Z, rotation: Math.PI };
  const otherPlayers = race?.players.filter((p) => p.playerId !== resolvedPlayerId) ?? [];

  useEffect(() => {
    const socket = getSocket();
    socket.on(SocketEvents.TRAFFIC_SYNC, (data: { signalState: 'red' | 'yellow' | 'green' }) => {
      setSignalState(data.signalState);
    });
    return () => { socket.off(SocketEvents.TRAFFIC_SYNC); };
  }, []);

  return (
    <>
      <WeatherSystem weather={weather} timeOfDay={timeOfDay} />
      <MapEnvironment map={map} />
      <TrafficSystem path={map.checkpoints} density={map.trafficDensity} signalState={signalState} />
      <PlayerVehicle
        vehicleId={vehicleId}
        vehicleColor={vehicleColor}
        mapId={mapId}
        isSolo={isSolo}
        spawnPosition={spawnPosition}
        username={myRacePlayer?.username || username}
      />
      {!isSolo && isMultiplayer && otherPlayers.map((p) => (
        <RemotePlayer
          key={p.playerId}
          playerId={p.playerId}
          username={p.username}
          vehicleId={p.vehicleId}
          vehicleColor={p.vehicleColor}
          initialPosition={p.position}
          initialRotation={p.rotation}
        />
      ))}
    </>
  );
}

export const GameScene = memo(function GameScene({
  vehicleId,
  vehicleColor,
  mapId,
  isSolo = false,
}: {
  vehicleId: string;
  vehicleColor: string;
  mapId: string;
  isSolo?: boolean;
}) {
  const settings = useSettingsStore((s) => s.settings.graphics);

  return (
    <Canvas
      shadows={settings.shadows}
      camera={{ position: [PLAYER_LANE_X, 8, 35], fov: 65, near: 0.1, far: settings.drawDistance }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ width: '100vw', height: '100vh' }}
      frameloop="always"
    >
      <Suspense fallback={null}>
        <GameWorld
          vehicleId={vehicleId}
          vehicleColor={vehicleColor}
          mapId={mapId}
          isSolo={isSolo}
        />
        {settings.bloom && (
          <EffectComposer multisampling={0}>
            <Bloom intensity={0.15} luminanceThreshold={0.92} luminanceSmoothing={0.9} />
            <Vignette offset={0.3} darkness={0.4} />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
});
