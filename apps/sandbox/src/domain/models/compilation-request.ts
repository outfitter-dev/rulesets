/**

- @fileoverview Compilation request domain model
-
- Represents a request to compile Rulesets source files into provider-specific
- rules files. Includes input validation, security checks, and metadata tracking.
 */

import type {
  CompilationRequestId,
  ProviderType,
  SafeDirectoryPath,
  SafeFilePath,
  SemanticVersion,
  SourceContent,
  Timestamp,
} from '@/shared/types/brands';

/**

- Priority levels for compilation requests
 */
export type CompilationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**

- Status of a compilation request
 */
export type CompilationRequestStatus =
  | 'pending' // Request created but not started
  | 'queued' // Request in processing queue
  | 'processing' // Currently being processed
  | 'completed' // Successfully completed
  | 'failed' // Failed with errors
  | 'cancelled'; // Cancelled by user

/**

- Options for compilation behavior
 */
export interface CompilationOptions {
  /**Whether to validate input files before compilation*/
  readonly validateInput: boolean;

  /** Whether to generate source maps for debugging */
  readonly generateSourceMaps: boolean;

  /** Whether to minify output content */
  readonly minifyOutput: boolean;

  /** Whether to include debug information in output */
  readonly includeDebugInfo: boolean;

  /** Maximum allowed compilation time in milliseconds */
  readonly timeoutMs: number;

  /** Whether to fail fast on first error or collect all errors */
  readonly failFast: boolean;

  /** Whether to create backup of existing files before overwriting */
  readonly createBackups: boolean;

  /** Custom template variables to use during compilation */
  readonly templateVariables: Record<string, unknown>;
}

/**

- Default compilation options for common scenarios
 */
export const DefaultCompilationOptions: CompilationOptions = {
  validateInput: true,
  generateSourceMaps: true,
  minifyOutput: false,
  includeDebugInfo: true,
  timeoutMs: 30_000, // 30 seconds
  failFast: false,
  createBackups: true,
  templateVariables: {},
} as const;

/**

- Development-focused compilation options
 */
export const DevelopmentCompilationOptions: CompilationOptions = {
  ...DefaultCompilationOptions,
  minifyOutput: false,
  includeDebugInfo: true,
  generateSourceMaps: true,
  timeoutMs: 60_000, // More time for debugging
} as const;

/**

- Production-focused compilation options
 */
export const ProductionCompilationOptions: CompilationOptions = {
  ...DefaultCompilationOptions,
  minifyOutput: true,
  includeDebugInfo: false,
  generateSourceMaps: false,
  failFast: true,
  timeoutMs: 15_000, // Faster timeout for production
} as const;

/**

- Input source for compilation - can be file path or direct content
 */
export interface CompilationSource {
  /**Type of input source*/
  readonly type: 'file' | 'content';

  /** File path (if type is 'file') */
  readonly filePath?: SafeFilePath;

  /** Direct content (if type is 'content') */
  readonly content?: SourceContent;

  /** Optional name for the source (used in error messages) */
  readonly name?: string;

  /** Encoding of the source content */
  readonly encoding: 'utf8' | 'utf16' | 'ascii';
}

/**

- Output target for compilation results
 */
export interface CompilationTarget {
  /**Provider type for this target*/
  readonly provider: ProviderType;

  /** Output file path for compiled rules */
  readonly outputPath: SafeFilePath;

  /** Output directory for the target */
  readonly outputDirectory: SafeDirectoryPath;

  /** Whether this target is enabled */
  readonly enabled: boolean;

  /** Custom options for this specific target */
  readonly targetOptions: Record<string, unknown>;
}

/**

- Metadata associated with a compilation request
 */
export interface CompilationMetadata {
  /**User or system that initiated the request*/
  readonly initiatedBy: string;

  /** Purpose or reason for the compilation */
  readonly purpose?: string;

  /** Tags for categorization and filtering */
  readonly tags: readonly string[];

  /** Environment where compilation is running */
  readonly environment: 'development' | 'staging' | 'production';

  /** Version of the Rulesets compiler being used */
  readonly compilerVersion: SemanticVersion;

  /** Additional custom metadata */
  readonly custom: Record<string, unknown>;
}

/**

- Complete compilation request with all necessary information
 */
export interface CompilationRequest {
  /**Unique identifier for this compilation request*/
  readonly id: CompilationRequestId;

  /** Current status of the request */
  readonly status: CompilationRequestStatus;

  /** Priority level for processing */
  readonly priority: CompilationPriority;

  /** Timestamp when request was created */
  readonly createdAt: Timestamp;

  /** Timestamp when request was last updated */
  readonly updatedAt: Timestamp;

  /** Input sources to compile */
  readonly sources: readonly CompilationSource[];

  /** Output targets for compilation results */
  readonly targets: readonly CompilationTarget[];

  /** Compilation behavior options */
  readonly options: CompilationOptions;

  /** Additional metadata */
  readonly metadata: CompilationMetadata;

  /** Optional parent request ID for batch operations */
  readonly parentRequestId?: CompilationRequestId;

  /** Child request IDs if this is a batch operation */
  readonly childRequestIds: readonly CompilationRequestId[];
}

/**

- Parameters for creating a new compilation request
 */
export interface CreateCompilationRequestParams {
  /**Input sources to compile*/
  readonly sources: readonly CompilationSource[];

  /** Output targets for compilation results */
  readonly targets: readonly CompilationTarget[];

