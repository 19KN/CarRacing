import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getVehicleById, DEFAULT_VEHICLE_ID } from '@indian-racing/shared';
import { getSocket, SocketEvents } from '../../utils/socket';
import { audioManager } from '../audio/AudioManager';
import { useAuthStore, useRaceStore, useLobbyStore } from '../../stores';
import { VehicleMesh } from '../vehicles/VehicleMesh';
import { PlayerNameLabel } from '../effects/PlayerNameLabel';

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

    const onHealthUpdate = (data: { playerId: string; health: number }) => {
      if (data.playerId === playerId) setHealth(data.health);
    };

    socket.on(SocketEvents.POSITION_SYNC, onPositionSync);
    socket.on(SocketEvents.POSITION_RANK, onPositionRank);
    socket.on(SocketEvents.HEALTH_UPDATE, onHealthUpdate);

    return () => {
      socket.off(SocketEvents.POSITION_SYNC, onPositionSync);
      socket.off(SocketEvents.POSITION_RANK, onPositionRank);
      socket.off(SocketEvents.HEALTH_UPDATE, onHealthUpdate);
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
}: {
  playerId: string;
  username: string;
  vehicleId: string;
  vehicleColor: string;
  initialPosition: { x: number; y: number; z: number };
  initialRotation: number;
}) {
  const remotePlayers = useRaceStore((s) => s.remotePlayers);
  const groupRef = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3(initialPosition.x, initialPosition.y, initialPosition.z));
  const targetRot = useRef(initialRotation);
  const config = getVehicleById(vehicleId) || getVehicleById(DEFAULT_VEHICLE_ID)!;

  const remote = remotePlayers[playerId];

  useFrame(() => {
    if (!groupRef.current) return;
    if (remote) {
      targetPos.current.set(remote.position.x, remote.position.y, remote.position.z);
      targetRot.current = remote.rotation;
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
      <PlayerNameLabel name={username} />
    </group>
  );
}
