import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../../components/ui';
import { useAuthStore } from '../../stores';
import { apiFetch } from '../../utils/api';
import { LeaderboardEntry } from '@indian-racing/shared';
import { formatDistance } from '../../utils/progression';

export function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [filter, setFilter] = useState<'global' | 'local'>('global');
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();

  useEffect(() => {
    if (filter === 'global') {
      apiFetch<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard')
        .then((data) => setEntries(data.leaderboard))
        .catch(() => setEntries([]));
    } else {
      setEntries([{
        playerId: profile.id,
        username: profile.username,
        wins: profile.stats.wins,
        totalDistance: profile.stats.totalDistance,
        highestSpeed: profile.stats.highestSpeed,
        score: profile.coins + profile.xp,
        submittedAt: Date.now(),
      }]);
    }
  }, [filter]);

  return (
    <div className="min-h-screen bg-game-dark p-4">
      <div className="max-w-lg mx-auto">
        <h2 className="text-3xl font-display font-bold text-saffron mb-6">Leaderboard</h2>

        <div className="flex gap-2 mb-4">
          {(['global', 'local'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-display text-sm capitalize transition-all ${
                filter === f ? 'bg-saffron text-white' : 'bg-game-card text-gray-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <Card>
          {entries.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No entries yet. Win a race to appear here!</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry, i) => (
                <div
                  key={entry.playerId + i}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    entry.playerId === profile.id ? 'bg-saffron/10 border border-saffron/30' : 'bg-game-dark'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-display font-bold text-lg ${
                      i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-500'
                    }`}>
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-semibold">{entry.username}</div>
                      <div className="text-xs text-gray-500">{entry.wins} wins · {formatDistance(entry.totalDistance)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-game-gold font-bold">{entry.score}</div>
                    <div className="text-xs text-gray-500">{Math.round(entry.highestSpeed)} km/h</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {filter === 'global' && (
          <p className="text-xs text-gray-600 text-center mt-4">
            Global leaderboard resets when server restarts (in-memory storage)
          </p>
        )}

        <Button variant="secondary" onClick={() => navigate('/menu')} className="w-full mt-6">Back</Button>
      </div>
    </div>
  );
}
