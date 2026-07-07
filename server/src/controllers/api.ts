import { Router, Request, Response } from 'express';
import {
  createGuestSession, verifyGoogleToken, signToken, verifyToken,
} from '../services/authService';
import { lobbyService } from '../services/lobbyService';
import { store } from '../services/memoryStore';
import { raceService } from '../services/raceService';
import { VEHICLES, MAPS, ACHIEVEMENTS } from '@indian-racing/shared';
import { authMiddleware } from '../middleware/auth';
import { MaxPlayers } from '@indian-racing/shared';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now(), lobbies: store.getAllLobbies().length });
});

router.post('/auth/google', async (req: Request, res: Response) => {
  const { idToken } = req.body;
  if (!idToken) {
    res.status(400).json({ error: 'idToken required' });
    return;
  }
  const payload = await verifyGoogleToken(idToken);
  if (!payload) {
    const guest = createGuestSession('Google User');
    const token = signToken(guest);
    res.json({ token, user: guest });
    return;
  }
  const token = signToken(payload);
  res.json({ token, user: payload });
});

router.post('/auth/guest', (req: Request, res: Response) => {
  const { username } = req.body;
  const guest = createGuestSession(username);
  const token = signToken(guest);
  res.json({ token, user: guest });
});

router.get('/auth/me', authMiddleware, (req: Request, res: Response) => {
  const user = (req as Request & { user: ReturnType<typeof verifyToken> }).user;
  res.json({ user });
});

router.get('/vehicles', (_req: Request, res: Response) => {
  res.json({ vehicles: VEHICLES });
});

router.get('/maps', (_req: Request, res: Response) => {
  res.json({ maps: MAPS });
});

router.get('/achievements', (_req: Request, res: Response) => {
  res.json({ achievements: ACHIEVEMENTS });
});

router.post('/lobby/create', authMiddleware, (req: Request, res: Response) => {
  const user = (req as Request & { user: { playerId: string; username: string } }).user;
  const { maxPlayers = 4, avatar = '🏎️', mapId } = req.body;
  const validSizes: MaxPlayers[] = [2, 4, 8, 16];
  const size = validSizes.includes(maxPlayers) ? maxPlayers : 4;
  const validMap = MAPS.some((m) => m.id === mapId) ? mapId : undefined;

  const lobby = lobbyService.createLobby(
    user.playerId,
    user.username,
    avatar,
    size,
    '',
    validMap,
  );
  res.json({ lobby });
});

router.post('/lobby/join', authMiddleware, (req: Request, res: Response) => {
  const user = (req as Request & { user: { playerId: string; username: string } }).user;
  const { gamingId, avatar = '🏎️' } = req.body;
  if (!gamingId) {
    res.status(400).json({ error: 'gamingId required' });
    return;
  }
  const result = lobbyService.joinLobby(gamingId, user.playerId, user.username, avatar, '');
  if ('error' in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ lobby: result.lobby });
});

router.get('/lobby/:gamingId', (req: Request, res: Response) => {
  const gamingId = req.params.gamingId as string;
  const lobby = lobbyService.getLobby(gamingId);
  if (!lobby) {
    res.status(404).json({ error: 'Lobby not found' });
    return;
  }
  res.json({ lobby });
});

router.get('/leaderboard', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json({ leaderboard: store.getLeaderboard(limit) });
});

router.post('/leaderboard/submit', authMiddleware, (req: Request, res: Response) => {
  const { result } = req.body;
  if (!result) {
    res.status(400).json({ error: 'result required' });
    return;
  }
  raceService.submitToLeaderboard(result);
  res.json({ success: true });
});

export default router;
