// TLDR: Defines the Logger interface for Mixdown. Provides a simple contract for logging messages at different levels (mixd-v0)
export interface Logger {
  // TLDR: Logs a debug message (mixd-v0)
  debug(message: string, ...args: any[]): void;
  // TLDR: Logs an informational message (mixd-v0)
  info(message: string, ...args: any[]): void;
  // TLDR: Logs a warning message (mixd-v0)
  warn(message: string, ...args: any[]): void;
  // TLDR: Logs an error message (mixd-v0)
  error(message: string | Error, ...args: any[]): void;
}

// Basic console logger implementation for v0
export class ConsoleLogger implements Logger {
  // TLDR: Logs a debug message to the console (mixd-v0)
  public debug(message: string, ...args: any[]): void {
    console.debug(`[DEBUG] ${message}`, ...args);
  }
  // TLDR: Logs an informational message to the console (mixd-v0)
  public info(message: string, ...args: any[]): void {
    console.info(`[INFO] ${message}`, ...args);
  }
  // TLDR: Logs a warning message to the console (mixd-v0)
  public warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }
  // TLDR: Logs an error message to the console (mixd-v0)
  public error(message: string | Error, ...args: any[]): void {
    if (message instanceof Error) {
      console.error(`[ERROR] ${message.message}`, message.stack, ...args);
    } else {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}