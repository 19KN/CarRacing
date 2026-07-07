const LATERAL_RANGE = 8;
const LONGITUDINAL_RANGE = 6;

type RelativeSide = 'behind' | 'ahead' | 'unknown';

function getRelativeSide(localZ: number, remoteZ: number): RelativeSide {
  const delta = remoteZ - localZ;
  if (delta > LONGITUDINAL_RANGE) return 'behind';
  if (delta < -LONGITUDINAL_RANGE) return 'ahead';
  return 'unknown';
}

export function detectPlayerOvertake(
  localX: number,
  localZ: number,
  remotePlayers: Record<string, { position: { x: number; y: number; z: number } }>,
  previousSides: Map<string, RelativeSide>,
): string | null {
  for (const [playerId, remote] of Object.entries(remotePlayers)) {
    const lateralDistance = Math.abs(localX - remote.position.x);
    if (lateralDistance > LATERAL_RANGE) {
      previousSides.set(playerId, getRelativeSide(localZ, remote.position.z));
      continue;
    }

    const side = getRelativeSide(localZ, remote.position.z);
    const prevSide = previousSides.get(playerId);

    if (prevSide === 'behind' && side === 'ahead') {
      previousSides.set(playerId, side);
      return playerId;
    }

    if (side !== 'unknown') {
      previousSides.set(playerId, side);
    }
  }

  return null;
}
