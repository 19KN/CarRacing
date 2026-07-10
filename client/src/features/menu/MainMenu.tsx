import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui';
import { useAuthStore } from '../../stores';
import { markLobbyMusicNewVisit } from '../../game/audio/AudioManager';

export function MainMenu() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const logout = useAuthStore((s) => s.logout);

  const menuItems = [
    { label: 'Create Lobby', path: '/lobby/create', icon: '🏁', primary: true },
    { label: 'Join Lobby', path: '/lobby/join', icon: '🔗' },
    { label: 'Garage', path: '/garage', icon: '🔧' },
    { label: 'Solo Practice', path: '/race/solo', icon: '🎮' },
    { label: 'Leaderboard', path: '/leaderboard', icon: '🏆' },
    { label: 'Profile', path: '/profile', icon: '👤' },
    { label: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-game-dark via-[#0f1628] to-game-dark relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 text-8xl animate-pulse-slow">🏎️</div>
        <div className="absolute bottom-20 right-10 text-6xl animate-pulse-slow">🛺</div>
        <div className="absolute top-1/2 left-1/4 text-5xl animate-pulse-slow">🚌</div>
      </div>

      <div className="relative z-10 text-center mb-12">
        <h1 className="text-6xl md:text-7xl font-display font-bold bg-gradient-to-r from-saffron via-white to-indiaGreen bg-clip-text text-transparent mb-2">
          INDIAN RACING
        </h1>
        <p className="text-gray-400 text-lg">Multiplayer Highway Racing</p>
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <span className="text-2xl">{profile.avatar}</span>
          <span className="text-saffron font-display font-semibold">{profile.username}</span>
          <span className="text-gray-500">|</span>
          <span className="text-game-gold">💰 {profile.coins}</span>
          <span className="text-gray-500">|</span>
          <span className="text-game-accent">Lv.{profile.level}</span>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg w-full px-4">
        {menuItems.map((item) => (
          <Button
            key={item.path}
            variant={item.primary ? 'primary' : 'secondary'}
            onClick={() => {
              if (item.path === '/lobby/create' || item.path === '/lobby/join') {
                markLobbyMusicNewVisit();
              }
              navigate(item.path);
            }}
            className="flex items-center gap-3 justify-center"
          >
            <span className="text-xl">{item.icon}</span>
            {item.label}
          </Button>
        ))}
      </div>

      <button
        onClick={() => { logout(); navigate('/'); }}
        className="relative z-10 mt-8 text-gray-500 hover:text-red-400 text-sm transition-colors"
      >
        Logout
      </button>
    </div>
  );
}
