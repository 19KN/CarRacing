import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getSocket, SocketEvents } from '../../utils/socket';
import { useAuthStore, useRaceStore } from '../../stores';

export function useNetworkSync(
  localPosition: React.RefObject<{ x: number; y: number; z: number }>,
  localRotation: React.RefObject<number>,
  localVelocity: React.RefObject<{ x: number; y: number; z: number }>,
  enabled = true,
) {
  const lastSent = useRef(0);
  const playerId = useAuthStore((s) => s.profile.id);
  const updateRemote = useRaceStore((s) => s.updateRemotePlayer);
  const setRankings = useRaceStore((s) => s.setRankings);
  const setHealth = useRaceStore((s) => s.setHealth);
  const setPosition = useRaceStore((s) => s.setPosition);

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();

    socket.on(SocketEvents.POSITION_SYNC, (data: {
      players: { playerId: string; position: { x: number; y: number; z: number }; rotation: number; velocity: { x: number; y: number; z: number } }[];
    }) => {
      data.players.forEach((p) => {
        if (p.playerId !== playerId) {
          updateRemote(p.playerId, { position: p.position, rotation: p.rotation, velocity: p.velocity });
        }
      });
    });

    socket.on(SocketEvents.POSITION_RANK, (data: {
      rankings: { playerId: string; username: string; rank: number; distanceTraveled: number; finished: boolean }[];
    }) => {
      setRankings(data.rankings);
      const me = data.rankings.find((r) => r.playerId === playerId);
      if (me) setPosition(me.rank);
    });

    socket.on(SocketEvents.HEALTH_UPDATE, (data: { playerId: string; health: number }) => {
      if (data.playerId === playerId) setHealth(data.health);
    });

    return () => {
      socket.off(SocketEvents.POSITION_SYNC);
      socket.off(SocketEvents.POSITION_RANK);
      socket.off(SocketEvents.HEALTH_UPDATE);
    };
  }, [playerId, enabled]);

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
  vehicleColor,
}: {
  playerId: string;
  vehicleColor: string;
}) {
  const remotePlayers = useRaceStore((s) => s.remotePlayers);
  const groupRef = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3());
  const targetRot = useRef(0);

  const remote = remotePlayers[playerId];

  useFrame(() => {
    if (!groupRef.current || !remote) return;
    targetPos.current.set(remote.position.x, remote.position.y, remote.position.z);
    targetRot.current = remote.rotation;
    groupRef.current.position.lerp(targetPos.current, 0.3);
    groupRef.current.rotation.y += (targetRot.current - groupRef.current.rotation.y) * 0.3;
  });

  if (!remote) return null;

  return (
    <group ref={groupRef} position={[remote.position.x, remote.position.y, remote.position.z]}>
      <mesh castShadow position={[0, 0.7, 0]}>
        <boxGeometry args={[1.8, 1.2, 3.5]} />
        <meshStandardMaterial color={vehicleColor} metalness={0.5} />
      </mesh>
    </group>
  );
}
