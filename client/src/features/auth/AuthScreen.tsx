import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '../../components/ui';
import { useAuthStore } from '../../stores';
import { apiFetch } from '../../utils/api';

const AVATARS = ['🏎️', '🏍️', '🛺', '🚗', '🚛', '🚌', '🏁', '🇮🇳', '⚡', '🔥'];

export function AuthScreen() {
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('🏎️');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleGuest = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<{ token: string; user: { playerId: string; username: string; isGuest: boolean } }>(
        '/api/auth/guest',
        { method: 'POST', body: JSON.stringify({ username: username.trim() }) },
      );
      setAuth(data.token, {
        id: data.user.playerId,
        username: data.user.username,
        avatar,
        isGuest: true,
      });
      navigate('/menu');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('Google OAuth requires GOOGLE_CLIENT_ID. Use Guest Login for now.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-game-dark via-[#0f1628] to-game-dark p-4">
      <Card className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold bg-gradient-to-r from-saffron via-white to-indiaGreen bg-clip-text text-transparent">
            Indian Racing
          </h1>
          <p className="text-gray-400 mt-2">Race on Indian highways with friends</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Username</label>
            <Input
              placeholder="Enter your racing name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Avatar</label>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                    avatar === a ? 'bg-saffron/30 border-2 border-saffron scale-110' : 'bg-game-dark border border-game-border hover:border-saffron/50'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <Button onClick={handleGuest} disabled={loading} className="w-full">
            {loading ? 'Joining...' : 'Play as Guest'}
          </Button>

          <Button variant="secondary" onClick={handleGoogle} className="w-full flex items-center justify-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Sign in with Google
          </Button>
        </div>
      </Card>
    </div>
  );
}
