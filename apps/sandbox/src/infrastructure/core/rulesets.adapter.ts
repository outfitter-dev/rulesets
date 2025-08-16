/**

- @fileoverview RulesetsCompilationService implementation
-
- Provides integration with @rulesets/core for compilation operations.
- Handles request lifecycle, file management, and error recovery.
 */

import { promises as fs } from 'node:fs';
import { basename, dirname, join } from 'node:path';

// Dynamic imports to avoid build issues
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

/**

- Compilation error for compilation-specific operations
 */
class CompilationError extends SandboxError {
  constructor(
    code: string,
    message: string,
    context: Record<string, unknown> = {},
    cause?: Error
  ) {
    super(
      code,
      message,
      'compilation',
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

- Internal compilation request storage interface
 */
interface StoredCompilationRequest extends CompilationRequest {
  tempFiles?: string[];
}

/**

- Internal compilation state management
 */
interface CompilationState {
  isRunning: boolean;
  startTime: number;
  timeoutHandle?: Timer;
}

/**

- RulesetsCompilationService implementation
 */
export class RulesetsCompilationService implements ICompilationService {
  private readonly fileSystem: IFileSystemService<
    SourceContent | CompiledContent

  >;
  private readonly configService: ConfigurationService;
  private readonly requests = new Map<
    CompilationRequestId,
    StoredCompilationRequest
  >();
  private readonly results = new Map<CompilationResultId, CompilationResult>();
  private readonly requestResults = new Map<
    CompilationRequestId,
    CompilationResultId
  >();
  private readonly activeCompilations = new Map<
    CompilationRequestId,
    CompilationState
  >();
  private readonly logger: Logger;

  constructor(
    fileSystem: IFileSystemService<SourceContent | CompiledContent>,
    configService: ConfigurationService,
    logger?: Logger
  ) {
    this.fileSystem = fileSystem;
    this.configService = configService;
    this.logger = logger || new DefaultLogger();
  }

  async createRequest(
    params: CreateCompilationRequestParams
  ): Promise<Result<CompilationRequest, SandboxError>> {
    try {
      const requestId = BrandedTypeUtils.generateCompilationRequestId();
      const now = BrandedTypeUtils.generateTimestamp();

      // Validate sources
      for (const source of params.sources) {
        if (source.type === 'file' && source.filePath) {
          const existsResult = await this.fileSystem.exists(source.filePath);
          if (!existsResult.success) {
            return existsResult;
          }

          if (!existsResult.value) {
            return Err(
              new CompilationError(
                ErrorCodes.FILE_NOT_FOUND,
                `Source file not found: ${source.filePath}`,
                { filePath: source.filePath }
              )
            );
          }
        }
      }

      // Build compilation request
      const request: StoredCompilationRequest = {
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
      };

      // Store request
      this.requests.set(requestId, request);

      return Ok(request);
    } catch (error) {
      return Err(
        new CompilationError(
          'INTERNAL_ERROR',
          `Failed to create compilation request: ${(error as Error).message}`,
          { params },
          error as Error
        )
      );
    }
  }

  async getRequest(
    id: CompilationRequestId
  ): Promise<Result<CompilationRequest, SandboxError>> {
    const request = this.requests.get(id);
    if (!request) {
      return Err(
        new CompilationError(
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
        new CompilationError(
          ErrorCodes.REQUEST_NOT_FOUND,
          `Compilation request not found: ${params.id}`,
          { requestId: params.id }
        )
      );
    }

    const updatedRequest: StoredCompilationRequest = {
      ...request,
      updatedAt: BrandedTypeUtils.generateTimestamp(),
      status: params.status || request.status,
      priority: params.priority || request.priority,
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

      // Apply filters
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
        new CompilationError(
          'INTERNAL_ERROR',
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
        new CompilationError(
          ErrorCodes.REQUEST_NOT_FOUND,
          `Compilation request not found: ${id}`,
          { requestId: id }
        )
      );
    }

    // Cancel active compilation if running
    const activeState = this.activeCompilations.get(id);
    if (activeState) {
      if (activeState.timeoutHandle) {
        clearTimeout(activeState.timeoutHandle);
      }
      this.activeCompilations.delete(id);
    }

    const cancelledRequest: StoredCompilationRequest = {
      ...request,
      status: 'cancelled',
      updatedAt: BrandedTypeUtils.generateTimestamp(),
    };

    this.requests.set(id, cancelledRequest);
    return Ok({ ...cancelledRequest });
  }

  async compile(
    id: CompilationRequestId
  ): Promise<Result<CompilationResult, SandboxError>> {
    const request = this.requests.get(id);
    if (!request) {
      return Err(
        new CompilationError(
          ErrorCodes.REQUEST_NOT_FOUND,
          `Compilation request not found: ${id}`,
          { requestId: id }
        )
      );
    }

    if (!CompilationRequestGuards.isValidForProcessing(request)) {
      return Err(
        new CompilationError(
          'VALIDATION_FAILED',
          `Request is not valid for processing: ${request.status}`,
          { requestId: id, status: request.status }
        )
      );
    }

    const resultId = BrandedTypeUtils.generateCompilationResultId();
    const resultBuilder = new CompilationResultBuilder(resultId, id);
    const startTime = Date.now();

    try {
      // Update request status
      await this.updateRequest({
        id,
        status: 'processing',
      });

      // Track active compilation
      const compilationState: CompilationState = {
        isRunning: true,
        startTime,
      };

      // Set up timeout if specified
      if (request.options.timeoutMs > 0) {
        compilationState.timeoutHandle = setTimeout(() => {
          compilationState.isRunning = false;
          this.logger.warn(`Compilation timeout for request ${id}`);
        }, request.options.timeoutMs);
      }

      this.activeCompilations.set(id, compilationState);

      // Process each source
      const tempFiles: string[] = [];
      let allSuccessful = true;

      for (const source of request.sources) {
        try {
          const sourceFile = await this.prepareSourceFile(source, tempFiles);

          // Check if compilation was cancelled or timed out
          if (!compilationState.isRunning) {
            throw new Error('Compilation timeout or cancellation');
          }

          // Run @rulesets/core compilation (dynamic import to avoid build issues)
          try {
            const { runRulesetsV0 } = await import('@rulesets/core');
            await runRulesetsV0(sourceFile, this.logger);
          } catch (importError) {
            // Check if this is an import error or compilation error
            if (
              (importError as Error).message.includes('Cannot resolve module')
            ) {
              // Fallback for testing or when @rulesets/core is not available
              this.logger.info(`Mock compilation for ${sourceFile}`);
            } else {
              // This is a compilation error from @rulesets/core
              throw importError;
            }
          }

          // Check if compilation was cancelled or timed out after @rulesets/core
          if (!compilationState.isRunning) {
            throw new Error('Compilation timeout or cancellation');
          }

          // For now, create a mock provider result
          // TODO: Integrate with actual @rulesets/core output collection
          const providerResult: ProviderResult = {
            provider: request.targets[0]?.provider || 'unknown',
            success: true,
            outputFiles: [],
            diagnostics: [],
            processingTimeMs: Date.now() - startTime,
            metadata: {},
          };

          resultBuilder.addProviderResult(providerResult);
        } catch (error) {
          allSuccessful = false;

          const compilationError = new CompilationError(
            'COMPILATION_FAILED',
            `Source compilation failed: ${(error as Error).message}`,
            { source },
            error as Error
          );

          resultBuilder.addError(compilationError);

          if (request.options.failFast) {
            break;
          }
        }
      }

      // Clean up timeout
      if (compilationState.timeoutHandle) {
        clearTimeout(compilationState.timeoutHandle);
      }
      this.activeCompilations.delete(id);

      // Clean up temp files
      await this.cleanupTempFiles(tempFiles);

      // Build final result
      const metrics: CompilationMetrics = {
        totalTimeMs: Date.now() - startTime,
        parseTimeMs: 0,
        templateTimeMs: 0,
        outputTimeMs: 0,
        validationTimeMs: 0,
        peakMemoryBytes: 0,
        filesProcessed: request.sources.length,
        inputSizeBytes: 0,
        outputSizeBytes: 0,
        compressionRatio: 1,
      };

      resultBuilder.setMetrics(metrics);

      const result = resultBuilder.build();

      // Update request status
      await this.updateRequest({
        id,
        status: allSuccessful ? 'completed' : 'failed',
      });

      // Store result
      this.results.set(resultId, result);
      this.requestResults.set(id, resultId);

      return Ok(result);
    } catch (error) {
      // Clean up on error
      if (this.activeCompilations.has(id)) {
        const state = this.activeCompilations.get(id)!;
        if (state.timeoutHandle) {
          clearTimeout(state.timeoutHandle);
        }
        this.activeCompilations.delete(id);
      }

      await this.updateRequest({
        id,
        status: 'failed',
      });

      const errorResult = new CompilationError(
        'COMPILATION_FAILED',
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

- Prepares a source file for compilation (creates temp file if needed)
   */
  private async prepareSourceFile(
    source: CompilationSource,
    tempFiles: string[]
  ): Promise<string> {
    if (source.type === 'file' && source.filePath) {
      return source.filePath;
    }

    if (source.type === 'content' && source.content) {
      // Create temporary file
      const tempFileName = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.rule.md`;
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
      return tempPath;
    }

    throw new Error(`Invalid source configuration: ${JSON.stringify(source)}`);
  }

  /**

- Cleans up temporary files created during compilation
   */
  private async cleanupTempFiles(tempFiles: string[]): Promise<void> {
    for (const tempFile of tempFiles) {
      try {
        await this.fileSystem.deleteFile(createSafeFilePath(tempFile));
      } catch (error) {
        this.logger.warn(
          `Failed to cleanup temp file ${tempFile}: ${(error as Error).message}`
        );
      }
    }
  }

  async getResult(
    id: CompilationResultId
  ): Promise<Result<CompilationResult, SandboxError>> {
    const result = this.results.get(id);
    if (!result) {
      return Err(
        new CompilationError(
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
        new CompilationError(
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
        new CompilationError(
          'INTERNAL_ERROR',
          `Failed to list results: ${(error as Error).message}`,
          { options },
          error as Error
        )
      );
    }
  }

  async batchCompile(
    requestIds: readonly CompilationRequestId[],
    options?: BatchCompilationOptions
  ): Promise<Result<readonly CompilationResult[], SandboxError>> {
    try {
      const maxConcurrency = options?.maxConcurrency || 3;
      const results: CompilationResult[] = [];
      const errors: SandboxError[] = [];

      // Process in batches
      for (let i = 0; i < requestIds.length; i += maxConcurrency) {
        const batch = requestIds.slice(i, i + maxConcurrency);

        const batchPromises = batch.map(async (requestId) => {
          const result = await this.compile(requestId);
          return { requestId, result };
        });

        const batchResults = await Promise.all(batchPromises);

        for (const { requestId, result } of batchResults) {
          if (result.success) {
            results.push(result.value);
          } else {
            errors.push(result.error);

            if (options?.failFast) {
              return Err(
                new CompilationError(
                  'COMPILATION_FAILED',
                  `Batch compilation failed at request ${requestId}: ${result.error.message}`,
                  { requestId, batchSize: batch.length },
                  result.error
                )
              );
            }
          }
        }
      }

      if (errors.length > 0 && !options?.continueOnError) {
        return Err(
          new CompilationError(
            'COMPILATION_FAILED',
            `Batch compilation failed with ${errors.length} errors`,
            { errorCount: errors.length, totalRequests: requestIds.length }
          )
        );
      }

      return Ok(results);
    } catch (error) {
      return Err(
        new CompilationError(
          'INTERNAL_ERROR',
          `Batch compilation failed: ${(error as Error).message}`,
          { requestIds: requestIds.length, options },
          error as Error
        )
      );
    }
  }

  async validateSourceFiles(
    filePaths: readonly SafeFilePath[]
  ): Promise<Result<readonly boolean[], SandboxError>> {
    try {
      const validationResults: boolean[] = [];

      for (const filePath of filePaths) {
        const existsResult = await this.fileSystem.exists(filePath);
        if (existsResult.success) {
          validationResults.push(existsResult.value);
        } else {
          // If we can't check existence, treat as invalid
          validationResults.push(false);
        }
      }

      return Ok(validationResults);
    } catch (error) {
      return Err(
        new CompilationError(
          'INTERNAL_ERROR',
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

      return Ok(cleanedCount);
    } catch (error) {
      return Err(
        new CompilationError(
          'INTERNAL_ERROR',
          `Cleanup failed: ${(error as Error).message}`,
          { olderThanMs },
          error as Error
        )
      );
    }
  }

  async getHealthStatus(): Promise<
    Result<CompilationServiceHealth, SandboxError>
  > {
    try {
      const allRequests = Array.from(this.requests.values());
      const allResults = Array.from(this.results.values());

      const activeCompilations = this.activeCompilations.size;
      const queuedRequests = allRequests.filter(
        (r) => r.status === 'queued' || r.status === 'pending'
      ).length;

      const completedResults = allResults.filter(
        (r) => r.status === 'success' || r.status === 'failure'
      );
      const successfulResults = allResults.filter(
        (r) => r.status === 'success'
      );

      const averageCompilationTimeMs =
        completedResults.length > 0
          ? completedResults.reduce(
              (sum, r) => sum + r.metrics.totalTimeMs,
              0
            ) / completedResults.length
          : 0;

      const successRate =
        completedResults.length > 0
          ? (successfulResults.length / completedResults.length) * 100
          : 100;

      const lastSuccessfulResult = successfulResults.sort(
        (a, b) => b.completedAt - a.completedAt
      )[0];

      const warnings: string[] = [];

      if (activeCompilations > 10) {
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

      return Ok({
        healthy: warnings.length === 0,
        status: warnings.length === 0 ? 'operational' : 'degraded',
        activeCompilations,
        queuedRequests,
        averageCompilationTimeMs,
        successRate,
        memoryUsageBytes: process.memoryUsage().heapUsed,
        lastSuccessfulCompilation: lastSuccessfulResult?.completedAt,
        warnings,
        diagnostics: {
          totalRequests: allRequests.length,
          totalResults: allResults.length,
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime(),
        },
      });
    } catch (error) {
      return Err(
        new CompilationError(
          'INTERNAL_ERROR',
          `Health check failed: ${(error as Error).message}`,
          {},
          error as Error
        )
      );
    }
  }
}
