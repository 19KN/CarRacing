import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HealthBar, Speedometer } from '../../components/ui';
import { FinishCelebration } from '../../components/ui/FinishCelebration';
import { useAuthStore, useLobbyStore, useRaceStore } from '../../stores';
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../../components/ui';

const GameScene = lazy(() => import('../../game/core/GameScene').then((m) => ({ default: m.GameScene })));
import { getMapById, DEFAULT_MAP_ID, getMapRaceDistance, getRaceSpawnPosition, getAerialSpawnPosition, getGhatSpawnPosition, getVehicleById, PlayerFinishedPayload, DEFAULT_TRAFFIC_LEVEL, isTrafficLevel, GHAT_COMBAT_MAX_SPEED_KMH, AERIAL_COMBAT_MAX_SPEED_KMH, GHAT_COMBAT_START_RULES, AERIAL_COMBAT_START_RULES } from '@indian-racing/shared';
import { getSocket, SocketEvents } from '../../utils/socket';
import { formatDistance, formatTime } from '../../utils/progression';
import { buildSoloRaceResult } from '../../utils/soloRace';
import { TouchControls } from './TouchControls';
import { RaceCountdownOverlay, StartLineInfoOverlay } from './RaceCountdownOverlay';
import { useAudioManager } from '../../game/audio/AudioManager';
export function RaceHUD() {
  const health = useRaceStore((s) => s.health);
  const speed = useRaceStore((s) => s.speed);
  const position = useRaceStore((s) => s.position);
  const rankings = useRaceStore((s) => s.rankings);
  const distanceRemaining = useRaceStore((s) => s.distanceRemaining);
  const isRaceFinished = useRaceStore((s) => s.isRaceFinished);
  const finishTimeMs = useRaceStore((s) => s.finishTimeMs);
  const finishStandings = useRaceStore((s) => s.finishStandings);
  const showFinishOverlay = useRaceStore((s) => s.showFinishOverlay);
  const setPlayerFinished = useRaceStore((s) => s.setPlayerFinished);
  const setShowFinishOverlay = useRaceStore((s) => s.setShowFinishOverlay);
  const maxRaceSpeed = useRaceStore((s) => s.maxRaceSpeed);
  const isPaused = useRaceStore((s) => s.isPaused);
  const isRespawning = useRaceStore((s) => s.isRespawning);
  const setPaused = useRaceStore((s) => s.setPaused);
  const setResults = useRaceStore((s) => s.setResults);
  const setDistanceRemaining = useRaceStore((s) => s.setDistanceRemaining);
  const lobby = useLobbyStore((s) => s.lobby);
  const localPlayerId = useLobbyStore((s) => s.localPlayerId);
  const selectedVehicleId = useLobbyStore((s) => s.selectedVehicleId);
  const selectedVehicleColor = useLobbyStore((s) => s.selectedVehicleColor);
  const selectedMapId = useLobbyStore((s) => s.selectedMapId);
  const race = useRaceStore((s) => s.race);
  const countdown = useRaceStore((s) => s.countdown);
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const mapFromUrl = searchParams.get('map');
  const mapId = race?.mapId
    || (mapFromUrl && getMapById(mapFromUrl) ? mapFromUrl : null)
    || lobby?.settings.mapId
    || selectedMapId
    || DEFAULT_MAP_ID;
  const map = getMapById(mapId);
  const isAerialMap = map?.roadType === 'aerial';
  const isGhatMap = map?.roadType === 'hill';
  const playerId = localPlayerId || profile.id;
  const myRacePlayer = race?.players.find((p) => p.playerId === playerId);
  const myLobbyPlayer = lobby?.players.find((p) => p.id === playerId);
  const vehicleId = myRacePlayer?.vehicleId || myLobbyPlayer?.vehicleId || selectedVehicleId || profile.favoriteVehicle;
  const vehicleColor = myRacePlayer?.vehicleColor || myLobbyPlayer?.vehicleColor || selectedVehicleColor || '#FF9933';
  const isMultiplayer = (race?.players.length ?? lobby?.players.length ?? 1) >= 2;
  const isSolo = !isMultiplayer;
  const [elapsedMs, setElapsedMs] = useState(0);
  const [showCombatStartInfo, setShowCombatStartInfo] = useState(false);
  const combatStartRules = isGhatMap
    ? GHAT_COMBAT_START_RULES
    : isAerialMap
      ? AERIAL_COMBAT_START_RULES
      : undefined;
  const combatMaxSpeed = isGhatMap
    ? GHAT_COMBAT_MAX_SPEED_KMH
    : isAerialMap
      ? AERIAL_COMBAT_MAX_SPEED_KMH
      : 300;
  const { playCelebration } = useAudioManager();

  const handleCelebrationComplete = useCallback(() => {
    setShowFinishOverlay(false);
    if (!isSolo || !finishTimeMs || !map) return;
    setResults(buildSoloRaceResult(profile, {
      finishTimeMs,
      distance: getMapRaceDistance(map),
      maxSpeed: maxRaceSpeed,
      health,
    }));
    navigate('/results');
  }, [isSolo, finishTimeMs, map, profile, maxRaceSpeed, health, setResults, navigate, setShowFinishOverlay]);

  useEffect(() => {
    if (map) setDistanceRemaining(getMapRaceDistance(map));
  }, [map]);

  useEffect(() => {
    if (!combatStartRules || !isSolo || countdown !== null) {
      setShowCombatStartInfo(false);
      return;
    }
    setShowCombatStartInfo(true);
    const timer = window.setTimeout(() => setShowCombatStartInfo(false), 5000);
    return () => window.clearTimeout(timer);
  }, [combatStartRules, isSolo, countdown, mapId, isGhatMap, isAerialMap]);

  useEffect(() => {
    if (countdown !== null) {
      setElapsedMs(0);
      return;
    }
    const startedAt = race?.startedAt ?? Date.now();
    const tick = () => setElapsedMs(Date.now() - startedAt);
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [race?.startedAt, countdown]);

  useEffect(() => {
    const socket = getSocket();
    socket.on(SocketEvents.PLAYER_FINISHED, (payload: PlayerFinishedPayload) => {
      const me = localPlayerId || profile.id;
      if (payload.playerId !== me) {
        playCelebration();
      }
      setPlayerFinished({ standings: payload.standings, latestFinisherId: payload.playerId });
    });
    socket.on(SocketEvents.RACE_FINISH, (data: { results: Parameters<typeof setResults>[0] }) => {
      setResults(data.results);
      navigate('/results');
    });
    return () => {
      socket.off(SocketEvents.PLAYER_FINISHED);
      socket.off(SocketEvents.RACE_FINISH);
    };
  }, [navigate, playCelebration, setPlayerFinished, setResults]);

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
          key={`${mapId}-${vehicleId}-${vehicleColor}`}
          vehicleId={vehicleId}
          vehicleColor={vehicleColor}
          mapId={mapId}
          isSolo={isSolo}
        />
      </Suspense>

      {countdown !== null && isMultiplayer && (
        <RaceCountdownOverlay
          value={countdown}
          rules={combatStartRules}
        />
      )}
      {showCombatStartInfo && isSolo && combatStartRules && (
        <StartLineInfoOverlay rules={combatStartRules} />
      )}

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
            <Speedometer speed={speed} maxSpeed={combatMaxSpeed} />
          </div>
        </div>

        {/* Health */}
        <div className="absolute bottom-24 left-4 w-48 hud-panel">
          <div className="text-xs text-gray-400 mb-1">HEALTH</div>
          <HealthBar health={health} />
          {isRespawning && (
            <div className="mt-2 text-xs font-semibold text-red-400 animate-pulse">
              💥 Exploded — respawning...
            </div>
          )}
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
              <div key={r.playerId} className={`flex justify-between text-xs py-0.5 ${r.playerId === playerId ? 'text-saffron' : 'text-gray-400'}`}>
                <span>{r.rank}. {r.username}</span>
                <span>{r.finished ? '✓' : ''}</span>
              </div>
            ))}
          </div>
        )}

        {/* Controls hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-600 text-center">
          {isAerialMap
            ? 'W=Throttle · S=Brake · A/D=Turn · ↑/↓=Pitch · F=Missile · H=Horn · C=Camera · Esc=Pause'
            : isGhatMap
              ? 'WASD/Arrows · Space=Drift · F=Missile · H=Horn · N=Nitro · C=Camera · Esc=Pause'
              : 'WASD/Arrows · Space=Drift · H=Horn · N=Nitro · C=Camera · Esc=Pause'}
        </div>
      </div>

      <TouchControls />

      {(showFinishOverlay || (isRaceFinished && finishTimeMs !== null)) && (
        <FinishCelebration
          finishTimeMs={finishTimeMs ?? undefined}
          mapName={map?.name}
          standings={finishStandings}
          localPlayerId={playerId}
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
              <button onClick={() => navigate('/race/solo')} className="game-btn-secondary w-full">Leave Race</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SoloRace() {
  const setRace = useRaceStore((s) => s.setRace);
  const setWeather = useRaceStore((s) => s.setWeather);
  const updateMySelection = useLobbyStore((s) => s.updateMySelection);
  const selectedVehicleId = useLobbyStore((s) => s.selectedVehicleId);
  const selectedVehicleColor = useLobbyStore((s) => s.selectedVehicleColor);
  const selectedMapId = useLobbyStore((s) => s.selectedMapId);
  const selectedTrafficLevel = useLobbyStore((s) => s.selectedTrafficLevel);
  const profile = useAuthStore((s) => s.profile);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const mapFromUrl = searchParams.get('map');
    const vehicleFromUrl = searchParams.get('vehicle');
    const colorFromUrl = searchParams.get('color');
    const trafficFromUrl = searchParams.get('traffic');

    const mapId = (mapFromUrl && getMapById(mapFromUrl) ? mapFromUrl : null)
      ?? selectedMapId
      ?? DEFAULT_MAP_ID;
    const vehicleId = (vehicleFromUrl && getVehicleById(vehicleFromUrl) ? vehicleFromUrl : null)
      ?? selectedVehicleId
      ?? profile.favoriteVehicle;
    const vehicleColor = colorFromUrl || selectedVehicleColor || '#FF9933';
    const trafficLevel = (trafficFromUrl && isTrafficLevel(trafficFromUrl) ? trafficFromUrl : null)
      ?? selectedTrafficLevel
      ?? DEFAULT_TRAFFIC_LEVEL;

    updateMySelection(vehicleId, vehicleColor, mapId, trafficLevel);

    const map = getMapById(mapId);
    const vehicleConfig = getVehicleById(vehicleId);
    const spawn = map?.roadType === 'aerial' && vehicleConfig?.category === 'aircraft'
      ? getAerialSpawnPosition(vehicleId, vehicleConfig.aircraftKind, 0)
      : map?.roadType === 'hill'
        ? getGhatSpawnPosition(0, 1, map.checkpoints)
        : getRaceSpawnPosition(0, 1);
    setRace({
      lobbyId: 'solo',
      mapId,
      status: 'racing',
      players: [{
        playerId: profile.id,
        username: profile.username,
        vehicleId,
        vehicleColor,
        position: { x: spawn.x, y: spawn.y, z: spawn.z },
        rotation: spawn.rotation,
        velocity: { x: 0, y: 0, z: 0 },
        health: 100,
        checkpointIndex: 0,
        distanceTraveled: 0,
        spawnZ: spawn.z,
        rank: 1,
        finished: false,
        isRespawning: false,
        nitroRemaining: 3,
      }],
      weather: map?.weatherPool[0] ?? 'clear',
      timeOfDay: map?.defaultTimeOfDay ?? 'morning',
      trafficLevel,
      startedAt: Date.now(),
      seed: 42,
      trafficSignalState: 'green',
      trafficSignalTimer: 0,
    });
    setWeather(map?.weatherPool[0] ?? 'clear', map?.defaultTimeOfDay ?? 'morning');
  }, [
    profile.favoriteVehicle,
    profile.id,
    profile.username,
    searchParams,
    selectedMapId,
    selectedTrafficLevel,
    selectedVehicleColor,
    selectedVehicleId,
    setRace,
    setWeather,
    updateMySelection,
  ]);

  return <RaceHUD />;
}
