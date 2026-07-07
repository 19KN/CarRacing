import { useVehicleControls } from '../../game/core/controls';

export function TouchControls() {
  const { inputRef } = useVehicleControls();
  const isMobile = typeof window !== 'undefined' && 'ontouchstart' in window;
  if (!isMobile) return null;

  const handleTouch = (action: string, active: boolean) => {
    switch (action) {
      case 'accel': inputRef.current.accelerate = active ? 1 : 0; break;
      case 'brake': inputRef.current.brake = active ? 1 : 0; break;
      case 'left': if (active) inputRef.current.steer = -1; else if (inputRef.current.steer === -1) inputRef.current.steer = 0; break;
      case 'right': if (active) inputRef.current.steer = 1; else if (inputRef.current.steer === 1) inputRef.current.steer = 0; break;
      case 'handbrake': inputRef.current.handbrake = active; break;
    }
  };

  const btnClass = "w-16 h-16 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-2xl active:bg-saffron/30 pointer-events-auto select-none";

  return (
    <div className="absolute bottom-4 left-0 right-0 flex justify-between px-4 pointer-events-none z-40 md:hidden">
      <div className="flex gap-2">
        <button className={btnClass} onTouchStart={() => handleTouch('left', true)} onTouchEnd={() => handleTouch('left', false)}>←</button>
        <button className={btnClass} onTouchStart={() => handleTouch('right', true)} onTouchEnd={() => handleTouch('right', false)}>→</button>
      </div>
      <div className="flex gap-2">
        <button className={btnClass} onTouchStart={() => handleTouch('brake', true)} onTouchEnd={() => handleTouch('brake', false)}>B</button>
        <button className={`${btnClass} w-20 h-20`} onTouchStart={() => handleTouch('accel', true)} onTouchEnd={() => handleTouch('accel', false)}>A</button>
      </div>
    </div>
  );
}
