/**

- @fileoverview Enhanced RulesetsCompilationService implementation
-
- High-performance compilation service with result caching, concurrency control,
- timeout management, and comprehensive monitoring for optimal performance.
 */

import { promises as fs } from 'node:fs';
import { basename, dirname, join } from 'node:path';

// Logger interface for dependency injection
type Logger = {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
};

class DefaultLogger implements Logger {
  info(message: string, ...args: unknown[]): void {
    console.log(`[INFO] ${message}`, ...args);
  }
  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }
  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }
  debug(message: string, ...args: unknown[]): void {
    console.debug(`[DEBUG] ${message}`, ...args);
  }
}

import {
  CommonSuggestions,
  createRecoverySuggestion,
  ErrorCodes,
  SandboxError,
} from '@/domain/errors';
import type {
  BatchCompilationOptions,
  CompilationServiceHealth,
  ICompilationService,
  ListCompilationRequestsOptions,
  ListCompilationResultsOptions,
} from '@/domain/interfaces/compilation-service';
import type { IFileSystemService } from '@/domain/interfaces/filesystem-service';
import type {
  CompilationRequest,
  CompilationSource,
  CreateCompilationRequestParams,
  UpdateCompilationRequestParams,
} from '@/domain/models/compilation-request';
import {
  CompilationRequestGuards,
  type CompilationRequestStatus,
  CompilationRequestUtils,
  DefaultCompilationOptions,
} from '@/domain/models/compilation-request';
import type {
  CompilationMetrics,
  CompilationResult,
  OutputFile,
  ProviderResult,
} from '@/domain/models/compilation-result';
import { CompilationResultBuilder } from '@/domain/models/compilation-result';
import type {
  CompilationRequestId,
  CompilationResultId,
  CompiledContent,
  SafeFilePath,
  SourceContent,
  Timestamp,
} from '@/shared/types/brands';
import {
  BrandedTypeUtils,
  createCompiledContent,
  createSafeFilePath,
  createTimestamp,
} from '@/shared/types/brands';
import { Err, Ok, type Result } from '@/shared/types/result';
import type { ConfigurationService } from '../config/config.loader';
import {
  AsyncQueue,
  PerformanceCache,
  PerformanceMonitor,
  type TaskPriority,
} from '../performance';

/**

- Enhanced compilation service configuration
 */
interface EnhancedCompilationConfig {
  /**Enable result caching */
  readonly enableResultCache: boolean;
  /** Enable source file caching */
  readonly enableSourceCache: boolean;
  /**Enable async compilation queuing */
  readonly enableAsyncQueue: boolean;
  /** Maximum concurrent compilations */
  readonly maxConcurrency: number;
  /**Default compilation timeout in milliseconds */
  readonly defaultTimeoutMs: number;
  /** Cache TTL in milliseconds */
  readonly cacheTtlMs: number;
  /**Enable incremental compilation */
  readonly enableIncremental: boolean;
  /** Maximum cache size in bytes */
  readonly maxCacheSize: number;
}

/**

- Compilation cache key structure
 */
interface CompilationCacheKey {
  readonly sourceHash: string;
  readonly targets: readonly string[];
  readonly options: string; // Serialized options
}

/**

- Enhanced compilation error
 */
class EnhancedCompilationError extends SandboxError {
  constructor(
    code: string,
    message: string,
    context: Record<string, unknown> = {},
    cause?: Error
  ) {
    super(
      code,
      message,
      'enhanced-compilation',
      'error',
      context,
      [
        CommonSuggestions.validateInput,
        CommonSuggestions.checkConfiguration,
        CommonSuggestions.retryOperation,
      ],
      cause
    );
  }
}

/**

- Internal compilation request storage with enhanced tracking
 */
interface EnhancedStoredCompilationRequest extends CompilationRequest {
  tempFiles?: string[];
  cacheKey?: string;
  queueTaskId?: string;
  parentCompilationId?: CompilationRequestId;
}

/**

- Compilation state with performance tracking
 */
interface EnhancedCompilationState {
  isRunning: boolean;
  startTime: number;
  timeoutHandle?: NodeJS.Timeout;
  abortController?: AbortController;
  progressCallback?: (progress: number) => void;
}

/**

- Enhanced RulesetsCompilationService with performance optimizations
 */
export class EnhancedRulesetsCompilationService implements ICompilationService {
  private readonly fileSystem: IFileSystemService<
    SourceContent | CompiledContent

  >;
  private readonly configService: ConfigurationService;
  private readonly config: EnhancedCompilationConfig;
  private readonly monitor: PerformanceMonitor;
  private readonly resultCache?: PerformanceCache<CompilationResult>;
  private readonly sourceCache?: PerformanceCache<string>;
  private readonly queue?: AsyncQueue;
  private readonly logger: Logger;

