import { io, Socket } from 'socket.io-client';
import { SocketEvents } from '@indian-racing/shared';
import { getSocketUrl } from './api';

let socket: Socket | null = null;
let pendingJoin: { gamingId: string; token: string; avatar: string } | null = null;
let listenersInitialized = false;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

function emitJoinLobby(): void {
  if (!pendingJoin || !socket?.connected) return;
  socket.emit(SocketEvents.JOIN_LOBBY, pendingJoin);
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) socket.disconnect();
  pendingJoin = null;
}

export function joinLobbySocket(gamingId: string, token: string, avatar: string): void {
  pendingJoin = { gamingId, token, avatar };
  const s = connectSocket();
  if (s.connected) {
    emitJoinLobby();
  }
}

export function leaveLobbySocket(): void {
  pendingJoin = null;
  const s = getSocket();
  if (s?.connected) s.emit(SocketEvents.LEAVE_LOBBY);
}

type RaceSyncHandlers = {
  onLobbyUpdate: (lobby: import('@indian-racing/shared').Lobby) => void;
  onCountdown: (value: number) => void;
  onRaceStart: (race: import('@indian-racing/shared').RaceState) => void;
  onWeatherSync: (weather: string, timeOfDay: string) => void;
  onError: (message: string) => void;
};

export function initSocketListeners(handlers: RaceSyncHandlers): void {
  const s = connectSocket();

  if (!listenersInitialized) {
    s.on('connect', () => {
      emitJoinLobby();
    });
    listenersInitialized = true;
  }

  s.off(SocketEvents.LOBBY_UPDATE);
  s.off(SocketEvents.COUNTDOWN);
  s.off(SocketEvents.RACE_START);
  s.off(SocketEvents.WEATHER_SYNC);
  s.off(SocketEvents.ERROR);

  s.on(SocketEvents.LOBBY_UPDATE, (data: { lobby: import('@indian-racing/shared').Lobby }) => {
    handlers.onLobbyUpdate(data.lobby);
  });
  s.on(SocketEvents.COUNTDOWN, (data: { value: number }) => {
    handlers.onCountdown(data.value);
  });
  s.on(SocketEvents.RACE_START, (data: { race: import('@indian-racing/shared').RaceState }) => {
    handlers.onRaceStart(data.race);
  });
  s.on(SocketEvents.WEATHER_SYNC, (data: { weather: string; timeOfDay: string }) => {
    handlers.onWeatherSync(data.weather, data.timeOfDay);
  });
  s.on(SocketEvents.ERROR, (data: { message: string }) => {
    handlers.onError(data.message);
  });
}

export { SocketEvents };
