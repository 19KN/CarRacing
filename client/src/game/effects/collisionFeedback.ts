import { CollisionSeverity } from '@indian-racing/shared';

export const collisionShake = { intensity: 0 };

const SHAKE_BY_SEVERITY: Record<CollisionSeverity, number> = {
  small: 0.12,
  medium: 0.28,
  large: 0.45,
  heavy: 0.65,
};

export function triggerCollisionFeedback(severity: CollisionSeverity, speedKmh: number) {
  const speedMul = Math.min(speedKmh / 80, 1.4);
  collisionShake.intensity = Math.min(1, SHAKE_BY_SEVERITY[severity] * speedMul);
}

export function decayCollisionShake(delta: number) {
  if (collisionShake.intensity <= 0) return;
  collisionShake.intensity = Math.max(0, collisionShake.intensity - delta * 2.8);
}
