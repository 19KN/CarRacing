import { Card } from '../../components/ui';

const RULE_SECTIONS = [
  {
    title: 'Controls',
    icon: '🎮',
    items: [
      'WASD or Arrow keys — accelerate, brake, and steer',
      'Space — drift / handbrake around corners',
      'C — switch camera (chase, cockpit, top, free, cinematic)',
      'H — horn',
      'N — nitro boost (limited uses per race)',
      'Esc — pause menu',
      'Mobile — on-screen pedals, steering wheel, and tilt steer',
    ],
  },
  {
    title: 'Lobby & Multiplayer',
    icon: '🏁',
    items: [
      'Share your Lobby ID so friends can join from Main Menu → Join Lobby',
      'Pick your vehicle and color before the race',
      'At least 2 joined players required — empty slots can stay open (e.g. race 3/4)',
      'Every joined player must click Ready; host can Start Race when all are ready',
      'Cross the finish line first to win — finish order is shown to everyone with celebration music',
    ],
  },
  {
    title: 'Health & Collisions',
    icon: '❤️',
    items: [
      'Your vehicle starts at 100% health — watch the health bar during the race',
      'Hit AI traffic on the road — health decreases and your car gets knocked',
      'Hit trees, median dividers, and roadside obstacles — health decreases',
      'Below 50% health — engine smoke; low health also reduces top speed',
      'At 0% health — explosion and respawn (solo practice respawns at 50% health)',
      'Ram another player — no health loss; the hit car is launched to the sidewalk',
    ],
  },
  {
    title: 'Race Tips',
    icon: '💡',
    items: [
      'Drive on the highway lanes — stay clear of trees on the median and footpaths',
      'Watch traffic signals and AI cars on the road',
      'Use nitro on straights; drift (Space) to take sharp turns',
      'Press C to find your favourite camera — chase cam shows the road ahead',
      'Finish position, clean driving, and speed earn coins and XP on the results screen',
    ],
  },
];

export function GameRulesPanel({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="mt-6 pt-5 border-t border-game-border">
        <h3 className="text-sm font-display font-semibold text-saffron mb-2">Quick Rules</h3>
        <ul className="text-xs text-gray-400 space-y-1.5">
          <li><span className="text-gray-300">C</span> — camera · <span className="text-gray-300">H</span> — horn · <span className="text-gray-300">N</span> — nitro · <span className="text-gray-300">Space</span> — drift</li>
          <li>Traffic & trees reduce health — keep above 0% or you explode</li>
          <li>Player bumps launch rivals — no health loss in multiplayer</li>
          <li>All joined players Ready → host starts the race</li>
        </ul>
      </div>
    );
  }

  return (
    <Card className="border-game-border/80">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📋</span>
        <div>
          <h3 className="text-lg font-display font-bold text-saffron">Rules & Instructions</h3>
          <p className="text-xs text-gray-500">How to play Indian Racing Game</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {RULE_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="rounded-lg bg-game-dark/80 border border-game-border/60 p-4"
          >
            <h4 className="font-display font-semibold text-white text-sm mb-2 flex items-center gap-2">
              <span>{section.icon}</span>
              {section.title}
            </h4>
            <ul className="space-y-1.5">
              {section.items.map((item) => (
                <li key={item} className="text-xs text-gray-400 leading-relaxed flex gap-2">
                  <span className="text-saffron shrink-0 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
