export interface PromptGraphNode {
  id: string;
  type: 'plan' | 'scaffold' | 'build' | 'validate' | 'quality' | 'review';
  model?: string;
  provider?: string;
  prompt: string;
  dependsOn?: string[];
  maxTokens?: number;
  temperature?: number;
}

export interface PromptGraphEdge {
  from: string;
  to: string;
  condition?: string;
  data?: any;
}

export interface PromptGraph {
  id: string;
  name: string;
  description: string;
  nodes: PromptGraphNode[];
  edges: PromptGraphEdge[];
  input: {
    userPrompt: string;
    requirements?: string[];
    constraints?: string[];
    preferences?: {
      language?: string;
      framework?: string;
      complexity?: 'simple' | 'moderate' | 'complex';
    };
  };
  output: {
    files: GeneratedFile[];
    summary: string;
    metadata: {
      totalTokens: number;
      totalCost: number;
      executionTime: number;
      modelsUsed: string[];
    };
  };
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
  purpose: string;
  nodeId: string;
}

export interface ExecutionContext {
  userPrompt: string;
  requirements: string[];
  constraints: string[];
  preferences: {
    language: string;
    framework: string;
    complexity: 'simple' | 'moderate' | 'complex';
  };
  generatedFiles: GeneratedFile[];
  currentNode?: string;
  executionHistory: ExecutionStep[];
}

export interface ExecutionStep {
  nodeId: string;
  type: string;
  model: string;
  provider: string;
  prompt: string;
  response: string;
  tokens: number;
  cost: number;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  file: string;
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  rule: string;
}

export interface ValidationWarning {
  file: string;
  line?: number;
  message: string;
  suggestion?: string;
}

export interface PromptGraphTemplate {
  id: string;
  name: string;
  description: string;
  template: Omit<PromptGraph, 'id' | 'input' | 'output'>;
  tags: string[];
  estimatedCost: number;
  estimatedTime: number;
}