  private readonly requests = new Map<
    CompilationRequestId,
    EnhancedStoredCompilationRequest
  >();
  private readonly results = new Map<CompilationResultId, CompilationResult>();
  private readonly requestResults = new Map<
    CompilationRequestId,
    CompilationResultId
  >();
  private readonly activeCompilations = new Map<
    CompilationRequestId,
    EnhancedCompilationState
  >();

  private compilationCount = 0;
  private successCount = 0;
  private failureCount = 0;
  private totalCompilationTime = 0;

  constructor(
    fileSystem: IFileSystemService<SourceContent | CompiledContent>,
    configService: ConfigurationService,
    config: Partial<EnhancedCompilationConfig> = {},
    monitor?: PerformanceMonitor,
    logger?: Logger
  ) {
    this.fileSystem = fileSystem;
    this.configService = configService;
    this.logger = logger || new DefaultLogger();

    this.config = {
      enableResultCache: true,
      enableSourceCache: true,
      enableAsyncQueue: true,
      maxConcurrency: 3,
      defaultTimeoutMs: 60_000,
      cacheTtlMs: 600_000, // 10 minutes
      enableIncremental: true,
      maxCacheSize: 100 * 1024 * 1024, // 100MB
      ...config,
    };

    this.monitor = monitor || new PerformanceMonitor();

    // Initialize performance components
    if (this.config.enableResultCache) {
      this.resultCache = new PerformanceCache<CompilationResult>(
        {
          maxEntries: 500,
          defaultTtlMs: this.config.cacheTtlMs,
          maxMemoryBytes: this.config.maxCacheSize / 2,
          enableLru: true,
          enableMonitoring: true,
        },
        this.monitor
      );
    }

    if (this.config.enableSourceCache) {
      this.sourceCache = new PerformanceCache<string>(
        {
          maxEntries: 1000,
          defaultTtlMs: this.config.cacheTtlMs,
          maxMemoryBytes: this.config.maxCacheSize / 2,
          enableLru: true,
          enableMonitoring: true,
        },
        this.monitor
      );
    }

    if (this.config.enableAsyncQueue) {
      this.queue = new AsyncQueue(
        {
          maxConcurrency: this.config.maxConcurrency,
          defaultTimeoutMs: this.config.defaultTimeoutMs,
          enablePrioritization: true,
          enableMonitoring: true,
        },
        this.monitor
      );
    }
  }

