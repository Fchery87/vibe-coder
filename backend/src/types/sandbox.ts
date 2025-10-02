export interface SandboxConfig {
  timeout: number; // milliseconds
  memoryLimit: number; // MB
  allowNetwork: boolean;
  allowFileSystem: boolean;
  allowedModules: string[];
  blockedModules: string[];
  envVars: Record<string, string>;
}

export interface SandboxResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  memoryUsed?: number;
  logs: SandboxLog[];
  returnValue?: any;
}

export interface SandboxLog {
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: Date;
  level: number;
}

export interface SandboxFile {
  name: string;
  content: string;
  language: string;
}

export interface ExecutionContext {
  files: SandboxFile[];
  mainFile?: string;
  dependencies?: Record<string, string>;
}

export interface SandboxSecurityPolicy {
  allowNetworkRequests: boolean;
  allowFileSystemAccess: boolean;
  allowProcessExecution: boolean;
  allowEnvironmentAccess: boolean;
  maxExecutionTime: number;
  maxMemoryUsage: number;
  allowedDomains?: string[];
  blockedPatterns?: (string | RegExp)[];
}

export interface SandboxMetrics {
  executionTime: number;
  memoryPeak: number;
  cpuUsage: number;
  networkRequests?: number;
  fileOperations?: number;
  errors: number;
  warnings: number;
}