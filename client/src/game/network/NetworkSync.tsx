import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getVehicleById, DEFAULT_VEHICLE_ID, PlayerRamPayload, getMapById, DEFAULT_MAP_ID, getMapRaceDistance, RACE_START_Z } from '@indian-racing/shared';
import { getMetersToFinishLine } from '../../utils/soloRace';
import { getSocket, SocketEvents } from '../../utils/socket';
import { audioManager } from '../audio/AudioManager';
import { useAuthStore, useRaceStore, useLobbyStore } from '../../stores';
import { VehicleMesh } from '../vehicles/VehicleMesh';
import { PlayerNameLabel } from '../effects/PlayerNameLabel';
import { triggerPlayerRam, updatePlayerRams, getPlayerRamPosition } from './playerRam';

export function useNetworkSync(
  localPosition: React.RefObject<{ x: number; y: number; z: number }>,
  localRotation: React.RefObject<number>,
  localVelocity: React.RefObject<{ x: number; y: number; z: number }>,
  enabled = true,
) {
  const lastSent = useRef(0);
  const prevRank = useRef<number | null>(null);
  const playerId = useLobbyStore((s) => s.localPlayerId) || useAuthStore((s) => s.profile.id);
  const updateRemote = useRaceStore((s) => s.updateRemotePlayer);
  const setRankings = useRaceStore((s) => s.setRankings);
  const setHealth = useRaceStore((s) => s.setHealth);
  const setPosition = useRaceStore((s) => s.setPosition);

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();

    const onPositionSync = (data: {
      players: { playerId: string; position: { x: number; y: number; z: number }; rotation: number; velocity: { x: number; y: number; z: number } }[];
    }) => {
      data.players.forEach((p) => {
        if (p.playerId !== playerId) {
          updateRemote(p.playerId, { position: p.position, rotation: p.rotation, velocity: p.velocity });
        }
      });
    };

    const onPositionRank = (data: {
      rankings: { playerId: string; username: string; rank: number; distanceTraveled: number; finished: boolean }[];
    }) => {
      setRankings(data.rankings);
      const me = data.rankings.find((r) => r.playerId === playerId);
      if (me) {
        if (prevRank.current !== null && me.rank > prevRank.current) {
          audioManager.playOvertakeSound();
        }
        prevRank.current = me.rank;
        setPosition(me.rank);
      }
    };

    const onHealthUpdate = (data: {
      playerId: string;
      health: number;
      isRespawning?: boolean;
      position?: { x: number; y: number; z: number };
      rotation?: number;
    }) => {
      if (data.playerId !== playerId) return;
      if (data.health <= 0) {
        setHealth(0);
        useRaceStore.getState().setRespawning(true);
        return;
      }
      if (data.position && data.rotation !== undefined && !data.isRespawning) {
        useRaceStore.getState().applyRespawn({
          health: data.health,
          position: data.position,
          rotation: data.rotation,
        });
        return;
      }
      setHealth(data.health);
      if (data.isRespawning !== undefined) {
        useRaceStore.getState().setRespawning(data.isRespawning);
      }
    };

    socket.on(SocketEvents.POSITION_SYNC, onPositionSync);
    socket.on(SocketEvents.POSITION_RANK, onPositionRank);
    socket.on(SocketEvents.HEALTH_UPDATE, onHealthUpdate);

    const onPlayerRam = (data: PlayerRamPayload) => {
      triggerPlayerRam(data.targetId, data.start, data.end);
    };
    socket.on(SocketEvents.PLAYER_RAM, onPlayerRam);

    return () => {
      socket.off(SocketEvents.POSITION_SYNC, onPositionSync);
      socket.off(SocketEvents.POSITION_RANK, onPositionRank);
      socket.off(SocketEvents.HEALTH_UPDATE, onHealthUpdate);
      socket.off(SocketEvents.PLAYER_RAM, onPlayerRam);
    };
  }, [playerId, enabled, updateRemote, setRankings, setHealth, setPosition]);

  useFrame(() => {
    if (!enabled) return;
    const now = Date.now();
    if (now - lastSent.current < 50) return;
    lastSent.current = now;

    const socket = getSocket();
    if (!socket.connected || !localPosition.current) return;

    socket.emit(SocketEvents.POSITION_UPDATE, {
      playerId,
      position: localPosition.current,
      rotation: localRotation.current || 0,
      velocity: localVelocity.current || { x: 0, y: 0, z: 0 },
      timestamp: now,
    });
  });
}

export function RemotePlayer({
  playerId,
  username,
  vehicleId,
  vehicleColor,
  initialPosition,
  initialRotation,
  mapId,
}: {
  playerId: string;
  username: string;
  vehicleId: string;
  vehicleColor: string;
  initialPosition: { x: number; y: number; z: number };
  initialRotation: number;
  mapId: string;
}) {
  const remotePlayers = useRaceStore((s) => s.remotePlayers);
  const rankings = useRaceStore((s) => s.rankings);
  const isRaceFinished = useRaceStore((s) => s.isRaceFinished);
  const localPlayerId = useLobbyStore((s) => s.localPlayerId) || useAuthStore((s) => s.profile.id);
  const groupRef = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3(initialPosition.x, initialPosition.y, initialPosition.z));
  const targetRot = useRef(initialRotation);
  const config = getVehicleById(vehicleId) || getVehicleById(DEFAULT_VEHICLE_ID)!;
  const raceDistance = getMapRaceDistance(getMapById(mapId) || getMapById(DEFAULT_MAP_ID)!);

  const remote = remotePlayers[playerId];
  const remoteRanking = rankings.find((r) => r.playerId === playerId);
  const localRanking = rankings.find((r) => r.playerId === localPlayerId);
  const localFinished = isRaceFinished || localRanking?.finished === true;
  const remoteFinished = remoteRanking?.finished === true;
  const positionZ = remote?.position.z ?? initialPosition.z;
  const metersToFinish = localFinished && !remoteFinished
    ? Math.round(getMetersToFinishLine(positionZ, raceDistance, RACE_START_Z))
    : null;

  useFrame((_, delta) => {
    updatePlayerRams(delta);
    if (!groupRef.current) return;
    if (remote) {
      targetPos.current.set(remote.position.x, remote.position.y, remote.position.z);
      targetRot.current = remote.rotation;
    }

    const ram = getPlayerRamPosition(playerId);
    if (ram.active) {
      groupRef.current.position.set(ram.x, ram.y, ram.z);
      groupRef.current.rotation.y = targetRot.current;
      return;
    }

    groupRef.current.position.lerp(targetPos.current, 0.35);
    groupRef.current.rotation.y += (targetRot.current - groupRef.current.rotation.y) * 0.35;
  });

  return (
    <group
      ref={groupRef}
      position={[initialPosition.x, initialPosition.y, initialPosition.z]}
      rotation={[0, initialRotation, 0]}
    >
      <VehicleMesh config={config} color={vehicleColor} />
      <PlayerNameLabel name={username} metersToFinish={metersToFinish} />
    </group>
  );
}
