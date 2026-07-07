export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (item: T) => void;
  private maxSize: number;

  constructor(factory: () => T, reset: (item: T) => void, maxSize = 100) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
  }

  acquire(): T {
    return this.pool.pop() || this.factory();
  }

  release(item: T): void {
    this.reset(item);
    if (this.pool.length < this.maxSize) {
      this.pool.push(item);
    }
  }

  get size(): number {
    return this.pool.length;
  }
}

export function getLODLevel(distance: number): 0 | 1 | 2 {
  if (distance < 50) return 0;
  if (distance < 150) return 1;
  return 2;
}

export const QUALITY_PRESETS = {
  low: { drawDistance: 200, shadows: false, bloom: false, trafficMultiplier: 0.3, sceneryLimit: 30 },
  medium: { drawDistance: 350, shadows: true, bloom: false, trafficMultiplier: 0.6, sceneryLimit: 60 },
  high: { drawDistance: 500, shadows: true, bloom: true, trafficMultiplier: 0.8, sceneryLimit: 100 },
  ultra: { drawDistance: 800, shadows: true, bloom: true, trafficMultiplier: 1.0, sceneryLimit: 150 },
} as const;

export function getAdaptiveQuality(fps: number): keyof typeof QUALITY_PRESETS {
  if (fps < 30) return 'low';
  if (fps < 45) return 'medium';
  if (fps < 55) return 'high';
  return 'ultra';
}
