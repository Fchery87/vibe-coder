import { ProviderManager } from './provider-manager';
import { ModelRegistryService } from './model-registry';
import { ModelConfig } from '../types/models';

interface QueuedRequest {
  id: string;
  providerName: string;
  modelName: string;
  prompt: string;
  modelConfig?: ModelConfig;
  priority: number;
  timestamp: number;
  resolve: (value: string) => void;
  reject: (error: any) => void;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

interface BatchRequest {
  providerName: string;
  modelName: string;
  prompts: string[];
  modelConfigs?: ModelConfig[];
  resolves: ((value: string) => void)[];
  rejects: ((error: any) => void)[];
}

export class CostOptimizationService {
  private requestQueue: QueuedRequest[] = [];
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private batchingEnabled: boolean = true;
  private maxBatchSize: number = 5;
  private batchTimeout: number = 100; // ms
  private maxRetries: number = 3;
  private baseBackoffMs: number = 1000;
  private circuitBreakerThreshold: number = 5;
  private circuitBreakerTimeout: number = 60000; // 1 minute
  private processingBatch: boolean = false;

  constructor(
    private providerManager: ProviderManager,
    private modelRegistry: ModelRegistryService
  ) {}

  /**
   * Generate code with cost optimization features
   */
  async generateCode(
    providerName: string,
    modelName: string,
    prompt: string,
    modelConfig?: ModelConfig,
    priority: number = 1
  ): Promise<string> {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen(providerName)) {
      throw new Error(`Circuit breaker open for provider ${providerName}`);
    }

    // Try direct execution first for high priority requests
    if (priority >= 3) {
      try {
        return await this.executeWithRetry(providerName, modelName, prompt, modelConfig);
      } catch (error) {
        // Fall back to queuing if direct execution fails
        console.warn(`Direct execution failed for high priority request, queuing: ${error}`);
      }
    }

    // Queue the request for batching/optimization
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: this.generateRequestId(),
        providerName,
        modelName,
        prompt,
        modelConfig,
        priority,
        timestamp: Date.now(),
        resolve,
        reject
      };

      this.requestQueue.push(request);
      this.requestQueue.sort((a, b) => b.priority - a.priority); // Higher priority first

