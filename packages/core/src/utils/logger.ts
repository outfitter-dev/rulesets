/**
 * Centralized logger configuration using Pino
 * Replaces console.* usage to meet Ultracite standards
 */

import pino from 'pino';
import type { Logger as PinoLogger } from 'pino';

// Define log levels for the application
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

// Logger configuration options
export interface LoggerOptions {
  name?: string;
  level?: LogLevel;
  prettyPrint?: boolean;
}

/**
 * Creates a configured Pino logger instance
 */
export function createLogger(options: LoggerOptions = {}): PinoLogger {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';
  
  const defaultOptions: pino.LoggerOptions = {
    name: options.name || '@rulesets/core',
    level: options.level || (isTest ? 'silent' : isDevelopment ? 'debug' : 'info'),
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },
  };

  // In development, use pretty printing for better readability
  if (isDevelopment && options.prettyPrint !== false) {
    return pino({
      ...defaultOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'HH:MM:ss.l',
        },
      },
    });
  }

  // In production/test, use standard JSON logging
  return pino(defaultOptions);
}

// Default logger instance for the core package
export const logger = createLogger();

// Child logger factory for specific modules
export function getChildLogger(module: string, context?: Record<string, unknown>): PinoLogger {
  return logger.child({ module, ...context });
}

// Re-export types for convenience
export type { Logger } from 'pino';

/**
 * Logger interface matching our existing Logger type in @rulesets/types
 * This provides compatibility with existing code
 */
export interface RulesetsLogger {
  info: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  debug: (msg: string, ...args: unknown[]) => void;
}

/**
 * Adapter to convert Pino logger to RulesetsLogger interface
 */
export function toRulesetsLogger(pinoLogger: PinoLogger): RulesetsLogger {
  return {
    info: (msg: string, ...args: unknown[]) => pinoLogger.info({ args }, msg),
    error: (msg: string, ...args: unknown[]) => pinoLogger.error({ args }, msg),
    warn: (msg: string, ...args: unknown[]) => pinoLogger.warn({ args }, msg),
    debug: (msg: string, ...args: unknown[]) => pinoLogger.debug({ args }, msg),
  };
}

/**
 * Mock logger for testing that doesn't output anything
 */
export const mockLogger: RulesetsLogger = {
  info: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {},
};