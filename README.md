# Indian Racing Game

A production-ready browser-based multiplayer racing game set on Indian highways and cities. Race with friends using unique Gaming IDs, choose from 18 vehicles, explore 12 Indian maps, and experience dynamic weather, AI traffic, and immersive gameplay.

![Indian Racing Game](client/public/favicon.svg)

## Features

- **Multiplayer Lobby System** — Create/join lobbies with Gaming IDs (e.g., `IND458923`), support for 2/4/8/16 players
- **18 Vehicles** — From bicycles to formula cars, each with unique physics (speed, acceleration, handling, weight)
- **12 Indian Maps** — Bangalore→Hyderabad, Kerala Hills, Ladakh Mountains, Goa Beaches, and more
- **AI Traffic System** — Cars, buses, autos, lorries with traffic signals (red/yellow/green)
- **Health System** — Collision damage, smoke effects, respawn at checkpoints
- **Dynamic Weather** — Rain, fog, thunder, wind with day/night cycles
- **5 Camera Modes** — First person, third person, top view, free camera, cinematic
- **Game Economy** — Earn coins and XP, unlock vehicles, achievements
- **Modern UI** — Dark gaming theme with saffron/teal accents, mobile touch controls
- **Audio System** — Engine sounds, horns, collisions, ambient effects

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Three.js (R3F), TypeScript, Tailwind CSS, Zustand |
| Backend | Node.js, Express, Socket.IO |
| Physics | Custom vehicle physics engine |
| Graphics | Post-processing (Bloom), shadows, weather effects |
| Deployment | Render |

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Local Development

```bash
# Clone and install
cd RacingGame
npm install

# Build shared package
npm run build -w shared

# Start dev servers (API on :3001, client on :5173)
npm run dev
```

Open http://localhost:5173 in your browser.

### Environment Variables

Create `server/.env` from the example:

```bash
cp server/.env.example server/.env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `JWT_SECRET` | JWT signing secret | (required in production) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | (optional) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | (optional) |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `CLIENT_URL` | Client URL | `http://localhost:5173` |

### Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web application)
4. Add authorized origins: `http://localhost:5173`, your Render URL
5. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in env vars

## Deployment on Render

1. Push this repo to GitHub
2. In Render Dashboard → New → Blueprint → connect repo (uses `render.yaml`)
3. Set environment variables:
   - `JWT_SECRET` — auto-generated
   - `CORS_ORIGIN` — your Render URL (e.g., `https://indian-racing-game.onrender.com`)
   - `CLIENT_URL` — same as CORS_ORIGIN
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — if using Google login
4. Deploy

The build process:
1. Installs all workspace dependencies
2. Builds shared types → client (Vite) → server (TypeScript)
3. Server serves API + static client files on one port

## Controls

| Key | Action |
|-----|--------|
| W / ↑ | Accelerate |
| S / ↓ | Brake / Reverse |
| A / ← | Steer Left |
| D / → | Steer Right |
| Space | Handbrake / Drift |
| H | Horn |
| N | Nitro |
| C | Switch Camera |
| Esc | Pause |

Gamepad supported via standard mapping. Touch controls available on mobile.

## Project Structure

```
RacingGame/
├── client/          # React + Three.js frontend
│   └── src/
│       ├── app/         # Router
│       ├── features/    # UI screens (auth, lobby, race, etc.)
│       ├── game/        # 3D engine (physics, maps, traffic, weather)
│       ├── stores/      # Zustand state
│       └── utils/       # API, socket, progression
├── server/          # Express + Socket.IO backend
│   └── src/
│       ├── controllers/ # REST API routes
│       ├── services/    # Lobby, race, auth logic
│       └── sockets/     # Real-time event handlers
├── shared/          # Shared types, vehicles, maps configs
└── render.yaml      # Render deployment config
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/guest` | Guest login |
| POST | `/api/auth/google` | Google OAuth |
| GET | `/api/vehicles` | Vehicle catalog |
| GET | `/api/maps` | Map catalog |
| POST | `/api/lobby/create` | Create lobby |
| POST | `/api/lobby/join` | Join lobby |
| GET | `/api/leaderboard` | Leaderboard |

## Socket.IO Events

**Client → Server:** `joinLobby`, `leaveLobby`, `chat`, `selectVehicle`, `selectColor`, `selectMap`, `setReady`, `positionUpdate`, `collision`, `checkpoint`, `raceFinish`, `horn`, `nitro`, `reconnect`

**Server → Client:** `lobbyUpdate`, `chat`, `countdown`, `raceStart`, `positionSync`, `healthUpdate`, `trafficSync`, `weatherSync`, `positionRank`, `raceFinish`, `penalty`

## Asset Replacement Guide

The game uses procedurally generated placeholder assets. To upgrade visuals:

| Asset Type | Location | Replacement |
|-----------|----------|-------------|
| Vehicle models | `client/src/game/vehicles/VehicleMesh.tsx` | Replace box geometry with licensed glTF models |
| Buildings/scenery | `client/src/game/maps/MapEnvironment.tsx` | Swap `SceneryObject` with imported 3D models |
| Road textures | `MapEnvironment.tsx` → `RoadSegment` | Add CC0 asphalt normal maps |
| Audio | `client/src/game/audio/AudioManager.ts` | Replace Web Audio oscillators with Howler.js sound files in `client/public/assets/audio/` |
| Sign boards | `MapEnvironment.tsx` → `SignBoard` | Use higher-res canvas or image textures |

Place 3D models in `client/public/assets/models/` and load with `useGLTF` from `@react-three/drei`.

## Known Limitations

- **No database** — Server state is in-memory (lobbies/races lost on restart)
- **Client-side economy** — Coins, XP, unlocks stored in browser localStorage
- **Leaderboard** — Ephemeral server snapshot, resets on deploy
- **Google OAuth** — Requires manual Google Cloud Console setup
- **Render free tier** — Cold starts may take 30-60 seconds

## License

MIT — Placeholder assets are procedurally generated. Replace with licensed assets for commercial distribution.
