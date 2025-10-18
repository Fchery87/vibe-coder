import { Request, Response, NextFunction } from 'express';
import redisClient from '../services/redis-client';

/**
 * Rate Limiting Middleware
 *
 * Protects your API from abuse and excessive usage
 */

interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds (default: 60000 = 1 minute)
  max?: number; // Maximum requests per window (default: 100)
  message?: string; // Error message
  keyGenerator?: (req: Request) => string; // Custom key generator
  skip?: (req: Request) => boolean; // Skip rate limiting
  onLimitReached?: (req: Request) => void; // Callback when limit reached
}

/**
 * Default key generator (uses IP address)
 */
function defaultKeyGenerator(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Rate limiting middleware
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 60000, // 1 minute
    max = 100,
    message = 'Too many requests, please try again later.',
    keyGenerator = defaultKeyGenerator,
    skip,
    onLimitReached,
  } = options;

  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip if specified
      if (skip && skip(req)) {
        return next();
      }

      // Generate rate limit key
      const identifier = keyGenerator(req);
      const key = `ratelimit:${req.path}:${identifier}`;

      // Increment counter
      const count = await redisClient.incr(key);

      // Set expiration on first request
      if (count === 1) {
        await redisClient.expire(key, windowSeconds);
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
      res.setHeader('X-RateLimit-Reset', Date.now() + windowMs);

      // Check if limit exceeded
      if (count > max) {
        console.warn(`⚠️  Rate limit exceeded: ${identifier} on ${req.path} (${count}/${max})`);

        if (onLimitReached) {
          onLimitReached(req);
        }

        return res.status(429).json({
          error: 'Rate limit exceeded',
          message,
          retryAfter: windowSeconds,
        });
      }

      next();
    } catch (error: any) {
      console.error('Rate limit middleware error:', error);
      // Continue without rate limiting on error
      next();
    }
  };
}

/**
 * Rate limit by user ID (requires authentication)
 */
export function rateLimitByUser(options: RateLimitOptions = {}) {
  return rateLimit({
    ...options,
    keyGenerator: (req: Request) => {
      // Assuming you have user info in req.user
      return (req as any).user?.id || defaultKeyGenerator(req);
    },
  });
}

/**
 * Rate limit for expensive operations (lower limits)
 */
export function rateLimitExpensive(options: Partial<RateLimitOptions> = {}) {
  return rateLimit({
    windowMs: 60000, // 1 minute
    max: 10, // Only 10 requests per minute
    message: 'Too many expensive operations, please slow down.',
    ...options,
  });
}

/**
 * Rate limit for LLM requests specifically
 */
export function rateLimitLLM(options: Partial<RateLimitOptions> = {}) {
  return rateLimit({
    windowMs: 60000, // 1 minute
    max: 20, // 20 LLM requests per minute
    message: 'Too many LLM requests, please wait before trying again.',
    keyGenerator: (req: Request) => {
      // Rate limit by user if available, otherwise by IP
      const userId = (req as any).user?.id;
      const ip = req.ip || 'unknown';
      return userId ? `user:${userId}` : `ip:${ip}`;
    },
    ...options,
  });
}

/**
 * Get rate limit info for a key
 */
export async function getRateLimitInfo(
  path: string,
  identifier: string
): Promise<{
  count: number;
  limit: number;
  remaining: number;
  resetAt: number;
}> {
  try {
    const key = `ratelimit:${path}:${identifier}`;
    const count = (await redisClient.get(key) as number) || 0;
    const ttl = await redisClient.ttl(key);

    return {
      count,
      limit: 100, // Default limit
      remaining: Math.max(0, 100 - count),
      resetAt: Date.now() + (ttl * 1000),
    };
  } catch (error) {
    return {
      count: 0,
      limit: 100,
      remaining: 100,
      resetAt: Date.now() + 60000,
    };
  }
}

/**
 * Reset rate limit for a specific key
 */
export async function resetRateLimit(
  path: string,
  identifier: string
): Promise<boolean> {
  try {
    const key = `ratelimit:${path}:${identifier}`;
    await redisClient.del(key);
    console.log(`✅ Rate limit reset for ${identifier} on ${path}`);
    return true;
  } catch (error) {
    console.error('Rate limit reset error:', error);
    return false;
  }
}
