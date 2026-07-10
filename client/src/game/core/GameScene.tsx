import { useRef, useState, useEffect, Suspense, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { getVehicleById, getMapById, DEFAULT_MAP_ID, DEFAULT_VEHICLE_ID, getMapRaceDistance, RACE_START_Z, getRaceSpawnPosition, resolveTrafficDensity, DEFAULT_TRAFFIC_LEVEL, getAerialSpawnPosition, getAerialDistanceRemaining, hasCrossedAerialFinish, MISSILE_COOLDOWN_SEC, getGhatSpawnPosition, GHAT_COMBAT_MAX_SPEED_KMH, AERIAL_COMBAT_MAX_SPEED_KMH, clampAerialToCorridor, getMapRespawnHealth } from '@indian-racing/shared';
import { getFinishLineZ, getMetersToFinishLine } from '../../utils/soloRace';
import { getGhatLanePosition, clampGhatToRoad } from '../maps/GhatRoad';
import { VehicleMesh } from '../vehicles/VehicleMesh';
import { MapEnvironment } from '../maps/MapEnvironment';
import { PLAYER_LANE_X } from '../maps/IndianHighwayRoad';
import { WeatherSystem } from '../weather/WeatherSystem';
import { TrafficSystem, trafficRegistry } from '../traffic/TrafficSystem';
import { findTrafficCollision, getCollisionDamage } from '../traffic/trafficCollision';
import { findPlayerCollision, computePlayerRamLanding } from '../network/playerCollision';
import { triggerPlayerRam, updatePlayerRams, getPlayerRamPosition } from '../network/playerRam';
import { detectPlayerOvertake } from '../network/playerOvertake';
import { medianRegistry, findMedianObstacleCollision, getMedianCollisionDamage, triggerPedestrianJump } from '../maps/medianCollision';
import { SmokeParticles } from '../effects/Effects';
import { ExplosionFire } from '../effects/ExplosionFire';
import { PlayerNameLabel } from '../effects/PlayerNameLabel';
import { triggerCollisionFeedback } from '../effects/collisionFeedback';
import { useCameraController, useCameraSwitcher, CAM_DISTANCE, CAM_HEIGHT, CAM_LOOK_HEIGHT } from '../camera/CameraController';
import { useVehicleControls } from '../core/controls';
import { createVehiclePhysics } from '../physics/vehiclePhysics';
import { createAircraftPhysics } from '../physics/aircraftPhysics';
import { fireMissile, findMissileHit } from '../combat/missileSystem';
import { MissileVisuals } from '../combat/MissileVisuals';
import { useAudioManager } from '../audio/AudioManager';
import { useNetworkSync, RemotePlayer } from '../network/NetworkSync';
import { useAuthStore, useRaceStore, useLobbyStore, useSettingsStore } from '../../stores';
import { getSocket, SocketEvents } from '../../utils/socket';
import { CameraMode } from '@indian-racing/shared';
import { playerPositionRegistry } from './playerPositionRegistry';

const SOLO_RESPAWN_DELAY = 3;
const MULTIPLAYER_RESPAWN_DELAY = 5.2;

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
  const map = getMapById(mapId) || getMapById(DEFAULT_MAP_ID)!;
  const isGhatMap = map.roadType === 'hill';
  const isAerialMap = map.roadType === 'aerial';
  const isAircraft = config.category === 'aircraft';
  const canUseMissiles = (isAerialMap && isAircraft) || isGhatMap;
  const physics = useRef(createVehiclePhysics(config, {
    freeBounds: isGhatMap,
    speedCapKmh: isGhatMap ? GHAT_COMBAT_MAX_SPEED_KMH : undefined,
  }));
  const aircraftPhysics = useRef(isAircraft ? createAircraftPhysics(config, { speedCapKmh: AERIAL_COMBAT_MAX_SPEED_KMH }) : null);
  const activeVehicleId = useRef(vehicleId);
  const { inputRef, hornRef, nitroRef } = useVehicleControls();
  const aircraftVisual = useRef({ rotorSpeed: 0, pitch: 0, onGround: true });
  const missileCooldown = useRef(0);
  const { indexRef } = useCameraSwitcher();
  const [cameraMode, setCameraMode] = useState<CameraMode>('thirdPerson');
  const [isDestroyed, setIsDestroyed] = useState(false);
  const health = useRaceStore((s) => s.health);
  const respawnRequest = useRaceStore((s) => s.respawnRequest);
  const { playEngine, playAircraftEngine, playSound, playCollisionImpact, playCelebration, playExplosion, stopEngine, playOvertakeSound } = useAudioManager();
  const posRef = useRef({ x: spawnPosition.x, y: spawnPosition.y, z: spawnPosition.z });
  const rotRef = useRef(spawnPosition.rotation);
  const velRef = useRef({ x: 0, y: 0, z: 0 });
  const checkpointRef = useRef(0);
  const hornCooldown = useRef(0);
  const prevHornRef = useRef(false);
  const lastSpeedReport = useRef(0);
  const speedReportTimer = useRef(0);
  const collisionCooldown = useRef(0);
  const trafficHitTimes = useRef(new Map<string, number>());
  const playerHitTimes = useRef(new Map<string, number>());
  const medianHitTimes = useRef(new Map<string, number>());
  const explodedRef = useRef(false);
  const respawnTimer = useRef(0);
  const localPlayerId = useLobbyStore((s) => s.localPlayerId) || useAuthStore((s) => s.profile.id);
  const remotePlayerSides = useRef(new Map<string, 'behind' | 'ahead' | 'unknown'>());
  const lastDistanceReport = useRef(-1);
  const finishedRef = useRef(false);
  const maxSpeedRef = useRef(0);
  const ghatPitchRef = useRef(0);
  const effectiveMaxSpeedKmh = isGhatMap
    ? GHAT_COMBAT_MAX_SPEED_KMH
    : (isAerialMap && isAircraft)
      ? AERIAL_COMBAT_MAX_SPEED_KMH
      : config.stats.maxSpeed;
  const totalRaceDistance = getMapRaceDistance(map);
  const finishLineZ = getFinishLineZ(totalRaceDistance, RACE_START_Z);

  const completeFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const startedAt = useRaceStore.getState().race?.startedAt ?? Date.now();
    const finishTimeMs = Date.now() - startedAt;
    useRaceStore.getState().setDistanceRemaining(0);
    useRaceStore.getState().setRaceFinished(finishTimeMs);
    playCelebration();
    if (!isSolo) getSocket().emit(SocketEvents.RACE_FINISH);
  };

  const getRespawnPoint = () => {
    const cp = map.checkpoints[Math.max(0, checkpointRef.current)];
    if (cp) {
      if (map.roadType === 'hill') {
        const lane = getGhatLanePosition(map.checkpoints, cp.z);
        return { x: lane.x, y: lane.y, z: lane.z, rotation: lane.rotation };
      }
      if (isAerialMap && isAircraft) {
        return getAerialSpawnPosition(vehicleId, config.aircraftKind, 0);
      }
      return { x: cp.x, y: 0.5, z: cp.z, rotation: spawnPosition.rotation };
    }
    return spawnPosition;
  };

  const respawnHealth = getMapRespawnHealth(map.roadType);

  const completeRespawn = (point: { x: number; y: number; z: number; rotation: number }, nextHealth = respawnHealth) => {
    if (isAerialMap && isAircraft && aircraftPhysics.current) {
      aircraftPhysics.current.setPosition(point.x, point.y, point.z, point.rotation);
    } else {
      physics.current.setPosition(point.x, point.y, point.z, point.rotation);
    }
    posRef.current = { x: point.x, y: point.y, z: point.z };
    rotRef.current = point.rotation;
    velRef.current = { x: 0, y: 0, z: 0 };
    explodedRef.current = false;
    respawnTimer.current = 0;
    setIsDestroyed(false);
    useRaceStore.getState().setHealth(nextHealth);
    useRaceStore.getState().setRespawning(false);
    useRaceStore.getState().setSpeed(0);
    lastSpeedReport.current = 0;
    if (groupRef.current) {
      groupRef.current.position.set(point.x, point.y, point.z);
      groupRef.current.rotation.y = point.rotation;
    }
  };

  const triggerExplosion = () => {
    if (explodedRef.current) return;
    explodedRef.current = true;
    respawnTimer.current = 0;
    setIsDestroyed(true);
    useRaceStore.getState().setRespawning(true);
    useRaceStore.getState().setSpeed(0);
    lastSpeedReport.current = 0;
    physics.current.stopVehicle();
    aircraftPhysics.current?.stopVehicle();
    stopEngine();
    playExplosion();
    triggerCollisionFeedback('heavy', maxSpeedRef.current);
  };

  useEffect(() => {
    if (!respawnRequest) return;
    completeRespawn(
      { ...respawnRequest.position, rotation: respawnRequest.rotation },
      respawnRequest.health,
    );
    useRaceStore.getState().clearRespawnRequest();
  }, [respawnRequest?.id]);

  useEffect(() => {
    if (health <= 0 && !explodedRef.current) {
      triggerExplosion();
    }
  }, [health]);

  useCameraController(cameraMode, groupRef);
  useNetworkSync(posRef, rotRef, velRef, !isSolo);

  useEffect(() => {
    if (activeVehicleId.current !== vehicleId) {
      activeVehicleId.current = vehicleId;
      const nextConfig = getVehicleById(vehicleId) || getVehicleById(DEFAULT_VEHICLE_ID)!;
      physics.current = createVehiclePhysics(nextConfig, {
        freeBounds: isGhatMap,
        speedCapKmh: isGhatMap ? GHAT_COMBAT_MAX_SPEED_KMH : undefined,
      });
      aircraftPhysics.current = nextConfig.category === 'aircraft'
        ? createAircraftPhysics(nextConfig, { speedCapKmh: AERIAL_COMBAT_MAX_SPEED_KMH })
        : null;
    }
    if (isAerialMap && isAircraft && aircraftPhysics.current) {
      aircraftPhysics.current.setPosition(spawnPosition.x, spawnPosition.y, spawnPosition.z, spawnPosition.rotation);
    } else {
      physics.current.setPosition(spawnPosition.x, spawnPosition.y, spawnPosition.z, spawnPosition.rotation);
    }
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
    const countdown = useRaceStore.getState().countdown;
    if (!isSolo && countdown !== null) {
      playerPositionRegistry.x = posRef.current.x;
      playerPositionRegistry.y = posRef.current.y;
      playerPositionRegistry.z = posRef.current.z;
      playerPositionRegistry.active = true;
      if (groupRef.current) {
        groupRef.current.position.set(posRef.current.x, posRef.current.y, posRef.current.z);
        groupRef.current.rotation.y = rotRef.current;
      }
      return;
    }

    updatePlayerRams(delta);

    const health = useRaceStore.getState().health;
    const ramPos = getPlayerRamPosition(localPlayerId);
    const isRamming = ramPos.active;

    if (health <= 0) {
      if (!explodedRef.current) triggerExplosion();
      respawnTimer.current += delta;
      const respawnDelay = isSolo ? SOLO_RESPAWN_DELAY : MULTIPLAYER_RESPAWN_DELAY;
      if (respawnTimer.current >= respawnDelay) {
        completeRespawn(getRespawnPoint());
      }
      if (groupRef.current) {
        groupRef.current.position.set(posRef.current.x, posRef.current.y, posRef.current.z);
        groupRef.current.rotation.y = rotRef.current;
      }
      return;
    }

    if (explodedRef.current || isDestroyed) {
      explodedRef.current = false;
      setIsDestroyed(false);
      useRaceStore.getState().setRespawning(false);
    }

    let state = physics.current.getState();
    let aircraftState = aircraftPhysics.current?.getState();

    if (isAerialMap && isAircraft && aircraftPhysics.current) {
      const inp = inputRef.current;
      aircraftState = aircraftPhysics.current.update(
        {
          throttle: inp.accelerate,
          brake: inp.brake,
          yaw: inp.steer,
          pitch: inp.pitch,
        },
        delta,
        health,
      );
      state = {
        position: aircraftState.position,
        rotation: aircraftState.rotation,
        velocity: aircraftState.velocity,
        speed: aircraftState.speed,
        rpm: 0,
        gear: 1,
        isDrifting: false,
      };
      aircraftVisual.current = {
        rotorSpeed: aircraftState.rotorSpeed,
        pitch: aircraftState.pitch,
        onGround: aircraftState.onGround,
      };

      const corridor = clampAerialToCorridor(map.checkpoints, state.position.x, state.position.z);
      aircraftPhysics.current.applyCorridorBoundary(
        corridor.x,
        state.position.y,
        state.position.z,
        corridor.hitMin,
        corridor.hitMax,
      );
      aircraftState = aircraftPhysics.current.getState();
      state = {
        position: aircraftState.position,
        rotation: aircraftState.rotation,
        velocity: aircraftState.velocity,
        speed: aircraftState.speed,
        rpm: 0,
        gear: 1,
        isDrifting: false,
      };
    } else if (isRamming) {
      physics.current.setPosition(ramPos.x, ramPos.y, ramPos.z, rotRef.current);
      state = physics.current.getState();
    } else {
      const inp = inputRef.current;
      const driveInput = {
        ...inp,
        accelerate: Math.max(inp.accelerate, inp.pitch > 0 ? 1 : 0),
        brake: Math.max(inp.brake, inp.pitch < 0 ? 1 : 0),
      };
      state = physics.current.update(driveInput, delta, health);
    }

    if (map.roadType === 'hill') {
      const lane = getGhatLanePosition(map.checkpoints, state.position.z);
      const bounds = clampGhatToRoad(map.checkpoints, state.position.x, state.position.z);
      const x = bounds.x;
      const y = lane.y;
      const z = state.position.z;
      physics.current.applyGhatBoundary(
        x,
        y,
        z,
        bounds.perpX,
        bounds.perpZ,
        bounds.hitMin,
        bounds.hitMax,
      );
      state = physics.current.getState();
      ghatPitchRef.current = lane.pitch * 0.35;
    }

    posRef.current = state.position;
    rotRef.current = state.rotation;
    velRef.current = state.velocity;

    if (groupRef.current) {
      groupRef.current.position.set(state.position.x, state.position.y, state.position.z);
      groupRef.current.rotation.y = state.rotation;
      if (isAircraft && aircraftState) {
        groupRef.current.rotation.x = aircraftState.pitch * 0.5;
      } else if (isGhatMap) {
        groupRef.current.rotation.x = ghatPitchRef.current;
      } else {
        groupRef.current.rotation.x = 0;
      }
    }

    playerPositionRegistry.x = state.position.x;
    playerPositionRegistry.y = state.position.y;
    playerPositionRegistry.z = state.position.z;
    playerPositionRegistry.active = true;

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

    const remaining = isAerialMap && isAircraft
      ? getAerialDistanceRemaining(state.position.z)
      : getMetersToFinishLine(state.position.z, totalRaceDistance, RACE_START_Z);
    const roundedRemaining = Math.round(remaining);
    if (roundedRemaining !== lastDistanceReport.current) {
      useRaceStore.getState().setDistanceRemaining(remaining);
      lastDistanceReport.current = roundedRemaining;
    }

    if (!finishedRef.current) {
      const aerialDone = isAerialMap && isAircraft && hasCrossedAerialFinish(state.position.x, state.position.y, state.position.z);
      const groundDone = !isAerialMap && (remaining <= 0.5 || state.position.z <= finishLineZ);
      if (aerialDone || groundDone) {
        completeFinish();
      }
    }

    if (isAerialMap && isAircraft) {
      playAircraftEngine(
        config.aircraftKind || 'airplane',
        state.speed,
        effectiveMaxSpeedKmh,
        health,
        inputRef.current.accelerate,
        aircraftVisual.current.rotorSpeed,
      );
    } else {
      playEngine(
        state.speed,
        effectiveMaxSpeedKmh,
        health,
        inputRef.current.accelerate,
        inputRef.current.brake,
      );
    }

    missileCooldown.current = Math.max(0, missileCooldown.current - delta);
    const missilePressed = inputRef.current.fireMissile;
    if (canUseMissiles && missilePressed && missileCooldown.current <= 0) {
      const pitch = isAerialMap ? (aircraftState?.pitch ?? 0) : ghatPitchRef.current;
      const hx = Math.sin(state.rotation);
      const hz = Math.cos(state.rotation);
      const launchForward = isGhatMap ? 1.6 : 0;
      const launchY = state.position.y + (isGhatMap ? 0.55 : 0);
      fireMissile(
        localPlayerId,
        state.position.x + hx * launchForward,
        launchY,
        state.position.z + hz * launchForward,
        state.rotation,
        pitch,
      );
      playSound('nitro');
      missileCooldown.current = MISSILE_COOLDOWN_SEC;
      if (!isSolo) {
        getSocket().emit(SocketEvents.MISSILE_FIRE, {
          ownerId: localPlayerId,
          position: { x: state.position.x, y: launchY, z: state.position.z },
          rotation: state.rotation,
        });
      }
    }

    if (canUseMissiles && !isSolo) {
      const remotePlayers = useRaceStore.getState().remotePlayers;
      const hitId = findMissileHit(localPlayerId, remotePlayers, isGhatMap ? 5.5 : 6);
      if (hitId) {
        getSocket().emit(SocketEvents.MISSILE_HIT, {
          attackerId: localPlayerId,
          targetId: hitId,
          position: { ...state.position },
        });
        playCollisionImpact('large', state.speed);
      }
    }

    const hornPressed = hornRef.current;
    if (hornPressed && !prevHornRef.current && hornCooldown.current <= 0) {
      playSound('horn');
      hornCooldown.current = 4;
      if (!isSolo) getSocket().emit(SocketEvents.HORN);
    }
    prevHornRef.current = hornPressed;
    hornCooldown.current -= delta;

    if (nitroRef.current) {
      playSound('nitro');
      if (!isSolo) getSocket().emit(SocketEvents.NITRO);
    }

    if (state.isDrifting) playSound('skid');

    if (!isSolo) {
      const remotePlayers = useRaceStore.getState().remotePlayers;
      const overtakenBy = detectPlayerOvertake(
        state.position.x,
        state.position.z,
        remotePlayers,
        remotePlayerSides.current,
      );
      if (overtakenBy) {
        playOvertakeSound();
      }
    }

    collisionCooldown.current = Math.max(0, collisionCooldown.current - delta);
    if (collisionCooldown.current <= 0 && state.speed > 3 && !isRamming && !(isAerialMap && isAircraft)) {
      if (!isSolo) {
        const remotePlayers = useRaceStore.getState().remotePlayers;
        const hitPlayerId = findPlayerCollision(state.position.x, state.position.z, remotePlayers);
        if (hitPlayerId) {
          const now = Date.now();
          const lastHit = playerHitTimes.current.get(hitPlayerId) ?? 0;
          if (now - lastHit > 1200) {
            playerHitTimes.current.set(hitPlayerId, now);
            collisionCooldown.current = 0.5;
            const remote = remotePlayers[hitPlayerId];
            const { severity } = getCollisionDamage(state.speed);
            const landing = computePlayerRamLanding(
              remote.position,
              state.position,
              state.rotation,
              state.speed,
            );
            const ramPayload = {
              attackerId: localPlayerId,
              targetId: hitPlayerId,
              start: { x: remote.position.x, y: remote.position.y, z: remote.position.z },
              end: landing,
              speedKmh: state.speed,
            };
            triggerPlayerRam(hitPlayerId, ramPayload.start, ramPayload.end);
            getSocket().emit(SocketEvents.PLAYER_RAM, ramPayload);
            playCollisionImpact(severity, state.speed);
            triggerCollisionFeedback(severity, state.speed * 0.6);
            return;
          }
        }
      }

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
          if (newHealth <= 0) triggerExplosion();
          physics.current.applyTrafficCollision(severity, hit.position.x);
          playCollisionImpact(severity, state.speed);
          triggerCollisionFeedback(severity, state.speed);

          if (!isSolo) {
            getSocket().emit(SocketEvents.COLLISION, {
              playerId: localPlayerId,
              severity,
              position: { ...state.position },
              collisionType: 'traffic',
            });
          }
        }
      } else if (medianHit) {
        const now = Date.now();
        const lastHit = medianHitTimes.current.get(medianHit.id) ?? 0;
        if (now - lastHit > 900 && state.speed > 1) {
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
            if (newHealth <= 0) triggerExplosion();
            physics.current.applyTrafficCollision(severity, medianHit.position.x);
            playCollisionImpact(severity, state.speed * 0.5);
            triggerCollisionFeedback(severity, state.speed * 0.5);

            if (!isSolo) {
              getSocket().emit(SocketEvents.COLLISION, {
                playerId: localPlayerId,
                severity,
                position: { ...state.position },
                collisionType: 'obstacle',
              });
            }
          }
        }
      }
    }

    const checkpoints = map.checkpoints;
    const nextCp = checkpoints[checkpointRef.current + 1];
    if (nextCp) {
      const dx = state.position.x - nextCp.x;
      const dy = isAerialMap ? state.position.y - nextCp.y : 0;
      const dz = state.position.z - nextCp.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const hitRadius = isAerialMap ? 55 : 30;
      if (dist < hitRadius) {
        checkpointRef.current++;
        if (!isSolo) {
          getSocket().emit(SocketEvents.CHECKPOINT, { checkpointIndex: checkpointRef.current });
        }
        if (checkpointRef.current >= checkpoints.length - 1) {
          completeFinish();
        }
      }
    }
  });

  return (
    <group ref={groupRef}>
      {!isDestroyed && health > 0 && (
        <VehicleMesh
          key={vehicleId}
          config={config}
          color={vehicleColor}
          rotorSpeed={aircraftVisual.current.rotorSpeed}
          pitch={aircraftVisual.current.pitch}
          onGround={aircraftVisual.current.onGround}
          visualRef={aircraftVisual}
        />
      )}
      <ExplosionFire active={isDestroyed || health <= 0} />
      <SmokeParticles active={!isDestroyed && health < 50 && health > 0} position={[0, 0.5, -1]} />
      {!isSolo && !isDestroyed && health > 0 && <PlayerNameLabel name={username} isLocal />}
    </group>
  );
}

