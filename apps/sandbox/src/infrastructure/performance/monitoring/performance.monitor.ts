/**

- @fileoverview PerformanceMonitor implementation
-
- Provides comprehensive performance monitoring, metrics collection,
- and benchmarking capabilities for tracking optimization improvements.
 */

import { ErrorCodes, SandboxError } from '@/domain/errors';
import type { Timestamp } from '@/shared/types/brands';
import { createTimestamp } from '@/shared/types/brands';
import { Err, Ok, type Result } from '@/shared/types/result';

/**

- Performance metric data point
 */
export interface PerformanceMetric {
  readonly name: string;
  readonly value: number;
  readonly unit: 'ms' | 'bytes' | 'count' | 'percent' | 'ratio';
  readonly timestamp: Timestamp;
  readonly context?: Record<string, unknown>;
}

/**

- Performance timer for measuring operation duration
 */
export interface PerformanceTimer {
  readonly name: string;
  readonly startTime: number;
  readonly context?: Record<string, unknown>;

  /** Stop the timer and record the metric */
  stop(): PerformanceMetric;
}

/**

- Performance benchmark configuration
 */
export interface BenchmarkConfig {
  readonly name: string;
  readonly iterations: number;
  readonly warmupIterations?: number;
  readonly timeout?: number;
  readonly context?: Record<string, unknown>;
}

/**

- Benchmark result
 */
export interface BenchmarkResult {
  readonly name: string;
  readonly iterations: number;
  readonly totalTimeMs: number;
  readonly averageTimeMs: number;
  readonly minTimeMs: number;
  readonly maxTimeMs: number;
  readonly standardDeviation: number;
  readonly throughputPerSecond: number;
  readonly memoryUsageBytes: number;
  readonly context?: Record<string, unknown>;
}

/**

- Performance statistics aggregation
 */
export interface PerformanceStats {
  readonly metricName: string;
  readonly count: number;
  readonly sum: number;
  readonly average: number;
  readonly min: number;
  readonly max: number;
  readonly standardDeviation: number;
  readonly percentiles: {
    readonly p50: number;
    readonly p90: number;
    readonly p95: number;
    readonly p99: number;
  };
}

/**

- System performance health status
 */
export interface PerformanceHealth {
  readonly healthy: boolean;
  readonly avgResponseTimeMs: number;
  readonly memoryUsageBytes: number;
  readonly memoryPressure: number; // 0-1 scale
  readonly cpuUsagePercent: number;
  readonly activeOperations: number;
  readonly errorRate: number; // 0-1 scale
  readonly uptime: number;
  readonly warnings: readonly string[];
  readonly diagnostics: Record<string, unknown>;
}

/**

- Performance error for monitoring-specific operations
 */
class PerformanceError extends SandboxError {
  constructor(
    code: string,
    message: string,
    context: Record<string, unknown> = {},
    cause?: Error
  ) {
    super(code, message, 'performance', 'error', context, [], cause);
  }
}

/**

- Internal timer implementation
 */
class Timer implements PerformanceTimer {
  public readonly name: string;
  public readonly startTime: number;
  public readonly context?: Record<string, unknown>;

  constructor(name: string, context?: Record<string, unknown>) {
    this.name = name;
    this.startTime = performance.now();
    this.context = context;
  }

  stop(): PerformanceMetric {
    const endTime = performance.now();
    const duration = endTime - this.startTime;

    return {
      name: this.name,
      value: duration,
      unit: 'ms',
      timestamp: createTimestamp(Date.now()),
      context: this.context,
    };
  }
}

/**

- High-performance monitoring system with metrics collection and benchmarking
 */
export class PerformanceMonitor {
  private readonly metrics: PerformanceMetric[] = [];
  private readonly activeTimers = new Map<string, Timer>();
  private readonly aggregatedStats = new Map<string, PerformanceStats>();
  private readonly maxMetricsHistory: number;
  private operationCount = 0;
  private errorCount = 0;
  private startTime = Date.now();

  constructor(maxMetricsHistory = 10_000) {
    this.maxMetricsHistory = maxMetricsHistory;
  }

  /**

- Start a performance timer for measuring operation duration
   */
  startTimer(
    name: string,
    context?: Record<string, unknown>
  ): PerformanceTimer {
    const timer = new Timer(name, context);
    this.activeTimers.set(name, timer);
    return timer;
  }

  /**

- Stop a timer and record the metric
   */
  stopTimer(name: string): Result<PerformanceMetric, SandboxError> {
    const timer = this.activeTimers.get(name);
    if (!timer) {
      return Err(
        new PerformanceError(
          ErrorCodes.NOT_FOUND,
          `Timer '${name}' not found`,
          { timerName: name }
        )
      );
    }

    const metric = timer.stop();
    this.activeTimers.delete(name);
    this.recordMetric(metric);

    return Ok(metric);
  }

