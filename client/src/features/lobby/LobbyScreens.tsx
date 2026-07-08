import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, Input } from '../../components/ui';
import { useAuthStore, useLobbyStore, useRaceStore } from '../../stores';
import { apiFetch } from '../../utils/api';
import { connectSocket, joinLobbySocket, leaveLobbySocket, getSocket, SocketEvents } from '../../utils/socket';
import { VEHICLES, VEHICLE_COLORS, MAPS, MaxPlayers, DEFAULT_MAP_ID, DEFAULT_TRAFFIC_LEVEL, TrafficLevel, TRAFFIC_LEVEL_LABELS } from '@indian-racing/shared';
import { TrafficLevelPicker } from '../../components/ui/TrafficLevelPicker';
import { copyToClipboard } from '../../utils/progression';
import { useAudioManager } from '../../game/audio/AudioManager';
import { GameRulesPanel } from './GameRulesPanel';

const VehiclePreview = lazy(() => import('../garage/VehiclePreview').then((m) => ({ default: m.VehiclePreview })));

type CreateStep = 'players' | 'map';

export function CreateLobby() {
  const [step, setStep] = useState<CreateStep>('players');
  const [maxPlayers, setMaxPlayers] = useState<MaxPlayers>(4);
  const [mapId, setMapId] = useState(DEFAULT_MAP_ID);
  const [trafficLevel, setTrafficLevel] = useState<TrafficLevel>(DEFAULT_TRAFFIC_LEVEL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const profile = useAuthStore((s) => s.profile);
  const token = useAuthStore((s) => s.token);
  const setLobby = useLobbyStore((s) => s.setLobby);
  const setGamingId = useLobbyStore((s) => s.setGamingId);
  const navigate = useNavigate();

  const selectedMap = MAPS.find((m) => m.id === mapId);

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<{ lobby: ReturnType<typeof useLobbyStore.getState>['lobby'] }>(
        '/api/lobby/create',
        { method: 'POST', body: JSON.stringify({ maxPlayers, mapId, trafficLevel, avatar: profile.avatar }) },
      );
      setLobby(data.lobby);
      setGamingId(data.lobby!.gamingId);
      if (token) joinLobbySocket(data.lobby!.gamingId, token, profile.avatar);
      navigate('/lobby');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create lobby');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-game-dark p-4">
      <Card className="max-w-lg w-full">
        <div className="flex items-center gap-2 mb-6">
          <StepDot active={step === 'players'} done={step === 'map'} label="1" />
          <div className={`flex-1 h-0.5 ${step === 'map' ? 'bg-saffron' : 'bg-game-border'}`} />
          <StepDot active={step === 'map'} done={false} label="2" />
        </div>

        {step === 'players' && (
          <>
            <h2 className="text-2xl font-display font-bold text-saffron mb-2">Create Lobby</h2>
            <p className="text-sm text-gray-400 mb-2">Step 1 — Max players (lobby size)</p>
            <p className="text-xs text-gray-500 mb-6">
              You can start with fewer friends. Empty slots stay open — e.g. pick 4 but race with 3.
            </p>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {([2, 4, 8, 16] as MaxPlayers[]).map((n) => (
                <button
                  key={n}
                  onClick={() => setMaxPlayers(n)}
                  className={`py-4 rounded-lg font-display font-semibold transition-all ${
                    maxPlayers === n ? 'bg-saffron text-white' : 'bg-game-dark border border-game-border text-gray-300 hover:border-saffron/50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <Button onClick={() => setStep('map')} className="w-full">Next — Choose Map</Button>
          </>
        )}

        {step === 'map' && (
          <>
            <h2 className="text-2xl font-display font-bold text-saffron mb-2">Choose Map</h2>
            <p className="text-sm text-gray-400 mb-4">Step 2 — Pick the race track (up to {maxPlayers} players)</p>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto mb-4">
              {MAPS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMapId(m.id)}
                  className={`p-3 rounded-lg text-xs text-left transition-all ${
                    mapId === m.id
                      ? 'bg-saffron/20 border-2 border-saffron'
                      : 'bg-game-dark border border-game-border hover:border-saffron/50'
                  }`}
                >
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-gray-500 capitalize">{m.roadType} · {(m.distance / 1000).toFixed(1)} km</div>
                </button>
              ))}
            </div>
            {selectedMap && (
              <p className="text-xs text-gray-500 mb-4 text-center">
                Selected: <span className="text-saffron">{selectedMap.name}</span>
              </p>
            )}

            <TrafficLevelPicker
              value={trafficLevel}
              onChange={setTrafficLevel}
              className="mb-4"
            />

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep('players')} className="flex-1">Back</Button>
              <Button onClick={handleCreate} disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Create Lobby'}
              </Button>
            </div>
          </>
        )}

        <Button variant="secondary" onClick={() => navigate('/menu')} className="w-full mt-3">Cancel</Button>
        <GameRulesPanel compact />
      </Card>
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
      active ? 'bg-saffron text-white' : done ? 'bg-indiaGreen text-white' : 'bg-game-dark border border-game-border text-gray-500'
    }`}>
      {done ? '✓' : label}
    </div>
  );
}

export function JoinLobby() {
  const [searchParams] = useSearchParams();
  const [gamingId, setGamingIdInput] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const profile = useAuthStore((s) => s.profile);
  const token = useAuthStore((s) => s.token);
  const setLobby = useLobbyStore((s) => s.setLobby);
  const setGamingId = useLobbyStore((s) => s.setGamingId);
  const navigate = useNavigate();

  const handleJoin = async () => {
    if (!gamingId.trim()) { setError('Enter your friend\'s Lobby ID'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<{ lobby: ReturnType<typeof useLobbyStore.getState>['lobby'] }>(
        '/api/lobby/join',
        { method: 'POST', body: JSON.stringify({ gamingId: gamingId.trim().toUpperCase(), avatar: profile.avatar }) },
      );
      setLobby(data.lobby);
      setGamingId(data.lobby!.gamingId);
      if (token) joinLobbySocket(data.lobby!.gamingId, token, profile.avatar);
      navigate('/lobby');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join — check the Lobby ID');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-game-dark p-4">
      <Card className="max-w-md w-full">
        <h2 className="text-2xl font-display font-bold text-saffron mb-2">Join Lobby</h2>
        <p className="text-sm text-gray-400 mb-6">Paste the Lobby ID your friend shared with you</p>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Lobby ID</label>
            <Input
              placeholder="e.g. IND458923"
              value={gamingId}
              onChange={(e) => setGamingIdInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              className="text-center text-2xl font-display tracking-widest"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button onClick={handleJoin} disabled={loading} className="w-full">
            {loading ? 'Joining...' : 'Join Lobby'}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/menu')} className="w-full">Back</Button>
        </div>
        <GameRulesPanel compact />
      </Card>
    </div>
  );
}

export function LobbyScreen() {
  const lobby = useLobbyStore((s) => s.lobby);
  const chat = useLobbyStore((s) => s.chat);
  const addChat = useLobbyStore((s) => s.addChat);
  const resetLobby = useLobbyStore((s) => s.reset);
  const updateMySelection = useLobbyStore((s) => s.updateMySelection);
  const localPlayerId = useLobbyStore((s) => s.localPlayerId);
  const profile = useAuthStore((s) => s.profile);
  const countdown = useRaceStore((s) => s.countdown);
  const { playLobbyMusic, stopLobbyMusic } = useAudioManager();
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevChatLengthRef = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!lobby) { navigate('/menu'); return; }
    const socket = connectSocket();

    socket.on(SocketEvents.CHAT, (data: { chat: typeof chat[0] }) => {
      addChat(data.chat);
    });

    return () => {
      socket.off(SocketEvents.CHAT);
    };
  }, [lobby?.gamingId]);

  useEffect(() => {
    if (!lobby || countdown !== null) {
      stopLobbyMusic();
      return;
    }

    playLobbyMusic();
    return () => stopLobbyMusic();
  }, [lobby?.gamingId, countdown, playLobbyMusic, stopLobbyMusic]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container || chat.length <= prevChatLengthRef.current) {
      prevChatLengthRef.current = chat.length;
      return;
    }
    prevChatLengthRef.current = chat.length;
    container.scrollTop = container.scrollHeight;
  }, [chat]);

  if (!lobby) return null;

  const myPlayer = lobby.players.find((p) => p.id === (localPlayerId || profile.id));
  const isHost = myPlayer?.isHost;
  const readyCount = lobby.players.filter((p) => p.isReady).length;
  const joinedCount = lobby.players.length;
  const openSlots = lobby.settings.maxPlayers - joinedCount;
  const allReady = joinedCount >= 2 && lobby.players.every((p) => p.isReady);
  const waitingForPlayers = joinedCount < 2;
  const canStartNow = allReady;
  const selectedMap = MAPS.find((m) => m.id === lobby.settings.mapId);
  const selectedVehicle = VEHICLES.find((v) => v.id === myPlayer?.vehicleId);
  const vehicles = VEHICLES;

  const sendChat = () => {
    if (!message.trim()) return;
    getSocket().emit(SocketEvents.CHAT, { message: message.trim() });
    setMessage('');
  };

  const sendEmote = (emote: string) => {
    getSocket().emit(SocketEvents.EMOTE, { emote });
    getSocket().emit(SocketEvents.CHAT, { message: emote });
  };

  const copyLobbyId = () => {
    copyToClipboard(lobby.gamingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}/lobby/join?code=${lobby.gamingId}`;
    copyToClipboard(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleReady = () => {
    getSocket().emit(SocketEvents.SET_READY, { isReady: !myPlayer?.isReady });
  };

  const startRaceNow = () => {
    getSocket().emit(SocketEvents.START_RACE);
  };

  const selectVehicle = (vehicleId: string) => {
    updateMySelection(vehicleId, undefined);
    getSocket().emit(SocketEvents.SELECT_VEHICLE, { vehicleId });
  };

  const selectColor = (color: string) => {
    updateMySelection(undefined, color);
    getSocket().emit(SocketEvents.SELECT_COLOR, { color });
  };

  const handleLeave = () => {
    stopLobbyMusic();
    leaveLobbySocket();
    resetLobby();
    navigate('/menu');
  };

  return (
    <div className="min-h-screen overflow-y-auto [overflow-anchor:auto] bg-game-dark p-4 pb-10">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Share Lobby ID — prominent for host */}
          <Card className="border-saffron/30 bg-saffron/5">
            <h3 className="text-sm text-gray-400 mb-1">Share this Lobby ID with friends</h3>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-3xl font-display font-bold tracking-widest text-white">{lobby.gamingId}</span>
              <button
                onClick={copyLobbyId}
                className="text-sm text-white bg-saffron hover:bg-saffron/80 px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                {copied ? 'Copied!' : 'Copy ID'}
              </button>
              <button
                onClick={copyInviteLink}
                className="text-sm text-game-accent hover:text-white px-4 py-2 border border-game-accent/40 rounded-lg transition-colors"
              >
                Copy Invite Link
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Friends: Main Menu → Join Lobby → paste this ID
            </p>
          </Card>

          <Card>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-display font-bold text-saffron">Lobby</h2>
                <div className="text-sm text-gray-400 mt-1">
                  {joinedCount}/{lobby.settings.maxPlayers} joined
                  {openSlots > 0 && (
                    <span className="text-gray-500"> · {openSlots} open slot{openSlots === 1 ? '' : 's'}</span>
                  )}
                  {' · '}
                  <span className="capitalize text-saffron">{lobby.status}</span>
                </div>
                {joinedCount >= 2 && openSlots > 0 && (
                  <p className="text-xs text-indiaGreen mt-1">
                    Race can start with {joinedCount} players — empty slots are optional
                  </p>
                )}
              </div>
              {selectedMap && (
                <div className="text-right text-sm">
                  <div className="text-gray-400">Map</div>
                  <div className="text-white font-semibold">{selectedMap.name}</div>
                  <div className="text-gray-500">{(selectedMap.distance / 1000).toFixed(1)} km</div>
                  <div className="text-gray-500 mt-1 capitalize">
                    Traffic: {TRAFFIC_LEVEL_LABELS[lobby.settings.trafficLevel ?? DEFAULT_TRAFFIC_LEVEL]}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 [overflow-anchor:none]">
              {Array.from({ length: lobby.settings.maxPlayers }).map((_, i) => {
                const player = lobby.players[i];
                return (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border text-center ${
                      player
                        ? player.isReady
                          ? 'border-indiaGreen bg-indiaGreen/10'
                          : 'border-game-border bg-game-dark'
                        : 'border-dashed border-game-border/50 bg-game-dark/50'
                    }`}
                  >
                    {player ? (
                      <>
                        <div className="text-2xl">{player.avatar}</div>
                        <div className="text-sm font-semibold truncate">{player.username}</div>
                        <div className="text-xs text-gray-400">{VEHICLES.find((v) => v.id === player.vehicleId)?.name || 'Vehicle'}</div>
                        <div className="w-4 h-4 rounded-full mx-auto mt-1" style={{ backgroundColor: player.vehicleColor }} />
                        <div className={`text-xs mt-1 ${player.isReady ? 'text-indiaGreen' : 'text-gray-500'}`}>
                          {player.isReady ? '✓ Ready' : 'Not Ready'}
                        </div>
                        {player.isHost && <div className="text-xs text-saffron">Host</div>}
                      </>
                    ) : (
                      <div className="text-gray-600 py-4 text-xs">Open slot</div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <h3 className="font-display font-semibold text-saffron mb-3">Select Vehicle</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-72 overflow-y-auto">
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  onClick={() => selectVehicle(v.id)}
                  className={`p-2 rounded-lg text-xs text-center transition-all ${
                    myPlayer?.vehicleId === v.id
                      ? 'bg-saffron/20 border-2 border-saffron'
                      : 'bg-game-dark border border-game-border hover:border-saffron/50'
                  }`}
                >
                  <div className="font-semibold truncate">{v.name}</div>
                  <div className="text-gray-500">{v.stats.maxSpeed} km/h</div>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {VEHICLE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => selectColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    myPlayer?.vehicleColor === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Card>

          <GameRulesPanel />
        </div>

        <div className="space-y-4">
          <Card className="flex flex-col h-80">
            <h3 className="font-display font-semibold text-saffron mb-2">Chat</h3>
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-2 text-sm">
              {chat.map((c) => (
                <div key={c.id}>
                  <span className="text-saffron font-semibold">{c.username}: </span>
                  <span className="text-gray-300">{c.message}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              {['👍', '🔥', '🏁', '😂', '💪'].map((e) => (
                <button key={e} onClick={() => sendEmote(e)} className="text-lg hover:scale-125 transition-transform">{e}</button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                className="text-sm"
              />
              <Button onClick={sendChat} className="px-4 py-2 text-sm">Send</Button>
            </div>
          </Card>

          {/* Ready status */}
          <div className="text-center text-sm space-y-1">
            {waitingForPlayers && (
              <p className="text-gray-400">Waiting for friends to join...</p>
            )}
            {!waitingForPlayers && !allReady && (
              <p className="text-gray-400">
                {readyCount}/{joinedCount} joined players ready
                {openSlots > 0 ? ' — no need to wait for open slots' : ''}
              </p>
            )}
            {allReady && (
              <p className="text-indiaGreen animate-pulse font-semibold">
                All {joinedCount} players ready! Starting countdown...
              </p>
            )}
            {isHost && !waitingForPlayers && !myPlayer?.isReady && (
              <p className="text-xs text-saffron">Everyone joined must click Ready to start</p>
            )}
          </div>

          {isHost && canStartNow && (
            <Button onClick={startRaceNow} className="w-full game-btn-primary">
              Start Race ({joinedCount} players)
            </Button>
          )}

          <Button
            onClick={toggleReady}
            disabled={waitingForPlayers}
            className={`w-full ${myPlayer?.isReady ? 'game-btn-danger' : 'game-btn-primary'}`}
          >
            {waitingForPlayers
              ? 'Waiting for Players...'
              : myPlayer?.isReady
                ? 'Cancel Ready'
                : 'Ready'}
          </Button>

          <Button variant="secondary" onClick={handleLeave} className="w-full">Leave Lobby</Button>

          {/* 3D vehicle preview — updates when you pick a vehicle or color */}
          <Card className="p-3 border-indiaGreen/40">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-display font-semibold text-saffron text-sm">Vehicle Preview</h3>
              {selectedVehicle && (
                <span className="text-xs text-gray-400">{selectedVehicle.stats.maxSpeed} km/h</span>
              )}
            </div>
            {myPlayer?.vehicleId ? (
              <Suspense fallback={
                <div className="h-56 lg:h-64 rounded-xl bg-game-dark border border-game-border flex items-center justify-center text-gray-500 text-sm">
                  Loading model...
                </div>
              }>
                <VehiclePreview
                  key={myPlayer.vehicleId}
                  vehicleId={myPlayer.vehicleId}
                  color={myPlayer.vehicleColor}
                  className="h-56 lg:h-64 md:h-64"
                />
              </Suspense>
            ) : (
              <div className="h-56 lg:h-64 rounded-xl bg-game-dark border border-dashed border-game-border flex items-center justify-center text-gray-500 text-sm">
                Select a vehicle
              </div>
            )}
            {selectedVehicle && (
              <p className="text-center text-sm text-white font-semibold mt-2">{selectedVehicle.name}</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
