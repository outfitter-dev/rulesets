/**

- @fileoverview Provider information domain model
-
- Represents metadata and capabilities of compilation providers
 */

import type { ProviderType, SemanticVersion } from '@/shared/types/brands';

/**

- Provider capability types
 */
export type ProviderCapability =
  | 'template_processing'
  | 'variable_substitution'
  | 'block_filtering'
  | 'syntax_highlighting'
  | 'validation'
  | 'minification'
  | 'source_maps'
  | 'hot_reload'
  | 'incremental_compilation';

/**

- Provider status
 */
export type ProviderStatus =
  | 'available'
  | 'initializing'
  | 'error'
  | 'disabled';

/**

- Provider information model
 */
export interface ProviderInfo {
  /**Provider type identifier*/
  readonly id: ProviderType;

  /** Human-readable name */
  readonly name: string;

  /** Provider description */
  readonly description: string;

  /** Provider version */
  readonly version: SemanticVersion;

  /** Current status */
  readonly status: ProviderStatus;

  /** Whether provider is enabled */
  readonly enabled: boolean;

  /** Supported capabilities */
  readonly capabilities: readonly ProviderCapability[];

  /** Supported file extensions */
  readonly supportedExtensions: readonly string[];

  /** Output file extension */
  readonly outputExtension: string;

  /** Provider website or documentation URL */
  readonly website?: string;

  /** Provider author/maintainer */
  readonly author?: string;

  /** License information */
  readonly license?: string;

  /** Configuration schema */
  readonly configSchema?: Record<string, unknown>;

  /** Default configuration */
  readonly defaultConfig?: Record<string, unknown>;

  /** Performance metrics */
  readonly metrics?: ProviderMetrics;

  /** Additional metadata */
  readonly metadata: Record<string, unknown>;
}

/**

- Provider performance metrics
 */
export interface ProviderMetrics {
  /**Average compilation time in milliseconds*/
  readonly averageCompilationTimeMs: number;

  /** Total compilations performed */
  readonly totalCompilations: number;

  /** Successful compilations */
  readonly successfulCompilations: number;

  /** Failed compilations */
  readonly failedCompilations: number;

  /** Success rate percentage */
  readonly successRate: number;

  /** Last compilation timestamp */
  readonly lastCompilationAt?: number;

  /** Memory usage statistics */
  readonly memoryUsage?: MemoryUsageStats;
}

/**

- Memory usage statistics
 */
export interface MemoryUsageStats {
  /**Current memory usage in bytes*/
  readonly currentBytes: number;

  /** Peak memory usage in bytes */
  readonly peakBytes: number;

  /** Average memory usage in bytes */
  readonly averageBytes: number;
}
