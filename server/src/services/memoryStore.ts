import { Lobby, RaceState, LeaderboardEntry } from '@indian-racing/shared';

class MemoryStore {
  private lobbies = new Map<string, Lobby>();
  private gamingIdIndex = new Map<string, string>();
  private races = new Map<string, RaceState>();
  private leaderboard: LeaderboardEntry[] = [];
  private usedGamingIds = new Set<string>();

  // Lobby operations
  setLobby(gamingId: string, lobby: Lobby): void {
    this.lobbies.set(gamingId, lobby);
    this.gamingIdIndex.set(gamingId, gamingId);
    this.usedGamingIds.add(gamingId);
  }

  getLobby(gamingId: string): Lobby | undefined {
    return this.lobbies.get(gamingId);
  }

  deleteLobby(gamingId: string): void {
    this.lobbies.delete(gamingId);
    this.races.delete(gamingId);
  }

  getAllLobbies(): Lobby[] {
    return Array.from(this.lobbies.values());
  }

  isGamingIdUsed(gamingId: string): boolean {
    return this.usedGamingIds.has(gamingId);
  }

  // Race operations
  setRace(gamingId: string, race: RaceState): void {
    this.races.set(gamingId, race);
  }

  getRace(gamingId: string): RaceState | undefined {
    return this.races.get(gamingId);
  }

  deleteRace(gamingId: string): void {
    this.races.delete(gamingId);
  }

  // Leaderboard operations
  addLeaderboardEntry(entry: LeaderboardEntry): void {
    this.leaderboard.push(entry);
    this.leaderboard.sort((a, b) => b.score - a.score);
    if (this.leaderboard.length > 100) {
      this.leaderboard = this.leaderboard.slice(0, 100);
    }
  }

  getLeaderboard(limit = 50): LeaderboardEntry[] {
    return this.leaderboard.slice(0, limit);
  }
}

export const store = new MemoryStore();
