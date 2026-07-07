export type LobbyStatus = 'waiting' | 'countdown' | 'racing' | 'finished';
export type MaxPlayers = 2 | 4 | 8 | 16;
export type VehicleCategory = 'two_wheeler' | 'car' | 'commercial' | 'special';
export type RoadType = 'highway' | 'city' | 'hill' | 'village' | 'beach' | 'circuit';
export type WeatherType = 'clear' | 'rain' | 'fog' | 'thunder' | 'wind';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night' | 'sunrise' | 'sunset';
export type TrafficSignalState = 'red' | 'yellow' | 'green';
export type CollisionSeverity = 'small' | 'medium' | 'large' | 'heavy';
export type CameraMode = 'firstPerson' | 'thirdPerson' | 'topView' | 'freeCamera' | 'cinematic';
export type SceneryType =
  | 'building' | 'apartment' | 'tea_shop' | 'petrol_pump' | 'bus_stop'
  | 'hotel' | 'toll_gate' | 'flyover' | 'metro_pillar' | 'railway_crossing'
  | 'vendor' | 'temple' | 'mosque' | 'church' | 'school' | 'college'
  | 'mall' | 'house' | 'water_tank' | 'mobile_tower' | 'electric_pole'
  | 'police_booth' | 'tree' | 'cow' | 'dog' | 'goat' | 'pedestrian';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface VehicleStats {
  maxSpeed: number;
  acceleration: number;
  handling: number;
  weight: number;
  brakePower: number;
  health: number;
}

export interface VehicleConfig {
  id: string;
  name: string;
  category: VehicleCategory;
  stats: VehicleStats;
  modelKey: string;
  sounds: {
    engine: string;
    horn: string;
    brake: string;
    collision: string;
    skid: string;
  };
  unlockCost: number;
  description: string;
}

export interface SignConfig {
  text: { hindi: string; english: string; kannada?: string; telugu?: string };
  position: Vector3;
  rotation: number;
}

export interface ScenerySpawn {
  type: SceneryType;
  position: Vector3;
  rotation: number;
  scale: number;
}

export interface MapConfig {
  id: string;
  name: string;
  description: string;
  distance: number;
  checkpoints: Vector3[];
  scenery: ScenerySpawn[];
  roadType: RoadType;
  signs: SignConfig[];
  trafficDensity: number;
  weatherPool: WeatherType[];
  defaultTimeOfDay: TimeOfDay;
  isCircuit: boolean;
  laps: number;
}

export interface PlayerProfile {
  id: string;
  username: string;
  avatar: string;
  isGuest: boolean;
  email?: string;
  stats: PlayerStats;
  coins: number;
  xp: number;
  level: number;
  unlockedVehicles: string[];
  unlockedColors: string[];
  unlockedHorns: string[];
  unlockedSkins: string[];
  favoriteVehicle: string;
  achievements: string[];
}

export interface PlayerStats {
  wins: number;
  losses: number;
  totalDistance: number;
  totalRaces: number;
  highestSpeed: number;
  cleanRaces: number;
}

export interface LobbyPlayer {
  id: string;
  socketId: string;
  username: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  vehicleId: string;
  vehicleColor: string;
  position: number;
}

export interface LobbySettings {
  maxPlayers: MaxPlayers;
  mapId: string;
  policeMode: boolean;
  allowBots: boolean;
  isPrivate: boolean;
}

export interface Lobby {
  gamingId: string;
  hostId: string;
  status: LobbyStatus;
  settings: LobbySettings;
  players: LobbyPlayer[];
  chat: ChatMessage[];
  createdAt: number;
  countdownValue?: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  username: string;
  message: string;
  timestamp: number;
}

export interface RacePlayerState {
  playerId: string;
  username: string;
  vehicleId: string;
  vehicleColor: string;
  position: Vector3;
  rotation: number;
  velocity: Vector3;
  health: number;
  checkpointIndex: number;
  distanceTraveled: number;
  rank: number;
  finished: boolean;
  finishTime?: number;
  isRespawning: boolean;
  nitroRemaining: number;
}

export interface RaceState {
  lobbyId: string;
  mapId: string;
  status: LobbyStatus;
  players: RacePlayerState[];
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  startedAt?: number;
  seed: number;
  trafficSignalState: TrafficSignalState;
  trafficSignalTimer: number;
}

export interface PositionUpdatePayload {
  playerId: string;
  position: Vector3;
  rotation: number;
  velocity: Vector3;
  timestamp: number;
}

export interface CollisionPayload {
  playerId: string;
  severity: CollisionSeverity;
  position: Vector3;
  targetPlayerId?: string;
}

export interface LeaderboardEntry {
  playerId: string;
  username: string;
  wins: number;
  totalDistance: number;
  highestSpeed: number;
  score: number;
  submittedAt: number;
}

export interface RaceResult {
  playerId: string;
  username: string;
  rank: number;
  finishTime: number;
  distance: number;
  coinsEarned: number;
  xpEarned: number;
  maxSpeed: number;
  collisions: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  category: 'racing' | 'distance' | 'vehicles' | 'social';
}

export interface GameSettings {
  graphics: {
    quality: 'low' | 'medium' | 'high' | 'ultra';
    shadows: boolean;
    bloom: boolean;
    motionBlur: boolean;
    drawDistance: number;
    fpsLimit: number;
  };
  audio: {
    master: number;
    engine: number;
    ambient: number;
    ui: number;
    music: number;
  };
  controls: {
    accelerate: string;
    brake: string;
    steerLeft: string;
    steerRight: string;
    handbrake: string;
    horn: string;
    nitro: string;
    camera: string;
    pause: string;
  };
}
