import type { Logger } from '../interfaces';

/**
 * Console logger implementation.
 */
export class ConsoleLogger implements Logger {
  constructor(private level: 'debug' | 'info' | 'warn' | 'error' = 'info') {}
  
  private shouldLog(msgLevel: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[msgLevel] >= levels[this.level];
  }
  
  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
  
  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.log(message, ...args);
    }
  }
  
  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`⚠️  ${message}`, ...args);
    }
  }
  
  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(`❌ ${message}`, ...args);
    }
  }
}