  /** Optional compilation options (uses defaults if not provided) */
  readonly options?: Partial<CompilationOptions>;

  /** Optional priority (defaults to 'normal') */
  readonly priority?: CompilationPriority;

  /** Optional metadata */
  readonly metadata?: Partial<CompilationMetadata>;

  /** Optional parent request ID for batch operations */
  readonly parentRequestId?: CompilationRequestId;
}

/**

- Parameters for updating an existing compilation request
 */
export interface UpdateCompilationRequestParams {
  /**Request ID to update*/
  readonly id: CompilationRequestId;

  /** New status */
  readonly status?: CompilationRequestStatus;

  /** New priority */
  readonly priority?: CompilationPriority;

  /** Additional metadata to merge */
  readonly metadata?: Partial<CompilationMetadata>;

  /** Child request IDs to add */
  readonly addChildRequestIds?: readonly CompilationRequestId[];
}

/**

- Utility functions for working with compilation requests
 */
export const CompilationRequestUtils = {
  /**
  - Creates a compilation source from a file path
   */
  createFileSource: (
    filePath: SafeFilePath,
    name?: string,
    encoding: CompilationSource['encoding'] = 'utf8'
  ): CompilationSource => ({
    type: 'file',
    filePath,
    name: name || filePath,
    encoding,
  }),

  /**

- Creates a compilation source from direct content
   */
  createContentSource: (
    content: SourceContent,
    name: string,
    encoding: CompilationSource['encoding'] = 'utf8'
  ): CompilationSource => ({
    type: 'content',
    content,
    name,
    encoding,
  }),

  /**

- Creates a compilation target for a provider
   */
  createTarget: (
    provider: ProviderType,
    outputPath: SafeFilePath,
    outputDirectory: SafeDirectoryPath,
    enabled = true,
    targetOptions: Record<string, unknown> = {}
  ): CompilationTarget => ({
    provider,
    outputPath,
    outputDirectory,
    enabled,
    targetOptions,
  }),

  /**

- Checks if a request is in a terminal state
   */
  isTerminal: (status: CompilationRequestStatus): boolean => {
    return (
      status === 'completed' || status === 'failed' || status === 'cancelled'
    );
  },

  /**

- Checks if a request is currently active
   */
  isActive: (status: CompilationRequestStatus): boolean => {
    return status === 'queued' || status === 'processing';
  },

  /**

- Checks if a request can be cancelled
   */
  canBeCancelled: (status: CompilationRequestStatus): boolean => {
    return (
      status === 'pending' || status === 'queued' || status === 'processing'
    );
  },

  /**

- Checks if a request can be retried
   */
  canBeRetried: (status: CompilationRequestStatus): boolean => {
    return status === 'failed' || status === 'cancelled';
  },

  /**

- Gets the enabled targets from a compilation request
   */
  getEnabledTargets: (
    request: CompilationRequest
  ): readonly CompilationTarget[] => {
    return request.targets.filter((target) => target.enabled);
  },

  /**

- Gets the file sources from a compilation request
   */
  getFileSources: (
    request: CompilationRequest
  ): readonly CompilationSource[] => {
    return request.sources.filter((source) => source.type === 'file');
  },

  /**

- Gets the content sources from a compilation request
   */
  getContentSources: (
    request: CompilationRequest
  ): readonly CompilationSource[] => {
    return request.sources.filter((source) => source.type === 'content');
  },

  /**

- Estimates the complexity of a compilation request
   */
  estimateComplexity: (
    request: CompilationRequest
  ): 'simple' | 'moderate' | 'complex' => {
    const sourceCount = request.sources.length;
    const targetCount = request.targets.filter((t) => t.enabled).length;
    const totalWork = sourceCount* targetCount;

    if (totalWork <= 5) return 'simple';
    if (totalWork <= 20) return 'moderate';
    return 'complex';
  },

  /**

- Calculates estimated processing time in milliseconds
   */
  estimateProcessingTime: (request: CompilationRequest): number => {
    const MODERATE_COMPLEXITY_TIME_MULTIPLIER = 3;
    const COMPLEX_COMPLEXITY_TIME_MULTIPLIER = 10;
    
    const complexity = CompilationRequestUtils.estimateComplexity(request);
    const baseTime = 1000; // 1 second base

    switch (complexity) {
      case 'simple':
        return baseTime;
      case 'moderate':
        return baseTime * MODERATE_COMPLEXITY_TIME_MULTIPLIER;
      case 'complex':
        return baseTime * COMPLEX_COMPLEXITY_TIME_MULTIPLIER;
    }
  },
} as const;

/**

- Type guards for compilation request validation
 */
export const CompilationRequestGuards = {
  /**
  - Validates that all sources are properly configured
   */
  hasValidSources: (request: CompilationRequest): boolean => {
    return (
      request.sources.length > 0 &&
      request.sources.every(
        (source) =>
          (source.type === 'file' && source.filePath) ||
          (source.type === 'content' && source.content)
      )
    );
  },

  /**

- Validates that at least one target is enabled
   */
  hasEnabledTargets: (request: CompilationRequest): boolean => {
    return request.targets.some((target) => target.enabled);
  },

  /**

- Validates that the request is in a valid state for processing
   */
  isValidForProcessing: (request: CompilationRequest): boolean => {
    return (
      CompilationRequestGuards.hasValidSources(request) &&
      CompilationRequestGuards.hasEnabledTargets(request) &&
      !CompilationRequestUtils.isTerminal(request.status)
    );
  },
} as const;
