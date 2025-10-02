import * as fs from 'fs';
import * as path from 'path';
import {
  ModelRegistry,
  ModelConfig,
  ProviderConfig,
  RoutingDecision,
  ModelUsage,
  RoutingModes
} from '../types/models';

export class ModelRegistryService {
  private registry: ModelRegistry;
  private usageHistory: ModelUsage[] = [];

  constructor(registryPath?: string) {
    const defaultPath = path.join(__dirname, '../config/models.json');
    const configPath = registryPath || defaultPath;

    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      this.registry = JSON.parse(configData);
    } catch (error) {
      throw new Error(`Failed to load model registry from ${configPath}: ${error}`);
    }
  }

  /**
   * Get all available providers
   */
  getProviders(): ProviderConfig[] {
    return Object.values(this.registry.providers);
  }

  /**
   * Get all available models across all providers
   */
  getAllModels(): ModelConfig[] {
    const models: ModelConfig[] = [];
    for (const provider of this.getProviders()) {
      models.push(...Object.values(provider.models));
    }
    return models;
  }

  /**
   * Get a specific model configuration
   */
  getModel(providerName: string, modelName: string): ModelConfig | null {
    const provider = this.registry.providers[providerName];
    if (!provider) return null;

    return provider.models[modelName] || null;
  }

  /**
   * Get models by capability
   */
  getModelsByCapability(capability: string): ModelConfig[] {
    return this.getAllModels().filter(model =>
      model.capabilities.includes(capability)
    );
  }

  /**
   * Get available routing modes
   */
  getRoutingModes(): RoutingModes {
    return this.registry.routingModes;
  }

  /**
   * Calculate cost for a given input/output token count
   */
  calculateCost(providerName: string, modelName: string, inputTokens: number, outputTokens: number): number {
    const model = this.getModel(providerName, modelName);
    if (!model) return 0;

    const inputCost = (inputTokens / 1000) * model.inputCostPer1k;
    const outputCost = (outputTokens / 1000) * model.outputCostPer1k;

    return inputCost + outputCost;
  }

  /**
   * Check if a model is within its limits
   */
  isWithinLimits(providerName: string, modelName: string): boolean {
    const model = this.getModel(providerName, modelName);
    if (!model) return false;

    // Check daily budget
    const todayUsage = this.getTodayUsage(providerName, modelName);
    if (todayUsage >= model.limits.dailyBudget) return false;

    // Check global limits
    const globalTodayUsage = this.getGlobalTodayUsage();
    if (globalTodayUsage >= this.registry.globalLimits.globalDailyBudget) return false;

    return true;
  }

  /**
   * Get usage for today for a specific model
   */
  private getTodayUsage(providerName: string, modelName: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.usageHistory
      .filter(usage =>
        usage.provider === providerName &&
        usage.model === modelName &&
        usage.timestamp >= today
      )
      .reduce((total, usage) => total + usage.cost, 0);
  }

  /**
   * Get total usage for today across all models
   */
  private getGlobalTodayUsage(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.usageHistory
      .filter(usage => usage.timestamp >= today)
      .reduce((total, usage) => total + usage.cost, 0);
  }

  /**
   * Record model usage
   */
  recordUsage(providerName: string, modelName: string, inputTokens: number, outputTokens: number, cost: number): void {
    const usage: ModelUsage = {
      provider: providerName,
      model: modelName,
      inputTokens,
      outputTokens,
      cost,
      timestamp: new Date()
    };

    this.usageHistory.push(usage);

    // Keep only last 30 days of usage
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    this.usageHistory = this.usageHistory.filter(u => u.timestamp >= thirtyDaysAgo);
  }

  /**
   * Get usage statistics
   */
  getUsageStats(providerName?: string, modelName?: string) {
    let filteredUsage = this.usageHistory;

    if (providerName) {
      filteredUsage = filteredUsage.filter(u => u.provider === providerName);
    }

    if (modelName) {
      filteredUsage = filteredUsage.filter(u => u.model === modelName);
    }

    const totalCost = filteredUsage.reduce((sum, u) => sum + u.cost, 0);
    const totalInputTokens = filteredUsage.reduce((sum, u) => sum + u.inputTokens, 0);
    const totalOutputTokens = filteredUsage.reduce((sum, u) => sum + u.outputTokens, 0);

    return {
      totalRequests: filteredUsage.length,
      totalCost,
      totalInputTokens,
      totalOutputTokens,
      averageCostPerRequest: filteredUsage.length > 0 ? totalCost / filteredUsage.length : 0
    };
  }

  /**
   * Get the registry configuration
   */
  getRegistry(): ModelRegistry {
    return this.registry;
  }

  /**
   * Reload registry from file
   */
  reloadRegistry(registryPath?: string): void {
    const defaultPath = path.join(__dirname, '../config/models.json');
    const configPath = registryPath || defaultPath;

    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      this.registry = JSON.parse(configData);
    } catch (error) {
      throw new Error(`Failed to reload model registry from ${configPath}: ${error}`);
    }
  }
}