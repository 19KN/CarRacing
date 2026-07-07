import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores';
import { AuthScreen } from '../features/auth/AuthScreen';
import { MainMenu } from '../features/menu/MainMenu';
import { CreateLobby, JoinLobby, LobbyScreen } from '../features/lobby/LobbyScreens';
import { RaceHUD, SoloRace } from '../features/race/RaceScreen';
import { SoloPracticeSetup } from '../features/race/SoloPracticeSetup';
import { ResultsScreen } from '../features/race/ResultsScreen';
import { GarageScreen } from '../features/garage/GarageScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { LeaderboardScreen } from '../features/leaderboard/LeaderboardScreen';
import { SocketSync } from '../components/SocketSync';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const rehydrate = useAuthStore.persist?.rehydrate;
    if (rehydrate) rehydrate();
  }, []);

  return (
    <BrowserRouter>
      <SocketSync />
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/menu" /> : <AuthScreen />} />
        <Route path="/menu" element={<ProtectedRoute><MainMenu /></ProtectedRoute>} />
        <Route path="/lobby/create" element={<ProtectedRoute><CreateLobby /></ProtectedRoute>} />
        <Route path="/lobby/join" element={<ProtectedRoute><JoinLobby /></ProtectedRoute>} />
        <Route path="/lobby" element={<ProtectedRoute><LobbyScreen /></ProtectedRoute>} />
        <Route path="/race" element={<ProtectedRoute><RaceHUD /></ProtectedRoute>} />
        <Route path="/race/solo" element={<ProtectedRoute><SoloPracticeSetup /></ProtectedRoute>} />
        <Route path="/race/solo/play" element={<ProtectedRoute><SoloRace /></ProtectedRoute>} />
        <Route path="/results" element={<ProtectedRoute><ResultsScreen /></ProtectedRoute>} />
        <Route path="/garage" element={<ProtectedRoute><GarageScreen /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsScreen /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardScreen /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
