import {
  Lobby, LobbyPlayer, LobbySettings, MaxPlayers, ChatMessage,
  DEFAULT_MAP_ID, DEFAULT_VEHICLE_ID, VEHICLE_COLORS,
} from '@indian-racing/shared';
import { store } from './memoryStore';
import { generateGamingId, generatePlayerId, generateChatId } from '../utils/idGenerator';

export class LobbyService {
  createLobby(
    hostId: string,
    hostUsername: string,
    hostAvatar: string,
    maxPlayers: MaxPlayers,
    socketId: string,
    mapId: string = DEFAULT_MAP_ID,
  ): Lobby {
    let gamingId = generateGamingId();
    while (store.isGamingIdUsed(gamingId)) {
      gamingId = generateGamingId();
    }

    const host: LobbyPlayer = {
      id: hostId,
      socketId,
      username: hostUsername,
      avatar: hostAvatar,
      isHost: true,
      isReady: false,
      vehicleId: DEFAULT_VEHICLE_ID,
      vehicleColor: VEHICLE_COLORS[0],
      position: 0,
    };

    const settings: LobbySettings = {
      maxPlayers,
      mapId,
      policeMode: false,
      allowBots: false,
      isPrivate: false,
    };

    const lobby: Lobby = {
      gamingId,
      hostId,
      status: 'waiting',
      settings,
      players: [host],
      chat: [],
      createdAt: Date.now(),
    };

    store.setLobby(gamingId, lobby);
    return lobby;
  }

  joinLobby(
    gamingId: string,
    playerId: string,
    username: string,
    avatar: string,
    socketId: string,
  ): { lobby: Lobby } | { error: string } {
    const lobby = store.getLobby(gamingId);
    if (!lobby) return { error: 'Lobby not found' };
    if (lobby.status !== 'waiting') return { error: 'Race already in progress' };
    if (lobby.players.length >= lobby.settings.maxPlayers) return { error: 'Lobby is full' };

    const existing = lobby.players.find((p) => p.id === playerId);
    if (existing) {
      existing.socketId = socketId;
      store.setLobby(gamingId, lobby);
      return { lobby };
    }

    const player: LobbyPlayer = {
      id: playerId,
      socketId,
      username,
      avatar,
      isHost: false,
      isReady: false,
      vehicleId: DEFAULT_VEHICLE_ID,
      vehicleColor: VEHICLE_COLORS[lobby.players.length % VEHICLE_COLORS.length],
      position: 0,
    };

    lobby.players.push(player);
    store.setLobby(gamingId, lobby);
    return { lobby };
  }

  leaveLobby(gamingId: string, playerId: string): Lobby | null {
    const lobby = store.getLobby(gamingId);
    if (!lobby) return null;

    lobby.players = lobby.players.filter((p) => p.id !== playerId);

    if (lobby.players.length === 0) {
      store.deleteLobby(gamingId);
      return null;
    }

    if (lobby.hostId === playerId) {
      lobby.hostId = lobby.players[0].id;
      lobby.players[0].isHost = true;
    }

    lobby.players.forEach((p) => { p.isReady = false; });
    lobby.status = 'waiting';
    store.setLobby(gamingId, lobby);
    return lobby;
  }

  addChatMessage(gamingId: string, playerId: string, username: string, message: string): ChatMessage | null {
    const lobby = store.getLobby(gamingId);
    if (!lobby) return null;

    const chat: ChatMessage = {
      id: generateChatId(),
      playerId,
      username,
      message: message.slice(0, 200),
      timestamp: Date.now(),
    };
    lobby.chat.push(chat);
    if (lobby.chat.length > 100) lobby.chat = lobby.chat.slice(-100);
    store.setLobby(gamingId, lobby);
    return chat;
  }

  selectVehicle(gamingId: string, playerId: string, vehicleId: string): Lobby | null {
    const lobby = store.getLobby(gamingId);
    if (!lobby) return null;
    const player = lobby.players.find((p) => p.id === playerId);
    if (!player) return null;
    player.vehicleId = vehicleId;
    player.isReady = false;
    store.setLobby(gamingId, lobby);
    return lobby;
  }

  selectColor(gamingId: string, playerId: string, color: string): Lobby | null {
    const lobby = store.getLobby(gamingId);
    if (!lobby) return null;
    const player = lobby.players.find((p) => p.id === playerId);
    if (!player) return null;
    player.vehicleColor = color;
    store.setLobby(gamingId, lobby);
    return lobby;
  }

  selectMap(gamingId: string, playerId: string, mapId: string): Lobby | null {
    const lobby = store.getLobby(gamingId);
    if (!lobby) return null;
    if (lobby.hostId !== playerId) return null;
    lobby.settings.mapId = mapId;
    lobby.players.forEach((p) => { p.isReady = false; });
    store.setLobby(gamingId, lobby);
    return lobby;
  }

  setReady(gamingId: string, playerId: string, isReady: boolean): Lobby | null {
    const lobby = store.getLobby(gamingId);
    if (!lobby) return null;
    const player = lobby.players.find((p) => p.id === playerId);
    if (!player) return null;
    player.isReady = isReady;
    store.setLobby(gamingId, lobby);
    return lobby;
  }

  canStartRace(gamingId: string): boolean {
    const lobby = store.getLobby(gamingId);
    if (!lobby || lobby.players.length < 2) return false;
    return lobby.players.every((p) => p.isReady);
  }

  setLobbyStatus(gamingId: string, status: Lobby['status']): void {
    const lobby = store.getLobby(gamingId);
    if (lobby) {
      lobby.status = status;
      store.setLobby(gamingId, lobby);
    }
  }

  getLobby(gamingId: string): Lobby | undefined {
    return store.getLobby(gamingId);
  }

  addBot(gamingId: string): Lobby | null {
    const lobby = store.getLobby(gamingId);
    if (!lobby || !lobby.settings.allowBots) return null;
    if (lobby.players.length >= lobby.settings.maxPlayers) return null;

    const botNames = ['Raju', 'Priya', 'Arjun', 'Kavya', 'Vikram', 'Ananya', 'Rohan', 'Meera'];
    const bot: LobbyPlayer = {
      id: generatePlayerId(),
      socketId: 'bot',
      username: `AI_${botNames[lobby.players.length % botNames.length]}`,
      avatar: '🤖',
      isHost: false,
      isReady: true,
      vehicleId: DEFAULT_VEHICLE_ID,
      vehicleColor: VEHICLE_COLORS[lobby.players.length % VEHICLE_COLORS.length],
      position: 0,
    };
    lobby.players.push(bot);
    store.setLobby(gamingId, lobby);
    return lobby;
  }
}

export const lobbyService = new LobbyService();
