import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useLobbyStore, useRaceStore } from '../stores';
import { initSocketListeners, joinLobbySocket } from '../utils/socket';
import type { RaceState } from '@indian-racing/shared';

function applyLobbySelectionsToRace(race: RaceState, lobby: ReturnType<typeof useLobbyStore.getState>['lobby']): RaceState {
  if (!lobby) return race;
  return {
    ...race,
    players: race.players.map((rp) => {
      const lp = lobby.players.find((p) => p.id === rp.playerId);
      if (!lp) return rp;
      return {
        ...rp,
        vehicleId: lp.vehicleId,
        vehicleColor: lp.vehicleColor,
        username: lp.username,
      };
    }),
  };
}

export function SocketSync() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const profile = useAuthStore((s) => s.profile);
  const gamingId = useLobbyStore((s) => s.gamingId);
  const lobby = useLobbyStore((s) => s.lobby);
  const setLobby = useLobbyStore((s) => s.setLobby);
  const setRace = useRaceStore((s) => s.setRace);
  const setCountdown = useRaceStore((s) => s.setCountdown);
  const setWeather = useRaceStore((s) => s.setWeather);

  useEffect(() => {
    if (!token) return;

    initSocketListeners({
      onLobbyUpdate: (updatedLobby) => {
        setLobby(updatedLobby);
      },
      onCountdown: (value) => {
        setCountdown(value);
      },
      onRaceStart: (race) => {
        const lobby = useLobbyStore.getState().lobby;
        const mergedRace = applyLobbySelectionsToRace(race, lobby);
        const me = lobby?.players.find((p) => p.id === useLobbyStore.getState().localPlayerId)
          ?? lobby?.players.find((p) => p.username === useAuthStore.getState().profile.username);
        if (me) {
          useLobbyStore.getState().updateMySelection(me.vehicleId, me.vehicleColor);
        }
        setRace(mergedRace);
        setCountdown(null);
        navigate('/race');
      },
      onWeatherSync: (weather, timeOfDay) => {
        setWeather(weather, timeOfDay);
      },
      onError: (message) => {
        console.error('Socket error:', message);
      },
    });
  }, [token, setLobby, setRace, setCountdown, setWeather, navigate]);

  useEffect(() => {
    if (!token || !gamingId || !lobby) return;
    joinLobbySocket(gamingId, token, profile.avatar);
  }, [token, gamingId, lobby?.gamingId, profile.avatar]);

  return null;
}
