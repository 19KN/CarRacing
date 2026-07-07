import {
  PlayerProfile, GameSettings, Lobby, RaceState, ChatMessage,
  RaceResult, LeaderboardEntry, VehicleConfig, MapConfig,
} from '@indian-racing/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_VEHICLE_ID } from '@indian-racing/shared';

const defaultProfile: PlayerProfile = {
  id: '',
  username: '',
  avatar: '🏎️',
  isGuest: true,
  stats: { wins: 0, losses: 0, totalDistance: 0, totalRaces: 0, highestSpeed: 0, cleanRaces: 0 },
  coins: 500,
  xp: 0,
  level: 1,
  unlockedVehicles: ['bicycle', 'scooter', 'hatchback'],
  unlockedColors: ['#FF9933', '#FFFFFF', '#138808'],
  unlockedHorns: ['default'],
  unlockedSkins: ['default'],
  favoriteVehicle: DEFAULT_VEHICLE_ID,
  achievements: [],
};

const defaultSettings: GameSettings = {
  graphics: { quality: 'high', shadows: true, bloom: true, motionBlur: false, drawDistance: 500, fpsLimit: 60 },
  audio: { master: 0.8, engine: 0.7, ambient: 0.5, ui: 0.6, music: 0.4 },
  controls: {
    accelerate: 'KeyW', brake: 'KeyS', steerLeft: 'KeyA', steerRight: 'KeyD',
    handbrake: 'Space', horn: 'KeyH', nitro: 'KeyN', camera: 'KeyC', pause: 'Escape',
  },
};

interface AuthState {
  token: string | null;
  profile: PlayerProfile;
  isAuthenticated: boolean;
  setAuth: (token: string, profile: Partial<PlayerProfile>) => void;
  updateProfile: (updates: Partial<PlayerProfile>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      profile: defaultProfile,
      isAuthenticated: false,
      setAuth: (token, profile) => set({
        token,
        profile: { ...defaultProfile, ...profile, id: profile.id || defaultProfile.id },
        isAuthenticated: true,
      }),
      updateProfile: (updates) => set({
        profile: { ...get().profile, ...updates },
      }),
      logout: () => set({ token: null, profile: defaultProfile, isAuthenticated: false }),
    }),
    { name: 'indian-racing-auth' },
  ),
);

interface SettingsState {
  settings: GameSettings;
  updateGraphics: (g: Partial<GameSettings['graphics']>) => void;
  updateAudio: (a: Partial<GameSettings['audio']>) => void;
  updateControls: (c: Partial<GameSettings['controls']>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      updateGraphics: (g) => set({ settings: { ...get().settings, graphics: { ...get().settings.graphics, ...g } } }),
      updateAudio: (a) => set({ settings: { ...get().settings, audio: { ...get().settings.audio, ...a } } }),
      updateControls: (c) => set({ settings: { ...get().settings, controls: { ...get().settings.controls, ...c } } }),
    }),
    { name: 'indian-racing-settings' },
  ),
);

interface LobbyState {
  lobby: Lobby | null;
  gamingId: string;
  chat: ChatMessage[];
  isHost: boolean;
  localPlayerId: string;
  selectedVehicleId: string;
  selectedVehicleColor: string;
  setLobby: (lobby: Lobby | null) => void;
  setGamingId: (id: string) => void;
  addChat: (msg: ChatMessage) => void;
  updateMySelection: (vehicleId?: string, vehicleColor?: string) => void;
  reset: () => void;
}

function resolveLocalPlayerId(lobby: Lobby | null): string {
  const auth = useAuthStore.getState().profile;
  if (!lobby) return auth.id;
  const byId = lobby.players.find((p) => p.id === auth.id);
  if (byId) return byId.id;
  const byName = lobby.players.find((p) => p.username === auth.username);
  return byName?.id ?? auth.id;
}

export const useLobbyStore = create<LobbyState>((set, get) => ({
  lobby: null,
  gamingId: '',
  chat: [],
  isHost: false,
  localPlayerId: '',
  selectedVehicleId: DEFAULT_VEHICLE_ID,
  selectedVehicleColor: '#FF9933',
  setLobby: (lobby) => {
    const localPlayerId = resolveLocalPlayerId(lobby);
    const me = lobby?.players.find((p) => p.id === localPlayerId);
    set({
      lobby,
      chat: lobby?.chat || [],
      isHost: lobby?.players.some((p) => p.isHost && p.id === localPlayerId) || false,
      localPlayerId,
      selectedVehicleId: me?.vehicleId ?? get().selectedVehicleId,
      selectedVehicleColor: me?.vehicleColor ?? get().selectedVehicleColor,
    });
  },
  setGamingId: (id) => set({ gamingId: id }),
  addChat: (msg) => set({ chat: [...get().chat, msg] }),
  updateMySelection: (vehicleId, vehicleColor) => {
    const { lobby, localPlayerId } = get();
    const playerId = localPlayerId || useAuthStore.getState().profile.id;
    const nextVehicleId = vehicleId ?? get().selectedVehicleId;
    const nextColor = vehicleColor ?? get().selectedVehicleColor;
    set({
      selectedVehicleId: nextVehicleId,
      selectedVehicleColor: nextColor,
      lobby: lobby
        ? {
            ...lobby,
            players: lobby.players.map((p) => (
              p.id === playerId
                ? {
                    ...p,
                    vehicleId: vehicleId ?? p.vehicleId,
                    vehicleColor: vehicleColor ?? p.vehicleColor,
                  }
                : p
            )),
          }
        : lobby,
    });
  },
  reset: () => set({
    lobby: null,
    gamingId: '',
    chat: [],
    isHost: false,
    localPlayerId: '',
    selectedVehicleId: DEFAULT_VEHICLE_ID,
    selectedVehicleColor: '#FF9933',
  }),
}));

