import { useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../../components/ui';
import { useRaceStore, useLobbyStore } from '../../stores';
import { useAuthStore } from '../../stores';
import { applyRaceRewards, checkAchievements, formatTime } from '../../utils/progression';
import { apiFetch } from '../../utils/api';
import { markLobbyMusicNewVisit } from '../../game/audio/AudioManager';

export function ResultsScreen() {
  const results = useRaceStore((s) => s.results);
  const resetRace = useRaceStore((s) => s.reset);
  const resetLobby = useLobbyStore((s) => s.reset);
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();

  if (!results || results.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-game-dark">
        <Card>
          <p className="text-gray-400 mb-4">No results available</p>
          <Button onClick={() => navigate('/menu')}>Back to Menu</Button>
        </Card>
      </div>
    );
  }

  const myResult = results.find((r) => r.playerId === profile.id);
  const rewardsApplied = useRef(false);

  useEffect(() => {
    if (!myResult || rewardsApplied.current) return;
    rewardsApplied.current = true;
    applyRaceRewards(
      myResult.rank, myResult.coinsEarned, myResult.xpEarned,
      myResult.distance, myResult.maxSpeed, myResult.collisions,
    );
    checkAchievements();
    apiFetch('/api/leaderboard/submit', {
      method: 'POST',
      body: JSON.stringify({ result: myResult }),
    }).catch(() => {});
  }, [myResult?.playerId]);

  const rankColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-game-dark via-[#0f1628] to-game-dark p-4">
      <Card className="max-w-lg w-full">
        <h2 className="text-3xl font-display font-bold text-center mb-2">
          {myResult?.rank === 1 ? '🏆 Victory!' : 'Race Complete'}
        </h2>
        <p className="text-center text-gray-400 mb-6">
          {myResult && `You finished ${myResult.rank}${myResult.rank === 1 ? 'st' : myResult.rank === 2 ? 'nd' : myResult.rank === 3 ? 'rd' : 'th'}`}
        </p>

        <div className="space-y-3 mb-6">
          {results.sort((a, b) => a.rank - b.rank).map((r) => (
            <div
              key={r.playerId}
              className={`flex items-center justify-between p-3 rounded-lg ${
                r.playerId === profile.id ? 'bg-saffron/10 border border-saffron/30' : 'bg-game-dark'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-xl font-display font-bold ${rankColors[r.rank - 1] || 'text-gray-400'}`}>
                  {r.rank}
                </span>
                <span className="font-semibold">{r.username}</span>
              </div>
              <div className="text-right text-sm">
                <div className="text-gray-300">{formatTime(r.finishTime)}</div>
                <div className="text-game-gold">+{r.coinsEarned} coins</div>
              </div>
            </div>
          ))}
        </div>

        {myResult && (
          <div className="grid grid-cols-3 gap-3 mb-6 text-center">
            <div className="bg-game-dark rounded-lg p-3">
              <div className="text-game-gold font-bold">+{myResult.coinsEarned}</div>
              <div className="text-xs text-gray-500">Coins</div>
            </div>
            <div className="bg-game-dark rounded-lg p-3">
              <div className="text-game-accent font-bold">+{myResult.xpEarned}</div>
              <div className="text-xs text-gray-500">XP</div>
            </div>
            <div className="bg-game-dark rounded-lg p-3">
              <div className="text-white font-bold">{Math.round(myResult.maxSpeed)}</div>
              <div className="text-xs text-gray-500">Max km/h</div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Button onClick={() => { resetRace(); resetLobby(); markLobbyMusicNewVisit(); navigate('/lobby/create'); }} className="w-full">
            Race Again
          </Button>
          <Button variant="secondary" onClick={() => { resetRace(); resetLobby(); navigate('/menu'); }} className="w-full">
            Main Menu
          </Button>
        </div>
      </Card>
    </div>
  );
}
