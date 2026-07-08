export interface PlayerRamState {
  startX: number;
  startY: number;
  startZ: number;
  endX: number;
  endY: number;
  endZ: number;
  time: number;
  duration: number;
}

const ramRegistry = new Map<string, PlayerRamState>();

export function triggerPlayerRam(
  playerId: string,
  start: { x: number; y: number; z: number },
  end: { x: number; y: number; z: number },
  duration = 1.15,
) {
  ramRegistry.set(playerId, {
    startX: start.x,
    startY: start.y,
    startZ: start.z,
    endX: end.x,
    endY: end.y,
    endZ: end.z,
    time: 0,
    duration,
  });
}

export function updatePlayerRams(delta: number) {
  for (const [id, ram] of ramRegistry) {
    ram.time += delta;
    if (ram.time >= ram.duration) {
      ramRegistry.delete(id);
    }
  }
}

export function isPlayerRamming(playerId: string): boolean {
  return ramRegistry.has(playerId);
}

export function getPlayerRamPosition(playerId: string): {
  x: number;
  y: number;
  z: number;
  active: boolean;
  finished: boolean;
} {
  const ram = ramRegistry.get(playerId);
  if (!ram) {
    return { x: 0, y: 0, z: 0, active: false, finished: false };
  }

  const t = Math.min(1, ram.time / ram.duration);
  const ease = 1 - Math.pow(1 - t, 2);
  const arc = Math.sin(t * Math.PI) * (2.2 + Math.abs(ram.endX - ram.startX) * 0.15);

  return {
    x: ram.startX + (ram.endX - ram.startX) * ease,
    y: ram.startY + (ram.endY - ram.startY) * ease + arc,
    z: ram.startZ + (ram.endZ - ram.startZ) * ease,
    active: t < 1,
    finished: t >= 1,
  };
}

export function clearPlayerRam(playerId: string) {
  ramRegistry.delete(playerId);
}
