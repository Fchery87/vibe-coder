import { randomBytes } from 'crypto';
import redisClient from './redis-client';

/**
 * Redis Session Service
 *
 * Replaces iron-session with Redis-based sessions for better scalability
 */

export interface SessionData {
  userId?: string;
  email?: string;
  name?: string;
  [key: string]: any;
}

export interface SessionConfig {
  ttl?: number; // Session TTL in seconds (default: 24 hours)
  prefix?: string; // Redis key prefix
}

export class SessionService {
  private ttl: number;
  private prefix: string;

  constructor(config: SessionConfig = {}) {
    this.ttl = config.ttl ?? 86400; // 24 hours
    this.prefix = config.prefix ?? 'session';
  }

  /**
   * Generate a new session ID
   */
  generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Get session key
   */
  private getKey(sessionId: string): string {
    return `${this.prefix}:${sessionId}`;
  }

  /**
   * Create a new session
   */
  async create(data: SessionData): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      const key = this.getKey(sessionId);

      await redisClient.set(key, data, { ex: this.ttl });

      console.log(`✅ Session created: ${sessionId}`);
      return sessionId;
    } catch (error: any) {
      console.error('Session create error:', error.message);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Get session data
   */
  async get(sessionId: string): Promise<SessionData | null> {
    try {
      const key = this.getKey(sessionId);
      const data = await redisClient.get(key);

      if (!data) {
        return null;
      }

      // Refresh TTL on access
      await redisClient.expire(key, this.ttl);

      return data as SessionData;
    } catch (error: any) {
      console.error('Session get error:', error.message);
      return null;
    }
  }

  /**
   * Update session data
   */
  async update(sessionId: string, data: Partial<SessionData>): Promise<boolean> {
    try {
      const key = this.getKey(sessionId);
      const existing = await this.get(sessionId);

      if (!existing) {
        return false;
      }

      const updated = { ...existing, ...data };
      await redisClient.set(key, updated, { ex: this.ttl });

      console.log(`✅ Session updated: ${sessionId}`);
      return true;
    } catch (error: any) {
      console.error('Session update error:', error.message);
      return false;
    }
  }

  /**
   * Destroy session
   */
  async destroy(sessionId: string): Promise<boolean> {
    try {
      const key = this.getKey(sessionId);
      await redisClient.del(key);

      console.log(`✅ Session destroyed: ${sessionId}`);
      return true;
    } catch (error: any) {
      console.error('Session destroy error:', error.message);
      return false;
    }
  }

  /**
   * Touch session (refresh TTL without updating data)
   */
  async touch(sessionId: string): Promise<boolean> {
    try {
      const key = this.getKey(sessionId);
      await redisClient.expire(key, this.ttl);
      return true;
    } catch (error: any) {
      console.error('Session touch error:', error.message);
      return false;
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<string[]> {
    // Note: This requires tracking session IDs separately
    // Upstash REST doesn't support SCAN, so you'd need to maintain a set
    console.log(`Getting sessions for user: ${userId}`);
    return [];
  }

  /**
   * Destroy all sessions for a user
   */
  async destroyUserSessions(userId: string): Promise<number> {
    // Note: This requires tracking session IDs separately
    console.log(`Destroying all sessions for user: ${userId}`);
    return 0;
  }
}

// Export singleton instance
export const sessionService = new SessionService({
  ttl: 86400, // 24 hours
  prefix: 'session',
});

export default sessionService;

/**
 * Express middleware for session handling
 */
import { Request, Response, NextFunction } from 'express';

export function sessionMiddleware(
  req: Request & { session?: SessionData; sessionId?: string },
  res: Response,
  next: NextFunction
) {
  // Get session ID from cookie or header
  const sessionId =
    req.cookies?.sessionId ||
    req.headers['x-session-id'] as string;

  if (sessionId) {
    // Load session
    sessionService.get(sessionId).then(session => {
      if (session) {
        (req as any).session = session;
        (req as any).sessionId = sessionId;
      }
      next();
    }).catch(() => next());
  } else {
    next();
  }
}

/**
 * Helper to create session and set cookie
 */
export async function createSession(
  res: Response,
  data: SessionData
): Promise<string> {
  const sessionId = await sessionService.create(data);

  // Set cookie
  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400000, // 24 hours
  });

  return sessionId;
}

/**
 * Helper to destroy session and clear cookie
 */
export async function destroySession(
  req: Request & { sessionId?: string },
  res: Response
): Promise<void> {
  if ((req as any).sessionId) {
    await sessionService.destroy((req as any).sessionId);
  }

  res.clearCookie('sessionId');
}
