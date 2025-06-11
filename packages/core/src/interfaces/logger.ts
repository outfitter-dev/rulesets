// :M: tldr: Defines the Logger interface for Rulesets
// :M: v0.1.0: Simple logging contract with four standard levels
export interface Logger {
  // :M: tldr: Logs a debug message
  // :M: v0.1.0: For detailed debugging information
  debug(message: string, ...args: unknown[]): void;
  // :M: tldr: Logs an informational message
  // :M: v0.1.0: For general progress and status updates
  info(message: string, ...args: unknown[]): void;
  // :M: tldr: Logs a warning message
  // :M: v0.1.0: For non-fatal issues or deprecation warnings
  warn(message: string, ...args: unknown[]): void;
  // :M: tldr: Logs an error message
  // :M: v0.1.0: For errors that require user attention
  error(message: string | Error, ...args: unknown[]): void;
}

// Basic console logger implementation for v0
export class ConsoleLogger implements Logger {
  // :M: tldr: Logs a debug message to the console
  // :M: v0.1.0: Console implementation of debug logging
  public debug(message: string, ...args: unknown[]): void {
    console.debug(`[DEBUG] ${message}`, ...args);
  }
  // :M: tldr: Logs an informational message to the console
  // :M: v0.1.0: Console implementation of info logging
  public info(message: string, ...args: unknown[]): void {
    console.info(`[INFO] ${message}`, ...args);
  }
  // :M: tldr: Logs a warning message to the console
  // :M: v0.1.0: Console implementation of warning logging
  public warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }
  // :M: tldr: Logs an error message to the console
  // :M: v0.1.0: Console implementation with stack trace support
  public error(message: string | Error, ...args: unknown[]): void {
    if (message instanceof Error) {
      console.error(`[ERROR] ${message.message}`, message.stack, ...args);
    } else {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}