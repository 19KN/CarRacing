import { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: ReactNode;
}

export function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  const variants = {
    primary: 'game-btn-primary',
    secondary: 'game-btn-secondary',
    danger: 'game-btn-danger',
  };
  return (
    <button className={`${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div className={`game-card ${className}`} onClick={onClick}>{children}</div>;
}

export function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`game-input ${className}`} {...props} />;
}

export function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="game-card max-w-lg w-full mx-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-display font-bold text-saffron">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 border-4 border-saffron/30 border-t-saffron rounded-full animate-spin" />
      <p className="text-gray-300 font-display text-lg">{message}</p>
    </div>
  );
}

export function HealthBar({ health }: { health: number }) {
  const color = health > 50 ? 'bg-indiaGreen' : health > 20 ? 'bg-saffron' : 'bg-red-500';
  return (
    <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all duration-300 rounded-full`} style={{ width: `${health}%` }} />
    </div>
  );
}

export function Speedometer({ speed }: { speed: number }) {
  const display = Math.min(Math.round(speed), 300);
  return (
    <div className="text-center min-w-[5.5rem]">
      <div className="text-4xl font-display font-bold text-white tabular-nums">{display}</div>
      <div className="text-xs text-gray-400 uppercase tracking-wider">km/h · max 300</div>
    </div>
  );
}
