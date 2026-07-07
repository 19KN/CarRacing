import {
  RaceState, RacePlayerState, WeatherType, TimeOfDay, TrafficSignalState,
  PositionUpdatePayload, CollisionPayload, CollisionSeverity,
  HEALTH_DAMAGE, getMapById, COIN_REWARDS, XP_PER_RACE, XP_PER_WIN,
  LeaderboardEntry, RaceResult, getRaceSpawnPosition,
} from '@indian-racing/shared';
import { Lobby, LobbyPlayer } from '@indian-racing/shared';
import { store } from './memoryStore';
import { config } from '../config';

export class RaceService {
  createRace(lobby: Lobby): RaceState {
    const map = getMapById(lobby.settings.mapId);
    const weatherPool = map?.weatherPool || ['clear'];
    const weather = weatherPool[Math.floor(Math.random() * weatherPool.length)];
    const timeOptions: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'night', 'sunrise', 'sunset'];
    const timeOfDay = map?.defaultTimeOfDay || timeOptions[Math.floor(Math.random() * timeOptions.length)];

    const race: RaceState = {
      lobbyId: lobby.gamingId,
      mapId: lobby.settings.mapId,
      status: 'racing',
      players: lobby.players.map((p, i) => this.createPlayerState(p, i, lobby.players.length)),
      weather,
      timeOfDay,
      startedAt: Date.now(),
      seed: Math.floor(Math.random() * 1000000),
      trafficSignalState: 'green',
      trafficSignalTimer: 0,
    };