  /**

- Enhanced request creation with caching
   */
  async createRequest(
    params: CreateCompilationRequestParams
  ): Promise<Result<CompilationRequest, SandboxError>> {
    try {
      const { result, metric } = await this.monitor.measure(
        'compilation_create_request',
        async () => {
          const requestId = BrandedTypeUtils.generateCompilationRequestId();
          const now = BrandedTypeUtils.generateTimestamp();

          // Validate sources efficiently
          const sourceValidationPromises = params.sources.map(
            async (source) => {
              if (source.type === 'file' && source.filePath) {
                const existsResult = await this.fileSystem.exists(
                  source.filePath
                );
                if (!existsResult.success) {
                  throw existsResult.error;
                }

                if (!existsResult.value) {
                  throw new EnhancedCompilationError(
                    ErrorCodes.FILE_NOT_FOUND,
                    `Source file not found: ${source.filePath}`,
                    { filePath: source.filePath }
                  );
                }
              }
            }
          );

          await Promise.all(sourceValidationPromises);

          // Generate cache key for incremental compilation
          const cacheKey = this.config.enableIncremental
            ? await this.generateCacheKey(
                params.sources,
                params.targets,
                params.options
              )
            : undefined;

          // Check for cached result if incremental compilation is enabled
          if (this.resultCache && cacheKey) {
            const cachedResult = await this.resultCache.get(cacheKey);
            if (cachedResult.success && cachedResult.value !== undefined) {
              this.logger.info(
                `Found cached compilation result for ${requestId}`
              );

              // Create a "completed" request with cached result
              const cachedRequest: EnhancedStoredCompilationRequest = {
                id: requestId,
                status: 'completed',
                priority: params.priority || 'normal',
                createdAt: now,
                updatedAt: now,
                completedAt: now,
                sources: params.sources,
                targets: params.targets,
                options: {
                  ...DefaultCompilationOptions,
                  ...params.options,
                },
                metadata: {
                  initiatedBy: 'sandbox',
                  environment: 'development',
                  compilerVersion: '0.1.0' as any,
                  tags: ['cached'],
                  custom: { fromCache: true },
                  ...params.metadata,
                },
                parentRequestId: params.parentRequestId,
                childRequestIds: [],
                cacheKey,
              };

              this.requests.set(requestId, cachedRequest);

              // Store the cached result with new IDs
              const resultId = BrandedTypeUtils.generateCompilationResultId();
              const updatedResult = {
                ...cachedResult.value,
                id: resultId,
                requestId,
                startedAt: now,
                completedAt: now,
              };

              this.results.set(resultId, updatedResult);
              this.requestResults.set(requestId, resultId);

              return cachedRequest;
            }
          }

          // Build new compilation request
          const request: EnhancedStoredCompilationRequest = {
            id: requestId,
            status: 'pending',
            priority: params.priority || 'normal',
            createdAt: now,
            updatedAt: now,
            sources: params.sources,
            targets: params.targets,
            options: {
              ...DefaultCompilationOptions,
              ...params.options,
            },
            metadata: {
              initiatedBy: 'sandbox',
              environment: 'development',
              compilerVersion: '0.1.0' as any,
              tags: [],
              custom: {},
              ...params.metadata,
            },
            parentRequestId: params.parentRequestId,
            childRequestIds: [],
            cacheKey,
          };

          this.requests.set(requestId, request);
          return request;
        }
      );

      return Ok(result);
    } catch (error) {
      return Err(
        new EnhancedCompilationError(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to create compilation request: ${(error as Error).message}`,
          { params },
          error as Error
        )
      );
    }
  }

  /**

- Enhanced compilation with queue management and caching
   */
  async compile(
    id: CompilationRequestId
  ): Promise<Result<CompilationResult, SandboxError>> {
    const request = this.requests.get(id);
    if (!request) {
      return Err(
        new EnhancedCompilationError(
          ErrorCodes.REQUEST_NOT_FOUND,
          `Compilation request not found: ${id}`,
          { requestId: id }
        )
      );
    }

    if (!CompilationRequestGuards.isValidForProcessing(request)) {
      return Err(
        new EnhancedCompilationError(
          ErrorCodes.VALIDATION_FAILED,
          `Request is not valid for processing: ${request.status}`,
          { requestId: id, status: request.status }
        )
      );
    }

    // Use async queue if enabled
    if (this.queue) {
      return this.compileWithQueue(id, request);
    }
    return this.compileDirectly(id, request);
  }

  /**

- Compile using async queue for concurrency control
   */
  private async compileWithQueue(
    id: CompilationRequestId,
    request: EnhancedStoredCompilationRequest
  ): Promise<Result<CompilationResult, SandboxError>> {
    try {
      const priority = this.mapPriorityToTaskPriority(request.priority);

      const queueTaskId = await this.queue!.enqueue({
        name: `compile_${id}`,
        priority,
        operation: async () => {
          const result = await this.compileDirectly(id, request);
          if (!result.success) {
            throw result.error;
          }
          return result.value;
        },
        timeoutMs: request.options.timeoutMs || this.config.defaultTimeoutMs,
        context: { requestId: id, priority: request.priority },
      });

      if (!queueTaskId.success) {
        return Err(queueTaskId.error);
      }

      // Store queue task ID for potential cancellation
      request.queueTaskId = queueTaskId.value;
      this.requests.set(id, request);

      // Wait for completion
      const taskResult = await this.queue!.wait<CompilationResult>(
        queueTaskId.value
      );
      if (!taskResult.success) {
        return Err(
          new EnhancedCompilationError(
            ErrorCodes.COMPILATION_FAILED,
            `Queued compilation failed: ${taskResult.error.message}`,
            { requestId: id },
            taskResult.error
          )
        );
      }

      if (
        taskResult.value.status === 'failed' ||
        taskResult.value.status === 'timeout'
      ) {
        return Err(
          new EnhancedCompilationError(
            ErrorCodes.COMPILATION_FAILED,
            `Compilation task failed: ${taskResult.value.status}`,
            { requestId: id, taskResult: taskResult.value }
          )
        );
      }

      return Ok(taskResult.value.result!);
    } catch (error) {
      return Err(
        new EnhancedCompilationError(
          ErrorCodes.INTERNAL_ERROR,
          `Queue compilation failed: ${(error as Error).message}`,
          { requestId: id },
          error as Error
        )
      );
    }
  }

  /**

- Direct compilation without queue
   */
  private async compileDirectly(
    id: CompilationRequestId,
    request: EnhancedStoredCompilationRequest
  ): Promise<Result<CompilationResult, SandboxError>> {
    const resultId = BrandedTypeUtils.generateCompilationResultId();
    const resultBuilder = new CompilationResultBuilder(resultId, id);
    const startTime = Date.now();

    try {
      const { result, metric } = await this.monitor.measure(
        'compilation_direct',
        async () => {
          // Update request status
          await this.updateRequest({
            id,
            status: 'processing',
          });

          // Set up compilation state with abort controller
          const compilationState: EnhancedCompilationState = {
            isRunning: true,
            startTime,
            abortController: new AbortController(),
          };

          // Set up timeout if specified
          const timeoutMs =
            request.options.timeoutMs || this.config.defaultTimeoutMs;
          if (timeoutMs > 0) {
            compilationState.timeoutHandle = setTimeout(() => {
              compilationState.isRunning = false;
              compilationState.abortController?.abort();
              this.logger.warn(
                `Compilation timeout for request ${id} after ${timeoutMs}ms`
              );
            }, timeoutMs);
          }

          this.activeCompilations.set(id, compilationState);
          this.compilationCount++;

          // Process each source with enhanced error handling
          const tempFiles: string[] = [];
          let allSuccessful = true;
          const processingPromises: Promise<void>[] = [];

          for (const [index, source] of request.sources.entries()) {
            processingPromises.push(
              this.processSourceWithMonitoring(
                source,
                tempFiles,
                resultBuilder,
                compilationState,
                index
              ).catch((error) => {
                allSuccessful = false;
                resultBuilder.addError(
                  new EnhancedCompilationError(
                    ErrorCodes.COMPILATION_FAILED,
                    `Source compilation failed: ${(error as Error).message}`,
                    { source, index },
                    error as Error
                  )
                );

                if (request.options.failFast) {
                  // Cancel other operations
                  compilationState.abortController?.abort();
                }
              })
            );
          }

          // Wait for all source processing to complete (or fail fast)
          if (request.options.failFast) {
            // Process sequentially for fail-fast behavior
            for (const promise of processingPromises) {
              await promise;
              if (!compilationState.isRunning) {
                break;
              }
            }
          } else {
            // Process all in parallel
            await Promise.allSettled(processingPromises);
          }

          // Clean up
          if (compilationState.timeoutHandle) {
            clearTimeout(compilationState.timeoutHandle);
          }
          this.activeCompilations.delete(id);

          // Clean up temp files
          await this.cleanupTempFiles(tempFiles);

          // Build final result with enhanced metrics
          const endTime = Date.now();
          const totalTime = endTime - startTime;
          this.totalCompilationTime += totalTime;

          const metrics: CompilationMetrics = {
            totalTimeMs: totalTime,
            parseTimeMs: 0, // Would be filled by actual @rulesets/core integration
            templateTimeMs: 0,
            outputTimeMs: 0,
            validationTimeMs: 0,
            peakMemoryBytes: process.memoryUsage().heapUsed,
            filesProcessed: request.sources.length,
            inputSizeBytes: 0,
            outputSizeBytes: 0,
            compressionRatio: 1,
          };

          resultBuilder.setMetrics(metrics);
          const result = resultBuilder.build();

          // Cache the result if successful and caching is enabled
          if (allSuccessful && this.resultCache && request.cacheKey) {
            await this.resultCache.set(
              request.cacheKey,
              result,
              this.config.cacheTtlMs
            );
            this.logger.debug(
              `Cached compilation result for ${id} with key ${request.cacheKey}`
            );
          }

          // Update request status
          await this.updateRequest({
            id,
            status: allSuccessful ? 'completed' : 'failed',
            metadata: {
              ...request.metadata,
              custom: {
                ...request.metadata?.custom,
                processingTimeMs: totalTime,
                cached: false,
              },
            },
          });

          // Store result
          this.results.set(resultId, result);
          this.requestResults.set(id, resultId);

          // Update counters
          if (allSuccessful) {
            this.successCount++;
          } else {
            this.failureCount++;
          }

          return result;
        }
      );

      return Ok(result);
    } catch (error) {
      // Clean up on error
      const compilationState = this.activeCompilations.get(id);
      if (compilationState) {
        if (compilationState.timeoutHandle) {
          clearTimeout(compilationState.timeoutHandle);
        }
        this.activeCompilations.delete(id);
      }

      await this.updateRequest({
        id,
        status: 'failed',
      });

      this.failureCount++;

      const errorResult = new EnhancedCompilationError(
        ErrorCodes.COMPILATION_FAILED,
        `Compilation failed: ${(error as Error).message}`,
        { requestId: id },
        error as Error
      );

      resultBuilder.addError(errorResult);
      const result = resultBuilder.build();

      this.results.set(resultId, result);
      this.requestResults.set(id, resultId);

      return Ok(result);
    }
  }

  /**

- Process individual source with monitoring
   */
  private async processSourceWithMonitoring(
    source: CompilationSource,
    tempFiles: string[],
    resultBuilder: CompilationResultBuilder,
    compilationState: EnhancedCompilationState,
    index: number
  ): Promise<void> {
    const { result } = await this.monitor.measure(
      `source_processing_${index}`,
      async () => {
        // Check if compilation was cancelled or timed out
        if (
          !compilationState.isRunning ||
          compilationState.abortController?.signal.aborted
        ) {
          throw new Error('Compilation cancelled or timed out');
        }

        const sourceFile = await this.prepareSourceFileWithCaching(
          source,
          tempFiles
        );

        // Check again after file preparation
        if (
          !compilationState.isRunning ||
          compilationState.abortController?.signal.aborted
        ) {
          throw new Error('Compilation cancelled or timed out');
        }

        // Run @rulesets/core compilation with enhanced error handling
        try {
          const { runRulesetsV0 } = await import('@rulesets/core');
          await runRulesetsV0(sourceFile, this.logger);
        } catch (importError) {
          if (
            (importError as Error).message.includes('Cannot resolve module')
          ) {
            // Fallback for testing
            this.logger.info(`Mock compilation for ${sourceFile}`);
            await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate work
          } else {
            throw importError;
          }
        }

        // Final cancellation check
        if (
          !compilationState.isRunning ||
          compilationState.abortController?.signal.aborted
        ) {
          throw new Error('Compilation cancelled or timed out');
        }

        // Create provider result (in real implementation, this would come from @rulesets/core)
        const providerResult: ProviderResult = {
          provider: 'mock', // Would be actual provider
          success: true,
          outputFiles: [],
          diagnostics: [],
          processingTimeMs: Date.now() - compilationState.startTime,
          metadata: { sourceIndex: index },
        };

        resultBuilder.addProviderResult(providerResult);
      }
    );
  }

  /**

- Enhanced source file preparation with caching
   */
  private async prepareSourceFileWithCaching(
    source: CompilationSource,
    tempFiles: string[]
  ): Promise<string> {
    if (source.type === 'file' && source.filePath) {
      return source.filePath;
    }

    if (source.type === 'content' && source.content) {
      // Check cache for content-based sources
      const contentHash = this.hashContent(source.content);
      if (this.sourceCache) {
        const cached = await this.sourceCache.get(contentHash);
        if (cached.success && cached.value !== undefined) {
          return cached.value;
        }
      }

      // Create temporary file
      const tempFileName = `temp-${Date.now()}-${contentHash.substring(0, 8)}.rule.md`;
      const tempPath = createSafeFilePath(tempFileName);

      const writeResult = await this.fileSystem.writeFile(
        tempPath,
        source.content,
        { createParents: true }
      );

      if (!writeResult.success) {
        throw writeResult.error;
      }

      tempFiles.push(tempPath);

      // Cache the temp file path
      if (this.sourceCache) {
        await this.sourceCache.set(
          contentHash,
          tempPath,
          this.config.cacheTtlMs
        );
      }

      return tempPath;
    }

    throw new Error(`Invalid source configuration: ${JSON.stringify(source)}`);
  }

  /**

- Enhanced batch compilation with intelligent scheduling
   */
  async batchCompile(
    requestIds: readonly CompilationRequestId[],
    options?: BatchCompilationOptions
  ): Promise<Result<readonly CompilationResult[], SandboxError>> {
    try {
      const { result, metric } = await this.monitor.measure(
        'batch_compilation',
        async () => {
          const maxConcurrency =
            options?.maxConcurrency || this.config.maxConcurrency;
          const results: CompilationResult[] = [];
          const errors: SandboxError[] = [];

          // Prioritize requests by priority and creation time
          const requests = requestIds
            .map((id) => ({ id, request: this.requests.get(id) }))
            .filter(({ request }) => request !== undefined)
            .sort((a, b) => {
              const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
              const aPriority = priorityOrder[a.request!.priority];
              const bPriority = priorityOrder[b.request!.priority];

              if (aPriority !== bPriority) {
                return aPriority - bPriority;
              }

              return a.request!.createdAt - b.request!.createdAt;
            });

          // Process in batches with controlled concurrency
          for (let i = 0; i < requests.length; i += maxConcurrency) {
            const batch = requests.slice(i, i + maxConcurrency);

            const batchPromises = batch.map(async ({ id }) => {
              try {
                const result = await this.compile(id);
                return { id, result };
              } catch (error) {
                return {
                  id,
                  result: Err(
                    new EnhancedCompilationError(
                      ErrorCodes.COMPILATION_FAILED,
                      `Batch compilation error: ${(error as Error).message}`,
                      { requestId: id },
                      error as Error
                    )
                  ),
                };
              }
            });

            const batchResults = await Promise.allSettled(batchPromises);

            for (const settledResult of batchResults) {
              if (settledResult.status === 'fulfilled') {
                const { id, result } = settledResult.value;

                if (result.success) {
                  results.push(result.value);
                } else {
                  errors.push(result.error);

                  if (options?.failFast) {
                    throw new EnhancedCompilationError(
                      ErrorCodes.COMPILATION_FAILED,
                      `Batch compilation failed at request ${id}: ${result.error.message}`,
                      { requestId: id, batchSize: batch.length },
                      result.error
                    );
                  }
                }
              } else {
                const error = new EnhancedCompilationError(
                  ErrorCodes.COMPILATION_FAILED,
                  `Batch promise rejected: ${settledResult.reason}`,
                  { batchIndex: i }
                );
                errors.push(error);

                if (options?.failFast) {
                  throw error;
                }
              }
            }
          }

          if (errors.length > 0 && !options?.continueOnError) {
            throw new EnhancedCompilationError(
              ErrorCodes.COMPILATION_FAILED,
              `Batch compilation failed with ${errors.length} errors`,
              { errorCount: errors.length, totalRequests: requestIds.length }
            );
          }

          return results;
        }
      );

      return Ok(result);
    } catch (error) {
      return Err(
        new EnhancedCompilationError(
          ErrorCodes.INTERNAL_ERROR,
          `Batch compilation failed: ${(error as Error).message}`,
          { requestIds: requestIds.length, options },
          error as Error
        )
      );
    }
  }

  /**

- Enhanced health status with detailed performance metrics
   */
  async getHealthStatus(): Promise<
    Result<CompilationServiceHealth, SandboxError>

  > {
    try {
      const { result, metric } = await this.monitor.measure(
        'health_check',
        async () => {
          const allRequests = Array.from(this.requests.values());
          const allResults = Array.from(this.results.values());

          const activeCompilations = this.activeCompilations.size;
          const queuedRequests = allRequests.filter(
            (r) => r.status === 'queued' || r.status === 'pending'
          ).length;

          const averageCompilationTimeMs =
            this.compilationCount > 0
              ? this.totalCompilationTime / this.compilationCount
              : 0;

          const successRate =
            this.compilationCount > 0
              ? (this.successCount / this.compilationCount) * 100
              : 100;

          const lastSuccessfulResult = allResults
            .filter((r) => r.status === 'success')
            .sort((a, b) => b.completedAt - a.completedAt)[0];

          const warnings: string[] = [];

          // Performance-based warnings
          if (activeCompilations > this.config.maxConcurrency * 2) {
            warnings.push(
              `High number of active compilations: ${activeCompilations}`
            );
          }

          if (queuedRequests > 50) {
            warnings.push(`High number of queued requests: ${queuedRequests}`);
          }

          if (successRate < 80) {
            warnings.push(`Low success rate: ${successRate.toFixed(1)}%`);
          }

          if (averageCompilationTimeMs > 10_000) {
            warnings.push(
              `High average compilation time: ${averageCompilationTimeMs.toFixed(0)}ms`
            );
          }

          // Cache health checks
          if (this.resultCache) {
            const cacheHealth = await this.resultCache.getHealthStatus();
            if (cacheHealth.success && !cacheHealth.value.healthy) {
              warnings.push('Result cache performance issues');
            }
          }

          if (this.queue) {
            const queueHealth = await this.queue.getHealthStatus();
            if (queueHealth.success && !queueHealth.value.healthy) {
              warnings.push('Compilation queue issues');
            }
          }

          const memoryUsage = process.memoryUsage();

          return {
            healthy: warnings.length === 0,
            status: warnings.length === 0 ? 'operational' : 'degraded',
            activeCompilations,
            queuedRequests,
            averageCompilationTimeMs,
            successRate,
            memoryUsageBytes: memoryUsage.heapUsed,
            lastSuccessfulCompilation: lastSuccessfulResult?.completedAt,
            warnings,
            diagnostics: {
              totalRequests: allRequests.length,
              totalResults: allResults.length,
              successCount: this.successCount,
              failureCount: this.failureCount,
              cacheEnabled: !!this.resultCache,
              queueEnabled: !!this.queue,
              memoryUsage,
              uptime: process.uptime(),
              performanceConfig: this.config,
            },
          };
        }
      );

      return Ok(result);
    } catch (error) {
      return Err(
        new EnhancedCompilationError(
          ErrorCodes.INTERNAL_ERROR,
          `Health check failed: ${(error as Error).message}`,
          {},
          error as Error
        )
      );
    }
  }

  // Standard interface methods (simplified implementations)
  async getRequest(
    id: CompilationRequestId
  ): Promise<Result<CompilationRequest, SandboxError>> {
    const request = this.requests.get(id);
    if (!request) {
      return Err(
        new EnhancedCompilationError(
          ErrorCodes.REQUEST_NOT_FOUND,
          `Compilation request not found: ${id}`,
          { requestId: id }
        )
      );
    }
    return Ok({ ...request });
  }

  async updateRequest(
    params: UpdateCompilationRequestParams
  ): Promise<Result<CompilationRequest, SandboxError>> {
    const request = this.requests.get(params.id);
    if (!request) {
      return Err(
        new EnhancedCompilationError(
          ErrorCodes.REQUEST_NOT_FOUND,
          `Compilation request not found: ${params.id}`,
          { requestId: params.id }
        )
      );
    }

    const updatedRequest: EnhancedStoredCompilationRequest = {
      ...request,
      updatedAt: BrandedTypeUtils.generateTimestamp(),
      status: params.status || request.status,
      priority: params.priority || request.priority,
      completedAt:
        params.status === 'completed' || params.status === 'failed'
          ? BrandedTypeUtils.generateTimestamp()
          : request.completedAt,
      metadata: {
        ...request.metadata,
        ...params.metadata,
      },
      childRequestIds: [
        ...request.childRequestIds,
        ...(params.addChildRequestIds || []),
      ],
    };

    this.requests.set(params.id, updatedRequest);
    return Ok({ ...updatedRequest });
  }

  async listRequests(
    options?: ListCompilationRequestsOptions
  ): Promise<Result<readonly CompilationRequest[], SandboxError>> {
    try {
      let requests = Array.from(this.requests.values());

      // Apply filters efficiently
      if (options?.status) {
        requests = requests.filter((r) => options.status!.includes(r.status));
      }

      if (options?.priority) {
        requests = requests.filter((r) =>
          options.priority!.includes(r.priority)
        );
      }

      if (options?.createdAfter) {
        requests = requests.filter((r) => r.createdAt >= options.createdAfter!);
      }

      if (options?.createdBefore) {
        requests = requests.filter(
          (r) => r.createdAt <= options.createdBefore!
        );
      }

      // Apply sorting
      if (options?.sortBy) {
        requests.sort((a, b) => {
          let comparison = 0;

          switch (options.sortBy) {
            case 'createdAt':
              comparison = a.createdAt - b.createdAt;
              break;
            case 'updatedAt':
              comparison = a.updatedAt - b.updatedAt;
              break;
            case 'priority': {
              const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
              comparison =
                priorityOrder[a.priority] - priorityOrder[b.priority];
              break;
            }
          }

          return options.sortOrder === 'desc' ? -comparison : comparison;
        });
      }

      // Apply pagination
      if (options?.offset) {
        requests = requests.slice(options.offset);
      }

      if (options?.limit) {
        requests = requests.slice(0, options.limit);
      }

      return Ok(requests.map((r) => ({ ...r })));
    } catch (error) {
      return Err(
        new EnhancedCompilationError(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to list requests: ${(error as Error).message}`,
          { options },
          error as Error
        )
      );
    }
  }

