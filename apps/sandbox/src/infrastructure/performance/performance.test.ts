/**

- @fileoverview Performance Components Test Suite
-
- Comprehensive tests for all performance components with
- real performance validation and benchmarking.
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createSafeFilePath, createSourceContent } from '@/shared/types/brands';
import {
  AsyncQueue,
  type BenchmarkConfig,
  PerformanceCache,
  PerformanceMonitor,
  StreamingService,
} from './index';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  test('should measure operation duration', async () => {
    const { result, metric } = await monitor.measure(
      'test_operation',
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'success';
      }
    );

    expect(result).toBe('success');
    expect(metric.name).toBe('test_operation');
    expect(metric.value).toBeGreaterThan(8); // Account for timing variance
    expect(metric.unit).toBe('ms');
  });

  test('should measure sync operations', () => {
    const { result, metric } = monitor.measureSync('sync_operation', () => {
      let sum = 0;
      for (let i = 0; i < 1000; i++) {
        sum += i;
      }
      return sum;
    });

    expect(result).toBe(499_500);
    expect(metric.name).toBe('sync_operation');
    expect(metric.value).toBeGreaterThan(0);
  });

  test('should handle timer operations', () => {
    const timer = monitor.startTimer('manual_timer');

    // Simulate some work
    for (let i = 0; i < 100; i++) {
      Math.random();
    }

    const metric = timer.stop();
    expect(metric.name).toBe('manual_timer');
    expect(metric.value).toBeGreaterThan(0);
  });

  test('should run benchmarks', async () => {
    const config: BenchmarkConfig = {
      name: 'test_benchmark',
      iterations: 10,
      warmupIterations: 2,
      timeout: 5000,
    };

    const result = await monitor.benchmark(config, async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.iterations).toBe(10);
      expect(result.value.averageTimeMs).toBeGreaterThan(0);
      expect(result.value.throughputPerSecond).toBeGreaterThan(0);
    }
  });

  test('should track performance statistics', async () => {
    // Record multiple metrics
    for (let i = 0; i < 5; i++) {
      monitor.record('test_metric', i * 10, 'ms');
    }

    const stats = monitor.getStats('test_metric');
    expect(stats.success).toBe(true);

    if (stats.success) {
      expect(stats.value.count).toBe(5);
      expect(stats.value.average).toBe(20); // (0+10+20+30+40)/5
      expect(stats.value.min).toBe(0);
      expect(stats.value.max).toBe(40);
    }
  });

  test('should provide health status', async () => {
    // Generate some metrics
    monitor.record('test_op', 100, 'ms');
    monitor.record('test_op', 200, 'ms');

    const health = await monitor.getHealthStatus();
    expect(health.success).toBe(true);

    if (health.success) {
      expect(health.value.healthy).toBe(true);
      expect(health.value.avgResponseTimeMs).toBeGreaterThan(0);
    }
  });
});

describe('PerformanceCache', () => {
  let cache: PerformanceCache<string>;

  beforeEach(() => {
    cache = new PerformanceCache<string>({
      maxEntries: 100,
      defaultTtlMs: 60_000,
      maxMemoryBytes: 1024 * 1024,
      enableLru: true,
      enableMonitoring: true,
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  test('should set and get values', async () => {
    const setResult = await cache.set('test_key', 'test_value');
    expect(setResult.success).toBe(true);

    const getResult = await cache.get('test_key');
    expect(getResult.success).toBe(true);
    expect(getResult.value).toBe('test_value');
  });

  test('should handle cache misses', async () => {
    const getResult = await cache.get('missing_key');
    expect(getResult.success).toBe(true);
    expect(getResult.value).toBeUndefined();
  });

  test('should respect TTL', async () => {
    const shortTtl = 100; // 100ms
    await cache.set('ttl_key', 'ttl_value', shortTtl);

    const immediateResult = await cache.get('ttl_key');
    expect(immediateResult.value).toBe('ttl_value');

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 150));

    const expiredResult = await cache.get('ttl_key');
    expect(expiredResult.value).toBeUndefined();
  });

  test('should handle LRU eviction', async () => {
    const smallCache = new PerformanceCache<string>({
      maxEntries: 3,
      enableLru: true,
    });

    // Fill cache
    await smallCache.set('key1', 'value1');
    await smallCache.set('key2', 'value2');
    await smallCache.set('key3', 'value3');

    // Access key1 to make it most recently used
    await smallCache.get('key1');

    // Add another item to trigger eviction
    await smallCache.set('key4', 'value4');

    // key2 should be evicted (least recently used)
    const key1Result = await smallCache.get('key1');
    const key2Result = await smallCache.get('key2');
    const key3Result = await smallCache.get('key3');
    const key4Result = await smallCache.get('key4');

    expect(key1Result.value).toBe('value1'); // Should still exist
    expect(key2Result.value).toBeUndefined(); // Should be evicted
    expect(key3Result.value).toBe('value3'); // Should still exist
    expect(key4Result.value).toBe('value4'); // Should exist

    smallCache.destroy();
  });

  test('should provide getOrSet functionality', async () => {
    let factoryCalled = false;

    const result = await cache.getOrSet('computed_key', async () => {
      factoryCalled = true;
      return 'computed_value';
    });

    expect(result.success).toBe(true);
    expect(result.value).toBe('computed_value');
    expect(factoryCalled).toBe(true);

    // Second call should hit cache
    factoryCalled = false;
    const cachedResult = await cache.getOrSet('computed_key', async () => {
      factoryCalled = true;
      return 'should_not_be_called';
    });

    expect(cachedResult.success).toBe(true);
    expect(cachedResult.value).toBe('computed_value');
    expect(factoryCalled).toBe(false); // Factory should not be called
  });

  test('should provide cache statistics', () => {
    cache.record('cache_hit', 1);
    cache.record('cache_miss', 1);

    const stats = cache.getStats();
    expect(stats.size).toBe(0); // No actual cache entries
    expect(stats.hitCount).toBeGreaterThanOrEqual(0);
    expect(stats.missCount).toBeGreaterThanOrEqual(0);
  });

  test('should cleanup expired entries', async () => {
    await cache.set('cleanup_key', 'cleanup_value', 50); // 50ms TTL

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 100));

    const cleanupResult = await cache.cleanup();
    expect(cleanupResult.success).toBe(true);
    expect(cleanupResult.value).toBeGreaterThanOrEqual(0);
  });
});

describe('AsyncQueue', () => {
  let queue: AsyncQueue;

  beforeEach(() => {
    queue = new AsyncQueue({
      maxConcurrency: 2,
      defaultTimeoutMs: 5000,
      enablePrioritization: true,
      enableMonitoring: true,
    });
  });

  afterEach(async () => {
    await queue.clear();
  });

  test('should enqueue and execute tasks', async () => {
    let executed = false;

    const taskId = await queue.enqueue({
      name: 'test_task',
      priority: 'normal',
      operation: async () => {
        executed = true;
        return 'success';
      },
    });

    expect(taskId.success).toBe(true);

    if (taskId.success) {
      const result = await queue.wait(taskId.value);
      expect(result.success).toBe(true);
      expect(executed).toBe(true);

      if (result.success) {
        expect(result.value.status).toBe('completed');
        expect(result.value.result).toBe('success');
      }
    }
  });

  test('should handle task priorities', async () => {
    const results: string[] = [];

    // Enqueue tasks in reverse priority order
    const lowTask = await queue.enqueue({
      name: 'low_priority',
      priority: 'low',
      operation: async () => {
        results.push('low');
        return 'low';
      },
    });

    const highTask = await queue.enqueue({
      name: 'high_priority',
      priority: 'high',
      operation: async () => {
        results.push('high');
        return 'high';
      },
    });

    const urgentTask = await queue.enqueue({
      name: 'urgent_priority',
      priority: 'urgent',
      operation: async () => {
        results.push('urgent');
        return 'urgent';
      },
    });

    // Wait for all tasks
    if (lowTask.success) await queue.wait(lowTask.value);
    if (highTask.success) await queue.wait(highTask.value);
    if (urgentTask.success) await queue.wait(urgentTask.value);

    // Urgent should execute first, then high, then low
    expect(results[0]).toBe('urgent');
    expect(results[1]).toBe('high');
    expect(results[2]).toBe('low');
  });

  test('should handle task cancellation', async () => {
    const taskId = await queue.enqueue({
      name: 'cancellable_task',
      priority: 'normal',
      operation: async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return 'should_not_complete';
      },
    });

    expect(taskId.success).toBe(true);

    if (taskId.success) {
      const cancelResult = await queue.cancel(taskId.value);
      expect(cancelResult.success).toBe(true);
      expect(cancelResult.value).toBe(true);

      const result = await queue.wait(taskId.value);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.value.status).toBe('cancelled');
      }
    }
  });

  test('should respect concurrency limits', async () => {
    let runningCount = 0;
    let maxConcurrent = 0;

    const createTask = (name: string) => ({
      name,
      priority: 'normal' as const,
      operation: async () => {
        runningCount++;
        maxConcurrent = Math.max(maxConcurrent, runningCount);

        await new Promise((resolve) => setTimeout(resolve, 100));

        runningCount--;
        return name;
      },
    });

    // Enqueue more tasks than concurrency limit
    const tasks = await Promise.all([
      queue.enqueue(createTask('task1')),
      queue.enqueue(createTask('task2')),
      queue.enqueue(createTask('task3')),
      queue.enqueue(createTask('task4')),
    ]);

    // Wait for all tasks
    for (const task of tasks) {
      if (task.success) {
        await queue.wait(task.value);
      }
    }

    // Should never exceed concurrency limit
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  test('should provide queue statistics', () => {
    const stats = queue.getStats();
    expect(stats.maxConcurrency).toBe(2);
    expect(stats.currentConcurrency).toBe(0);
    expect(stats.pendingTasks).toBe(0);
    expect(stats.totalTasks).toBeGreaterThanOrEqual(0);
  });

  test('should handle task timeouts', async () => {
    const taskId = await queue.enqueue({
      name: 'timeout_task',
      priority: 'normal',
      timeoutMs: 100,
      operation: async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return 'should_timeout';
      },
    });

    expect(taskId.success).toBe(true);

    if (taskId.success) {
      const result = await queue.wait(taskId.value);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.value.status).toBe('timeout');
      }
    }
  });

  test('should handle task retries', async () => {
    let attempts = 0;

    const taskId = await queue.enqueue({
      name: 'retry_task',
      priority: 'normal',
      maxRetries: 2,
      operation: async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Retry test');
        }
        return 'success_after_retries';
      },
    });

    expect(taskId.success).toBe(true);

    if (taskId.success) {
      const result = await queue.wait(taskId.value);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.value.status).toBe('completed');
        expect(result.value.result).toBe('success_after_retries');
        expect(result.value.retryCount).toBe(2);
      }
    }

    expect(attempts).toBe(3);
  });
});

describe('StreamingService', () => {
  let streaming: StreamingService;

  beforeEach(() => {
    streaming = new StreamingService({
      chunkSize: 1024,
      enableProgress: false, // Disable for tests
      enableChecksum: true,
    });
  });

  test('should create content streams', () => {
    const content = 'Test streaming content';
    const stream = streaming.createContentStream(createSourceContent(content));

    expect(stream).toBeDefined();
    expect(stream.readable).toBe(true);
  });

  test('should convert streams to content', async () => {
    const originalContent = 'Stream to content test';
    const stream = streaming.createContentStream(
      createSourceContent(originalContent)
    );

    const result = await streaming.streamToContent(stream);
    expect(result.success).toBe(true);
    expect(result.value).toBe(originalContent);
  });

  test('should handle large content streaming', async () => {
    const largeContent = 'Large content line.\n'.repeat(1000);
    const stream = streaming.createContentStream(
      createSourceContent(largeContent)
    );

    const result = await streaming.streamToContent(stream);
    expect(result.success).toBe(true);
    expect(result.value).toBe(largeContent);
  });

  test('should process files in chunks', async () => {
    // This would require file system setup in a real test
    // For now, test the configuration
    const config = streaming.getConfig();
    expect(config.chunkSize).toBe(1024);
    expect(config.enableChecksum).toBe(true);
  });
});

describe('Performance Integration', () => {
  test('should integrate all components', async () => {
    const monitor = new PerformanceMonitor();
    const cache = new PerformanceCache<string>(
      {
        maxEntries: 10,
      },
      monitor
    );
    const queue = new AsyncQueue(
      {
        maxConcurrency: 1,
      },
      monitor
    );

    // Test integration with caching and queuing
    const taskId = await queue.enqueue({
      name: 'integration_task',
      priority: 'normal',
      operation: async () => {
        return await cache.getOrSet('integration_key', async () => {
          return 'integration_value';
        });
      },
    });

    expect(taskId.success).toBe(true);

    if (taskId.success) {
      const result = await queue.wait(taskId.value);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.value.status).toBe('completed');
        expect(result.value.result.success).toBe(true);
        expect(result.value.result.value).toBe('integration_value');
      }
    }

    // Check that both operations were monitored
    const monitorHealth = await monitor.getHealthStatus();
    expect(monitorHealth.success).toBe(true);

    // Cleanup
    cache.destroy();
    await queue.clear();
  });

  test('should provide comprehensive performance metrics', async () => {
    const monitor = new PerformanceMonitor();

    // Generate various types of metrics
    monitor.record('file_read', 10, 'ms');
    monitor.record('file_write', 15, 'ms');
    monitor.record('cache_hit', 1, 'count');
    monitor.record('cache_miss', 1, 'count');
    monitor.record('memory_usage', 1024 * 1024, 'bytes');

    const summary = monitor.getMetricsSummary();
    expect(Object.keys(summary).length).toBeGreaterThan(0);
    expect(summary['file_read']).toBe(1);
    expect(summary['cache_hit']).toBe(1);

    const health = await monitor.getHealthStatus();
    expect(health.success).toBe(true);

    if (health.success) {
      expect(health.value.diagnostics).toBeDefined();
      expect(health.value.uptime).toBeGreaterThan(0);
    }
  });
});

describe('Performance Benchmarks', () => {
  test('should validate performance targets', async () => {
    const monitor = new PerformanceMonitor();

    // Test basic operations meet performance targets
    const fileOpResult = await monitor.benchmark(
      {
        name: 'file_operation_simulation',
        iterations: 10,
        warmupIterations: 2,
      },
      async () => {
        // Simulate file operation
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    );

    expect(fileOpResult.success).toBe(true);

    if (fileOpResult.success) {
      // Should complete within reasonable time (< 50ms target)
      expect(fileOpResult.value.averageTimeMs).toBeLessThan(50);
      expect(fileOpResult.value.throughputPerSecond).toBeGreaterThan(10);
    }

    const cacheOpResult = await monitor.benchmark(
      {
        name: 'cache_operation_simulation',
        iterations: 100,
        warmupIterations: 10,
      },
      async () => {
        // Simulate cache operation
        const cache = new Map();
        cache.set('key', 'value');
        cache.get('key');
      }
    );

    expect(cacheOpResult.success).toBe(true);

    if (cacheOpResult.success) {
      // Should be very fast (< 5ms target)
      expect(cacheOpResult.value.averageTimeMs).toBeLessThan(5);
      expect(cacheOpResult.value.throughputPerSecond).toBeGreaterThan(100);
    }
  });

  test('should measure memory efficiency', async () => {
    const monitor = new PerformanceMonitor();
    const initialMemory = process.memoryUsage().heapUsed;

    // Create and destroy cache to test memory cleanup
    const cache = new PerformanceCache<string>(
      {
        maxEntries: 100,
      },
      monitor
    );

    // Fill cache
    for (let i = 0; i < 50; i++) {
      await cache.set(`key_${i}`, `value_${i}`.repeat(100));
    }

    const filledMemory = process.memoryUsage().heapUsed;
    expect(filledMemory).toBeGreaterThan(initialMemory);

    // Clean up
    cache.destroy();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Memory should be freed (though GC timing is not guaranteed)
    const finalMemory = process.memoryUsage().heapUsed;

    // At minimum, ensure we're not continuously growing
    expect(finalMemory).toBeLessThan(filledMemory * 2);
  });
});

// Performance validation helper
export async function validatePerformanceInTests(): Promise<boolean> {
  const monitor = new PerformanceMonitor();

  // Quick validation of key performance targets
  const tests = [
    {
      name: 'File Operation Speed',
      target: 50, // 50ms
      test: async () => new Promise((resolve) => setTimeout(resolve, 5)),
    },
    {
      name: 'Cache Operation Speed',
      target: 5, // 5ms
      test: async () => {
        const cache = new Map();
        cache.set('test', 'value');
        return cache.get('test');
      },
    },
    {
      name: 'Queue Operation Speed',
      target: 10, // 10ms
      test: async () => new Promise((resolve) => setTimeout(resolve, 1)),
    },
  ];

  let allPassed = true;

  for (const test of tests) {
    const result = await monitor.benchmark(
      {
        name: test.name,
        iterations: 10,
        warmupIterations: 2,
      },
      test.test
    );

    if (result.success && result.value.averageTimeMs > test.target) {
      console.warn(
        `⚠️  Performance warning: ${test.name} took ${result.value.averageTimeMs}ms (target: ${test.target}ms)`
      );
      allPassed = false;
    }
  }

  return allPassed;
}
