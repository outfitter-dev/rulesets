/**

- @fileoverview Core compilation service interface
-
- Defines the primary service interface for @rulesets/core integration,
- providing type-safe compilation operations with comprehensive error handling.
 */

import type { SandboxError } from '@/domain/errors';
import type {
  CompilationRequest,
  CreateCompilationRequestParams,
  UpdateCompilationRequestParams,
} from '@/domain/models/compilation-request';
import type { CompilationResult } from '@/domain/models/compilation-result';
import type {
  CompilationRequestId,
  CompilationResultId,
  SafeFilePath,
} from '@/shared/types/brands';
import type { Result } from '@/shared/types/result';

/**

- Options for listing compilation requests
 */
export interface ListCompilationRequestsOptions {
  /**Maximum number of requests to return*/
  readonly limit?: number;

  /** Number of requests to skip (for pagination) */
  readonly offset?: number;

  /** Filter by request status */
  readonly status?: readonly string[];

  /** Filter by priority */
  readonly priority?: readonly string[];

  /** Filter by creation date range */
  readonly createdAfter?: number;
  readonly createdBefore?: number;

  /** Sort order */
  readonly sortBy?: 'createdAt' | 'updatedAt' | 'priority';
  readonly sortOrder?: 'asc' | 'desc';

  /** Include child requests in results */
  readonly includeChildren?: boolean;
}

/**

- Options for listing compilation results
 */
export interface ListCompilationResultsOptions {
  /**Maximum number of results to return*/
  readonly limit?: number;

  /** Number of results to skip (for pagination) */
  readonly offset?: number;

  /** Filter by result status */
  readonly status?: readonly string[];

  /** Filter by completion date range */
  readonly completedAfter?: number;
  readonly completedBefore?: number;

  /** Sort order */
  readonly sortBy?: 'completedAt' | 'totalTimeMs' | 'status';
  readonly sortOrder?: 'asc' | 'desc';

  /** Include only successful results */
  readonly successfulOnly?: boolean;
}

/**

- Batch compilation options
 */
export interface BatchCompilationOptions {
  /**Maximum number of concurrent compilations*/
  readonly maxConcurrency?: number;

  /** Whether to fail fast on first error */
  readonly failFast?: boolean;

  /** Timeout for the entire batch operation */
  readonly batchTimeoutMs?: number;

  /** Whether to continue on individual compilation failures */
  readonly continueOnError?: boolean;
}

/**

- Core compilation service interface for @rulesets/core integration
-
- This service provides the main interface for compiling Rulesets source files
- into provider-specific rules files. It handles request lifecycle management,
- batch operations, and integration with the @rulesets/core library.
-
- @template TRequest - Type constraint for compilation request parameters
- @template TResult - Type constraint for compilation result data
 */
export interface ICompilationService<
  TRequest extends CompilationRequest = CompilationRequest,
  TResult extends CompilationResult = CompilationResult,