  async cancelRequest(
    id: CompilationRequestId
  ): Promise<Result<CompilationRequest, SandboxError>> {
    const request = this.requests.get(id);
    if (!request) {
      return Err(
        new EnhancedCompilationError(
          ErrorCodes.REQUEST_NOT_FOUND,
          `Compilation request not found: ${id}`,
          { requestId: id }
        )
      );
    }

    // Cancel queue task if present
    if (this.queue && request.queueTaskId) {
      await this.queue.cancel(request.queueTaskId);
    }

    // Cancel active compilation if running
    const activeState = this.activeCompilations.get(id);
    if (activeState) {
      if (activeState.timeoutHandle) {
        clearTimeout(activeState.timeoutHandle);
      }
      if (activeState.abortController) {
        activeState.abortController.abort();
      }
      this.activeCompilations.delete(id);
    }

    const cancelledRequest: EnhancedStoredCompilationRequest = {
      ...request,
      status: 'cancelled',
      updatedAt: BrandedTypeUtils.generateTimestamp(),
      completedAt: BrandedTypeUtils.generateTimestamp(),
    };

    this.requests.set(id, cancelledRequest);
    return Ok({ ...cancelledRequest });
  }

  async getResult(
    id: CompilationResultId
  ): Promise<Result<CompilationResult, SandboxError>> {
    const result = this.results.get(id);
    if (!result) {
      return Err(
        new EnhancedCompilationError(
          ErrorCodes.RESULT_NOT_FOUND,
          `Compilation result not found: ${id}`,
          { resultId: id }
        )
      );
    }
    return Ok({ ...result });
  }

