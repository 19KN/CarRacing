import { COIN_REWARDS, XP_PER_RACE, XP_PER_WIN, RaceResult } from '@indian-racing/shared';
import { PlayerProfile } from '@indian-racing/shared';

export function buildSoloRaceResult(
  profile: PlayerProfile,
  opts: {
    finishTimeMs: number;
    distance: number;
    maxSpeed: number;
    health: number;
  },
): RaceResult[] {
  let coins = COIN_REWARDS.base + COIN_REWARDS.first;
  if (opts.health > 80) coins += COIN_REWARDS.cleanBonus;
  const xp = XP_PER_RACE + XP_PER_WIN;

  return [{
    playerId: profile.id,
    username: profile.username || 'Player',
    rank: 1,
    finishTime: opts.finishTimeMs,
    distance: opts.distance,
    coinsEarned: coins,
    xpEarned: xp,
    maxSpeed: opts.maxSpeed,
    collisions: 100 - opts.health,
  }];
}

export function getFinishLineZ(raceDistance: number, startZ = 20): number {
  return startZ - raceDistance;
}
