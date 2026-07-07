import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config';
import { generatePlayerId } from '../utils/idGenerator';

const googleClient = config.googleClientId
  ? new OAuth2Client(config.googleClientId, config.googleClientSecret)
  : null;

export interface AuthTokenPayload {
  playerId: string;
  username: string;
  email?: string;
  isGuest: boolean;
}

export async function verifyGoogleToken(idToken: string): Promise<AuthTokenPayload | null> {
  if (!googleClient || !config.googleClientId) {
    return null;
  }
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload) return null;
    return {
      playerId: generatePlayerId(),
      username: payload.name || payload.email?.split('@')[0] || 'Player',
      email: payload.email,
      isGuest: false,
    };
  } catch {
    return null;
  }
}

export function createGuestSession(username: string): AuthTokenPayload {
  return {
    playerId: generatePlayerId(),
    username: username || `Guest${Math.floor(Math.random() * 9999)}`,
    isGuest: true,
  };
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
  } catch {
    return null;
  }
}
