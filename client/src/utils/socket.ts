import { io, Socket } from 'socket.io-client';
import { SocketEvents } from '@indian-racing/shared';
import { getSocketUrl } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) socket.disconnect();
}

export function joinLobbySocket(gamingId: string, token: string, avatar: string): void {
  const s = connectSocket();
  s.emit(SocketEvents.JOIN_LOBBY, { gamingId, token, avatar });
}

export function leaveLobbySocket(): void {
  const s = getSocket();
  if (s?.connected) s.emit(SocketEvents.LEAVE_LOBBY);
}

export { SocketEvents };
