import { ModelRegistryService } from './model-registry';
import { ProviderManager } from './provider-manager';
import { ModelConfig, RoutingDecision, ModelUsage } from '../types/models';

export type RoutingMode = 'manual' | 'heuristic' | 'cost-aware' | 'orchestrated' | 'single-model';

export interface RoutingContext {
  mode: RoutingMode;
  requestedModel?: string;
  capabilities?: string[];
  maxCost?: number;
  priority?: 'speed' | 'quality' | 'cost';
  nodeType?: string; // For orchestrated routing
  activeProvider?: string; // For single-model routing
  allowFailover?: boolean; // For single-model routing
}

export class RoutingService {
  private loadBalancingEnabled: boolean = true;
  private predictiveOptimizationEnabled: boolean = true;
  private providerLoad: Map<string, number> = new Map(); // Track concurrent requests per provider

  constructor(
    private modelRegistry: ModelRegistryService,
    private providerManager?: ProviderManager
  ) {
    // Initialize load tracking
    this.initializeLoadTracking();
  }

  private initializeLoadTracking(): void {
    const providers = this.modelRegistry.getProviders();
    providers.forEach(provider => {
      this.providerLoad.set(provider.name.toLowerCase(), 0);
    });
  }

  /**
   * Make a routing decision based on context
   */
  async makeRoutingDecision(context: RoutingContext): Promise<RoutingDecision> {
    switch (context.mode) {
      case 'manual':
        return this.handleManualRouting(context);
      case 'heuristic':
        return this.handleHeuristicRouting(context);
      case 'cost-aware':
        return this.handleCostAwareRouting(context);
      case 'orchestrated':
        return this.handleOrchestratedRouting(context);
      case 'single-model':
        return this.handleSingleModelRouting(context);
      default:
        throw new Error(`Unknown routing mode: ${context.mode}`);
    }
  }

  /**
   * Manual routing - user specifies exact model
   */
  private handleManualRouting(context: RoutingContext): RoutingDecision {
    if (!context.requestedModel) {
      throw new Error('Manual routing requires requestedModel to be specified');
    }

    // Parse provider and model from "provider:model" format or assume openai
    const [providerName, modelName] = this.parseModelIdentifier(context.requestedModel);

    const model = this.modelRegistry.getModel(providerName, modelName);
    if (!model) {
      throw new Error(`Model ${context.requestedModel} not found in registry`);
    }

    if (!this.modelRegistry.isWithinLimits(providerName, modelName)) {
      throw new Error(`Model ${context.requestedModel} has exceeded usage limits`);
    }

    return {
      selectedModel: modelName,
      provider: providerName,
      reason: `Manual selection: ${context.requestedModel}`,
      estimatedCost: 0, // Will be calculated after actual usage
      fallbackOptions: this.getFallbackOptions(providerName, modelName)
    };
  }

  /**
   * Heuristic routing - match capabilities and strengths with load balancing and cost optimization
   */
  private handleHeuristicRouting(context: RoutingContext): RoutingDecision {
    const requiredCapabilities = context.capabilities || ['text-generation'];
    const priority = context.priority || 'quality';

    // Get all models that support required capabilities
    const candidateModels = this.getModelsByCapabilities(requiredCapabilities);

    if (candidateModels.length === 0) {
      throw new Error(`No models found supporting capabilities: ${requiredCapabilities.join(', ')}`);
    }

    // Score models based on priority, strengths, load balancing, and predictive costs
    const scoredModels = candidateModels.map(model => {
      const { providerName, modelName } = this.extractProviderAndModel(model);
      const baseScore = this.calculateHeuristicScore(model, priority, providerName, modelName);
      const loadBalanceScore = this.loadBalancingEnabled ? this.calculateLoadBalanceScore(providerName) : 0;
      const costOptimizationScore = this.predictiveOptimizationEnabled ? this.calculateCostOptimizationScore(model, context) : 0;

      const totalScore = baseScore + loadBalanceScore + costOptimizationScore;

      return {
        model,
        providerName,
        modelName,
        score: totalScore,
        withinLimits: this.modelRegistry.isWithinLimits(providerName, modelName),
        loadBalanceScore,
        costOptimizationScore
      };
    });

    // Sort by score (descending) and filter by limits
    const validModels = scoredModels
      .filter(m => m.withinLimits)
      .sort((a, b) => b.score - a.score);

    if (validModels.length === 0) {
      throw new Error('No models available within usage limits');
    }

    const bestModel = validModels[0];

    // Update load tracking
    this.incrementProviderLoad(bestModel.providerName);

    return {
      selectedModel: bestModel.modelName,
      provider: bestModel.providerName,
      reason: `Advanced heuristic selection (${priority} priority) with load balancing and cost optimization. Capabilities: ${requiredCapabilities.join(', ')}`,
      estimatedCost: this.estimateRequestCost(bestModel.model),
      fallbackOptions: this.getFallbackOptions(bestModel.providerName, bestModel.modelName)
    };
  }

