import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'surgewatch_super_secure_emergency_secret_2026';

export interface TokenUserPayload {
  id: string;
  email: string;
  role: string;
  fullName: string;
  hospitalId?: string;
  hospitalName?: string;
}

/**
 * Signs a short-lived access token
 */
export function signAccessToken(payload: TokenUserPayload, expiresIn: string = '2h'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

/**
 * Verifies a JWT access token
 */
export function verifyAccessToken(token: string): TokenUserPayload {
  return jwt.verify(token, JWT_SECRET) as TokenUserPayload;
}

/**
 * Generates a cryptographically secure random token (hex)
 */
export function generateRandomToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Computes a SHA-256 hash of a raw token for secure database storage
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

