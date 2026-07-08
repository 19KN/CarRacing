import { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../../components/ui';
import { useAuthStore, useLobbyStore } from '../../stores';
import { VEHICLES, VEHICLE_COLORS, MAPS, DEFAULT_MAP_ID, DEFAULT_TRAFFIC_LEVEL, TrafficLevel } from '@indian-racing/shared';
import { TrafficLevelPicker } from '../../components/ui/TrafficLevelPicker';

const VehiclePreview = lazy(() => import('../garage/VehiclePreview').then((m) => ({ default: m.VehiclePreview })));

export function SoloPracticeSetup() {
  const profile = useAuthStore((s) => s.profile);
  const updateMySelection = useLobbyStore((s) => s.updateMySelection);
  const storedVehicleId = useLobbyStore((s) => s.selectedVehicleId);
  const storedColor = useLobbyStore((s) => s.selectedVehicleColor);
  const storedMapId = useLobbyStore((s) => s.selectedMapId);
  const storedTrafficLevel = useLobbyStore((s) => s.selectedTrafficLevel);
  const navigate = useNavigate();

  const [vehicleId, setVehicleId] = useState(storedVehicleId || profile.favoriteVehicle);
  const [color, setColor] = useState(storedColor || profile.unlockedColors[0] || VEHICLE_COLORS[0]);
  const [mapId, setMapId] = useState(storedMapId || DEFAULT_MAP_ID);
  const [trafficLevel, setTrafficLevel] = useState<TrafficLevel>(storedTrafficLevel || DEFAULT_TRAFFIC_LEVEL);

  const selectedVehicle = VEHICLES.find((v) => v.id === vehicleId);
  const selectedMap = MAPS.find((m) => m.id === mapId);

  const handleStart = () => {
    updateMySelection(vehicleId, color, mapId, trafficLevel);
    navigate('/race/solo/play');
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-game-dark p-4 pb-10">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <h2 className="text-2xl font-display font-bold text-saffron mb-1">Solo Practice</h2>
            <p className="text-sm text-gray-400 mb-4">Choose your map and vehicle, then hit the road</p>

            <h3 className="font-display font-semibold text-saffron mb-3">Choose Map</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {MAPS.map((m) => (
                <button
                  key={m.id}
                  type="button"
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
              <p className="text-xs text-gray-500 mb-4">
                Selected: <span className="text-saffron">{selectedMap.name}</span>
              </p>
            )}

            <TrafficLevelPicker
              value={trafficLevel}
              onChange={setTrafficLevel}
              className="mb-6"
            />

            <h3 className="font-display font-semibold text-saffron mb-3">Select Vehicle</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-72 overflow-y-auto">
              {VEHICLES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVehicleId(v.id)}
                  className={`p-2 rounded-lg text-xs text-center transition-all ${
                    vehicleId === v.id
                      ? 'bg-saffron/20 border-2 border-saffron'
                      : 'bg-game-dark border border-game-border hover:border-saffron/50'
                  }`}
                >
                  <div className="font-semibold truncate">{v.name}</div>
                  <div className="text-gray-500">{v.stats.maxSpeed} km/h</div>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {VEHICLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-3 border-indiaGreen/40">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-display font-semibold text-saffron text-sm">Vehicle Preview</h3>
              {selectedVehicle && (
                <span className="text-xs text-gray-400">{selectedVehicle.stats.maxSpeed} km/h</span>
              )}
            </div>
            <Suspense fallback={
              <div className="h-56 lg:h-64 rounded-xl bg-game-dark border border-game-border flex items-center justify-center text-gray-500 text-sm">
                Loading model...
              </div>
            }>
              <VehiclePreview
                key={vehicleId}
                vehicleId={vehicleId}
                color={color}
                className="h-56 lg:h-64"
              />
            </Suspense>
            {selectedVehicle && (
              <p className="text-center text-sm text-white font-semibold mt-2">{selectedVehicle.name}</p>
            )}
          </Card>

          <Button onClick={handleStart} className="w-full game-btn-primary">
            Start Race
          </Button>
          <Button variant="secondary" onClick={() => navigate('/menu')} className="w-full">
            Back to Menu
          </Button>
        </div>
      </div>
    </div>
  );
}