function GameWorld({
  vehicleId,
  vehicleColor,
  mapId,
}: {
  vehicleId: string;
  vehicleColor: string;
  mapId: string;
}) {
  const map = getMapById(mapId) || getMapById(DEFAULT_MAP_ID)!;
  const weather = useRaceStore((s) => s.weather) as 'clear' | 'rain' | 'fog' | 'thunder' | 'wind';
  const timeOfDay = useRaceStore((s) => s.timeOfDay) as 'morning' | 'afternoon' | 'evening' | 'night' | 'sunrise' | 'sunset';
  const race = useRaceStore((s) => s.race);
  const lobby = useLobbyStore((s) => s.lobby);
  const selectedTrafficLevel = useLobbyStore((s) => s.selectedTrafficLevel);
  const playerId = useAuthStore((s) => s.profile.id);
  const localPlayerId = useLobbyStore((s) => s.localPlayerId);
  const username = useAuthStore((s) => s.profile.username);
  const [signalState, setSignalState] = useState<'red' | 'yellow' | 'green'>('green');
  const resolvedPlayerId = localPlayerId || playerId;
  const myRacePlayer = race?.players.find((p) => p.playerId === resolvedPlayerId);
  const lobbyPlayers = lobby?.players ?? [];
  const playerCount = race?.players.length ?? lobbyPlayers.length ?? 1;
  const myIndex = race
    ? Math.max(0, race.players.findIndex((p) => p.playerId === resolvedPlayerId))
    : Math.max(0, lobbyPlayers.findIndex((p) => p.id === resolvedPlayerId));
  const isGhatMap = map.roadType === 'hill';
  const isAerialMap = map.roadType === 'aerial';
  const spawnVehicleConfig = getVehicleById(vehicleId);
  const spawnPosition = (() => {
      if (isGhatMap) {
        return getGhatSpawnPosition(myIndex, Math.max(1, playerCount), map.checkpoints);
      }
      if (isAerialMap && spawnVehicleConfig?.category === 'aircraft') {
        return getAerialSpawnPosition(vehicleId, spawnVehicleConfig.aircraftKind, myIndex);
      }
      if (myRacePlayer) {
        return {
          x: myRacePlayer.position.x,
          y: myRacePlayer.position.y,
          z: myRacePlayer.position.z,
          rotation: myRacePlayer.rotation,
        };
      }
      const spawn = getRaceSpawnPosition(myIndex, Math.max(2, playerCount));
      return { x: spawn.x, y: spawn.y, z: spawn.z, rotation: spawn.rotation };
    })();
  const otherPlayers = race?.players.filter((p) => p.playerId !== resolvedPlayerId) ?? [];
  const isMultiplayer = playerCount >= 2;
  const trafficLevel = race?.trafficLevel ?? lobby?.settings.trafficLevel ?? selectedTrafficLevel ?? DEFAULT_TRAFFIC_LEVEL;
  const trafficDensity = resolveTrafficDensity(map.trafficDensity, trafficLevel);

  useEffect(() => {
    const socket = getSocket();
    socket.on(SocketEvents.TRAFFIC_SYNC, (data: { signalState: 'red' | 'yellow' | 'green' }) => {
      setSignalState(data.signalState);
    });
    return () => { socket.off(SocketEvents.TRAFFIC_SYNC); };
  }, []);

  return (
    <>
      <WeatherSystem weather={weather} timeOfDay={timeOfDay} mapId={mapId} />
      <MapEnvironment map={map} />
      {!isGhatMap && !isAerialMap && (
        <TrafficSystem path={map.checkpoints} density={trafficDensity} signalState={signalState} />
      )}
      {(isAerialMap || isGhatMap) && <MissileVisuals />}
      <PlayerVehicle
        vehicleId={vehicleId}
        vehicleColor={vehicleColor}
        mapId={mapId}
        isSolo={!isMultiplayer}
        spawnPosition={spawnPosition}
        username={myRacePlayer?.username || username}
      />
      {isMultiplayer && otherPlayers.map((p) => (
        <RemotePlayer
          key={p.playerId}
          playerId={p.playerId}
          username={p.username}
          vehicleId={p.vehicleId}
          vehicleColor={p.vehicleColor}
          initialPosition={p.position}
          initialRotation={p.rotation}
          mapId={mapId}
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
  const timeOfDay = useRaceStore((s) => s.timeOfDay);

  return (
    <Canvas
      shadows={settings.shadows}
      camera={{
        position: [PLAYER_LANE_X, 0.5 + CAM_HEIGHT, RACE_START_Z + CAM_DISTANCE],
        fov: 65,
        near: 0.1,
        far: settings.drawDistance,
      }}
      onCreated={({ camera }) => {
        camera.lookAt(PLAYER_LANE_X, 0.5 + CAM_LOOK_HEIGHT, RACE_START_Z - 18);
      }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ width: '100vw', height: '100vh' }}
      frameloop="always"
    >
      <Suspense fallback={null}>
        <GameWorld
          vehicleId={vehicleId}
          vehicleColor={vehicleColor}
          mapId={mapId}
        />
        {settings.bloom && (
          <EffectComposer multisampling={0}>
            <Bloom intensity={0.15} luminanceThreshold={0.92} luminanceSmoothing={0.9} />
            <Vignette offset={0.3} darkness={timeOfDay === 'night' ? 0.45 : 0.22} />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
});
