import { useNavigate } from 'react-router-dom';
import { Button, Card, HealthBar } from '../../components/ui';
import { useAuthStore } from '../../stores';
import { ACHIEVEMENTS } from '@indian-racing/shared';
import { formatDistance, xpForNextLevel } from '../../utils/progression';

export function ProfileScreen() {
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();
  const nextLevelXp = xpForNextLevel(profile.level);
  const xpProgress = (profile.xp / nextLevelXp) * 100;

  return (
    <div className="min-h-screen bg-game-dark p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <Card className="text-center">
          <div className="text-6xl mb-2">{profile.avatar}</div>
          <h2 className="text-2xl font-display font-bold text-saffron">{profile.username}</h2>
          <p className="text-gray-400 text-sm">{profile.isGuest ? 'Guest Account' : 'Google Account'}</p>
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>Level {profile.level}</span>
              <span>{profile.xp} / {nextLevelXp} XP</span>
            </div>
            <HealthBar health={Math.min(xpProgress, 100)} />
          </div>
        </Card>

        <Card>
          <h3 className="font-display font-semibold text-saffron mb-3">Statistics</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-game-dark rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-indiaGreen">{profile.stats.wins}</div>
              <div className="text-gray-500">Wins</div>
            </div>
            <div className="bg-game-dark rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-400">{profile.stats.losses}</div>
              <div className="text-gray-500">Losses</div>
            </div>
            <div className="bg-game-dark rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">{profile.stats.totalRaces}</div>
              <div className="text-gray-500">Races</div>
            </div>
            <div className="bg-game-dark rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-game-accent">{Math.round(profile.stats.highestSpeed)}</div>
              <div className="text-gray-500">Top Speed</div>
            </div>
            <div className="bg-game-dark rounded-lg p-3 text-center col-span-2">
              <div className="text-lg font-bold text-saffron">{formatDistance(profile.stats.totalDistance)}</div>
              <div className="text-gray-500">Total Distance</div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-display font-semibold text-saffron mb-3">
            Achievements ({profile.achievements.length}/{ACHIEVEMENTS.length})
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {ACHIEVEMENTS.map((a) => {
              const unlocked = profile.achievements.includes(a.id);
              return (
                <div
                  key={a.id}
                  title={`${a.name}: ${a.description}`}
                  className={`text-center p-2 rounded-lg ${unlocked ? 'bg-saffron/10' : 'bg-game-dark opacity-40'}`}
                >
                  <div className="text-2xl">{a.icon}</div>
                  <div className="text-[10px] text-gray-400 truncate">{a.name}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="flex gap-3 text-center">
          <div className="flex-1 bg-game-card rounded-lg p-3 border border-game-border">
            <div className="text-game-gold font-bold">{profile.coins}</div>
            <div className="text-xs text-gray-500">Coins</div>
          </div>
          <div className="flex-1 bg-game-card rounded-lg p-3 border border-game-border">
            <div className="text-white font-bold">{profile.unlockedVehicles.length}</div>
            <div className="text-xs text-gray-500">Vehicles</div>
          </div>
        </div>

        <Button variant="secondary" onClick={() => navigate('/menu')} className="w-full">Back</Button>
      </div>
    </div>
  );
}