interface RaceStateStore {
  race: RaceState | null;
  results: RaceResult[] | null;
  rankings: { playerId: string; username: string; rank: number; distanceTraveled: number; finished: boolean }[];
  countdown: number | null;
  isPaused: boolean;
  health: number;
  position: number;
  speed: number;
  distanceRemaining: number;
  isRaceFinished: boolean;
  finishTimeMs: number | null;
  maxRaceSpeed: number;
  weather: string;
  timeOfDay: string;
  remotePlayers: Record<string, { position: { x: number; y: number; z: number }; rotation: number; velocity: { x: number; y: number; z: number } }>;
  setRace: (race: RaceState | null) => void;
  setResults: (results: RaceResult[] | null) => void;
  setRankings: (rankings: RaceStateStore['rankings']) => void;
  setCountdown: (v: number | null) => void;
  setPaused: (p: boolean) => void;
  setHealth: (h: number) => void;
  setPosition: (p: number) => void;
  setSpeed: (s: number) => void;
  setDistanceRemaining: (d: number) => void;
  setRaceFinished: (finishTimeMs: number) => void;
  setMaxRaceSpeed: (speed: number) => void;
  setWeather: (w: string, t: string) => void;
  updateRemotePlayer: (id: string, data: RaceStateStore['remotePlayers'][string]) => void;
  reset: () => void;
}

export const useRaceStore = create<RaceStateStore>((set, get) => ({
  race: null,
  results: null,
  rankings: [],
  countdown: null,
  isPaused: false,
  health: 100,
  position: 1,
  speed: 0,
  distanceRemaining: 0,
  isRaceFinished: false,
  finishTimeMs: null,
  maxRaceSpeed: 0,
  weather: 'clear',
  timeOfDay: 'morning',
  remotePlayers: {},
  setRace: (race) => {
    const localPlayerId = useLobbyStore.getState().localPlayerId;
    const myId = localPlayerId || useAuthStore.getState().profile.id;
    const remotePlayers: RaceStateStore['remotePlayers'] = {};
    if (race) {
      for (const p of race.players) {
        if (p.playerId !== myId) {
          remotePlayers[p.playerId] = {
            position: { ...p.position },
            rotation: p.rotation,
            velocity: { ...p.velocity },
          };
        }
      }
    }
    const myPlayer = race?.players.find((p) => p.playerId === myId);
    const initialRankings = race
      ? race.players
        .map((p) => ({
          playerId: p.playerId,
          username: p.username,
          rank: p.rank,
          distanceTraveled: p.distanceTraveled,
          finished: p.finished,
        }))
        .sort((a, b) => a.rank - b.rank)
      : [];
    set({
      race,
      health: 100,
      isRaceFinished: false,
      finishTimeMs: null,
      maxRaceSpeed: 0,
      remotePlayers,
      rankings: initialRankings,
      position: myPlayer?.rank ?? 1,
    });
  },
  setResults: (results) => set({ results }),
  setRankings: (rankings) => set({ rankings }),
  setCountdown: (countdown) => set({ countdown }),
  setPaused: (isPaused) => set({ isPaused }),
  setHealth: (health) => set({ health }),
  setPosition: (position) => set({ position }),
  setSpeed: (speed) => set({ speed }),
  setDistanceRemaining: (distanceRemaining) => set({ distanceRemaining }),
  setRaceFinished: (finishTimeMs) => set({ isRaceFinished: true, finishTimeMs }),
  setMaxRaceSpeed: (maxRaceSpeed) => set({ maxRaceSpeed }),
  setWeather: (weather, timeOfDay) => set({ weather, timeOfDay }),
  updateRemotePlayer: (id, data) => set({ remotePlayers: { ...get().remotePlayers, [id]: data } }),
  reset: () => set({
    race: null, results: null, rankings: [], countdown: null, isPaused: false,
    health: 100, position: 1, speed: 0, distanceRemaining: 0,
    isRaceFinished: false, finishTimeMs: null, maxRaceSpeed: 0,
    remotePlayers: {},
  }),
}));

interface GameDataState {
  vehicles: VehicleConfig[];
  maps: MapConfig[];
  leaderboard: LeaderboardEntry[];
  setVehicles: (v: VehicleConfig[]) => void;
  setMaps: (m: MapConfig[]) => void;
  setLeaderboard: (l: LeaderboardEntry[]) => void;
}

export const useGameDataStore = create<GameDataState>((set) => ({
  vehicles: [],
  maps: [],
  leaderboard: [],
  setVehicles: (vehicles) => set({ vehicles }),
  setMaps: (maps) => set({ maps }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
}));

interface UIState {
  screen: 'menu' | 'auth' | 'lobby' | 'garage' | 'race' | 'results' | 'settings' | 'profile' | 'leaderboard' | 'loading';
  loadingMessage: string;
  setScreen: (screen: UIState['screen']) => void;
  setLoading: (message: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  screen: 'menu',
  loadingMessage: '',
  setScreen: (screen) => set({ screen }),
  setLoading: (loadingMessage) => set({ loadingMessage, screen: 'loading' }),
}));
