/**

- @fileoverview PerformanceCache implementation
-
- Provides high-performance multi-level caching with TTL, LRU eviction,
- and optional persistence for optimizing repeated operations.
 */

import { ErrorCodes, SandboxError } from '@/domain/errors';
import type { Timestamp } from '@/shared/types/brands';
import { createTimestamp } from '@/shared/types/brands';
import { Err, Ok, type Result } from '@/shared/types/result';
import type { PerformanceMonitor } from '../monitoring/performance.monitor';

/**

- Cache entry with metadata
 */
export interface CacheEntry<T> {
  readonly key: string;
  readonly value: T;
  readonly createdAt: Timestamp;
  readonly expiresAt: Timestamp;
  readonly accessCount: number;
  readonly lastAccessed: Timestamp;
  readonly sizeBytes: number;
}

/**

- Cache configuration options
 */
export interface CacheConfig {
  /**Maximum number of entries */
  readonly maxEntries: number;
  /** Default TTL in milliseconds */
  readonly defaultTtlMs: number;
  /**Maximum memory usage in bytes */
  readonly maxMemoryBytes: number;
  /** Enable LRU eviction */
  readonly enableLru: boolean;
  /**Enable performance monitoring */
  readonly enableMonitoring: boolean;
  /** Cleanup interval in milliseconds */
  readonly cleanupIntervalMs: number;
}

/**

- Cache statistics
 */
export interface CacheStats {
  readonly size: number;
  readonly memoryUsageBytes: number;
  readonly hitCount: number;
  readonly missCount: number;
  readonly hitRate: number;
  readonly evictionCount: number;
  readonly expiredCount: number;
  readonly oldestEntry?: Timestamp;
  readonly newestEntry?: Timestamp;
  readonly avgAccessTime?: number;
}

/**

- Cache health status
 */
export interface CacheHealth {
  readonly healthy: boolean;
  readonly stats: CacheStats;
  readonly memoryPressure: number; // 0-1 scale
  readonly warnings: readonly string[];
  readonly recommendations: readonly string[];
}

/**

- Cache error for cache-specific operations
 */
class CacheError extends SandboxError {
  constructor(
    code: string,
    message: string,
    context: Record<string, unknown> = {},
    cause?: Error
  ) {
    super(code, message, 'cache', 'error', context, [], cause);
  }
}

/**

- High-performance cache with TTL, LRU eviction, and monitoring
 */
export class PerformanceCache<T = unknown> {
  private readonly entries = new Map<string, CacheEntry<T>>();
  private readonly accessOrder: string[] = []; // For LRU tracking
  private readonly config: CacheConfig;
  private readonly monitor?: PerformanceMonitor;

