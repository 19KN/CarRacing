import { Server, Socket } from 'socket.io';
import {
  SocketEvents, Lobby, RaceState, COIN_REWARDS,
} from '@indian-racing/shared';
import { lobbyService } from '../services/lobbyService';
import { raceService } from '../services/raceService';
import { verifyToken } from '../services/authService';
import { config } from '../config';

interface SocketData {
  playerId: string;
  username: string;
  gamingId?: string;
}

const countdownTimers = new Map<string, NodeJS.Timeout>();
const raceTickIntervals = new Map<string, NodeJS.Timeout>();

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on(SocketEvents.JOIN_LOBBY, (data: { gamingId: string; token: string; avatar?: string }) => {
      const auth = verifyToken(data.token);
      if (!auth) {
        socket.emit(SocketEvents.ERROR, { message: 'Invalid token' });
        return;
      }

      const socketData: SocketData = {
        playerId: auth.playerId,
        username: auth.username,
        gamingId: data.gamingId,
      };
      socket.data = socketData;

      const result = lobbyService.joinLobby(
        data.gamingId,
        auth.playerId,
        auth.username,
        data.avatar || '🏎️',
        socket.id,
      );

      if ('error' in result) {
        socket.emit(SocketEvents.ERROR, { message: result.error });
        return;
      }

      socket.join(data.gamingId);
      io.to(data.gamingId).emit(SocketEvents.LOBBY_UPDATE, { lobby: result.lobby });
      socket.to(data.gamingId).emit(SocketEvents.PLAYER_JOINED, {
        player: result.lobby.players.find((p) => p.id === auth.playerId),
      });
    });

    socket.on(SocketEvents.LEAVE_LOBBY, () => {
      handleLeave(socket, io);
    });

    socket.on(SocketEvents.CHAT, (data: { message: string }) => {
      const { gamingId, playerId, username } = socket.data as SocketData;
      if (!gamingId) return;
      const chat = lobbyService.addChatMessage(gamingId, playerId, username, data.message);
      if (chat) {
        io.to(gamingId).emit(SocketEvents.CHAT, { chat });
      }
    });

    socket.on(SocketEvents.SELECT_VEHICLE, (data: { vehicleId: string }) => {
      const { gamingId, playerId } = socket.data as SocketData;
      if (!gamingId) return;
      const lobby = lobbyService.selectVehicle(gamingId, playerId, data.vehicleId);
      if (lobby) io.to(gamingId).emit(SocketEvents.LOBBY_UPDATE, { lobby });
    });

    socket.on(SocketEvents.SELECT_COLOR, (data: { color: string }) => {
      const { gamingId, playerId } = socket.data as SocketData;
      if (!gamingId) return;
      const lobby = lobbyService.selectColor(gamingId, playerId, data.color);
      if (lobby) io.to(gamingId).emit(SocketEvents.LOBBY_UPDATE, { lobby });
    });

    socket.on(SocketEvents.SELECT_MAP, (data: { mapId: string }) => {
      const { gamingId, playerId } = socket.data as SocketData;
      if (!gamingId) return;
      const lobby = lobbyService.selectMap(gamingId, playerId, data.mapId);
      if (lobby) io.to(gamingId).emit(SocketEvents.LOBBY_UPDATE, { lobby });
    });

    socket.on(SocketEvents.SET_READY, (data: { isReady: boolean }) => {
      const { gamingId, playerId } = socket.data as SocketData;
      if (!gamingId) return;
      const lobby = lobbyService.setReady(gamingId, playerId, data.isReady);
      if (!lobby) return;
      io.to(gamingId).emit(SocketEvents.LOBBY_UPDATE, { lobby });

      if (lobbyService.canStartRace(gamingId)) {
        startCountdown(io, gamingId, lobby);
      }
    });

    socket.on(SocketEvents.POSITION_UPDATE, (data) => {
      const { gamingId } = socket.data as SocketData;
      if (!gamingId) return;
      const race = raceService.updatePosition(gamingId, data);
      if (race) {
        socket.to(gamingId).emit(SocketEvents.POSITION_SYNC, {
          players: race.players.map((p) => ({
            playerId: p.playerId,
            position: p.position,
            rotation: p.rotation,
            velocity: p.velocity,
            rank: p.rank,
          })),
        });
        io.to(gamingId).emit(SocketEvents.POSITION_RANK, {
          rankings: race.players.map((p) => ({
            playerId: p.playerId,
            username: p.username,
            rank: p.rank,
            distanceTraveled: p.distanceTraveled,
            finished: p.finished,
          })),
        });
      }
    });

    socket.on(SocketEvents.COLLISION, (data) => {
      const { gamingId } = socket.data as SocketData;
      if (!gamingId) return;
      const race = raceService.handleCollision(gamingId, data);
      if (race) {
        const player = race.players.find((p) => p.playerId === data.playerId);
        if (player) {
          io.to(gamingId).emit(SocketEvents.HEALTH_UPDATE, {
            playerId: data.playerId,
            health: player.health,
            isRespawning: player.isRespawning,
          });
        }
      }
    });

    socket.on(SocketEvents.CHECKPOINT, (data: { checkpointIndex: number }) => {
      const { gamingId, playerId } = socket.data as SocketData;
      if (!gamingId) return;
      const race = raceService.handleCheckpoint(gamingId, playerId, data.checkpointIndex);
      if (race?.status === 'finished') {
        const results = raceService.calculateResults(gamingId);
        io.to(gamingId).emit(SocketEvents.RACE_FINISH, { results });
        cleanupRace(gamingId);
      }
    });

    socket.on(SocketEvents.RACE_FINISH, () => {
      const { gamingId, playerId } = socket.data as SocketData;
      if (!gamingId) return;
      const race = raceService.getRace(gamingId);
      if (!race) return;
      const player = race.players.find((p) => p.playerId === playerId);
      if (player && !player.finished) {
        player.finished = true;
        player.finishTime = Date.now() - (race.startedAt || Date.now());
      }
      if (race.players.every((p) => p.finished)) {
        race.status = 'finished';
        const results = raceService.calculateResults(gamingId);
        io.to(gamingId).emit(SocketEvents.RACE_FINISH, { results });
        cleanupRace(gamingId);
      }
    });

    socket.on(SocketEvents.HORN, () => {
      const { gamingId, playerId } = socket.data as SocketData;
      if (!gamingId) return;
      socket.to(gamingId).emit(SocketEvents.HORN, { playerId });
    });

    socket.on(SocketEvents.NITRO, () => {
      const { gamingId, playerId } = socket.data as SocketData;
      if (!gamingId) return;
      const race = raceService.getRace(gamingId);
      if (!race) return;
      const player = race.players.find((p) => p.playerId === playerId);
      if (player && player.nitroRemaining > 0) {
        player.nitroRemaining--;
        socket.to(gamingId).emit(SocketEvents.NITRO, { playerId });
      }
    });

    socket.on(SocketEvents.EMOTE, (data: { emote: string }) => {
      const { gamingId, playerId } = socket.data as SocketData;
      if (!gamingId) return;
      io.to(gamingId).emit(SocketEvents.EMOTE, { playerId, emote: data.emote });
    });

    socket.on(SocketEvents.RECONNECT, (data: { gamingId: string; token: string }) => {
      const auth = verifyToken(data.token);
      if (!auth) {
        socket.emit(SocketEvents.ERROR, { message: 'Invalid token' });
        return;
      }
      const lobby = lobbyService.getLobby(data.gamingId);
      const race = raceService.getRace(data.gamingId);
      if (lobby) {
        socket.data = { playerId: auth.playerId, username: auth.username, gamingId: data.gamingId };
        socket.join(data.gamingId);
        socket.emit(SocketEvents.LOBBY_UPDATE, { lobby });
        if (race) {
          socket.emit(SocketEvents.RACE_START, { race });
        }
      }
    });

    socket.on('disconnect', () => {
      handleLeave(socket, io);
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

function startCountdown(io: Server, gamingId: string, lobby: Lobby): void {
  if (countdownTimers.has(gamingId)) return;

  lobbyService.setLobbyStatus(gamingId, 'countdown');
  let count = config.countdownSeconds;

  const tick = () => {
    io.to(gamingId).emit(SocketEvents.COUNTDOWN, { value: count });
    if (count <= 0) {
      clearInterval(countdownTimers.get(gamingId)!);
      countdownTimers.delete(gamingId);
      startRace(io, gamingId, lobby);
      return;
    }
    count--;
  };

  tick();
  const timer = setInterval(tick, 1000);
  countdownTimers.set(gamingId, timer);
}

function startRace(io: Server, gamingId: string, lobby: Lobby): void {
  lobbyService.setLobbyStatus(gamingId, 'racing');
  const currentLobby = lobbyService.getLobby(gamingId) || lobby;
  const race = raceService.createRace(currentLobby);

  io.to(gamingId).emit(SocketEvents.RACE_START, { race });
  io.to(gamingId).emit(SocketEvents.WEATHER_SYNC, {
    weather: race.weather,
    timeOfDay: race.timeOfDay,
  });

  const tickInterval = setInterval(() => {
    raceService.updateTrafficSignal(gamingId);
    const r = raceService.getRace(gamingId);
    if (r) {
      io.to(gamingId).emit(SocketEvents.TRAFFIC_SYNC, {
        signalState: r.trafficSignalState,
        timer: r.trafficSignalTimer,
      });
    }
  }, 1000 / config.serverTickRate);

  raceTickIntervals.set(gamingId, tickInterval);
}

function cleanupRace(gamingId: string): void {
  const timer = raceTickIntervals.get(gamingId);
  if (timer) {
    clearInterval(timer);
    raceTickIntervals.delete(gamingId);
  }
  lobbyService.setLobbyStatus(gamingId, 'finished');
}

function handleLeave(socket: Socket, io: Server): void {
  const { gamingId, playerId } = socket.data as SocketData;
  if (!gamingId || !playerId) return;

  const lobby = lobbyService.leaveLobby(gamingId, playerId);
  socket.leave(gamingId);

  if (lobby) {
    io.to(gamingId).emit(SocketEvents.LOBBY_UPDATE, { lobby });
    io.to(gamingId).emit(SocketEvents.PLAYER_LEFT, { playerId });
  }
}