  /**
   * Cost-aware routing - optimize for cost while meeting requirements
   */
  private handleCostAwareRouting(context: RoutingContext): RoutingDecision {
    const maxCost = context.maxCost || 0.1; // Default max cost per request
    const requiredCapabilities = context.capabilities || ['text-generation'];

    // Get all models that support required capabilities and are within cost limits
    const candidateModels = this.getModelsByCapabilities(requiredCapabilities);

    const costEffectiveModels = candidateModels
      .map(model => {
        const { providerName, modelName } = this.extractProviderAndModel(model);
        const estimatedCost = this.estimateRequestCost(model);

        return {
          model,
          providerName,
          modelName,
          estimatedCost,
          withinLimits: this.modelRegistry.isWithinLimits(providerName, modelName)
        };
      })
      .filter(m => m.estimatedCost <= maxCost && m.withinLimits)
      .sort((a, b) => a.estimatedCost - b.estimatedCost); // Sort by cost (ascending)

    if (costEffectiveModels.length === 0) {
      throw new Error(`No models available within cost limit $${maxCost} for capabilities: ${requiredCapabilities.join(', ')}`);
    }

    const bestModel = costEffectiveModels[0];

    return {
      selectedModel: bestModel.modelName,
      provider: bestModel.providerName,
      reason: `Cost-aware selection (max $${maxCost}): ${bestModel.estimatedCost.toFixed(4)} estimated cost`,
      estimatedCost: bestModel.estimatedCost,
      fallbackOptions: this.getFallbackOptions(bestModel.providerName, bestModel.modelName)
    };
  }

  /**
   * Orchestrated routing - use specialized models for different tasks
   */
  private handleOrchestratedRouting(context: RoutingContext): RoutingDecision {
    const nodeType = context.nodeType || 'build';

    // Define model assignments for different node types - Multi-Model Orchestration
    const modelAssignments: Record<string, { provider: string; model: string }> = {
      'plan': { provider: 'anthropic', model: 'claude-3.5-sonnet' }, // Claude 3.5 for planning & analysis
      'scaffold': { provider: 'openai', model: 'gpt-4o' }, // GPT-4o for code scaffolding (keeping current as GPT-5 may not exist yet)
      'build': { provider: 'openai', model: 'gpt-4o' }, // GPT-4o for code building (keeping current as GPT-5 may not exist yet)
      'validate': { provider: 'google', model: 'gemini-1.5-pro' }, // Gemini 1.5 Pro for validation/review
      'quality': { provider: 'google', model: 'gemini-1.5-flash' }, // Gemini 1.5 Flash for quality checks (faster)
      'review': { provider: 'google', model: 'gemini-1.5-pro' }, // Gemini 1.5 Pro for diff validation
      'ui': { provider: 'google', model: 'gemini-1.5-pro' } // Gemini 1.5 Pro for UI tasks
    };

    const assignment = modelAssignments[nodeType] || modelAssignments['build'];

    // Check if the assigned model is available
    const model = this.modelRegistry.getModel(assignment.provider, assignment.model);

    if (!model) {
      // Fallback to heuristic routing if assigned model not available
      console.warn(`Assigned model ${assignment.provider}:${assignment.model} not available, falling back to heuristic routing`);
      return this.handleHeuristicRouting(context);
    }

    if (!this.modelRegistry.isWithinLimits(assignment.provider, assignment.model)) {
      // Fallback if model is over limits
      console.warn(`Assigned model ${assignment.provider}:${assignment.model} over limits, falling back to heuristic routing`);
      return this.handleHeuristicRouting(context);
    }

    return {
      selectedModel: assignment.model,
      provider: assignment.provider,
      reason: `Orchestrated selection for ${nodeType}: ${assignment.provider}:${assignment.model}`,
      estimatedCost: 0,
      fallbackOptions: this.getFallbackOptions(assignment.provider, assignment.model)
    };
  }