      // Process queue
      this.processQueue();
    });
  }

  /**
   * Execute request with retry logic and exponential backoff
   */
  private async executeWithRetry(
    providerName: string,
    modelName: string,
    prompt: string,
    modelConfig?: ModelConfig,
    attempt: number = 1
  ): Promise<string> {
    try {
      const result = await this.providerManager.generateCode(providerName, modelName, prompt, modelConfig);

      // Reset circuit breaker on success
      this.resetCircuitBreaker(providerName);

      return result;
    } catch (error) {
      console.warn(`Attempt ${attempt} failed for ${providerName}:${modelName}:`, error);

      // Record failure for circuit breaker
      this.recordFailure(providerName);

      if (attempt < this.maxRetries) {
        const backoffMs = this.calculateBackoff(attempt);
        console.log(`Retrying in ${backoffMs}ms...`);

        await this.delay(backoffMs);
        return this.executeWithRetry(providerName, modelName, prompt, modelConfig, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Process queued requests with batching
   */
  private async processQueue(): Promise<void> {
    if (this.processingBatch || this.requestQueue.length === 0) {
      return;
    }

    this.processingBatch = true;

    try {
      // Group requests by provider and model for batching
      const batches = this.groupRequestsIntoBatches();

      // Process batches concurrently
      const batchPromises = batches.map(batch => this.processBatch(batch));
      await Promise.allSettled(batchPromises);

    } finally {
      this.processingBatch = false;

      // Continue processing if more requests arrived
      if (this.requestQueue.length > 0) {
        setTimeout(() => this.processQueue(), 10);
      }
    }
  }

  /**
   * Group queued requests into optimal batches
   */
  private groupRequestsIntoBatches(): BatchRequest[] {
    const batches: BatchRequest[] = [];
    const processedIds = new Set<string>();

    // Group by provider and model
    const groupedRequests = new Map<string, QueuedRequest[]>();

    for (const request of this.requestQueue) {
      if (processedIds.has(request.id)) continue;

      const key = `${request.providerName}:${request.modelName}`;
      if (!groupedRequests.has(key)) {
        groupedRequests.set(key, []);
      }
      groupedRequests.get(key)!.push(request);
    }

    // Create batches
    for (const [key, requests] of groupedRequests) {
      const [providerName, modelName] = key.split(':');

      // Sort by priority
      requests.sort((a, b) => b.priority - a.priority);

      // Create batches of maxBatchSize
      for (let i = 0; i < requests.length; i += this.maxBatchSize) {
        const batchRequests = requests.slice(i, i + this.maxBatchSize);
        const batch: BatchRequest = {
          providerName,
          modelName,
          prompts: batchRequests.map(r => r.prompt),
          modelConfigs: batchRequests.map(r => r.modelConfig).filter(config => config !== undefined) as ModelConfig[],
          resolves: batchRequests.map(r => r.resolve),
          rejects: batchRequests.map(r => r.reject)
        };

        batches.push(batch);

        // Mark as processed
        batchRequests.forEach(r => processedIds.add(r.id));
      }
    }

    // Remove processed requests from queue
    this.requestQueue = this.requestQueue.filter(r => !processedIds.has(r.id));

    return batches;
  }

  /**
   * Process a batch of requests
   */
  private async processBatch(batch: BatchRequest): Promise<void> {
    try {
      // For now, process individually (can be enhanced for true batching if API supports)
      // Some providers support batch requests, but we'll implement individual processing with concurrency
      const promises = batch.prompts.map((prompt, index) =>
        this.executeWithRetry(
          batch.providerName,
          batch.modelName,
          prompt,
          batch.modelConfigs?.[index]
        )
      );

      const results = await Promise.allSettled(promises);

      // Resolve/reject promises
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          batch.resolves[index](result.value);
        } else {
          batch.rejects[index](result.reason);
        }
      });

    } catch (error) {
      // If batch processing fails entirely, reject all
      batch.rejects.forEach(reject => reject(error));
    }
  }

  /**
   * Circuit breaker methods
   */
  private isCircuitBreakerOpen(providerName: string): boolean {
    const breaker = this.circuitBreakers.get(providerName);
    if (!breaker) return false;

    if (breaker.state === 'open') {
      // Check if timeout has passed
      if (Date.now() - breaker.lastFailureTime > this.circuitBreakerTimeout) {
        breaker.state = 'half-open';
        return false;
      }
      return true;
    }

    return false;
  }

  private recordFailure(providerName: string): void {
    const breaker = this.circuitBreakers.get(providerName) || {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed'
    };

    breaker.failures++;
    breaker.lastFailureTime = Date.now();

    if (breaker.failures >= this.circuitBreakerThreshold) {
      breaker.state = 'open';
      console.warn(`Circuit breaker opened for provider ${providerName}`);
    }

    this.circuitBreakers.set(providerName, breaker);
  }

  private resetCircuitBreaker(providerName: string): void {
    const breaker = this.circuitBreakers.get(providerName);
    if (breaker) {
      breaker.failures = 0;
      breaker.state = 'closed';
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    return this.baseBackoffMs * Math.pow(2, attempt - 1);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats() {
    return {
      queueLength: this.requestQueue.length,
      circuitBreakers: Object.fromEntries(this.circuitBreakers),
      batchingEnabled: this.batchingEnabled,
      maxBatchSize: this.maxBatchSize,
      maxRetries: this.maxRetries
    };
  }

  /**
   * Configure optimization settings
   */
  configure(settings: {
    batchingEnabled?: boolean;
    maxBatchSize?: number;
    batchTimeout?: number;
    maxRetries?: number;
    baseBackoffMs?: number;
    circuitBreakerThreshold?: number;
    circuitBreakerTimeout?: number;
  }): void {
    if (settings.batchingEnabled !== undefined) this.batchingEnabled = settings.batchingEnabled;
    if (settings.maxBatchSize !== undefined) this.maxBatchSize = settings.maxBatchSize;
    if (settings.batchTimeout !== undefined) this.batchTimeout = settings.batchTimeout;
    if (settings.maxRetries !== undefined) this.maxRetries = settings.maxRetries;
    if (settings.baseBackoffMs !== undefined) this.baseBackoffMs = settings.baseBackoffMs;
    if (settings.circuitBreakerThreshold !== undefined) this.circuitBreakerThreshold = settings.circuitBreakerThreshold;
    if (settings.circuitBreakerTimeout !== undefined) this.circuitBreakerTimeout = settings.circuitBreakerTimeout;
  }
}