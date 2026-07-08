import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../../components/ui';
import { useAuthStore } from '../../stores';
import { VEHICLES, VEHICLE_COLORS, getVehicleById } from '@indian-racing/shared';
import { VehiclePreview } from './VehiclePreview';

function vehicleIcon(category: string, id: string) {
  if (id === 'cruise_ship') return '🚢';
  if (id === 'f1_car') return '🏎️';
  if (id === 'dodge_challenger' || id === 'bursley_defiance') return '🏁';
  if (category === 'two_wheeler') return '🏍️';
  if (category === 'commercial') return '🚛';
  if (id === 'jeep') return '🛻';
  return '🚗';
}

export function GarageScreen() {
  const profile = useAuthStore((s) => s.profile);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const navigate = useNavigate();

  const initialIndex = Math.max(
    0,
    VEHICLES.findIndex((v) => v.id === profile.favoriteVehicle),
  );
  const [index, setIndex] = useState(initialIndex);
  const [color, setColor] = useState('#f5c518');

  const selected = VEHICLES[index];
  const selectedVehicle = getVehicleById(selected?.id ?? '');

  const selectIndex = useCallback(
    (nextIndex: number) => {
      const wrapped = (nextIndex + VEHICLES.length) % VEHICLES.length;
      setIndex(wrapped);
      updateProfile({ favoriteVehicle: VEHICLES[wrapped].id });
    },
    [updateProfile],
  );

  const goPrev = () => selectIndex(index - 1);
  const goNext = () => selectIndex(index + 1);

  return (
    <div className="min-h-screen bg-game-dark p-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-display font-bold text-saffron mb-6">Garage</h2>

        <Card className="p-4 md:p-6 mb-6">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <h3 className="font-display font-semibold text-white text-xl md:text-2xl">
                {selectedVehicle?.name || 'Vehicle'}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {selectedVehicle
                  ? `${selectedVehicle.stats.maxSpeed} km/h · ${selectedVehicle.category} · ${selectedVehicle.description}`
                  : ''}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-2xl">{vehicleIcon(selected?.category ?? '', selected?.id ?? '')}</span>
              <p className="text-[11px] text-gray-500 mt-1">
                {index + 1} / {VEHICLES.length}
              </p>
            </div>
          </div>

          <div className="relative mt-4">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous vehicle"
              className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/50 border border-white/20 text-white text-xl md:text-2xl flex items-center justify-center hover:bg-saffron/80 hover:border-saffron transition-all shadow-lg"
            >
              ‹
            </button>

            <div className="mx-12 md:mx-16">
              <VehiclePreview vehicleId={selected.id} color={color} />
            </div>

            <button
              type="button"
              onClick={goNext}
              aria-label="Next vehicle"
              className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/50 border border-white/20 text-white text-xl md:text-2xl flex items-center justify-center hover:bg-saffron/80 hover:border-saffron transition-all shadow-lg"
            >
              ›
            </button>
          </div>

          <div className="mt-4">
            <h4 className="text-sm text-gray-400 mb-2">Paint Color</h4>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {VEHICLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-110 ${
                    color === c ? 'border-white scale-110' : 'border-white/20'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </Card>

        <Button variant="secondary" onClick={() => navigate('/menu')} className="w-full">
          Back to Menu
        </Button>
      </div>
    </div>
  );
}
