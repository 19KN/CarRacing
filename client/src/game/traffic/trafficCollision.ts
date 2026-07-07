import { CollisionSeverity, HEALTH_DAMAGE, VehicleConfig, getVehicleById } from '@indian-racing/shared';
import { detectCollisionSeverity } from '../physics/vehiclePhysics';
import type { TrafficVehicle } from './TrafficSystem';

const PLAYER_HALF_WIDTH = 0.95;
const PLAYER_HALF_LENGTH = 2.1;

export function getTrafficCollisionBounds(config: VehicleConfig): { halfWidth: number; halfLength: number } {
  if (config.category === 'two_wheeler') {
    return { halfWidth: 0.42, halfLength: config.id === 'bicycle' ? 0.85 : 1.1 };
  }
  if (config.category === 'commercial') {
    if (config.id === 'bus') return { halfWidth: 1.35, halfLength: 4.2 };
    if (config.id === 'lorry') return { halfWidth: 1.35, halfLength: 3.8 };
    if (config.id === 'tractor') return { halfWidth: 1.2, halfLength: 2.2 };
    return { halfWidth: 1.05, halfLength: 2.2 };
  }
  if (config.id === 'suv' || config.id === 'jeep') return { halfWidth: 1.05, halfLength: 2.3 };
  if (config.id === 'formula_car' || config.id === 'toy_car') return { halfWidth: 0.8, halfLength: 1.8 };
  return { halfWidth: 0.95, halfLength: 2.15 };
}

export function findTrafficCollision(
  px: number,
  pz: number,
  traffic: TrafficVehicle[],
): TrafficVehicle | null {
  for (const tv of traffic) {
    const dx = px - tv.position.x;
    const dz = pz - tv.position.z;
    const cos = Math.cos(tv.rotation);
    const sin = Math.sin(tv.rotation);
    const localX = dx * cos + dz * sin;
    const localZ = -dx * sin + dz * cos;

    if (
      Math.abs(localX) < PLAYER_HALF_WIDTH + tv.halfWidth
      && Math.abs(localZ) < PLAYER_HALF_LENGTH + tv.halfLength
    ) {
      return tv;
    }
  }
  return null;
}

export function getCollisionDamage(speedKmh: number): { severity: CollisionSeverity; damage: number } {
  const severity = detectCollisionSeverity(speedKmh);
  return { severity, damage: HEALTH_DAMAGE[severity] ?? 4 };
}

export function buildTrafficSpawnBounds(vehicleId: string) {
  const config = getVehicleById(vehicleId);
  if (!config) return { halfWidth: 0.95, halfLength: 2.15 };
  return getTrafficCollisionBounds(config);
}