  /**

- Measure the duration of an async operation
   */
  async measure<T>(
    name: string,
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<{ result: T; metric: PerformanceMetric }> {
    const timer = this.startTimer(name, context);

    try {
      this.operationCount++;
      const result = await operation();
      const metric = timer.stop();
      this.recordMetric(metric);

      return { result, metric };
    } catch (error) {
      this.errorCount++;
      const metric = timer.stop();
      this.recordMetric({
        ...metric,
        context: { ...metric.context, error: true },
      });
      throw error;
    }
  }

  /**

- Measure the duration of a synchronous operation
   */
  measureSync<T>(
    name: string,
    operation: () => T,
    context?: Record<string, unknown>
  ): { result: T; metric: PerformanceMetric } {
    const timer = this.startTimer(name, context);

    try {
      this.operationCount++;
      const result = operation();
      const metric = timer.stop();
      this.recordMetric(metric);

      return { result, metric };
    } catch (error) {
      this.errorCount++;
      const metric = timer.stop();
      this.recordMetric({
        ...metric,
        context: { ...metric.context, error: true },
      });
      throw error;
    }
  }

  /**

- Record a custom performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Maintain metrics history limit
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.splice(0, this.metrics.length - this.maxMetricsHistory);
    }

    // Update aggregated stats
    this.updateAggregatedStats(metric);
  }

  /**

- Record custom metric with name and value
   */
  record(
    name: string,
    value: number,
    unit: PerformanceMetric['unit'] = 'count',
    context?: Record<string, unknown>
  ): void {
    this.recordMetric({
      name,
      value,
      unit,
      timestamp: createTimestamp(Date.now()),
      context,
    });
  }

  /**

- Run a performance benchmark
   */
  async benchmark(
    config: BenchmarkConfig,
    operation: () => Promise<void>
  ): Promise<Result<BenchmarkResult, SandboxError>> {
    try {
      const {
        name,
        iterations,
        warmupIterations = 5,
        timeout = 30_000,
      } = config;
      const times: number[] = [];

      // Warmup iterations
      for (let i = 0; i < warmupIterations; i++) {
        await operation();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage().heapUsed;
      const startTime = performance.now();
      let timeoutHandle: NodeJS.Timeout | undefined;

      try {
        // Set up timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error(`Benchmark timeout after ${timeout}ms`));
          }, timeout);
        });

        // Run benchmark iterations
        const benchmarkPromise = (async () => {
          for (let i = 0; i < iterations; i++) {
            const iterationStart = performance.now();
            await operation();
            const iterationTime = performance.now() - iterationStart;
            times.push(iterationTime);
          }
        })();

        await Promise.race([benchmarkPromise, timeoutPromise]);
      } finally {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      }

      const endTime = performance.now();
      const finalMemory = process.memoryUsage().heapUsed;
      const totalTime = endTime - startTime;

