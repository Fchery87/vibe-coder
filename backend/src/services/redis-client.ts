import { Redis } from '@upstash/redis';

/**
 * Upstash Redis Client for caching and session storage
 *
 * Uses REST API - perfect for serverless and edge environments
 *
 * Use this for:
 * - Caching LLM responses
 * - Session management
 * - Rate limiting
 * - Simple key-value storage
 *
 * For job queues, we'll use ioredis connection (see queue-manager)
 */

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    const restUrl = process.env.UPSTASH_REDIS_REST_URL;
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!restUrl || !restToken) {
      throw new Error(
        'Missing Upstash Redis credentials. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env'
      );
    }

    redis = new Redis({
      url: restUrl,
      token: restToken,
    });

    console.log('✅ Upstash Redis client initialized');
  }

  return redis;
}

// Export singleton instance
const redisClient = getRedisClient();
export default redisClient;

/**
 * Example Usage: Caching
 *
 * import redis from './services/redis-client';
 *
 * // Set cache with 1 hour expiration
 * await redis.set('key', 'value', { ex: 3600 });
 *
 * // Get from cache
 * const value = await redis.get('key');
 *
 * // Cache LLM response (Upstash auto-serializes objects)
 * const cacheKey = `llm:${modelName}:${hash(prompt)}`;
 * const cached = await redis.get(cacheKey);
 * if (cached) return cached;
 *
 * const response = await callLLM(prompt);
 * await redis.set(cacheKey, response, { ex: 3600 }); // No need for JSON.stringify!
 */

/**
 * Example Usage: Rate Limiting
 *
 * import redis from './services/redis-client';
 *
 * const key = `ratelimit:${userId}:${endpoint}`;
 * const count = await redis.incr(key);
 *
 * if (count === 1) {
 *   await redis.expire(key, 60); // 60 second window
 * }
 *
 * if (count > 100) {
 *   throw new Error('Rate limit exceeded');
 * }
 */

/**
 * Example Usage: Session Storage
 *
 * import redis from './services/redis-client';
 *
 * // Store session (Upstash auto-serializes objects)
 * const sessionId = generateId();
 * await redis.set(
 *   `session:${sessionId}`,
 *   { userId, data }, // No need for JSON.stringify!
 *   { ex: 86400 } // 24 hours
 * );
 *
 * // Get session (Upstash auto-deserializes)
 * const session = await redis.get(`session:${sessionId}`);
 * return session; // Already an object!
 */
