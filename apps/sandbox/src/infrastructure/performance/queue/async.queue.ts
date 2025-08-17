/**

- @fileoverview AsyncQueue implementation
-
- Provides high-performance async operation queuing with concurrency control,
- prioritization, and timeout management for optimal resource utilization.
 */

import { ErrorCodes, SandboxError } from '@/domain/errors';
import type { Timestamp } from '@/shared/types/brands';
import { createTimestamp } from '@/shared/types/brands';
import { Err, Ok, type Result } from '@/shared/types/result';
import type { PerformanceMonitor } from '../monitoring/performance.monitor';

/**

- Queue task priority levels
 */
export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';

/**

- Queue task status
 */
export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

/**

- Queued task definition
 */
export interface QueueTask<T = unknown> {
  readonly id: string;
  readonly name: string;
  readonly priority: TaskPriority;
  readonly operation: () => Promise<T>;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly retryDelayMs?: number;
  readonly context?: Record<string, unknown>;
  readonly createdAt: Timestamp;
}

/**

- Task execution result
 */
export interface TaskResult<T = unknown> {
  readonly taskId: string;
  readonly status: TaskStatus;
  readonly result?: T;
  readonly error?: Error;
  readonly startedAt: Timestamp;
  readonly completedAt: Timestamp;
  readonly executionTimeMs: number;
  readonly retryCount: number;
  readonly context?: Record<string, unknown>;
}

/**

- Queue configuration
 */
export interface QueueConfig {
  /**Maximum concurrent operations */
  readonly maxConcurrency: number;
  /** Default task timeout in milliseconds */
  readonly defaultTimeoutMs: number;
  /**Maximum queue size */
  readonly maxQueueSize: number;
  /** Enable task prioritization */
  readonly enablePrioritization: boolean;
  /**Enable performance monitoring */
  readonly enableMonitoring: boolean;
  /** Default retry count */
  readonly defaultMaxRetries: number;
  /**Default retry delay in milliseconds*/
  readonly defaultRetryDelayMs: number;
}

/**

- Queue statistics
 */
export interface QueueStats {
  readonly totalTasks: number;
  readonly pendingTasks: number;
  readonly runningTasks: number;
  readonly completedTasks: number;
  readonly failedTasks: number;
  readonly cancelledTasks: number;
  readonly timeoutTasks: number;
  readonly avgExecutionTimeMs: number;
  readonly avgWaitTimeMs: number;
  readonly throughputPerSecond: number;
  readonly currentConcurrency: number;
  readonly maxConcurrency: number;
  readonly queueUtilization: number; // 0-1 scale
}

/**

- Queue health status
 */
export interface QueueHealth {
  readonly healthy: boolean;
  readonly stats: QueueStats;
  readonly backlogPressure: number; // 0-1 scale
  readonly warnings: readonly string[];
  readonly recommendations: readonly string[];
}

/**

- Queue error for queue-specific operations
 */
class QueueError extends SandboxError {
  constructor(
    code: string,
    message: string,
    context: Record<string, unknown> = {},
    cause?: Error
  ) {
    super(code, message, 'queue', 'error', context, [], cause);
  }
}

/**

- Internal task state tracking
 */
interface TaskState<T = unknown> {
  task: QueueTask<T>;
  status: TaskStatus;
  retryCount: number;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  abortController?: AbortController;
  result?: TaskResult<T>;
}

/**

- High-performance async queue with concurrency control and monitoring
 */
export class AsyncQueue {
  private readonly config: QueueConfig;
  private readonly monitor?: PerformanceMonitor;

  private readonly pendingTasks: TaskState[] = [];
  private readonly runningTasks = new Map<string, TaskState>();
  private readonly completedTasks = new Map<string, TaskResult>();

  private totalTaskCount = 0;
  private completedCount = 0;
  private failedCount = 0;
  private cancelledCount = 0;
  private timeoutCount = 0;
  private totalExecutionTime = 0;
  private totalWaitTime = 0;

  private isProcessing = false;
  private readonly priorityOrder: TaskPriority[] = [
    'urgent',
    'high',
    'normal',
    'low',
  ];

  constructor(config: Partial<QueueConfig> = {}, monitor?: PerformanceMonitor) {
    this.config = {
      maxConcurrency: 5,
      defaultTimeoutMs: 30_000,
      maxQueueSize: 1000,
      enablePrioritization: true,
      enableMonitoring: true,
      defaultMaxRetries: 3,
      defaultRetryDelayMs: 1000,
      ...config,
    };

    this.monitor = monitor;
  }

