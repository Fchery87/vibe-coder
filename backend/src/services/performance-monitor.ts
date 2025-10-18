import redisClient from './redis-client';
import { log } from './logger';

/**
 * Performance Monitoring Service
 *
 * Tracks application performance metrics:
 * - API response times
 * - LLM request latency
 * - Cache hit rates
 * - Database query times
 * - Memory usage
 * - Error rates
 */

interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  timestamp: number;
  tags?: Record<string, string>;
}

export class PerformanceMonitor {
  private metricsBuffer: PerformanceMetric[] = [];
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 60000; // 1 minute

  constructor() {
    // Auto-flush metrics every minute
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => this.flush(), this.FLUSH_INTERVAL);
    }
  }

  /**
   * Record a performance metric
   */
  record(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    this.metricsBuffer.push(fullMetric);

    // Log to Pino/Logtail
    log.performance(metric.name, metric.value, metric.unit, metric.tags);

    // Auto-flush if buffer is full
    if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
      this.flush();
    }
  }

  /**
   * Time a function execution
   */
  async time<T>(
    name: string,
    fn: () => Promise<T> | T,
    tags?: Record<string, string>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.record({ name, value: duration, unit: 'ms', tags });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.record({
        name: `${name}_error`,
        value: duration,
        unit: 'ms',
        tags: { ...tags, error: 'true' },
      });
      throw error;
    }
  }

  /**
   * Create a timer for manual control
   */
  createTimer(name: string, tags?: Record<string, string>) {
    const start = Date.now();
    return {
      stop: () => {
        const duration = Date.now() - start;
        this.record({ name, value: duration, unit: 'ms', tags });
        return duration;
      },
    };
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(): void {
    const usage = process.memoryUsage();
    this.record({
      name: 'memory.rss',
      value: usage.rss,
      unit: 'bytes',
    });
    this.record({
      name: 'memory.heap_used',
      value: usage.heapUsed,
      unit: 'bytes',
    });
    this.record({
      name: 'memory.heap_total',
      value: usage.heapTotal,
      unit: 'bytes',
    });
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number
  ): void {
    this.record({
      name: 'http.request',
      value: duration,
      unit: 'ms',
      tags: {
        method,
        path,
        status: statusCode.toString(),
      },
    });
  }

  /**
   * Record LLM request metrics
   */
  recordLLMRequest(
    provider: string,
    model: string,
    duration: number,
    tokens: number,
    cached: boolean
  ): void {
    this.record({
      name: 'llm.request',
      value: duration,
      unit: 'ms',
      tags: {
        provider,
        model,
        cached: cached.toString(),
      },
    });

    this.record({
      name: 'llm.tokens',
      value: tokens,
      unit: 'count',
      tags: {
        provider,
        model,
      },
    });
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(
    operation: string,
    table: string,
    duration: number
  ): void {
    this.record({
      name: 'db.query',
      value: duration,
      unit: 'ms',
      tags: {
        operation,
        table,
      },
    });
  }

  /**
   * Record cache operations
   */
  recordCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'del',
    duration: number
  ): void {
    this.record({
      name: 'cache.operation',
      value: duration,
      unit: 'ms',
      tags: {
        operation,
      },
    });
  }

  /**
   * Get performance statistics
   */
  async getStats(metricName?: string): Promise<{
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  }> {
    const metrics = metricName
      ? this.metricsBuffer.filter(m => m.name === metricName)
      : this.metricsBuffer;

    if (metrics.length === 0) {
      return {
        count: 0,
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      avg: sum / values.length,
      min: values[0],
      max: values[values.length - 1],
      p50: this.percentile(values, 50),
      p95: this.percentile(values, 95),
      p99: this.percentile(values, 99),
    };
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedValues: number[], p: number): number {
    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Get real-time performance dashboard data
   */
  async getDashboard(): Promise<{
    httpRequests: any;
    llmRequests: any;
    cachePerformance: any;
    memory: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
    };
  }> {
    const [httpStats, llmStats, cacheStats] = await Promise.all([
      this.getStats('http.request'),
      this.getStats('llm.request'),
      this.getStats('cache.operation'),
    ]);

    const memoryUsage = process.memoryUsage();

    return {
      httpRequests: httpStats,
      llmRequests: llmStats,
      cachePerformance: cacheStats,
      memory: {
        rss: memoryUsage.rss,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
      },
    };
  }

  /**
   * Store aggregated metrics in Redis for historical analysis
   */
  private async flush(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    try {
      // Group metrics by name
      const grouped = new Map<string, number[]>();
      for (const metric of this.metricsBuffer) {
        const existing = grouped.get(metric.name) || [];
        existing.push(metric.value);
        grouped.set(metric.name, existing);
      }

      // Calculate aggregates and store in Redis
      const timestamp = new Date().toISOString();
      for (const [name, values] of grouped.entries()) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const max = Math.max(...values);
        const min = Math.min(...values);

        const key = `performance:${name}:${timestamp}`;
        await redisClient.set(
          key,
          {
            avg,
            max,
            min,
            count: values.length,
            timestamp,
          },
          { ex: 86400 * 7 } // Keep for 7 days
        );
      }

      log.debug(`Flushed ${this.metricsBuffer.length} performance metrics to Redis`);

      // Clear buffer
      this.metricsBuffer = [];
    } catch (error) {
      log.error('Failed to flush performance metrics', error as Error);
    }
  }

  /**
   * Get historical metrics from Redis
   */
  async getHistoricalMetrics(
    metricName: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    try {
      // In production, you would scan Redis for matching keys
      // and return aggregated data
      log.debug('Fetching historical metrics', {
        metricName,
        startDate,
        endDate,
      });

      return [];
    } catch (error) {
      log.error('Failed to fetch historical metrics', error as Error);
      return [];
    }
  }

  /**
   * Health check for monitoring services
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    redis: boolean;
    memory: boolean;
    uptime: number;
  }> {
    let redisHealthy = false;
    try {
      await redisClient.set('health:check', 'ok', { ex: 10 });
      redisHealthy = true;
    } catch (error) {
      log.error('Redis health check failed', error as Error);
    }

    const memoryUsage = process.memoryUsage();
    const memoryHealthy = memoryUsage.heapUsed / memoryUsage.heapTotal < 0.9;

    return {
      healthy: redisHealthy && memoryHealthy,
      redis: redisHealthy,
      memory: memoryHealthy,
      uptime: process.uptime(),
    };
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;
