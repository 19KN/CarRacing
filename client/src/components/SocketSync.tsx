import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useLobbyStore, useRaceStore } from '../stores';
import { initSocketListeners, joinLobbySocket } from '../utils/socket';

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
        setRace(race);
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
