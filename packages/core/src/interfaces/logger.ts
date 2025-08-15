// TLDR: Defines the Logger interface for Rulesets (ruleset-v0.1-beta)
// TLDR: ruleset-v0.1-beta Simple logging contract with four standard levels
export interface Logger {
  // TLDR: Logs a debug message (ruleset-v0.1-beta)
  // TLDR: ruleset-v0.1-beta For detailed debugging information
  debug(message: string, ...args: unknown[]): void;
  // TLDR: Logs an informational message (ruleset-v0.1-beta)
  // TLDR: ruleset-v0.1-beta For general progress and status updates
  info(message: string, ...args: unknown[]): void;
  // TLDR: Logs a warning message (ruleset-v0.1-beta)
  // TLDR: ruleset-v0.1-beta For non-fatal issues or deprecation warnings
  warn(message: string, ...args: unknown[]): void;
  // TLDR: Logs an error message (ruleset-v0.1-beta)
  // TLDR: ruleset-v0.1-beta For errors that require user attention
  error(message: string | Error, ...args: unknown[]): void;
}

// Basic console logger implementation for v0
export class ConsoleLogger implements Logger {
  // TLDR: Logs a debug message to the console (ruleset-v0.1-beta)
  // TLDR: ruleset-v0.1-beta Console implementation of debug logging
  debug(message: string, ...args: unknown[]): void {
    if (process.env.RULESETS_LOG_LEVEL === 'debug') {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
  // TLDR: Logs an informational message to the console (ruleset-v0.1-beta)
  // TLDR: ruleset-v0.1-beta Console implementation of info logging
  info(message: string, ...args: unknown[]): void {
    console.info(`[INFO] ${message}`, ...args);
  }
  // TLDR: Logs a warning message to the console (ruleset-v0.1-beta)
  // TLDR: ruleset-v0.1-beta Console implementation of warning logging
  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }
  // TLDR: Logs an error message to the console (ruleset-v0.1-beta)
  // TLDR: ruleset-v0.1-beta Console implementation with stack trace support
  error(message: string | Error, ...args: unknown[]): void {
    if (message instanceof Error) {
      console.error(`[ERROR] ${message.message}`, message.stack, ...args);
    } else {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}
