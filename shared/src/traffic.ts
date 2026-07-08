import type { TrafficLevel } from './types';

export const TRAFFIC_LEVELS: TrafficLevel[] = ['less', 'medium', 'high'];

export const TRAFFIC_LEVEL_LABELS: Record<TrafficLevel, string> = {
  less: 'Less',
  medium: 'Medium',
  high: 'High',
};

/** Relative density multipliers applied on top of each map's base traffic density. */
export const TRAFFIC_LEVEL_MULTIPLIER: Record<TrafficLevel, number> = {
  less: 0.35,
  medium: 0.65,
  high: 1.0,
};

export const DEFAULT_TRAFFIC_LEVEL: TrafficLevel = 'medium';

export function resolveTrafficDensity(mapTrafficDensity: number, level: TrafficLevel): number {
  return mapTrafficDensity * TRAFFIC_LEVEL_MULTIPLIER[level];
}

export function isTrafficLevel(value: unknown): value is TrafficLevel {
  return value === 'less' || value === 'medium' || value === 'high';
}
