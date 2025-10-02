import { ModelConfig } from '../types/models';
import { OpenAIService } from './openai';
import { XAIService } from './xai';
import { SupernovaService } from './supernova';
import { AnthropicService } from './anthropic';
import { GoogleService } from './google';
import { OllamaService } from './ollama';
import { CostOptimizationService } from './cost-optimization-service';

export interface LLMProvider {
  generateCode(prompt: string, model?: string): Promise<string>;
  generateWithModel(prompt: string, modelConfig: ModelConfig): Promise<string>;
  getAvailableModels(): string[];
}

export class ProviderManager {
  private providers: Map<string, LLMProvider> = new Map();
  private singleModelMode: boolean = false;
  private activeProvider: string | null = null;
  private costOptimizer: CostOptimizationService | null = null;

  constructor(modelRegistry?: any) {
    // In single-model mode, providers are loaded lazily
    // In multi-model mode, initialize all available providers
    if (!this.singleModelMode) {
      this.initializeAllProviders();
    }

    // Initialize cost optimization if model registry is provided
    if (modelRegistry) {
      this.costOptimizer = new CostOptimizationService(this, modelRegistry);
    }
  }

  private initializeAllProviders() {
    // Initialize providers only if they have valid credentials
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
      this.providers.set('openai', new OpenAIService());
    }

