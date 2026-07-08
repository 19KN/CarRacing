import { MapConfig, Vector3 } from './types';

function generateHighwayCheckpoints(count: number, length: number, curve = 0): Vector3[] {
  const points: Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const z = -t * length;
    const x = Math.sin(t * Math.PI * curve) * 200;
    const y = Math.sin(t * Math.PI * 2) * 5;
    points.push({ x, y, z });
  }
  return points;
}

function generateScenery(type: MapConfig['scenery'][0]['type'], count: number, spread: number): MapConfig['scenery'] {
  const scenery: MapConfig['scenery'] = [];
  const types: MapConfig['scenery'][0]['type'][] = [
    'building', 'apartment', 'tea_shop', 'petrol_pump', 'bus_stop',
    'hotel', 'toll_gate', 'temple', 'house', 'tree', 'vendor',
    'school', 'mall', 'water_tank', 'electric_pole', 'metro_pillar',
  ];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    scenery.push({
      type: type || types[i % types.length],
      position: {
        x: side * (30 + Math.random() * spread),
        y: 0,
        z: -Math.random() * 5000,
      },
      rotation: Math.random() * Math.PI * 2,
      scale: 0.8 + Math.random() * 0.6,
    });
  }
  return scenery;
}

function defaultSigns(): MapConfig['signs'] {
  return [
    { text: { hindi: 'धीरे चलें', english: 'Drive Slow', kannada: 'ನಿಧಾನವಾಗಿ', telugu: 'నెమ్మదిగా' }, position: { x: 15, y: 3, z: -500 }, rotation: 0 },
    { text: { hindi: 'सावधान', english: 'Caution', kannada: 'ಎಚ್ಚರ', telugu: 'జాగ్రత్త' }, position: { x: -15, y: 3, z: -1500 }, rotation: Math.PI },
    { text: { hindi: 'टोल प्लाज़ा', english: 'Toll Plaza Ahead', kannada: 'ಟೋಲ್ ಪ್ಲಾಜಾ', telugu: 'టోల్ ప్లాజా' }, position: { x: 15, y: 3, z: -3000 }, rotation: 0 },
  ];
}

export const MAPS: MapConfig[] = [
  {
    id: 'bangalore_hyderabad',
    name: 'Bangalore → Hyderabad',
    description: 'NH44 highway through Karnataka and Telangana',
    distance: 4000,
    checkpoints: generateHighwayCheckpoints(16, 4000, 0),
    scenery: generateScenery('building', 80, 40),
    roadType: 'highway',
    signs: defaultSigns(),
    trafficDensity: 0.6,
    weatherPool: ['clear', 'rain', 'fog'],
    defaultTimeOfDay: 'morning',
    isCircuit: false,
    laps: 1,
  },
  {
    id: 'hyderabad_vijayawada',
    name: 'Hyderabad → Vijayawada',
    description: 'NH65 expressway through Telangana and Andhra Pradesh',
    distance: 3500,
    checkpoints: generateHighwayCheckpoints(14, 3500, 0),
    scenery: generateScenery('petrol_pump', 60, 35),
    roadType: 'highway',
    signs: defaultSigns(),
    trafficDensity: 0.5,
    weatherPool: ['clear', 'rain', 'thunder'],
    defaultTimeOfDay: 'afternoon',
    isCircuit: false,
    laps: 1,
  },
  {
    id: 'chennai_bangalore',
    name: 'Chennai → Bangalore',
    description: 'NH48 through Tamil Nadu and Karnataka',
    distance: 4000,
    checkpoints: generateHighwayCheckpoints(16, 4000, 0),
    scenery: generateScenery('temple', 70, 38),
    roadType: 'highway',
    signs: defaultSigns(),
    trafficDensity: 0.55,
    weatherPool: ['clear', 'rain', 'wind'],
    defaultTimeOfDay: 'sunrise',
    isCircuit: false,
    laps: 1,
  },
];