      // Calculate statistics
      const sum = times.reduce((a, b) => a + b, 0);
      const average = sum / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);

      const variance =
        times.reduce((acc, time) => acc + (time - average) ** 2, 0) /
        times.length;
      const standardDeviation = Math.sqrt(variance);

      const throughput = (iterations * 1000) / totalTime; // operations per second

      const result: BenchmarkResult = {
        name,
        iterations,
        totalTimeMs: totalTime,
        averageTimeMs: average,
        minTimeMs: min,
        maxTimeMs: max,
        standardDeviation,
        throughputPerSecond: throughput,
        memoryUsageBytes: finalMemory - initialMemory,
        context: config.context,
      };

      // Record benchmark as metric
      this.recordMetric({
        name: `benchmark_${name}`,
        value: average,
        unit: 'ms',
        timestamp: createTimestamp(Date.now()),
        context: {
          benchmark: true,
          ...config.context,
          throughput,
          iterations,
        },
      });

      return Ok(result);
    } catch (error) {
      return Err(
        new PerformanceError(
          ErrorCodes.INTERNAL_ERROR,
          `Benchmark failed: ${(error as Error).message}`,
          { config },
          error as Error
        )
      );
    }
  }

  /**

- Get performance statistics for a specific metric
   */
  getStats(metricName: string): Result<PerformanceStats, SandboxError> {
    const stats = this.aggregatedStats.get(metricName);
    if (!stats) {
      return Err(
        new PerformanceError(
          ErrorCodes.NOT_FOUND,
          `No statistics found for metric '${metricName}'`,
          { metricName }
        )
      );
    }

    return Ok({ ...stats });
  }

  /**

- Get all recorded metrics
   */
  getMetrics(filter?: {
    name?: string;
    startTime?: Timestamp;
    endTime?: Timestamp;
    context?: Record<string, unknown>;
  }): readonly PerformanceMetric[] {
    let filteredMetrics = [...this.metrics];

    if (filter) {
      if (filter.name) {
        filteredMetrics = filteredMetrics.filter((m) => m.name === filter.name);
      }

      if (filter.startTime) {
        filteredMetrics = filteredMetrics.filter(
          (m) => m.timestamp >= filter.startTime!
        );
      }

      if (filter.endTime) {
        filteredMetrics = filteredMetrics.filter(
          (m) => m.timestamp <= filter.endTime!
        );
      }

      if (filter.context) {
        filteredMetrics = filteredMetrics.filter((m) => {
          if (!m.context) return false;
          return Object.entries(filter.context!).every(
            ([key, value]) => m.context![key] === value
          );
        });
      }
    }

    return filteredMetrics;
  }

  /**

- Get system performance health status
   */
  async getHealthStatus(): Promise<Result<PerformanceHealth, SandboxError>> {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = Date.now() - this.startTime;

      // Calculate average response time from recent metrics
      const recentMetrics = this.metrics.slice(-1000);
      const responseTimeMetrics = recentMetrics.filter(
        (m) => m.unit === 'ms' && !m.context?.error
      );

      const avgResponseTime =
        responseTimeMetrics.length > 0
          ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) /
            responseTimeMetrics.length
          : 0;

      // Calculate error rate
      const errorRate =
        this.operationCount > 0 ? this.errorCount / this.operationCount : 0;

      // Memory pressure calculation (simplified)
      const memoryPressure = memoryUsage.heapUsed / memoryUsage.heapTotal;

      // CPU usage estimation (simplified - would need more sophisticated tracking in production)
      const cpuUsage = Math.min(
        100,
        (this.operationCount / (uptime / 1000)) * 0.1
      );

      const warnings: string[] = [];

      if (avgResponseTime > 1000) {
        warnings.push(
          `High average response time: ${avgResponseTime.toFixed(2)}ms`
        );
      }

      if (errorRate > 0.1) {
        warnings.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
      }

      if (memoryPressure > 0.8) {
        warnings.push(
          `High memory pressure: ${(memoryPressure * 100).toFixed(1)}%`
        );
      }

      if (this.activeTimers.size > 100) {
        warnings.push(
          `High number of active timers: ${this.activeTimers.size}`
        );
      }

      return Ok({
        healthy: warnings.length === 0,
        avgResponseTimeMs: avgResponseTime,
        memoryUsageBytes: memoryUsage.heapUsed,
        memoryPressure,
        cpuUsagePercent: cpuUsage,
        activeOperations: this.activeTimers.size,
        errorRate,
        uptime,
        warnings,
        diagnostics: {
          totalOperations: this.operationCount,
          totalErrors: this.errorCount,
          metricsCount: this.metrics.length,
          memoryUsage,
          activeTimers: Array.from(this.activeTimers.keys()),
        },
      });
    } catch (error) {
      return Err(
        new PerformanceError(
          ErrorCodes.INTERNAL_ERROR,
          `Health check failed: ${(error as Error).message}`,
          {},
          error as Error
        )
      );
    }
  }

  /**

- Clear all metrics and reset counters
   */
  reset(): void {
    this.metrics.length = 0;
    this.activeTimers.clear();
    this.aggregatedStats.clear();
    this.operationCount = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
  }

  /**

- Get summary of all metric names and their counts
   */
  getMetricsSummary(): Record<string, number> {
    const summary: Record<string, number> = {};

    for (const metric of this.metrics) {
      summary[metric.name] = (summary[metric.name] || 0) + 1;
    }

    return summary;
  }

  /**

- Update aggregated statistics for a metric
   */
  private updateAggregatedStats(metric: PerformanceMetric): void {
    const existing = this.aggregatedStats.get(metric.name);

    if (existing) {
      // Update existing stats
      const count = existing.count + 1;
      const sum = existing.sum + metric.value;
      const average = sum / count;
      const min = Math.min(existing.min, metric.value);
      const max = Math.max(existing.max, metric.value);

      // Calculate percentiles from recent metrics
      const recentValues = this.metrics
        .filter((m) => m.name === metric.name)
        .slice(-1000)
        .map((m) => m.value)
        .sort((a, b) => a - b);

      const percentiles = {
        p50: this.calculatePercentile(recentValues, 0.5),
        p90: this.calculatePercentile(recentValues, 0.9),
        p95: this.calculatePercentile(recentValues, 0.95),
        p99: this.calculatePercentile(recentValues, 0.99),
      };

      // Calculate standard deviation
      const variance =
        recentValues.reduce((acc, val) => acc + (val - average) ** 2, 0) /
        recentValues.length;
      const standardDeviation = Math.sqrt(variance);

      this.aggregatedStats.set(metric.name, {
        metricName: metric.name,
        count,
        sum,
        average,
        min,
        max,
        standardDeviation,
        percentiles,
      });
    } else {
      // First metric of this type
      this.aggregatedStats.set(metric.name, {
        metricName: metric.name,
        count: 1,
        sum: metric.value,
        average: metric.value,
        min: metric.value,
        max: metric.value,
        standardDeviation: 0,
        percentiles: {
          p50: metric.value,
          p90: metric.value,
          p95: metric.value,
          p99: metric.value,
        },
      });
    }
  }

  /**

- Calculate percentile from sorted array
   */
  private calculatePercentile(
    sortedValues: number[],
    percentile: number
  ): number {
    if (sortedValues.length === 0) return 0;

    const index = percentile * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sortedValues[lower]!;
    }

    const lowerValue = sortedValues[lower]!;
    const upperValue = sortedValues[upper]!;
    const weight = index - lower;

    return lowerValue + weight * (upperValue - lowerValue);
  }
}
