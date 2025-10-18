import crypto from 'crypto';
import redisClient from './redis-client';

/**
 * LLM Response Cache Service
 *
 * Caches LLM responses to reduce API costs and improve response times
 */

export interface CacheConfig {
  enabled?: boolean;
  ttl?: number; // Time to live in seconds
  keyPrefix?: string;
}

export class LLMCacheService {
  private enabled: boolean;
  private ttl: number;
  private keyPrefix: string;

  constructor(config: CacheConfig = {}) {
    this.enabled = config.enabled ?? true;
    this.ttl = config.ttl ?? 3600; // 1 hour default
    this.keyPrefix = config.keyPrefix ?? 'llm:cache';
  }

  /**
   * Generate cache key from request parameters
   */
  private generateKey(params: {
    provider: string;
    model: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
  }): string {
    const data = {
      provider: params.provider,
      model: params.model,
      prompt: params.prompt,
      temperature: params.temperature ?? 0.7,
      maxTokens: params.maxTokens ?? 2048,
    };

    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);

    return `${this.keyPrefix}:${params.provider}:${params.model}:${hash}`;
  }

  /**
   * Get cached response
   */
  async get(params: {
    provider: string;
    model: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<any | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const key = this.generateKey(params);
      const cached = await redisClient.get(key);

      if (cached) {
        console.log(`💰 LLM Cache HIT: ${key} (saved API call!)`);
        // Increment cache hit counter
        await redisClient.incr('llm:stats:cache:hits').catch(() => {});
        return cached;
      }

      console.log(`💸 LLM Cache MISS: ${key}`);
      // Increment cache miss counter
      await redisClient.incr('llm:stats:cache:misses').catch(() => {});
      return null;
    } catch (error: any) {
      console.error('LLM cache get error:', error.message);
      return null;
    }
  }

  /**
   * Determine optimal TTL based on prompt content
   */
  private getOptimalTTL(prompt: string): number {
    const promptLower = prompt.toLowerCase();

    // Very long cache for documentation/explanation queries (2 hours)
    if (promptLower.includes('documentation') ||
        promptLower.includes('explain') ||
        promptLower.includes('what is') ||
        promptLower.includes('how to') ||
        promptLower.includes('tutorial')) {
      return 7200; // 2 hours
    }

    // Short cache for user-specific or time-sensitive (15 minutes)
    if (promptLower.includes('my ') ||
        promptLower.includes('current') ||
        promptLower.includes('latest') ||
        promptLower.includes('today') ||
        promptLower.includes('now')) {
      return 900; // 15 minutes
    }

    // Medium cache for code generation (45 minutes)
    if (promptLower.includes('generate') ||
        promptLower.includes('create') ||
        promptLower.includes('write') ||
        promptLower.includes('build')) {
      return 2700; // 45 minutes
    }

    // Default (1 hour)
    return this.ttl;
  }

  /**
   * Set cache response
   */
  async set(
    params: {
      provider: string;
      model: string;
      prompt: string;
      temperature?: number;
      maxTokens?: number;
    },
    response: any,
    customTtl?: number
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const key = this.generateKey(params);

      // Use smart TTL if not explicitly provided
      const ttl = customTtl ?? this.getOptimalTTL(params.prompt);

      await redisClient.set(key, response, { ex: ttl });
      console.log(`💾 LLM Response cached: ${key} (TTL: ${ttl}s, Type: ${this.getCacheType(params.prompt)})`);
    } catch (error: any) {
      console.error('LLM cache set error:', error.message);
    }
  }

  /**
   * Get cache type for logging
   */
  private getCacheType(prompt: string): string {
    const promptLower = prompt.toLowerCase();
    if (promptLower.includes('documentation') || promptLower.includes('explain')) return 'docs';
    if (promptLower.includes('my ') || promptLower.includes('current')) return 'user-specific';
    if (promptLower.includes('generate') || promptLower.includes('create')) return 'code-gen';
    return 'general';
  }

  /**
   * Clear all LLM cache
   */
  async clear(): Promise<void> {
    try {
      // Note: Upstash REST doesn't support SCAN
      // You would need to track keys separately or use a different approach
      console.log('LLM cache clear requested');
    } catch (error: any) {
      console.error('LLM cache clear error:', error.message);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    estimatedSavings: string;
  }> {
    try {
      const hits = (await redisClient.get('llm:stats:cache:hits') as number) || 0;
      const misses = (await redisClient.get('llm:stats:cache:misses') as number) || 0;
      const total = hits + misses;
      const hitRate = total > 0 ? (hits / total) * 100 : 0;

      // Estimate savings (assuming $0.01 per request)
      const estimatedSavings = `$${(hits * 0.01).toFixed(2)}`;

      return {
        hits,
        misses,
        hitRate: parseFloat(hitRate.toFixed(2)),
        estimatedSavings,
      };
    } catch (error) {
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        estimatedSavings: '$0.00',
      };
    }
  }

  /**
   * Enable/disable cache
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`LLM Cache ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set TTL
   */
  setTTL(ttl: number): void {
    this.ttl = ttl;
    console.log(`LLM Cache TTL set to ${ttl}s`);
  }
}

// Export singleton instance
export const llmCacheService = new LLMCacheService({
  enabled: true,
  ttl: 3600, // 1 hour
});

export default llmCacheService;
