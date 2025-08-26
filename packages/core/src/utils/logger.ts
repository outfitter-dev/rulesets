/**

- Centralized logger configuration using Pino
- Replaces console.*usage to meet Ultracite standards
 */

import type { Logger as PinoLogger } from 'pino';
import * as pinoModule from 'pino';

const pino = (pinoModule as any).default || pinoModule;

// Define log levels for the application
export type LogLevel =
  | 'fatal'
  | 'error'
  | 'warn'
  | 'info'
  | 'debug'
  | 'trace'
  | 'silent';

// Logger configuration options
export interface LoggerOptions {
  name?: string;
  level?: LogLevel;
  prettyPrint?: boolean;
}

/**

- Creates a configured Pino logger instance
 */
export function createLogger(options: LoggerOptions = {}): PinoLogger {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';

  function getDefaultLogLevel(): string {
    if (isTest) {
      return 'silent';
    }
    if (isDevelopment) {
      return 'debug';
    }
    return 'info';
  }

  const defaultOptions = {
    name: options.name || '@rulesets/core',
    level: options.level || getDefaultLogLevel(),
    formatters: {
      level: (label: string) => {
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
export function getChildLogger(
  module: string,
  context?: Record<string, unknown>
): PinoLogger {
  return logger.child({ module, ...context });
}

// Re-export types for convenience
export type { Logger } from 'pino';

/**

- Logger interface matching our existing Logger type in @rulesets/types
- This provides compatibility with existing code
 */
export interface RulesetsLogger {
  info: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  debug: (msg: string, ...args: unknown[]) => void;
}

/**

- Adapter to convert Pino logger to RulesetsLogger interface
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

- Mock logger for testing that doesn't output anything
 */
export const mockLogger: RulesetsLogger = {
  info: () => {
    // Mock logger - no implementation needed
  },
  error: () => {
    // Mock logger - no implementation needed
  },
  warn: () => {
    // Mock logger - no implementation needed
  },
  debug: () => {
    // Mock logger - no implementation needed
  },
};