> {
  /**

- Creates a new compilation request
-
- @param params - Parameters for creating the compilation request
- @returns Promise resolving to the created request or error
-
- @example

- ```typescript
- const result = await compilationService.createRequest({
- sources: [{ type: 'file', filePath: createSafeFilePath('src/rules.rule.md') }],
- targets: [{ provider: createProviderType('cursor'), outputPath: createSafeFilePath('.cursor/rules.mdc') }]
- });
-
- if (result.success) {
- console.log('Request created:', result.value.id);
- } else {
- console.error('Failed to create request:', result.error.message);
- }

- ```

   */
  createRequest(
    params: CreateCompilationRequestParams
  ): Promise<Result<TRequest, SandboxError>>;

  /**

- Retrieves a compilation request by ID
-
- @param id - Unique identifier of the compilation request
- @returns Promise resolving to the request or error if not found
   */
  getRequest(id: CompilationRequestId): Promise<Result<TRequest, SandboxError>>;

  /**

- Updates an existing compilation request
-
- @param params - Parameters for updating the request
- @returns Promise resolving to the updated request or error
   */
  updateRequest(
    params: UpdateCompilationRequestParams
  ): Promise<Result<TRequest, SandboxError>>;

  /**

- Lists compilation requests with optional filtering and pagination
-
- @param options - Options for filtering, sorting, and pagination
- @returns Promise resolving to array of requests matching criteria
   */
  listRequests(
    options?: ListCompilationRequestsOptions
  ): Promise<Result<readonly TRequest[], SandboxError>>;

  /**

- Cancels a pending or active compilation request
-
- @param id - ID of the request to cancel
- @returns Promise resolving to the cancelled request or error
   */
  cancelRequest(
    id: CompilationRequestId
  ): Promise<Result<TRequest, SandboxError>>;

  /**

- Executes a compilation request and returns the result
-
- This is the core compilation method that processes source files
- through the @rulesets/core library and generates provider-specific output.
-
- @param id - ID of the compilation request to execute
- @returns Promise resolving to the compilation result or error
-
- @example

- ```typescript
- const result = await compilationService.compile(requestId);
-
- if (result.success) {
- console.log('Compilation completed:', result.value.status);
- console.log('Generated files:', result.value.outputFiles.length);
- } else {
- console.error('Compilation failed:', result.error.getUserMessage());
- }

- ```

   */
  compile(id: CompilationRequestId): Promise<Result<TResult, SandboxError>>;

  /**

- Retrieves a compilation result by ID
-
- @param id - Unique identifier of the compilation result
- @returns Promise resolving to the result or error if not found
   */
  getResult(id: CompilationResultId): Promise<Result<TResult, SandboxError>>;

  /**

- Retrieves the compilation result for a specific request
-
- @param requestId - ID of the compilation request
- @returns Promise resolving to the result or error if not found
   */
  getResultByRequestId(
    requestId: CompilationRequestId
  ): Promise<Result<TResult, SandboxError>>;

  /**

- Lists compilation results with optional filtering and pagination
-
- @param options - Options for filtering, sorting, and pagination
- @returns Promise resolving to array of results matching criteria
   */
  listResults(
    options?: ListCompilationResultsOptions
  ): Promise<Result<readonly TResult[], SandboxError>>;

  /**

- Performs batch compilation of multiple requests
-
- @param requestIds - Array of request IDs to compile
- @param options - Options for batch processing behavior
- @returns Promise resolving to array of compilation results
-
- @example

- ```typescript
- const result = await compilationService.batchCompile(
- [requestId1, requestId2, requestId3],
- { maxConcurrency: 2, failFast: false }
- );
-
- if (result.success) {
- const successful = result.value.filter(r => r.status === 'success');
- console.log(`${successful.length}/${result.value.length} compilations succeeded`);
- }

- ```

   */
  batchCompile(
    requestIds: readonly CompilationRequestId[],
    options?: BatchCompilationOptions
  ): Promise<Result<readonly TResult[], SandboxError>>;

  /**

- Validates that source files exist and are accessible
-
- @param filePaths - Array of file paths to validate
- @returns Promise resolving to validation results for each file
   */
  validateSourceFiles(
    filePaths: readonly SafeFilePath[]
  ): Promise<Result<readonly boolean[], SandboxError>>;

  /**

- Cleans up temporary files and resources for completed compilations
-
- @param olderThanMs - Clean up results older than this many milliseconds
- @returns Promise resolving to number of cleaned up items
   */
  cleanup(olderThanMs?: number): Promise<Result<number, SandboxError>>;

  /**

- Gets health status of the compilation service
-
- @returns Promise resolving to health check information
   */
  getHealthStatus(): Promise<Result<CompilationServiceHealth, SandboxError>>;
}

/**

- Health status information for the compilation service
 */
export interface CompilationServiceHealth {
  /**Whether the service is healthy*/
  readonly healthy: boolean;

  /** Current status message */
  readonly status: string;

  /** Number of active compilations */
  readonly activeCompilations: number;

  /** Number of queued requests */
  readonly queuedRequests: number;

  /** Average compilation time in milliseconds */
  readonly averageCompilationTimeMs: number;

  /** Success rate percentage */
  readonly successRate: number;

  /** Memory usage in bytes */
  readonly memoryUsageBytes: number;

  /** Timestamp of last successful compilation */
  readonly lastSuccessfulCompilation?: number;

  /** Any health warnings */
  readonly warnings: readonly string[];

  /** Additional diagnostic information */
  readonly diagnostics: Record<string, unknown>;
}

/**

- Event types emitted by the compilation service
 */
export type CompilationServiceEvent =
  | { type: 'request_created'; requestId: CompilationRequestId }
  | { type: 'request_updated'; requestId: CompilationRequestId }
  | { type: 'compilation_started'; requestId: CompilationRequestId }
  | {
      type: 'compilation_completed';
      requestId: CompilationRequestId;
      resultId: CompilationResultId;
    }
  | {
      type: 'compilation_failed';
      requestId: CompilationRequestId;
      error: SandboxError;
    }
  | { type: 'compilation_cancelled'; requestId: CompilationRequestId }
  | { type: 'batch_started'; requestIds: readonly CompilationRequestId[] }
  | { type: 'batch_completed'; results: readonly CompilationResultId[] };

/**

- Optional event listener interface for compilation service events
 */
export interface ICompilationServiceEventListener {
  /**
  - Called when a compilation service event occurs
  -
  - @param event - The event that occurred
   */
  onEvent(event: CompilationServiceEvent): void | Promise<void>;
}

/**

- Extended compilation service interface with event support
 */
export interface ICompilationServiceWithEvents<
  TRequest extends CompilationRequest = CompilationRequest,
  TResult extends CompilationResult = CompilationResult,

> extends ICompilationService<TRequest, TResult> {
  /**

- Adds an event listener for compilation service events
-
- @param listener - Event listener to add
   */
  addEventListener(listener: ICompilationServiceEventListener): void;

  /**

- Removes an event listener
-
- @param listener - Event listener to remove
   */
  removeEventListener(listener: ICompilationServiceEventListener): void;

  /**

- Removes all event listeners
   */
  clearEventListeners(): void;
}

/**

- Type alias for the standard compilation service interface
 */
export type CompilationService = ICompilationService<
  CompilationRequest,
  CompilationResult

>;

/**

- Type alias for the compilation service with events
 */
export type CompilationServiceWithEvents = ICompilationServiceWithEvents<
  CompilationRequest,
  CompilationResult

>;
