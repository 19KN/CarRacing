import { XP_PER_RACE, XP_PER_WIN } from '@indian-racing/shared';
import { useAuthStore } from '../stores';

export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function xpForNextLevel(level: number): number {
  return level * level * 100;
}

export function applyRaceRewards(
  rank: number,
  coinsEarned: number,
  xpEarned: number,
  distance: number,
  maxSpeed: number,
  collisions: number,
): void {
  const store = useAuthStore.getState();
  const profile = store.profile;

  const newXp = profile.xp + xpEarned;
  const newLevel = calculateLevel(newXp);
  const isWin = rank === 1;

  store.updateProfile({
    coins: profile.coins + coinsEarned,
    xp: newXp,
    level: newLevel,
    stats: {
      ...profile.stats,
      wins: profile.stats.wins + (isWin ? 1 : 0),
      losses: profile.stats.losses + (isWin ? 0 : 1),
      totalDistance: profile.stats.totalDistance + distance,
      totalRaces: profile.stats.totalRaces + 1,
      highestSpeed: Math.max(profile.stats.highestSpeed, maxSpeed),
      cleanRaces: profile.stats.cleanRaces + (collisions < 5 ? 1 : 0),
    },
  });
}

export function canUnlockVehicle(vehicleId: string, cost: number): boolean {
  const profile = useAuthStore.getState().profile;
  return profile.coins >= cost && !profile.unlockedVehicles.includes(vehicleId);
}

export function unlockVehicle(vehicleId: string, cost: number): boolean {
  const store = useAuthStore.getState();
  const profile = store.profile;
  if (profile.coins < cost || profile.unlockedVehicles.includes(vehicleId)) return false;
  store.updateProfile({
    coins: profile.coins - cost,
    unlockedVehicles: [...profile.unlockedVehicles, vehicleId],
  });
  return true;
}

export function checkAchievements(): string[] {
  const profile = useAuthStore.getState().profile;
  const newAchievements: string[] = [];

  const checks: [string, boolean][] = [
    ['first_win', profile.stats.wins >= 1],
    ['speed_demon', profile.stats.highestSpeed >= 200],
    ['marathon', profile.stats.totalDistance >= 100000],
    ['collector', profile.unlockedVehicles.length >= 18],
    ['clean_racer', profile.stats.cleanRaces >= 1],
    ['rich_racer', profile.coins >= 10000],
    ['level_10', profile.level >= 10],
    ['level_25', profile.level >= 25],
  ];

  for (const [id, met] of checks) {
    if (met && !profile.achievements.includes(id)) {
      newAchievements.push(id);
    }
  }

  if (newAchievements.length > 0) {
    useAuthStore.getState().updateProfile({
      achievements: [...profile.achievements, ...newAchievements],
    });
  }

  return newAchievements;
}

export function copyToClipboard(text: string): void {
  navigator.clipboard?.writeText(text).catch(() => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  });
}

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${m}:${rem.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}