  /**
   * Single-model routing - use only the configured active provider
   */
  private handleSingleModelRouting(context: RoutingContext): RoutingDecision {
    // Get the active provider from project settings (passed in context)
    const activeProvider = context.activeProvider;
    const allowFailover = context.allowFailover !== false; // Default to true

    if (!activeProvider) {
      throw new Error('Single-model mode requires activeProvider to be specified in context');
    }

    // Enable single-model mode in provider manager for lazy loading
    if (this.providerManager) {
      this.providerManager.enableSingleModelMode(activeProvider);
    }

    // Get all models and filter by provider
    const allModels = this.modelRegistry.getAllModels();
    const providerModels = allModels.filter(model => {
      // Find which provider this model belongs to
      const providers = this.modelRegistry.getProviders();
      for (const provider of providers) {
        if (provider.name.toLowerCase() === activeProvider.toLowerCase()) {
          return Object.keys(provider.models).some(modelName => {
            const modelConfig = provider.models[modelName];
            return modelConfig === model;
          });
        }
      }
      return false;
    });

    if (providerModels.length === 0) {
      throw new Error(`No models available for provider ${activeProvider}`);
    }

    // Select the highest priority model from the active provider
    const bestModel = providerModels
      .filter(model => {
        // Extract provider and model name for limit checking
        const providers = this.modelRegistry.getProviders();
        for (const provider of providers) {
          if (provider.name.toLowerCase() === activeProvider.toLowerCase()) {
            for (const [modelName, modelConfig] of Object.entries(provider.models)) {
              if (modelConfig === model) {
                return this.modelRegistry.isWithinLimits(provider.name.toLowerCase(), modelName);
              }
            }
          }
        }
        return false;
      })
      .sort((a: ModelConfig, b: ModelConfig) => a.routing.priority - b.routing.priority)[0];

    if (!bestModel) {
      if (allowFailover) {
        console.warn(`No models available for provider ${activeProvider}, falling back to heuristic routing`);
        return this.handleHeuristicRouting(context);
      } else {
        throw new Error(`No models available for provider ${activeProvider} and failover is disabled`);
      }
    }

    return {
      selectedModel: bestModel.name,
      provider: activeProvider,
      reason: `Single-model selection: ${activeProvider}:${bestModel.name} (failover: ${allowFailover ? 'enabled' : 'disabled'})`,
      estimatedCost: 0,
      fallbackOptions: allowFailover ? this.getFallbackOptions(activeProvider, bestModel.name) : []
    };
  }

  /**
   * Parse model identifier (provider:model or just model)
   */
  private parseModelIdentifier(modelId: string): [string, string] {
    const parts = modelId.split(':');
    if (parts.length === 2) {
      return [parts[0], parts[1]];
    }
    // Default to openai if no provider specified
    return ['openai', modelId];
  }

  /**
   * Get models that support all required capabilities
   */
  private getModelsByCapabilities(capabilities: string[]): ModelConfig[] {
    return this.modelRegistry.getAllModels().filter(model =>
      capabilities.every(cap => model.capabilities.includes(cap))
    );
  }

  /**
   * Calculate heuristic score for model selection
   */
  private calculateHeuristicScore(model: ModelConfig, priority: string, providerName: string, modelName: string): number {
    let score = 0;

    // Base score from routing priority (lower priority number = higher score)
    score += (100 - model.routing.priority * 10);

    // Bonus for matching strengths with priority
    switch (priority) {
      case 'speed':
        if (model.strengths.includes('fast-inference')) score += 20;
        if (model.contextWindow > 50000) score += 10; // Larger contexts can be slower
        break;
      case 'quality':
        if (model.strengths.includes('reasoning')) score += 25;
        if (model.strengths.includes('analysis')) score += 15;
        break;
      case 'cost':
        // Lower cost per token gives higher score
        const avgCost = (model.inputCostPer1k + model.outputCostPer1k) / 2;
        score += Math.max(0, 20 - avgCost * 1000);
        break;
    }

    // Bonus for code generation if that's a required capability
    if (model.capabilities.includes('code-generation') && model.strengths.includes('code-generation')) {
      score += 15;
    }

    return score;
  }

  /**
   * Estimate cost for a typical request (1k input, 500 output tokens)
   */
  private estimateRequestCost(model: ModelConfig): number {
    const inputCost = (1000 / 1000) * model.inputCostPer1k;
    const outputCost = (500 / 1000) * model.outputCostPer1k;
    return inputCost + outputCost;
  }

  /**
   * Extract provider and model names from model config
   */
  private extractProviderAndModel(model: ModelConfig): { providerName: string; modelName: string } {
    // This is a simplified approach - in a real implementation,
    // we'd need to track which provider each model belongs to
    const allProviders = this.modelRegistry.getProviders();
    for (const provider of allProviders) {
      for (const [modelName, modelConfig] of Object.entries(provider.models)) {
        if (modelConfig === model) {
          return { providerName: provider.name.toLowerCase(), modelName };
        }
      }
    }
    throw new Error('Could not determine provider for model');
  }

