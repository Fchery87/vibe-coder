import { ModelRegistryService } from './model-registry';
import { ProviderManager } from './provider-manager';
import { ModelConfig, RoutingDecision } from '../types/models';

export type RoutingMode = 'single-model';

export interface RoutingContext {
  mode: RoutingMode;
  activeProvider: string; // Required: The provider selected by user
  allowFailover?: boolean; // Optional: Allow fallback if provider unavailable (default: true)
}

/**
 * Simplified Routing Service - Single Model Mode Only
 *
 * This service routes requests to the provider selected by the user in the UI.
 * It's been simplified from the original multi-mode routing system to focus
 * on the single use case that's actually being used.
 */
export class RoutingService {
  constructor(
    private modelRegistry: ModelRegistryService,
    private providerManager?: ProviderManager
  ) {}

  /**
   * Make a routing decision - uses only the provider selected by user
   */
  async makeRoutingDecision(context: RoutingContext): Promise<RoutingDecision> {
    return this.handleSingleModelRouting(context);
  }

  /**
   * Single-model routing - use only the configured active provider
   */
  private handleSingleModelRouting(context: RoutingContext): RoutingDecision {
    const activeProvider = context.activeProvider;
    const allowFailover = context.allowFailover !== false; // Default to true

    if (!activeProvider) {
      throw new Error('Single-model mode requires activeProvider to be specified');
    }

    // Enable single-model mode in provider manager for lazy loading
    if (this.providerManager) {
      this.providerManager.enableSingleModelMode(activeProvider);
    }

    // Get all models for the active provider
    const allModels = this.modelRegistry.getAllModels();
    const providerModels = allModels.filter(model => {
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
        // Fallback: just use any available model from the provider (ignore limits temporarily)
        const fallbackModel = providerModels[0];
        console.warn(`No models within limits for ${activeProvider}, using ${fallbackModel.name} anyway`);

        return {
          selectedModel: fallbackModel.name,
          provider: activeProvider,
          reason: `Single-model fallback: ${activeProvider}:${fallbackModel.name} (over limits but no alternatives)`,
          estimatedCost: 0,
          fallbackOptions: []
        };
      } else {
        throw new Error(`No models available for provider ${activeProvider} and failover is disabled`);
      }
    }

    return {
      selectedModel: bestModel.name,
      provider: activeProvider,
      reason: `User selected provider: ${activeProvider}:${bestModel.name}`,
      estimatedCost: 0,
      fallbackOptions: this.getFallbackOptions(activeProvider, bestModel.name)
    };
  }

  /**
   * Get fallback options for a model (up to 3 alternatives from same provider)
   */
  private getFallbackOptions(providerName: string, modelName: string): string[] {
    const model = this.modelRegistry.getModel(providerName, modelName);
    if (!model || !model.routing.fallback) return [];

    const provider = this.modelRegistry.getProviders().find(p => p.name.toLowerCase() === providerName);
    if (!provider) return [];

    return Object.keys(provider.models)
      .filter(name => name !== modelName)
      .slice(0, 3);
  }

  /**
   * Get routing statistics - simplified for single-model mode
   */
  getRoutingStats(): {
    totalDecisions: number;
    currentMode: RoutingMode;
    activeProvider?: string;
  } {
    return {
      totalDecisions: 0,
      currentMode: 'single-model',
      activeProvider: undefined
    };
  }
}
