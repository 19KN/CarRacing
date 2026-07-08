export interface GLBVehicleConfig {
  path: string;
  targetSize: number;
  /** Only set when a GLB exports facing the wrong axis (+X/-X). Do not use ±90° on models that already face +Z. */
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
    paintMesh: (name) => name === 'Bike',
  },
  motorcycle: {
    path: '/assets/vehicles/motorcycle.glb',
    targetSize: 2.4,
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
  f1_car: {
    path: '/assets/vehicles/f1-car.glb',
    targetSize: 4.2,
    fixWheelPivots: true,
    isWheel: (name) => /wheel|tire|tyre/i.test(name),
    isGlass: (name) => /glass|visor|windshield/i.test(name),
    paintMesh: (name) => !/wheel|tire|tyre|glass|visor|windshield|interior|seat/i.test(name),
  },
  dodge_challenger: {
    path: '/assets/vehicles/dodge-challenger.glb',
    targetSize: 4.6,
    fixWheelPivots: true,
    isWheel: (name) => /wheel|tire|tyre/i.test(name),
    isGlass: (name) => /glass|window/i.test(name),
    paintMesh: (name) => !/wheel|tire|tyre|glass|window|light|lamp|interior|seat|chrome/i.test(name),
  },
  bursley_defiance: {
    path: '/assets/vehicles/bursley-defiance.glb',
    targetSize: 4.5,
    fixWheelPivots: true,
    isWheel: (name) => /wheel|tire|tyre/i.test(name),
    isGlass: (name) => /glass|window/i.test(name),
    paintMesh: (name) => !/wheel|tire|tyre|glass|window|light|lamp|interior|seat|chrome/i.test(name),
  },
};

export const GLB_VEHICLE_IDS = new Set(Object.keys(GLB_VEHICLE_CONFIGS));
