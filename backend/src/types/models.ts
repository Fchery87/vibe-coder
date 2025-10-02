export interface ModelLimits {
  requestsPerMinute: number;
  requestsPerHour: number;
  dailyBudget: number;
}

export interface ModelRouting {
  priority: number;
  fallback: boolean;
  loadBalance: boolean;
}

export interface ModelConfig {
  name: string;
  contextWindow: number;
  maxTokens: number;
  inputCostPer1k: number;
  outputCostPer1k: number;
  capabilities: string[];
  strengths: string[];
  routing: ModelRouting;
  limits: ModelLimits;
}

export interface ProviderModels {
  [modelName: string]: ModelConfig;
}

export interface ProviderConfig {
  name: string;
  apiBaseUrl: string;
  models: ProviderModels;
}

export interface ProvidersConfig {
  [providerName: string]: ProviderConfig;
}

export interface RoutingMode {
  description: string;
  selection: 'user-choice' | 'capability-matching' | 'cost-optimization';
}

export interface RoutingModes {
  [modeName: string]: RoutingMode;
}

export interface GlobalLimits {
  maxConcurrentRequests: number;
  globalDailyBudget: number;
  retryAttempts: number;
  timeoutSeconds: number;
}

export interface ModelRegistry {
  providers: ProvidersConfig;
  routingModes: RoutingModes;
  globalLimits: GlobalLimits;
}

export interface ModelUsage {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: Date;
}

export interface RoutingDecision {
  selectedModel: string;
  provider: string;
  reason: string;
  estimatedCost: number;
  fallbackOptions: string[];
}