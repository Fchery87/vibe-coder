import pino from 'pino';
import { Logtail } from '@logtail/node';

/**
 * Centralized Logging Service with Pino + BetterStack Logtail
 *
 * Features:
 * - Structured JSON logging
 * - Multiple log levels (trace, debug, info, warn, error, fatal)
 * - BetterStack Logtail integration for production
 * - Pretty printing in development
 * - Context-aware logging
 * - Performance tracking
 */

// Initialize Logtail if configured
let logtail: Logtail | null = null;
const logtailToken = process.env.LOGTAIL_SOURCE_TOKEN;

if (logtailToken) {
  try {
    logtail = new Logtail(logtailToken);
    console.log('✅ Logtail (BetterStack) initialized');
  } catch (error) {
    console.warn('⚠️  Failed to initialize Logtail:', error);
  }
}

// Create base Pino logger
const isDevelopment = process.env.NODE_ENV !== 'production';

const pinoConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

  // Base configuration
  base: {
    env: process.env.NODE_ENV || 'development',
    service: 'vibe-coder-backend',
  },

  // Format timestamps
  timestamp: () => `,"time":"${new Date().toISOString()}"`,

  // Redact sensitive data
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'apiKey',
      'token',
      'secret',
      '*.password',
      '*.apiKey',
      '*.token',
      '*.secret',
    ],
    remove: true,
  },
};

// Create logger based on environment
let logger: pino.Logger;

if (isDevelopment) {
  // Pretty printing for development
  logger = pino({
    ...pinoConfig,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    },
  });
} else {
  // Standard JSON logging for production
  logger = pino(pinoConfig);
}

// Helper function to send logs to Logtail
function sendToLogtail(level: string, message: string, data?: any) {
  if (logtail && process.env.NODE_ENV === 'production') {
    // Map to Logtail methods
    if (level === 'debug') logtail.debug(message, data);
    else if (level === 'info') logtail.info(message, data);
    else if (level === 'warn') logtail.warn(message, data);
    else if (level === 'error') logtail.error(message, data);
  }
}

/**
 * Create a child logger with additional context
 */
export function createLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * Log levels and utilities
 */
export const log = {
  // Standard log levels
  trace: (msg: string, data?: Record<string, any>) => {
    logger.trace(data, msg);
    sendToLogtail('debug', msg, data);
  },
  debug: (msg: string, data?: Record<string, any>) => {
    logger.debug(data, msg);
    sendToLogtail('debug', msg, data);
  },
  info: (msg: string, data?: Record<string, any>) => {
    logger.info(data, msg);
    sendToLogtail('info', msg, data);
  },
  warn: (msg: string, data?: Record<string, any>) => {
    logger.warn(data, msg);
    sendToLogtail('warn', msg, data);
  },
  error: (msg: string, error?: Error | Record<string, any>) => {
    if (error instanceof Error) {
      logger.error({ err: error }, msg);
      sendToLogtail('error', msg, { error: error.message, stack: error.stack });
    } else {
      logger.error(error, msg);
      sendToLogtail('error', msg, error);
    }
  },
  fatal: (msg: string, error?: Error | Record<string, any>) => {
    if (error instanceof Error) {
      logger.fatal({ err: error }, msg);
      sendToLogtail('error', msg, { error: error.message, stack: error.stack });
    } else {
      logger.fatal(error, msg);
      sendToLogtail('error', msg, error);
    }
  },

  // HTTP request logging
  http: (method: string, url: string, statusCode: number, duration: number, data?: Record<string, any>) => {
    logger.info({
      type: 'http',
      method,
      url,
      statusCode,
      duration,
      ...data,
    }, `${method} ${url} ${statusCode} - ${duration}ms`);
  },

  // LLM API call logging
  llm: (provider: string, model: string, tokens: number, cost: number, cached: boolean, duration: number) => {
    logger.info({
      type: 'llm',
      provider,
      model,
      tokens,
      cost,
      cached,
      duration,
    }, `LLM call: ${provider}/${model} - ${tokens} tokens - $${cost.toFixed(4)} - ${cached ? 'CACHED' : 'API'} - ${duration}ms`);
  },

  // Database query logging
  db: (operation: string, table: string, duration: number, data?: Record<string, any>) => {
    logger.debug({
      type: 'database',
      operation,
      table,
      duration,
      ...data,
    }, `DB ${operation} on ${table} - ${duration}ms`);
  },

  // Cache operation logging
  cache: (operation: 'hit' | 'miss' | 'set' | 'del', key: string, data?: Record<string, any>) => {
    logger.debug({
      type: 'cache',
      operation,
      key,
      ...data,
    }, `Cache ${operation}: ${key}`);
  },

  // Queue/Job logging
  job: (jobType: string, jobId: string, status: 'started' | 'completed' | 'failed', data?: Record<string, any>) => {
    const level = status === 'failed' ? 'error' : 'info';
    logger[level]({
      type: 'job',
      jobType,
      jobId,
      status,
      ...data,
    }, `Job ${jobType} [${jobId}] ${status}`);
  },

  // Performance metrics
  performance: (metric: string, value: number, unit: string, data?: Record<string, any>) => {
    logger.info({
      type: 'performance',
      metric,
      value,
      unit,
      ...data,
    }, `Performance: ${metric} = ${value}${unit}`);
  },

  // Security events
  security: (event: string, severity: 'low' | 'medium' | 'high' | 'critical', data?: Record<string, any>) => {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    logger[level]({
      type: 'security',
      event,
      severity,
      ...data,
    }, `Security event: ${event} (${severity})`);
  },

  // Business events
  event: (name: string, data?: Record<string, any>) => {
    logger.info({
      type: 'event',
      eventName: name,
      ...data,
    }, `Event: ${name}`);
  },
};

/**
 * Flush logs (important for serverless environments)
 */
export async function flushLogs(): Promise<void> {
  if (logtail) {
    await logtail.flush();
  }
}

/**
 * Export the base logger for advanced use cases
 */
export default logger;
