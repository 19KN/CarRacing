const PLAYER_HALF_WIDTH = 0.95;
const PLAYER_HALF_LENGTH = 2.1;

export function findPlayerCollision(
  px: number,
  pz: number,
  remotePlayers: Record<string, { position: { x: number; y: number; z: number }; rotation: number }>,
): string | null {
  for (const [playerId, remote] of Object.entries(remotePlayers)) {
    const dx = px - remote.position.x;
    const dz = pz - remote.position.z;
    const cos = Math.cos(remote.rotation);
    const sin = Math.sin(remote.rotation);
    const localX = dx * cos + dz * sin;
    const localZ = -dx * sin + dz * cos;

    if (
      Math.abs(localX) < PLAYER_HALF_WIDTH * 2
      && Math.abs(localZ) < PLAYER_HALF_LENGTH * 2
    ) {
      return playerId;
    }
  }
  return null;
}
