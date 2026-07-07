import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HealthBar, Speedometer } from '../../components/ui';
import { FinishCelebration } from '../../components/ui/FinishCelebration';
import { useAuthStore, useLobbyStore, useRaceStore } from '../../stores';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../../components/ui';

const GameScene = lazy(() => import('../../game/core/GameScene').then((m) => ({ default: m.GameScene })));
import { getMapById, DEFAULT_MAP_ID, getMapRaceDistance } from '@indian-racing/shared';
import { getSocket, SocketEvents } from '../../utils/socket';
import { formatDistance, formatTime } from '../../utils/progression';
import { buildSoloRaceResult } from '../../utils/soloRace';
import { TouchControls } from './TouchControls';
export function RaceHUD() {
  const health = useRaceStore((s) => s.health);
  const speed = useRaceStore((s) => s.speed);
  const position = useRaceStore((s) => s.position);
  const rankings = useRaceStore((s) => s.rankings);
  const distanceRemaining = useRaceStore((s) => s.distanceRemaining);
  const isRaceFinished = useRaceStore((s) => s.isRaceFinished);
  const finishTimeMs = useRaceStore((s) => s.finishTimeMs);
  const maxRaceSpeed = useRaceStore((s) => s.maxRaceSpeed);
  const isPaused = useRaceStore((s) => s.isPaused);
  const setPaused = useRaceStore((s) => s.setPaused);
  const setResults = useRaceStore((s) => s.setResults);
  const setDistanceRemaining = useRaceStore((s) => s.setDistanceRemaining);
  const lobby = useLobbyStore((s) => s.lobby);
  const race = useRaceStore((s) => s.race);
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();

  const mapId = race?.mapId || lobby?.settings.mapId || DEFAULT_MAP_ID;
  const map = getMapById(mapId);
  const myRacePlayer = race?.players.find((p) => p.playerId === profile.id);
  const myLobbyPlayer = lobby?.players.find((p) => p.id === profile.id);
  const vehicleId = myRacePlayer?.vehicleId || myLobbyPlayer?.vehicleId || profile.favoriteVehicle;
  const vehicleColor = myRacePlayer?.vehicleColor || myLobbyPlayer?.vehicleColor || '#FF9933';
  const isSolo = !race || race.players.length < 2;
  const [elapsedMs, setElapsedMs] = useState(0);

  const handleCelebrationComplete = useCallback(() => {
    if (!isSolo || !finishTimeMs || !map) return;
    setResults(buildSoloRaceResult(profile, {
      finishTimeMs,
      distance: getMapRaceDistance(map),
      maxSpeed: maxRaceSpeed,
      health,
    }));
    navigate('/results');
  }, [isSolo, finishTimeMs, map, profile, maxRaceSpeed, health, setResults, navigate]);

  useEffect(() => {
    if (map) setDistanceRemaining(getMapRaceDistance(map));
  }, [map]);

  useEffect(() => {
    const startedAt = race?.startedAt ?? Date.now();
    const tick = () => setElapsedMs(Date.now() - startedAt);
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [race?.startedAt]);

  useEffect(() => {
    const socket = getSocket();
    socket.on(SocketEvents.RACE_FINISH, (data: { results: Parameters<typeof setResults>[0] }) => {
      setResults(data.results);
      navigate('/results');
    });
    return () => { socket.off(SocketEvents.RACE_FINISH); };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') setPaused(!isPaused);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPaused]);

  const rankSuffix = (n: number) => {
    if (n === 1) return 'st';
    if (n === 2) return 'nd';
    if (n === 3) return 'rd';
    return 'th';
  };

  return (
    <div className="relative w-full h-screen">
      <Suspense fallback={<div className="w-full h-screen flex items-center justify-center bg-game-dark"><LoadingSpinner message="Loading race..." /></div>}>
        <GameScene
          vehicleId={vehicleId}
          vehicleColor={vehicleColor}
          mapId={mapId}
          isSolo={isSolo}
        />
      </Suspense>

      {/* HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <div className="hud-panel pointer-events-auto">
            <div className="text-3xl font-display font-bold text-saffron">
              {position}{rankSuffix(position)}
            </div>
            <div className="text-xs text-gray-400">POSITION</div>
          </div>
          <div className="hud-panel">
            <div className="text-sm text-gray-300">{map?.name}</div>
            <div className="text-xs text-gray-500 capitalize">{race?.weather} · {race?.timeOfDay}</div>
          </div>
          <div className="hud-panel">
            <Speedometer speed={speed} />
          </div>
        </div>

        {/* Health */}
        <div className="absolute bottom-24 left-4 w-48 hud-panel">
          <div className="text-xs text-gray-400 mb-1">HEALTH</div>
          <HealthBar health={health} />
        </div>

        {/* Distance & time */}
        <div className="absolute bottom-24 right-4 hud-panel text-right">
          <div className="text-sm text-gray-300">{formatDistance(distanceRemaining)}</div>
          <div className="text-xs text-gray-500">REMAINING</div>
          <div className="text-xs text-gray-400 mt-1">{formatTime(elapsedMs)}</div>
        </div>

        {/* Mini rankings */}
        {rankings.length > 0 && (
          <div className="absolute top-20 right-4 hud-panel w-48">
            {rankings.slice(0, 5).map((r) => (
              <div key={r.playerId} className={`flex justify-between text-xs py-0.5 ${r.playerId === profile.id ? 'text-saffron' : 'text-gray-400'}`}>
                <span>{r.rank}. {r.username}</span>
                <span>{r.finished ? '✓' : ''}</span>
              </div>
            ))}
          </div>
        )}

        {/* Controls hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-600">
          WASD/Arrows · Space=Drift · H=Horn · N=Nitro · C=Camera · Esc=Pause
        </div>
      </div>

      <TouchControls />

      {isRaceFinished && finishTimeMs !== null && (
        <FinishCelebration
          finishTimeMs={finishTimeMs}
          mapName={map?.name}
          onComplete={handleCelebrationComplete}
        />
      )}

      {/* Pause Menu */}
      {isPaused && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 pointer-events-auto">
          <div className="game-card text-center">
            <h2 className="text-2xl font-display font-bold text-saffron mb-6">Paused</h2>
            <div className="space-y-3">
              <button onClick={() => setPaused(false)} className="game-btn-primary w-full">Resume</button>
              <button onClick={() => navigate('/menu')} className="game-btn-secondary w-full">Leave Race</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SoloRace() {
  const profile = useAuthStore((s) => s.profile);
  const setRace = useRaceStore((s) => s.setRace);
  const setWeather = useRaceStore((s) => s.setWeather);

  useEffect(() => {
    setRace({
      lobbyId: 'solo',
      mapId: 'bangalore_hyderabad',
      status: 'racing',
      players: [],
      weather: 'clear',
      timeOfDay: 'morning',
      startedAt: Date.now(),
      seed: 42,
      trafficSignalState: 'green',
      trafficSignalTimer: 0,
    });
    setWeather('clear', 'morning');
  }, []);

  return <RaceHUD />;
}