    // Anthropic Claude service - requires ANTHROPIC_API_KEY
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        this.providers.set('anthropic', new AnthropicService());
      } catch (error) {
        console.warn('Failed to initialize Anthropic service:', error);
      }
    }

    // Google AI service - requires GOOGLE_API_KEY
    if (process.env.GOOGLE_API_KEY) {
      try {
        this.providers.set('google', new GoogleService());
      } catch (error) {
        console.warn('Failed to initialize Google AI service:', error);
      }
    }

    // XAI service - requires XAI_API_KEY
    if (process.env.XAI_API_KEY) {
      this.providers.set('xai', new XAIService());
    }

    // Supernova service - requires SUPERNOVA_API_KEY
    if (process.env.SUPERNOVA_API_KEY) {
      this.providers.set('supernova', new SupernovaService());
    }

    // Ollama service - local, no API key required
    try {
      this.providers.set('ollama', new OllamaService());
    } catch (error) {
      console.warn('Failed to initialize Ollama service:', error);
    }

    console.log(`Initialized providers: ${Array.from(this.providers.keys()).join(', ')}`);
  }

  /**
   * Enable single-model mode and load only the specified provider
   */
  enableSingleModelMode(providerName: string): void {
    this.singleModelMode = true;
    this.activeProvider = providerName.toLowerCase();

    // Clear all existing providers
    this.providers.clear();

    // Load only the active provider
    this.loadProvider(providerName);

    console.log(`Single-model mode enabled. Active provider: ${providerName}`);
  }

  /**
   * Disable single-model mode and load all available providers
   */
  disableSingleModelMode(): void {
    this.singleModelMode = false;
    this.activeProvider = null;

    // Clear existing providers and reload all
    this.providers.clear();
    this.initializeAllProviders();

    console.log('Single-model mode disabled. All providers loaded.');
  }

  /**
   * Load a specific provider lazily
   */
  private loadProvider(providerName: string): LLMProvider | null {
    const normalizedName = providerName.toLowerCase();

    // Check if provider is already loaded
    if (this.providers.has(normalizedName)) {
      return this.providers.get(normalizedName)!;
    }

    // Lazy load the provider
    let provider: LLMProvider | null = null;

    try {
      switch (normalizedName) {
        case 'openai':
          if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
            provider = new OpenAIService();
          }
          break;

        case 'anthropic':
          if (process.env.ANTHROPIC_API_KEY) {
            provider = new AnthropicService();
          }
          break;

        case 'google':
          if (process.env.GOOGLE_API_KEY) {
            provider = new GoogleService();
          }
          break;

        case 'xai':
          if (process.env.XAI_API_KEY) {
            provider = new XAIService();
          }
          break;

        case 'supernova':
          if (process.env.SUPERNOVA_API_KEY) {
            provider = new SupernovaService();
          }
          break;

        case 'ollama':
          provider = new OllamaService();
          break;

        default:
          console.warn(`Unknown provider: ${providerName}`);
          return null;
      }

      if (provider) {
        this.providers.set(normalizedName, provider);
        console.log(`Lazy loaded provider: ${providerName}`);
      } else {
        console.warn(`Failed to load provider ${providerName}: missing API key or configuration`);
      }
    } catch (error) {
      console.error(`Error loading provider ${providerName}:`, error);
    }

    return provider;
  }

  /**
   * Get provider instance by name
   */
  getProvider(providerName: string): LLMProvider | null {
    const normalizedName = providerName.toLowerCase();

    // If in single-model mode and this is not the active provider, don't load it
    if (this.singleModelMode && this.activeProvider && normalizedName !== this.activeProvider) {
      return null;
    }

    // Try to get existing provider
    let provider = this.providers.get(normalizedName);

    // If not found and we're allowed to load it, try lazy loading
    if (!provider && (!this.singleModelMode || normalizedName === this.activeProvider)) {
      provider = this.loadProvider(normalizedName) || undefined;
    }

    return provider || null;
  }

  /**
   * Generate code using specified provider and model with cost optimization
   */
  async generateCode(
    providerName: string,
    modelName: string,
    prompt: string,
    modelConfig?: ModelConfig,
    priority: number = 1
  ): Promise<string> {
    // Use cost optimizer if available
    if (this.costOptimizer) {
      return this.costOptimizer.generateCode(providerName, modelName, prompt, modelConfig, priority);
    }

    // Fallback to direct provider call
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider '${providerName}' is not supported`);
    }

    try {
      if (modelConfig) {
        return await provider.generateWithModel(prompt, modelConfig);
      } else {
        return await provider.generateCode(prompt, modelName);
      }
    } catch (error) {
      console.error(`Error generating code with ${providerName}:${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Check if single-model mode is enabled
   */
  isSingleModelMode(): boolean {
    return this.singleModelMode;
  }

  /**
   * Get the active provider in single-model mode
   */
  getActiveProvider(): string | null {
    return this.activeProvider;
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): string[] {
    // In single-model mode, only return the active provider
    if (this.singleModelMode && this.activeProvider) {
      return this.providers.has(this.activeProvider) ? [this.activeProvider] : [];
    }

    // In multi-model mode, return all loaded providers
    return Array.from(this.providers.keys());
  }

  /**
   * Get all models for a specific provider
   */
  getProviderModels(providerName: string): string[] {
    const provider = this.getProvider(providerName);
    return provider ? provider.getAvailableModels() : [];
  }

  /**
   * Get all available models across all providers
   */
  getAllModels(): Array<{ provider: string; models: string[] }> {
    return this.getAvailableProviders().map(provider => ({
      provider,
      models: this.getProviderModels(provider)
    }));
  }

  /**
   * Check if a provider is configured and ready to use
   */
  isProviderConfigured(providerName: string): boolean {
    const provider = this.getProvider(providerName);
    if (!provider) return false;

    // Check for required API keys based on provider
    switch (providerName.toLowerCase()) {
      case 'openai':
        return !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here');
      case 'anthropic':
        return !!process.env.ANTHROPIC_API_KEY;
      case 'google':
        return !!process.env.GOOGLE_API_KEY;
      case 'xai':
        return !!process.env.XAI_API_KEY;
      case 'supernova':
        return !!process.env.SUPERNOVA_API_KEY;
      case 'ollama':
        return true; // Local service, always available if instantiated
      default:
        return false;
    }
  }

  /**
   * Get provider health status
   */
  getProviderStatus(providerName: string): {
    configured: boolean;
    available: boolean;
    models: string[];
  } {
    const configured = this.isProviderConfigured(providerName);
    const provider = this.getProvider(providerName);

    return {
      configured,
      available: configured && !!provider,
      models: provider ? provider.getAvailableModels() : []
    };
  }

  /**
   * Test provider connectivity
   */
  async testProvider(providerName: string): Promise<{
    success: boolean;
    error?: string;
    responseTime?: number;
  }> {
    const startTime = Date.now();

    try {
      const provider = this.getProvider(providerName);
      if (!provider) {
        return { success: false, error: 'Provider not found' };
      }

      // Simple test prompt
      await provider.generateCode('Hello', provider.getAvailableModels()[0]);
      const responseTime = Date.now() - startTime;

      return { success: true, responseTime };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      };
    }
  }
}