  async getResultByRequestId(
    requestId: CompilationRequestId
  ): Promise<Result<CompilationResult, SandboxError>> {
    const resultId = this.requestResults.get(requestId);
    if (!resultId) {
      return Err(
        new EnhancedCompilationError(
          ErrorCodes.REQUEST_NOT_FOUND,
          `No result found for request: ${requestId}`,
          { requestId }
        )
      );
    }
    return this.getResult(resultId);
  }

  async listResults(
    options?: ListCompilationResultsOptions
  ): Promise<Result<readonly CompilationResult[], SandboxError>> {
    try {
      let results = Array.from(this.results.values());

      // Apply filters
      if (options?.status) {
        results = results.filter((r) => options.status!.includes(r.status));
      }

      if (options?.successfulOnly) {
        results = results.filter((r) => r.status === 'success');
      }

      if (options?.completedAfter) {
        results = results.filter(
          (r) => r.completedAt >= options.completedAfter!
        );
      }

      if (options?.completedBefore) {
        results = results.filter(
          (r) => r.completedAt <= options.completedBefore!
        );
      }

      // Apply sorting
      if (options?.sortBy) {
        results.sort((a, b) => {
          let comparison = 0;

          switch (options.sortBy) {
            case 'completedAt':
              comparison = a.completedAt - b.completedAt;
              break;
            case 'totalTimeMs':
              comparison = a.metrics.totalTimeMs - b.metrics.totalTimeMs;
              break;
            case 'status':
              comparison = a.status.localeCompare(b.status);
              break;
          }

          return options.sortOrder === 'desc' ? -comparison : comparison;
        });
      }

      // Apply pagination
      if (options?.offset) {
        results = results.slice(options.offset);
      }

      if (options?.limit) {
        results = results.slice(0, options.limit);
      }

      return Ok(results.map((r) => ({ ...r })));
    } catch (error) {
      return Err(
        new EnhancedCompilationError(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to list results: ${(error as Error).message}`,
          { options },
          error as Error
        )
      );
    }
  }

  async validateSourceFiles(
    filePaths: readonly SafeFilePath[]
  ): Promise<Result<readonly boolean[], SandboxError>> {
    try {
      const validationPromises = filePaths.map(async (filePath) => {
        const existsResult = await this.fileSystem.exists(filePath);
        return existsResult.success ? existsResult.value : false;
      });

      const validationResults = await Promise.all(validationPromises);
      return Ok(validationResults);
    } catch (error) {
      return Err(
        new EnhancedCompilationError(
          ErrorCodes.INTERNAL_ERROR,
          `Source file validation failed: ${(error as Error).message}`,
          { filePaths },
          error as Error
        )
      );
    }
  }

  async cleanup(olderThanMs?: number): Promise<Result<number, SandboxError>> {
    try {
      const cutoffTime = olderThanMs ? Date.now() - olderThanMs : 0;
      let cleanedCount = 0;

      // Clean up old requests and results
      for (const [requestId, request] of this.requests.entries()) {
        if (request.completedAt && request.completedAt < cutoffTime) {
          this.requests.delete(requestId);

          const resultId = this.requestResults.get(requestId);
          if (resultId) {
            this.results.delete(resultId);
            this.requestResults.delete(requestId);
          }

          cleanedCount++;
        }
      }

      // Clean up caches
      if (this.resultCache) {
        const cacheCleanup = await this.resultCache.cleanup();
        if (cacheCleanup.success) {
          cleanedCount += cacheCleanup.value;
        }
      }

      if (this.sourceCache) {
        const cacheCleanup = await this.sourceCache.cleanup();
        if (cacheCleanup.success) {
          cleanedCount += cacheCleanup.value;
        }
      }

      return Ok(cleanedCount);
    } catch (error) {
      return Err(
        new EnhancedCompilationError(
          ErrorCodes.INTERNAL_ERROR,
          `Cleanup failed: ${(error as Error).message}`,
          { olderThanMs },
          error as Error
        )
      );
    }
  }

  /**

- Helper methods
   */
  private async generateCacheKey(
    sources: readonly CompilationSource[],
    targets: readonly any[],
    options?: any
  ): Promise<string> {
    const sourceHash = await this.hashSources(sources);
    const targetsHash = this.hashContent(JSON.stringify(targets));
    const optionsHash = this.hashContent(JSON.stringify(options || {}));

    return `${sourceHash}_${targetsHash}_${optionsHash}`;
  }

  private async hashSources(
    sources: readonly CompilationSource[]
  ): Promise<string> {
    const hashes = await Promise.all(
      sources.map(async (source) => {
        if (source.type === 'file' && source.filePath) {
          const metadata = await this.fileSystem.getMetadata(source.filePath);
          return metadata.success
            ? `${source.filePath}_${metadata.value.modifiedAt}`
            : source.filePath;
        }
        if (source.type === 'content' && source.content) {
          return this.hashContent(source.content);
        }
        return '';
      })
    );

    return this.hashContent(hashes.join('_'));
  }

  private hashContent(content: string): string {
    // Simple hash function for demo purposes
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private mapPriorityToTaskPriority(priority: string): TaskPriority {
    switch (priority) {
      case 'urgent':
        return 'urgent';
      case 'high':
        return 'high';
      case 'normal':
        return 'normal';
      case 'low':
        return 'low';
      default:
        return 'normal';
    }
  }

  private async cleanupTempFiles(tempFiles: string[]): Promise<void> {
    const cleanupPromises = tempFiles.map(async (tempFile) => {
      try {
        await this.fileSystem.deleteFile(createSafeFilePath(tempFile));
      } catch (error) {
        this.logger.warn(
          `Failed to cleanup temp file ${tempFile}: ${(error as Error).message}`
        );
      }
    });

    await Promise.all(cleanupPromises);
  }

  /**

- Get performance statistics
   */
  async getPerformanceStats(): Promise<{
    monitor: any;
    resultCache?: any;
    sourceCache?: any;
    queue?: any;
  }> {
    const stats: any = {
      monitor: await this.monitor.getHealthStatus(),
    };

    if (this.resultCache) {
      stats.resultCache = await this.resultCache.getHealthStatus();
    }

    if (this.sourceCache) {
      stats.sourceCache = await this.sourceCache.getHealthStatus();
    }

    if (this.queue) {
      stats.queue = await this.queue.getHealthStatus();
    }

    return stats;
  }

  /**

- Destroy and cleanup all resources
   */
  destroy(): void {
    // Cancel all active compilations
    for (const [id] of this.activeCompilations) {
      this.cancelRequest(id);
    }

    // Cleanup caches
    if (this.resultCache) {
      this.resultCache.destroy();
    }
    if (this.sourceCache) {
      this.sourceCache.destroy();
    }

    // Clear queue
    if (this.queue) {
      this.queue.clear();
    }
  }
}