  /**

- Add task to queue
   */
  async enqueue<T>(
    task: Omit<QueueTask<T>, 'id' | 'createdAt'>
  ): Promise<Result<string, SandboxError>> {
    try {
      // Check queue capacity
      if (this.pendingTasks.length >= this.config.maxQueueSize) {
        return Err(
          new QueueError(
            ErrorCodes.QUEUE_FULL,
            'Queue is at maximum capacity',
            {
              maxQueueSize: this.config.maxQueueSize,
              currentSize: this.pendingTasks.length,
            }
          )
        );
      }

      const taskId = this.generateTaskId();
      const now = createTimestamp(Date.now());

      const fullTask: QueueTask<T> = {
        id: taskId,
        createdAt: now,
        timeoutMs: this.config.defaultTimeoutMs,
        maxRetries: this.config.defaultMaxRetries,
        retryDelayMs: this.config.defaultRetryDelayMs,
        ...task,
      };

      const taskState: TaskState<T> = {
        task: fullTask,
        status: 'pending',
        retryCount: 0,
      };

      // Insert task based on priority
      if (this.config.enablePrioritization) {
        this.insertByPriority(taskState);
      } else {
        this.pendingTasks.push(taskState);
      }

      this.totalTaskCount++;
      this.recordMetric('queue_enqueue', 1);

      // Start processing if not already running
      this.processQueue();

      return Ok(taskId);
    } catch (error) {
      return Err(
        new QueueError(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to enqueue task: ${(error as Error).message}`,
          { task: task.name },
          error as Error
        )
      );
    }
  }

  /**

- Cancel a pending or running task
   */
  async cancel(taskId: string): Promise<Result<boolean, SandboxError>> {
    try {
      // Check running tasks first
      const runningTask = this.runningTasks.get(taskId);
      if (runningTask) {
        if (runningTask.abortController) {
          runningTask.abortController.abort();
        }

        runningTask.status = 'cancelled';
        runningTask.completedAt = createTimestamp(Date.now());

        const result: TaskResult = {
          taskId,
          status: 'cancelled',
          startedAt: runningTask.startedAt!,
          completedAt: runningTask.completedAt,
          executionTimeMs: runningTask.completedAt - runningTask.startedAt!,
          retryCount: runningTask.retryCount,
          context: runningTask.task.context,
        };

        runningTask.result = result;
        this.completedTasks.set(taskId, result);
        this.runningTasks.delete(taskId);
        this.cancelledCount++;

        this.recordMetric('queue_cancel_running', 1);
        return Ok(true);
      }

      // Check pending tasks
      const pendingIndex = this.pendingTasks.findIndex(
        (state) => state.task.id === taskId
      );
      if (pendingIndex >= 0) {
        const taskState = this.pendingTasks[pendingIndex]!;
        this.pendingTasks.splice(pendingIndex, 1);

        const now = createTimestamp(Date.now());
        const result: TaskResult = {
          taskId,
          status: 'cancelled',
          startedAt: now,
          completedAt: now,
          executionTimeMs: 0,
          retryCount: 0,
          context: taskState.task.context,
        };

        this.completedTasks.set(taskId, result);
        this.cancelledCount++;

        this.recordMetric('queue_cancel_pending', 1);
        return Ok(true);
      }

      return Ok(false);
    } catch (error) {
      return Err(
        new QueueError(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to cancel task: ${(error as Error).message}`,
          { taskId },
          error as Error
        )
      );
    }
  }

  /**

- Wait for task completion
   */
  async wait<T>(
    taskId: string,
    timeoutMs?: number
  ): Promise<Result<TaskResult<T>, SandboxError>> {
    try {
      const timeout = timeoutMs || 60_000; // 1 minute default
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        // Check if task is completed
        const result = this.completedTasks.get(taskId);
        if (result) {
          return Ok(result as TaskResult<T>);
        }

        // Check if task exists
        const isRunning = this.runningTasks.has(taskId);
        const isPending = this.pendingTasks.some(
          (state) => state.task.id === taskId
        );

        if (!(isRunning || isPending)) {
          return Err(
            new QueueError(ErrorCodes.NOT_FOUND, `Task not found: ${taskId}`, {
              taskId,
            })
          );
        }

        // Wait a bit before checking again
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return Err(
        new QueueError(ErrorCodes.TIMEOUT, `Wait timeout for task: ${taskId}`, {
          taskId,
          timeoutMs: timeout,
        })
      );
    } catch (error) {
      return Err(
        new QueueError(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to wait for task: ${(error as Error).message}`,
          { taskId },
          error as Error
        )
      );
    }
  }

  /**

- Get task result
   */
  getResult<T>(
    taskId: string
  ): Result<TaskResult<T> | undefined, SandboxError> {
    try {
      const result = this.completedTasks.get(taskId);
      return Ok(result as TaskResult<T> | undefined);
    } catch (error) {
      return Err(
        new QueueError(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to get task result: ${(error as Error).message}`,
          { taskId },
          error as Error
        )
      );
    }
  }

