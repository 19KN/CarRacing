export interface Missile {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

export const missileRegistry: { missiles: Missile[] } = { missiles: [] };

let missileIdCounter = 0;

export function fireMissile(
  ownerId: string,
  x: number,
  y: number,
  z: number,
  rotation: number,
  pitch: number,
): Missile {
  const speed = 140;
  const m: Missile = {
    id: `msl-${++missileIdCounter}`,
    ownerId,
    x,
    y,
    z,
    vx: Math.sin(rotation) * Math.cos(pitch) * speed,
    vy: -Math.sin(pitch) * speed,
    vz: Math.cos(rotation) * Math.cos(pitch) * speed,
    life: 4,
  };
  missileRegistry.missiles.push(m);
  return m;
}

export function updateMissiles(delta: number) {
  missileRegistry.missiles = missileRegistry.missiles.filter((m) => {
    m.x += m.vx * delta;
    m.y += m.vy * delta;
    m.z += m.vz * delta;
    m.life -= delta;
    return m.life > 0 && m.y > -5;
  });
}

export function findMissileHit(
  ownerId: string,
  remotePlayers: Record<string, { position: { x: number; y: number; z: number } }>,
  hitRadius = 6,
  maxVerticalSep = 4,
): string | null {
  for (const m of missileRegistry.missiles) {
    if (m.ownerId !== ownerId) continue;
    for (const [pid, rp] of Object.entries(remotePlayers)) {
      if (pid === ownerId) continue;
      const dx = m.x - rp.position.x;
      const dy = m.y - rp.position.y;
      const dz = m.z - rp.position.z;
      const horizontal = Math.hypot(dx, dz);
      if (horizontal < hitRadius && Math.abs(dy) < maxVerticalSep) {
        m.life = 0;
        return pid;
      }
    }
  }
  return null;
}

export function clearMissiles() {
  missileRegistry.missiles.length = 0;
}
