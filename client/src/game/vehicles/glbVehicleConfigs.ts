export interface GLBVehicleConfig {
  path: string;
  targetSize: number;
  /** Correct GLB forward axis to match game driving direction (-Z) */
  modelRotation?: [number, number, number];
  fixWheelPivots?: boolean;
  isWheel?: (name: string) => boolean;
  isGlass?: (name: string) => boolean;
  paintMesh?: (name: string) => boolean;
}

export const GLB_VEHICLE_CONFIGS: Record<string, GLBVehicleConfig> = {
  sedan: {
    path: '/assets/vehicles/sedan.glb',
    targetSize: 4.5,
    fixWheelPivots: true,
    isWheel: (name) => /wheel/i.test(name),
    isGlass: (name) => /glass/i.test(name),
  },
  bicycle: {
    path: '/assets/vehicles/bike.glb',
    targetSize: 1.6,
    modelRotation: [0, Math.PI / 2, 0],
    paintMesh: (name) => name === 'Bike',
  },
  motorcycle: {
    path: '/assets/vehicles/motorcycle.glb',
    targetSize: 2.4,
    modelRotation: [0, Math.PI / 2, 0],
    paintMesh: () => true,
  },
  wagon: {
    path: '/assets/vehicles/wagon.glb',
    targetSize: 4.5,
    isWheel: (name) => /^Cylinder/i.test(name),
    paintMesh: (name) => /^Box/i.test(name),
  },
  cruise_ship: {
    path: '/assets/vehicles/cruise-ship.glb',
    targetSize: 9,
    paintMesh: (name) => !/glass|window|railing|rail|antenna|chimney|smoke|water/i.test(name),
  },
};

export const GLB_VEHICLE_IDS = new Set(Object.keys(GLB_VEHICLE_CONFIGS));