  /**

- Get current queue statistics
   */
  getStats(): QueueStats {
    const totalCompleted =
      this.completedCount +
      this.failedCount +
      this.cancelledCount +
      this.timeoutCount;
    const avgExecutionTime =
      totalCompleted > 0 ? this.totalExecutionTime / totalCompleted : 0;
    const avgWaitTime =
      totalCompleted > 0 ? this.totalWaitTime / totalCompleted : 0;

    // Calculate throughput (operations per second)
    const uptimeSeconds = (Date.now() - this.getStartTime()) / 1000;
    const throughput = uptimeSeconds > 0 ? totalCompleted / uptimeSeconds : 0;

    return {
      totalTasks: this.totalTaskCount,
      pendingTasks: this.pendingTasks.length,
      runningTasks: this.runningTasks.size,
      completedTasks: this.completedCount,
      failedTasks: this.failedCount,
      cancelledTasks: this.cancelledCount,
      timeoutTasks: this.timeoutCount,
      avgExecutionTimeMs: avgExecutionTime,
      avgWaitTimeMs: avgWaitTime,
      throughputPerSecond: throughput,
      currentConcurrency: this.runningTasks.size,
      maxConcurrency: this.config.maxConcurrency,
      queueUtilization: this.runningTasks.size / this.config.maxConcurrency,
    };
  }

  /**

- Get queue health status
   */
  async getHealthStatus(): Promise<Result<QueueHealth, SandboxError>> {
    try {
      const stats = this.getStats();
      const backlogPressure =
        this.config.maxQueueSize > 0
          ? stats.pendingTasks / this.config.maxQueueSize
          : 0;

      const warnings: string[] = [];
      const recommendations: string[] = [];

      // Analyze health
      if (backlogPressure > 0.8) {
        warnings.push(`High queue backlog: ${stats.pendingTasks} tasks`);
        recommendations.push(
          'Consider increasing maxConcurrency or processing capacity'
        );
      }

      if (stats.avgExecutionTimeMs > 10_000) {
        warnings.push(
          `High average execution time: ${stats.avgExecutionTimeMs.toFixed(0)}ms`
        );
        recommendations.push('Optimize task operations or reduce timeout');
      }

      const errorRate =
        stats.totalTasks > 0
          ? (stats.failedTasks + stats.timeoutTasks) / stats.totalTasks
          : 0;

      if (errorRate > 0.1) {
        warnings.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
        recommendations.push('Review task implementations and error handling');
      }

      if (stats.queueUtilization < 0.3 && stats.pendingTasks > 0) {
        warnings.push('Low queue utilization with pending tasks');
        recommendations.push('Check for task processing bottlenecks');
      }

      return Ok({
        healthy: warnings.length === 0,
        stats,
        backlogPressure,
        warnings,
        recommendations,
      });
    } catch (error) {
      return Err(
        new QueueError(
          ErrorCodes.INTERNAL_ERROR,
          `Health check failed: ${(error as Error).message}`,
          {},
          error as Error
        )
      );
    }
  }

