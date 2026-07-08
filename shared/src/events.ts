export const SocketEvents = {
  // Client -> Server
  JOIN_LOBBY: 'joinLobby',
  LEAVE_LOBBY: 'leaveLobby',
  CHAT: 'chat',
  SELECT_VEHICLE: 'selectVehicle',
  SELECT_COLOR: 'selectColor',
  SELECT_MAP: 'selectMap',
  SET_READY: 'setReady',
  START_RACE: 'startRace',
  POSITION_UPDATE: 'positionUpdate',
  COLLISION: 'collision',
  PLAYER_RAM: 'playerRam',
  HORN: 'horn',
  NITRO: 'nitro',
  RECONNECT: 'reconnect',
  CHECKPOINT: 'checkpoint',
  RACE_FINISH: 'raceFinish',
  PLAYER_FINISHED: 'playerFinished',
  EMOTE: 'emote',

  // Server -> Client
  LOBBY_UPDATE: 'lobbyUpdate',
  PLAYER_JOINED: 'playerJoined',
  PLAYER_LEFT: 'playerLeft',
  COUNTDOWN: 'countdown',
  RACE_START: 'raceStart',
  POSITION_SYNC: 'positionSync',
  HEALTH_UPDATE: 'healthUpdate',
  TRAFFIC_SYNC: 'trafficSync',
  WEATHER_SYNC: 'weatherSync',
  POSITION_RANK: 'positionRank',
  PENALTY: 'penalty',
  ERROR: 'error',
} as const;

export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents];