export function getMapRoadLength(map: MapConfig): number {
  const last = map.checkpoints[map.checkpoints.length - 1];
  return Math.abs(last?.z ?? map.distance) + 600;
}

export function getMapRaceDistance(map: MapConfig): number {
  return map.isCircuit ? map.distance * map.laps : map.distance;
}

export const DEFAULT_MAP_ID = 'bangalore_hyderabad';

export function getMapById(id: string): MapConfig | undefined {
  return MAPS.find((m) => m.id === id);
}

export const ACHIEVEMENTS = [
  { id: 'first_win', name: 'First Victory', description: 'Win your first race', icon: '🏆', requirement: 1, category: 'racing' as const },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Reach 200 km/h', icon: '⚡', requirement: 200, category: 'racing' as const },
  { id: 'marathon', name: 'Marathon Driver', description: 'Drive 100km total', icon: '🛣️', requirement: 100000, category: 'distance' as const },
  { id: 'explorer', name: 'Explorer', description: 'Race on all 3 maps', icon: '🗺️', requirement: 3, category: 'distance' as const },
  { id: 'collector', name: 'Collector', description: 'Unlock all vehicles', icon: '🚗', requirement: 18, category: 'vehicles' as const },
  { id: 'clean_racer', name: 'Clean Racer', description: 'Win without collisions', icon: '✨', requirement: 1, category: 'racing' as const },
  { id: 'social_butterfly', name: 'Social Butterfly', description: 'Race with 8 players', icon: '👥', requirement: 8, category: 'social' as const },
  { id: 'night_owl', name: 'Night Owl', description: 'Win a night race', icon: '🌙', requirement: 1, category: 'racing' as const },
  { id: 'rain_master', name: 'Rain Master', description: 'Win in rain', icon: '🌧️', requirement: 1, category: 'racing' as const },
  { id: 'hill_climber', name: 'Hill Climber', description: 'Complete Kerala Hill Roads', icon: '⛰️', requirement: 1, category: 'distance' as const },
  { id: 'village_hero', name: 'Village Hero', description: 'Complete Village Roads', icon: '🏡', requirement: 1, category: 'distance' as const },
  { id: 'nitro_king', name: 'Nitro King', description: 'Use nitro 50 times', icon: '🔥', requirement: 50, category: 'racing' as const },
  { id: 'horn_happy', name: 'Horn Happy', description: 'Honk 100 times', icon: '📯', requirement: 100, category: 'social' as const },
  { id: 'survivor', name: 'Survivor', description: 'Finish with less than 20% health', icon: '💪', requirement: 1, category: 'racing' as const },
  { id: 'rich_racer', name: 'Rich Racer', description: 'Earn 10000 coins', icon: '💰', requirement: 10000, category: 'vehicles' as const },
  { id: 'level_10', name: 'Rising Star', description: 'Reach level 10', icon: '⭐', requirement: 10, category: 'racing' as const },
  { id: 'level_25', name: 'Pro Driver', description: 'Reach level 25', icon: '🌟', requirement: 25, category: 'racing' as const },
  { id: 'auto_master', name: 'Auto Raja', description: 'Win with Auto Rickshaw', icon: '🛺', requirement: 1, category: 'vehicles' as const },
  { id: 'truck_driver', name: 'Truck Driver', description: 'Win with Lorry', icon: '🚛', requirement: 1, category: 'vehicles' as const },
  { id: 'formula_one', name: 'Formula One', description: 'Win with Formula Car', icon: '🏎️', requirement: 1, category: 'vehicles' as const },
];

export const HEALTH_DAMAGE: Record<string, number> = {
  small: 4,
  medium: 12,
  large: 23,
  heavy: 22,
};

export const COIN_REWARDS = {
  base: 100,
  first: 500,
  second: 300,
  third: 200,
  cleanBonus: 150,
  finePenalty: 50,
};

export const XP_PER_RACE = 50;
export const XP_PER_WIN = 100;