  /**

- Clear all tasks and reset counters
   */
  async clear(): Promise<Result<void, SandboxError>> {
    try {
      // Cancel all running tasks
      for (const [taskId] of this.runningTasks) {
        await this.cancel(taskId);
      }

      // Clear all queues
      this.pendingTasks.length = 0;
      this.runningTasks.clear();
      this.completedTasks.clear();

      // Reset counters
      this.totalTaskCount = 0;
      this.completedCount = 0;
      this.failedCount = 0;
      this.cancelledCount = 0;
      this.timeoutCount = 0;
      this.totalExecutionTime = 0;
      this.totalWaitTime = 0;

      this.recordMetric('queue_clear', 1);
      return Ok(undefined);
    } catch (error) {
      return Err(
        new QueueError(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to clear queue: ${(error as Error).message}`,
          {},
          error as Error
        )
      );
    }
  }

  /**

- Process queue (internal)
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (
        this.pendingTasks.length > 0 &&
        this.runningTasks.size < this.config.maxConcurrency
      ) {
        const taskState = this.pendingTasks.shift();
        if (!taskState) break;

        // Start task execution
        this.executeTask(taskState);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**

- Execute a single task
   */
  private async executeTask(taskState: TaskState): Promise<void> {
    const { task } = taskState;
    const startTime = Date.now();
    const waitTime = startTime - task.createdAt;

    taskState.status = 'running';
    taskState.startedAt = createTimestamp(startTime);
    taskState.abortController = new AbortController();

    this.runningTasks.set(task.id, taskState);
    this.totalWaitTime += waitTime;

    try {
      // Set up timeout
      const timeoutMs = task.timeoutMs || this.config.defaultTimeoutMs;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          if (taskState.abortController) {
            taskState.abortController.abort();
          }
          reject(new Error(`Task timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      // Execute task with timeout
      const result = await Promise.race([task.operation(), timeoutPromise]);

      // Task completed successfully
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      taskState.status = 'completed';
      taskState.completedAt = createTimestamp(endTime);

      const taskResult: TaskResult = {
        taskId: task.id,
        status: 'completed',
        result,
        startedAt: taskState.startedAt!,
        completedAt: taskState.completedAt,
        executionTimeMs: executionTime,
        retryCount: taskState.retryCount,
        context: task.context,
      };

      taskState.result = taskResult;
      this.completedTasks.set(task.id, taskResult);
      this.completedCount++;
      this.totalExecutionTime += executionTime;

      this.recordMetric('queue_task_completed', 1);
      this.recordMetric('queue_task_execution_time', executionTime, 'ms');
    } catch (error) {
      // Task failed
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Check if we should retry
      const maxRetries = task.maxRetries || this.config.defaultMaxRetries;
      if (
        taskState.retryCount < maxRetries &&
        !taskState.abortController?.signal.aborted
      ) {
        // Retry task
        taskState.retryCount++;
        taskState.status = 'pending';
        taskState.startedAt = undefined;
        taskState.abortController = undefined;

        // Add delay before retry
        const retryDelay = task.retryDelayMs || this.config.defaultRetryDelayMs;
        setTimeout(() => {
          if (this.config.enablePrioritization) {
            this.insertByPriority(taskState);
          } else {
            this.pendingTasks.push(taskState);
          }
          this.processQueue();
        }, retryDelay);

        this.recordMetric('queue_task_retry', 1);
      } else {
        // Task failed permanently
        const isTimeout = (error as Error).message.includes('timeout');
        const status: TaskStatus = isTimeout ? 'timeout' : 'failed';

        taskState.status = status;
        taskState.completedAt = createTimestamp(endTime);

        const taskResult: TaskResult = {
          taskId: task.id,
          status,
          error: error as Error,
          startedAt: taskState.startedAt!,
          completedAt: taskState.completedAt,
          executionTimeMs: executionTime,
          retryCount: taskState.retryCount,
          context: task.context,
        };

        taskState.result = taskResult;
        this.completedTasks.set(task.id, taskResult);

        if (isTimeout) {
          this.timeoutCount++;
          this.recordMetric('queue_task_timeout', 1);
        } else {
          this.failedCount++;
          this.recordMetric('queue_task_failed', 1);
        }
      }
    } finally {
      this.runningTasks.delete(task.id);

      // Continue processing queue
      this.processQueue();
    }
  }

  /**

- Insert task by priority order
   */
  private insertByPriority(taskState: TaskState): void {
    const taskPriorityIndex = this.priorityOrder.indexOf(
      taskState.task.priority
    );

    let insertIndex = this.pendingTasks.length;
    for (let i = 0; i < this.pendingTasks.length; i++) {
      const existingPriorityIndex = this.priorityOrder.indexOf(
        this.pendingTasks[i]!.task.priority
      );
      if (taskPriorityIndex < existingPriorityIndex) {
        insertIndex = i;
        break;
      }
    }

    this.pendingTasks.splice(insertIndex, 0, taskState);
  }

  /**

- Generate unique task ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**

- Get queue start time (when first task was added)
   */
  private getStartTime(): number {
    // Simplified - in production this would track actual start time
    return Date.now() - 60_000; // Assume 1 minute ago for demo
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
      this.monitor.record(name, value, unit, { queue: true });
    }
  }
}
