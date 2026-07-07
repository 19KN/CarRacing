import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../../components/ui';
import { useSettingsStore } from '../../stores';

export function SettingsScreen() {
  const { settings, updateGraphics, updateAudio } = useSettingsStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-game-dark p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <h2 className="text-3xl font-display font-bold text-saffron mb-6">Settings</h2>

        <Card>
          <h3 className="font-display font-semibold text-saffron mb-4">Graphics</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Quality</label>
              <select
                value={settings.graphics.quality}
                onChange={(e) => updateGraphics({ quality: e.target.value as 'low' | 'medium' | 'high' | 'ultra' })}
                className="game-input mt-1"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="ultra">Ultra</option>
              </select>
            </div>
            {[
              { key: 'shadows' as const, label: 'Shadows' },
              { key: 'bloom' as const, label: 'Bloom' },
              { key: 'motionBlur' as const, label: 'Motion Blur' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{label}</span>
                <input
                  type="checkbox"
                  checked={settings.graphics[key]}
                  onChange={(e) => updateGraphics({ [key]: e.target.checked })}
                  className="w-5 h-5 accent-saffron"
                />
              </label>
            ))}
            <div>
              <label className="text-sm text-gray-400">Draw Distance: {settings.graphics.drawDistance}m</label>
              <input
                type="range" min="100" max="1000" step="50"
                value={settings.graphics.drawDistance}
                onChange={(e) => updateGraphics({ drawDistance: parseInt(e.target.value) })}
                className="w-full accent-saffron mt-1"
              />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-display font-semibold text-saffron mb-4">Audio</h3>
          {(['master', 'engine', 'ambient', 'ui', 'music'] as const).map((key) => (
            <div key={key} className="mb-3">
              <label className="text-sm text-gray-400 capitalize">{key}: {Math.round(settings.audio[key] * 100)}%</label>
              <input
                type="range" min="0" max="1" step="0.05"
                value={settings.audio[key]}
                onChange={(e) => updateAudio({ [key]: parseFloat(e.target.value) })}
                className="w-full accent-saffron mt-1"
              />
            </div>
          ))}
        </Card>

        <Card>
          <h3 className="font-display font-semibold text-saffron mb-4">Controls</h3>
          <div className="text-sm text-gray-400 space-y-1">
            <p>W / ↑ - Accelerate</p>
            <p>S / ↓ - Brake / Reverse</p>
            <p>A / ← - Steer Left</p>
            <p>D / → - Steer Right</p>
            <p>Space - Handbrake / Drift</p>
            <p>H - Horn</p>
            <p>N - Nitro</p>
            <p>C - Switch Camera</p>
            <p>Esc - Pause</p>
          </div>
        </Card>

        <Button variant="secondary" onClick={() => navigate('/menu')} className="w-full">Back</Button>
      </div>
    </div>
  );
}
