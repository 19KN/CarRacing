import { SIDEWALK_X } from '../maps/IndianHighwayRoad';

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

/** Where a rammed player should land — sidewalk or median based on impact direction. */
export function computePlayerRamLanding(
  victim: { x: number; z: number },
  attacker: { x: number; z: number },
  attackerRotation: number,
  speedKmh: number,
): { x: number; y: number; z: number } {
  const dx = victim.x - attacker.x;
  const dz = victim.z - attacker.z;
  const dist = Math.sqrt(dx * dx + dz * dz) || 1;
  const nx = dx / dist;
  const nz = dz / dist;

  const headingX = Math.sin(attackerRotation);
  const headingZ = Math.cos(attackerRotation);
  const rightX = -headingZ;
  const rightZ = headingX;
  const lateral = dx * rightX + dz * rightZ;
  const forward = dx * headingX + dz * headingZ;

  let targetX: number;
  if (Math.abs(lateral) > 1) {
    targetX = lateral > 0 ? SIDEWALK_X : -SIDEWALK_X;
  } else if (Math.abs(victim.x) < 2) {
    targetX = lateral >= 0 ? 0.55 : -0.55;
  } else {
    targetX = victim.x + nx * (2.5 + speedKmh * 0.04);
    if (Math.abs(targetX) < 2.2) {
      targetX = lateral >= 0 ? 0.55 : -0.55;
    } else {
      targetX = targetX > 0 ? SIDEWALK_X : -SIDEWALK_X;
    }
  }

  const pushZ = (3 + speedKmh * 0.05) * (Math.abs(forward) > 0.3 ? Math.sign(forward) : Math.sign(nz || -1));
  const targetZ = victim.z + pushZ * 0.4;

  return { x: targetX, y: 0.5, z: targetZ };
}