  private hitCount = 0;
  private missCount = 0;
  private evictionCount = 0;
  private expiredCount = 0;
  private memoryUsage = 0;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}, monitor?: PerformanceMonitor) {
    this.config = {
      maxEntries: 1000,
      defaultTtlMs: 300_000, // 5 minutes
      maxMemoryBytes: 50 *1024* 1024, // 50MB
      enableLru: true,
      enableMonitoring: true,
      cleanupIntervalMs: 60_000, // 1 minute
      ...config,
    };

    this.monitor = monitor;

    // Start cleanup timer
    if (this.config.cleanupIntervalMs > 0) {
      this.startCleanupTimer();
    }
  }

  /**

- Get value from cache
   */
  async get(key: string): Promise<Result<T | undefined, SandboxError>> {
    try {
      const startTime = this.monitor ? performance.now() : 0;

      const entry = this.entries.get(key);

      if (!entry) {
        this.missCount++;
        this.recordMetric('cache_miss', 1);
        return Ok(undefined);
      }

      // Check if expired
      const now = Date.now();
      if (entry.expiresAt < now) {
        this.entries.delete(key);
        this.memoryUsage -= entry.sizeBytes;
        this.expiredCount++;
        this.missCount++;
        this.recordMetric('cache_expired', 1);
        return Ok(undefined);
      }

      // Update access tracking
      const updatedEntry: CacheEntry<T> = {
        ...entry,
        accessCount: entry.accessCount + 1,
        lastAccessed: createTimestamp(now),
      };

      this.entries.set(key, updatedEntry);

      // Update LRU order
      if (this.config.enableLru) {
        this.updateAccessOrder(key);
      }

      this.hitCount++;

      if (this.monitor && startTime > 0) {
        const duration = performance.now() - startTime;
        this.recordMetric('cache_get_time', duration, 'ms');
      }

      this.recordMetric('cache_hit', 1);
      return Ok(entry.value);
    } catch (error) {
      return Err(
        new CacheError(
          ErrorCodes.INTERNAL_ERROR,
          `Cache get failed: ${(error as Error).message}`,
          { key },
          error as Error
        )
      );
    }
  }

  /**

- Set value in cache with optional TTL
   */
  async set(
    key: string,
    value: T,
    ttlMs?: number
  ): Promise<Result<void, SandboxError>> {
    try {
      const startTime = this.monitor ? performance.now() : 0;
      const now = Date.now();
      const ttl = ttlMs ?? this.config.defaultTtlMs;
      const expiresAt = now + ttl;

      // Calculate size (rough estimation)
      const sizeBytes = this.estimateSize(value);

      // Check memory limits
      if (sizeBytes > this.config.maxMemoryBytes) {
        return Err(
          new CacheError(
            ErrorCodes.MEMORY_LIMIT_EXCEEDED,
            'Entry too large for cache',
            { key, sizeBytes, maxMemoryBytes: this.config.maxMemoryBytes }
          )
        );
      }

      // Remove existing entry if present
      const existingEntry = this.entries.get(key);
      if (existingEntry) {
        this.memoryUsage -= existingEntry.sizeBytes;
      }

      // Ensure we have space
      await this.ensureCapacity(sizeBytes);

      const entry: CacheEntry<T> = {
        key,
        value,
        createdAt: createTimestamp(now),
        expiresAt: createTimestamp(expiresAt),
        accessCount: 0,
        lastAccessed: createTimestamp(now),
        sizeBytes,
      };

      this.entries.set(key, entry);
      this.memoryUsage += sizeBytes;

      // Update LRU order
      if (this.config.enableLru) {
        this.updateAccessOrder(key);
      }

      if (this.monitor && startTime > 0) {
        const duration = performance.now() - startTime;
        this.recordMetric('cache_set_time', duration, 'ms');
      }

      this.recordMetric('cache_set', 1);
      return Ok(undefined);
    } catch (error) {
      return Err(
        new CacheError(
          ErrorCodes.INTERNAL_ERROR,
          `Cache set failed: ${(error as Error).message}`,
          { key },
          error as Error
        )
      );
    }
  }

  /**

- Get or compute value with automatic caching
   */
  async getOrSet<R extends T>(
    key: string,
    factory: () => Promise<R>,
    ttlMs?: number
  ): Promise<Result<R, SandboxError>> {
    try {
      // Try to get from cache first
      const cached = await this.get(key);
      if (!cached.success) {
        return cached;
      }

      if (cached.value !== undefined) {
        return Ok(cached.value as R);
      }

      // Cache miss - compute value
      const startTime = this.monitor ? performance.now() : 0;
      const value = await factory();

      if (this.monitor && startTime > 0) {
        const duration = performance.now() - startTime;
        this.recordMetric('cache_factory_time', duration, 'ms');
      }

      // Store in cache
      const setResult = await this.set(key, value, ttlMs);
      if (!setResult.success) {
        // Return value even if caching failed
        return Ok(value);
      }

      return Ok(value);
    } catch (error) {
      return Err(
        new CacheError(
          ErrorCodes.INTERNAL_ERROR,
          `Cache getOrSet failed: ${(error as Error).message}`,
          { key },
          error as Error
        )
      );
    }
  }

  /**

- Delete entry from cache
   */
  async delete(key: string): Promise<Result<boolean, SandboxError>> {
    try {
      const entry = this.entries.get(key);
      if (!entry) {
        return Ok(false);
      }

      this.entries.delete(key);
      this.memoryUsage -= entry.sizeBytes;

      // Remove from LRU order
      if (this.config.enableLru) {
        const index = this.accessOrder.indexOf(key);
        if (index >= 0) {
          this.accessOrder.splice(index, 1);
        }
      }

      this.recordMetric('cache_delete', 1);
      return Ok(true);
    } catch (error) {
      return Err(
        new CacheError(
          ErrorCodes.INTERNAL_ERROR,
          `Cache delete failed: ${(error as Error).message}`,
          { key },
          error as Error
        )
      );
    }
  }

  /**

- Check if key exists in cache
   */
  async has(key: string): Promise<Result<boolean, SandboxError>> {
    try {
      const entry = this.entries.get(key);
      if (!entry) {
        return Ok(false);
      }

      // Check if expired
      const now = Date.now();
      if (entry.expiresAt < now) {
        // Clean up expired entry
        await this.delete(key);
        return Ok(false);
      }

      return Ok(true);
    } catch (error) {
      return Err(
        new CacheError(
          ErrorCodes.INTERNAL_ERROR,
          `Cache has failed: ${(error as Error).message}`,
          { key },
          error as Error
        )
      );
    }
  }

  /**

- Clear all entries
   */
  async clear(): Promise<Result<void, SandboxError>> {
    try {
      this.entries.clear();
      this.accessOrder.length = 0;
      this.memoryUsage = 0;
      this.recordMetric('cache_clear', 1);
      return Ok(undefined);
    } catch (error) {
      return Err(
        new CacheError(
          ErrorCodes.INTERNAL_ERROR,
          `Cache clear failed: ${(error as Error).message}`,
          {},
          error as Error
        )
      );
    }
  }

  /**

- Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.entries.values());
    const totalOps = this.hitCount + this.missCount;
    const hitRate = totalOps > 0 ? this.hitCount / totalOps : 0;

    const timestamps = entries.map((e) => e.createdAt);
    const oldestEntry =
      timestamps.length > 0 ? Math.min(...timestamps) : undefined;
    const newestEntry =
      timestamps.length > 0 ? Math.max(...timestamps) : undefined;

    return {
      size: this.entries.size,
      memoryUsageBytes: this.memoryUsage,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate,
      evictionCount: this.evictionCount,
      expiredCount: this.expiredCount,
      oldestEntry: oldestEntry ? createTimestamp(oldestEntry) : undefined,
      newestEntry: newestEntry ? createTimestamp(newestEntry) : undefined,
    };
  }

  /**

- Get cache health status
   */
  async getHealthStatus(): Promise<Result<CacheHealth, SandboxError>> {
    try {
      const stats = this.getStats();
      const memoryPressure =
        this.config.maxMemoryBytes > 0
          ? this.memoryUsage / this.config.maxMemoryBytes
          : 0;

      const warnings: string[] = [];
      const recommendations: string[] = [];

      // Analyze health
      if (stats.hitRate < 0.5 && stats.hitCount + stats.missCount > 100) {
        warnings.push(`Low hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
        recommendations.push('Consider increasing TTL or cache size');
      }

      if (memoryPressure > 0.8) {
        warnings.push(
          `High memory usage: ${(memoryPressure * 100).toFixed(1)}%`
        );
        recommendations.push(
          'Consider increasing maxMemoryBytes or reducing TTL'
        );
      }

      if (stats.evictionCount > stats.hitCount / 2) {
        warnings.push('High eviction rate');
        recommendations.push('Consider increasing maxEntries');
      }

      if (stats.size === 0 && stats.hitCount + stats.missCount > 50) {
        warnings.push('Cache not being utilized effectively');
        recommendations.push('Check TTL configuration and usage patterns');
      }

      return Ok({
        healthy: warnings.length === 0,
        stats,
        memoryPressure,
        warnings,
        recommendations,
      });
    } catch (error) {
      return Err(
        new CacheError(
          ErrorCodes.INTERNAL_ERROR,
          `Health check failed: ${(error as Error).message}`,
          {},
          error as Error
        )
      );
    }
  }

  /**

- Clean up expired entries
   */
  async cleanup(): Promise<Result<number, SandboxError>> {
    try {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [key, entry] of this.entries.entries()) {
        if (entry.expiresAt < now) {
          this.entries.delete(key);
          this.memoryUsage -= entry.sizeBytes;
          this.expiredCount++;
          cleanedCount++;

          // Remove from LRU order
          if (this.config.enableLru) {
            const index = this.accessOrder.indexOf(key);
            if (index >= 0) {
              this.accessOrder.splice(index, 1);
            }
          }
        }
      }

      this.recordMetric('cache_cleanup', cleanedCount);
      return Ok(cleanedCount);
    } catch (error) {
      return Err(
        new CacheError(
          ErrorCodes.INTERNAL_ERROR,
          `Cache cleanup failed: ${(error as Error).message}`,
          {},
          error as Error
        )
      );
    }
  }

  /**

- Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    this.entries.clear();
    this.accessOrder.length = 0;
    this.memoryUsage = 0;
  }

  /**

- Ensure cache has capacity for new entry
   */
  private async ensureCapacity(neededBytes: number): Promise<void> {
    // Check memory limit
    if (this.memoryUsage + neededBytes > this.config.maxMemoryBytes) {
      await this.evictMemory(neededBytes);
    }

    // Check entry count limit
    if (this.entries.size >= this.config.maxEntries) {
      await this.evictEntries(1);
    }
  }

  /**

- Evict entries to free memory
   */
  private async evictMemory(neededBytes: number): Promise<void> {
    const targetMemory = this.config.maxMemoryBytes - neededBytes;

    if (this.config.enableLru) {
      // Evict LRU entries
      while (this.memoryUsage > targetMemory && this.accessOrder.length > 0) {
        const oldestKey = this.accessOrder.shift();
        if (oldestKey) {
          const entry = this.entries.get(oldestKey);
          if (entry) {
            this.entries.delete(oldestKey);
            this.memoryUsage -= entry.sizeBytes;
            this.evictionCount++;
          }
        }
      }
    } else {
      // Evict oldest entries by creation time
      const entries = Array.from(this.entries.entries()).sort(
        ([, a], [, b]) => a.createdAt - b.createdAt
      );

      for (const [key, entry] of entries) {
        if (this.memoryUsage <= targetMemory) break;

        this.entries.delete(key);
        this.memoryUsage -= entry.sizeBytes;
        this.evictionCount++;
      }
    }
  }

  /**

- Evict specified number of entries
   */
  private async evictEntries(count: number): Promise<void> {
    if (this.config.enableLru) {
      // Evict LRU entries
      for (let i = 0; i < count && this.accessOrder.length > 0; i++) {
        const oldestKey = this.accessOrder.shift();
        if (oldestKey) {
          const entry = this.entries.get(oldestKey);
          if (entry) {
            this.entries.delete(oldestKey);
            this.memoryUsage -= entry.sizeBytes;
            this.evictionCount++;
          }
        }
      }
    } else {
      // Evict oldest entries
      const entries = Array.from(this.entries.entries())
        .sort(([, a], [, b]) => a.createdAt - b.createdAt)
        .slice(0, count);

      for (const [key, entry] of entries) {
        this.entries.delete(key);
        this.memoryUsage -= entry.sizeBytes;
        this.evictionCount++;
      }
    }
  }

  /**

- Update LRU access order
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index >= 0) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**

- Estimate memory size of value
   */
  private estimateSize(value: T): number {
    try {
      // Rough estimation based on JSON serialization
      const serialized = JSON.stringify(value);
      return serialized.length* 2; // Assume UTF-16 encoding
    } catch {
      // Fallback for non-serializable values
      return 1024; // 1KB default
    }
  }

  /**

- Record performance metric
   */
  private recordMetric(
    name: string,
    value: number,
    unit: 'ms' | 'bytes' | 'count' = 'count'
  ): void {
    if (this.monitor && this.config.enableMonitoring) {
      this.monitor.record(name, value, unit, { cache: true });
    }
  }

  /**

- Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      await this.cleanup();
    }, this.config.cleanupIntervalMs);

    // Don't keep the process alive just for cleanup
    this.cleanupTimer.unref();
  }
}