  /**
   * Calculate load balancing score (prefer less loaded providers)
   */
  private calculateLoadBalanceScore(providerName: string): number {
    const currentLoad = this.providerLoad.get(providerName.toLowerCase()) || 0;
    const maxConcurrent = this.modelRegistry.getRegistry().globalLimits.maxConcurrentRequests;

    // Score decreases as load increases (0-20 points)
    const loadScore = Math.max(0, 20 * (1 - currentLoad / maxConcurrent));
    return loadScore;
  }

  /**
   * Calculate cost optimization score based on predictive analysis
   */
  private calculateCostOptimizationScore(model: ModelConfig, context: RoutingContext): number {
    let score = 0;

    // Factor in recent usage patterns and cost trends
    const usageStats = this.modelRegistry.getUsageStats();
    const recentCostPerRequest = usageStats.averageCostPerRequest || 0;

    // Prefer models with lower recent costs
    if (recentCostPerRequest > 0) {
      const modelAvgCost = (model.inputCostPer1k + model.outputCostPer1k) / 2;
      if (modelAvgCost < recentCostPerRequest) {
        score += 10; // Bonus for cheaper than average
      }
    }

    // Consider context constraints
    if (context.maxCost) {
      const estimatedCost = this.estimateRequestCost(model);
      if (estimatedCost <= context.maxCost) {
        score += 15; // Strong bonus for staying within budget
      } else if (estimatedCost <= context.maxCost * 1.2) {
        score += 5; // Smaller bonus for close to budget
      }
    }

    // Factor in model efficiency (context window vs cost)
    const efficiencyRatio = model.contextWindow / ((model.inputCostPer1k + model.outputCostPer1k) / 2);
    score += Math.min(10, efficiencyRatio / 1000); // Up to 10 points for efficiency

    return score;
  }

  /**
   * Increment provider load counter
   */
  private incrementProviderLoad(providerName: string): void {
    const currentLoad = this.providerLoad.get(providerName.toLowerCase()) || 0;
    this.providerLoad.set(providerName.toLowerCase(), currentLoad + 1);
  }

  /**
   * Decrement provider load counter (call when request completes)
   */
  decrementProviderLoad(providerName: string): void {
    const currentLoad = this.providerLoad.get(providerName.toLowerCase()) || 0;
    this.providerLoad.set(providerName.toLowerCase(), Math.max(0, currentLoad - 1));
  }

  /**
   * Get fallback options for a model
   */
  private getFallbackOptions(providerName: string, modelName: string): string[] {
    const model = this.modelRegistry.getModel(providerName, modelName);
    if (!model || !model.routing.fallback) return [];

    // Get other models from the same provider as fallbacks
    const provider = this.modelRegistry.getProviders().find(p => p.name.toLowerCase() === providerName);
    if (!provider) return [];

    return Object.keys(provider.models)
      .filter(name => name !== modelName)
      .slice(0, 3); // Return up to 3 fallback options
  }

  /**
   * Configure optimization settings
   */
  configureOptimization(settings: {
    loadBalancingEnabled?: boolean;
    predictiveOptimizationEnabled?: boolean;
  }): void {
    if (settings.loadBalancingEnabled !== undefined) {
      this.loadBalancingEnabled = settings.loadBalancingEnabled;
    }
    if (settings.predictiveOptimizationEnabled !== undefined) {
      this.predictiveOptimizationEnabled = settings.predictiveOptimizationEnabled;
    }
  }

  /**
   * Get current load status for all providers
   */
  getProviderLoadStatus(): Record<string, number> {
    const status: Record<string, number> = {};
    for (const [provider, load] of this.providerLoad) {
      status[provider] = load;
    }
    return status;
  }

  /**
   * Get routing statistics
   */
  getRoutingStats(): {
    totalDecisions: number;
    decisionsByMode: Record<RoutingMode, number>;
    averageCostPerDecision: number;
    providerLoad: Record<string, number>;
    optimizationEnabled: {
      loadBalancing: boolean;
      predictiveOptimization: boolean;
    };
  } {
    // This would track routing decisions in a real implementation
    // For now, return placeholder data
    return {
      totalDecisions: 0,
      decisionsByMode: {
        'manual': 0,
        'heuristic': 0,
        'cost-aware': 0,
        'orchestrated': 0,
        'single-model': 0
      },
      averageCostPerDecision: 0,
      providerLoad: this.getProviderLoadStatus(),
      optimizationEnabled: {
        loadBalancing: this.loadBalancingEnabled,
        predictiveOptimization: this.predictiveOptimizationEnabled
      }
    };
  }
}