    store.setRace(lobby.gamingId, race);
    return race;
  }

  private createPlayerState(player: LobbyPlayer, index: number, totalPlayers: number): RacePlayerState {
    const spawn = getRaceSpawnPosition(index, totalPlayers);
    return {
      playerId: player.id,
      username: player.username,
      vehicleId: player.vehicleId,
      vehicleColor: player.vehicleColor,
      position: { x: spawn.x, y: spawn.y, z: spawn.z },
      rotation: spawn.rotation,
      velocity: { x: 0, y: 0, z: 0 },
      health: 100,
      checkpointIndex: 0,
      distanceTraveled: 0,
      rank: index + 1,
      finished: false,
      isRespawning: false,
      nitroRemaining: 3,
    };
  }

  updatePosition(gamingId: string, update: PositionUpdatePayload): RaceState | null {
    const race = store.getRace(gamingId);
    if (!race || race.status !== 'racing') return null;

    const player = race.players.find((p) => p.playerId === update.playerId);
    if (!player || player.finished || player.isRespawning) return null;

    player.position = update.position;
    player.rotation = update.rotation;
    player.velocity = update.velocity;

    const speed = Math.sqrt(
      update.velocity.x ** 2 + update.velocity.y ** 2 + update.velocity.z ** 2,
    );
    player.distanceTraveled += speed * (1 / config.serverTickRate);

    this.updateRanks(race);
    store.setRace(gamingId, race);
    return race;
  }

  handleCollision(gamingId: string, payload: CollisionPayload): RaceState | null {
    const race = store.getRace(gamingId);
    if (!race) return null;

    const player = race.players.find((p) => p.playerId === payload.playerId);
    if (!player) return null;

    const damage = HEALTH_DAMAGE[payload.severity] || 4;
    player.health = Math.max(0, player.health - damage);

    if (payload.targetPlayerId) {
      const target = race.players.find((p) => p.playerId === payload.targetPlayerId);
      if (target && !target.isRespawning) {
        target.health = Math.max(0, target.health - damage);
        if (target.health <= 0) {
          this.startRespawn(gamingId, target.playerId);
        }
      }
    }

    if (player.health <= 0) {
      this.startRespawn(gamingId, payload.playerId);
    }

    store.setRace(gamingId, race);
    return race;
  }

  private startRespawn(gamingId: string, playerId: string): void {
    const race = store.getRace(gamingId);
    if (!race) return;
    const player = race.players.find((p) => p.playerId === playerId);
    if (!player) return;

    player.isRespawning = true;
    store.setRace(gamingId, race);

    setTimeout(() => {
      const r = store.getRace(gamingId);
      if (!r) return;
      const p = r.players.find((pl) => pl.playerId === playerId);
      if (p) {
        p.health = 50;
        p.isRespawning = false;
        const map = getMapById(r.mapId);
        if (map && map.checkpoints[p.checkpointIndex]) {
          p.position = { ...map.checkpoints[p.checkpointIndex], y: 0.5 };
        }
        store.setRace(gamingId, r);
      }
    }, config.respawnDelay);
  }

  handleCheckpoint(gamingId: string, playerId: string, checkpointIndex: number): RaceState | null {
    const race = store.getRace(gamingId);
    if (!race) return null;

    const player = race.players.find((p) => p.playerId === playerId);
    if (!player) return null;

    if (checkpointIndex > player.checkpointIndex) {
      player.checkpointIndex = checkpointIndex;
    }

    const map = getMapById(race.mapId);
    if (map && checkpointIndex >= map.checkpoints.length - 1 && !player.finished) {
      player.finished = true;
      player.finishTime = Date.now() - (race.startedAt || Date.now());
      this.updateRanks(race);

      if (race.players.every((p) => p.finished || p.playerId.startsWith('player_') && p.username.startsWith('AI_'))) {
        race.status = 'finished';
      }
    }

    store.setRace(gamingId, race);
    return race;
  }

  private updateRanks(race: RaceState): void {
    const sorted = [...race.players].sort((a, b) => {
      if (a.finished && b.finished) return (a.finishTime || 0) - (b.finishTime || 0);
      if (a.finished) return -1;
      if (b.finished) return 1;
      if (a.checkpointIndex !== b.checkpointIndex) return b.checkpointIndex - a.checkpointIndex;
      return b.distanceTraveled - a.distanceTraveled;
    });
    sorted.forEach((p, i) => { p.rank = i + 1; });
  }

  updateTrafficSignal(gamingId: string): void {
    const race = store.getRace(gamingId);
    if (!race) return;

    race.trafficSignalTimer += 1 / config.serverTickRate;
    const cycle = 15;
    const phase = race.trafficSignalTimer % cycle;

    if (phase < 6) race.trafficSignalState = 'green';
    else if (phase < 8) race.trafficSignalState = 'yellow';
    else race.trafficSignalState = 'red';

    store.setRace(gamingId, race);
  }

  calculateResults(gamingId: string): RaceResult[] {
    const race = store.getRace(gamingId);
    if (!race) return [];

    return race.players.map((p) => {
      const speed = Math.sqrt(p.velocity.x ** 2 + p.velocity.z ** 2) * 3.6;
      let coins = COIN_REWARDS.base;
      if (p.rank === 1) coins += COIN_REWARDS.first;
      else if (p.rank === 2) coins += COIN_REWARDS.second;
      else if (p.rank === 3) coins += COIN_REWARDS.third;
      if (p.health > 80) coins += COIN_REWARDS.cleanBonus;

      let xp = XP_PER_RACE;
      if (p.rank === 1) xp += XP_PER_WIN;

      return {
        playerId: p.playerId,
        username: p.username,
        rank: p.rank,
        finishTime: p.finishTime || 0,
        distance: p.distanceTraveled,
        coinsEarned: coins,
        xpEarned: xp,
        maxSpeed: speed,
        collisions: 100 - p.health,
      };
    });
  }

  submitToLeaderboard(result: RaceResult): void {
    if (result.rank !== 1) return;
    const entry: LeaderboardEntry = {
      playerId: result.playerId,
      username: result.username,
      wins: 1,
      totalDistance: result.distance,
      highestSpeed: result.maxSpeed,
      score: result.coinsEarned + result.xpEarned,
      submittedAt: Date.now(),
    };
    store.addLeaderboardEntry(entry);
  }

  getRace(gamingId: string): RaceState | undefined {
    return store.getRace(gamingId);
  }
}

export const raceService = new RaceService();
