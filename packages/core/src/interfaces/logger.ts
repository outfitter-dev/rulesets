export type Logger = {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string | Error, ...args: unknown[]): void;
};

// Basic console logger implementation for v0
export class ConsoleLogger implements Logger {
  debug(message: string, ...args: unknown[]): void {
    if (process.env.RULESETS_LOG_LEVEL === 'debug') {
      // biome-ignore lint/suspicious/noConsole: This is a logger implementation
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
  info(message: string, ...args: unknown[]): void {
    // biome-ignore lint/suspicious/noConsole: This is a logger implementation
    console.info(`[INFO] ${message}`, ...args);
  }
  warn(message: string, ...args: unknown[]): void {
    // biome-ignore lint/suspicious/noConsole: This is a logger implementation
    console.warn(`[WARN] ${message}`, ...args);
  }
  error(message: string | Error, ...args: unknown[]): void {
    if (message instanceof Error) {
      // biome-ignore lint/suspicious/noConsole: This is a logger implementation
      console.error(`[ERROR] ${message.message}`, message.stack, ...args);
    } else {
      // biome-ignore lint/suspicious/noConsole: This is a logger implementation
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}
