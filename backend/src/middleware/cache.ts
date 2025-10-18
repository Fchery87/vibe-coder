import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import redisClient from '../services/redis-client';

/**
 * LLM Response Caching Middleware
 *
 * Caches LLM responses to reduce costs and improve response times
 */

interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 1 hour)
  keyPrefix?: string; // Cache key prefix (default: 'llm')
  skipCache?: (req: Request) => boolean; // Function to skip caching
}

/**
 * Generate a cache key from request body
 */
function generateCacheKey(prefix: string, data: any): string {
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')
    .substring(0, 16);

  return `${prefix}:${hash}`;
}

/**
 * Cache LLM responses
 */
export function cacheLLMResponse(options: CacheOptions = {}) {
  const { ttl = 3600, keyPrefix = 'llm', skipCache } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching if specified
    if (skipCache && skipCache(req)) {
      return next();
    }

    // Only cache POST requests with body
    if (req.method !== 'POST' || !req.body) {
      return next();
    }

    try {
      // Generate cache key from request body
      const cacheKey = generateCacheKey(keyPrefix, {
        prompt: req.body.prompt,
        model: req.body.model,
        provider: req.body.provider,
        temperature: req.body.temperature,
        maxTokens: req.body.maxTokens,
      });

      // Try to get from cache
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        console.log(`✅ Cache HIT: ${cacheKey}`);

        // Return cached response
        return res.json({
          ...cached,
          cached: true,
          cacheKey,
        });
      }

      console.log(`❌ Cache MISS: ${cacheKey}`);

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = function(body: any) {
        // Cache the response (don't await to avoid blocking)
        redisClient.set(cacheKey, body, { ex: ttl }).catch(err => {
          console.error('Cache write error:', err);
        });

        console.log(`💾 Cached response: ${cacheKey} (TTL: ${ttl}s)`);

        // Call original json method
        return originalJson(body);
      };

      next();
    } catch (error: any) {
      console.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Cache GitHub API responses
 */
export function cacheGitHubAPI(options: CacheOptions = {}) {
  const { ttl = 300, keyPrefix = 'github' } = options; // 5 minutes default

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Generate cache key from URL and query params
      const cacheKey = generateCacheKey(keyPrefix, {
        path: req.path,
        query: req.query,
        method: req.method,
      });

      // Try to get from cache
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        console.log(`✅ GitHub Cache HIT: ${cacheKey}`);
        return res.json(cached);
      }

      console.log(`❌ GitHub Cache MISS: ${cacheKey}`);

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = function(body: any) {
        // Cache the response
        redisClient.set(cacheKey, body, { ex: ttl }).catch(err => {
          console.error('GitHub cache write error:', err);
        });

        return originalJson(body);
      };

      next();
    } catch (error: any) {
      console.error('GitHub cache middleware error:', error);
      next();
    }
  };
}

/**
 * Clear cache by pattern
 */
export async function clearCache(pattern: string): Promise<number> {
  try {
    // Note: Upstash REST API doesn't support SCAN
    // You'll need to track keys manually or use a different approach
    console.log(`Cache clear requested for pattern: ${pattern}`);
    return 0;
  } catch (error: any) {
    console.error('Cache clear error:', error);
    return 0;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  hits: number;
  misses: number;
  hitRate: number;
}> {
  try {
    // Get stats from Redis (stored as counters)
    const hits = await redisClient.get('cache:stats:hits') as number || 0;
    const misses = await redisClient.get('cache:stats:misses') as number || 0;
    const total = hits + misses;
    const hitRate = total > 0 ? hits / total : 0;

    return { hits, misses, hitRate };
  } catch (error) {
    return { hits: 0, misses: 0, hitRate: 0 };
  }
}
