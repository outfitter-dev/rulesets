/**

- @fileoverview Compilation result domain model
-
- Represents the outcome of a compilation request, including generated files,
- diagnostics, performance metrics, and any errors encountered during processing.
 */

import type { SandboxError } from '@/domain/errors';
import type {
  CompilationRequestId,
  CompilationResultId,
  CompiledContent,
  ErrorCode,
  SafeFilePath,
  Timestamp,
} from '@/shared/types/brands';

/**

- Severity levels for compilation diagnostics
 */
export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

/**

- Categories for diagnostic classification
 */
export type DiagnosticCategory =
  | 'syntax'
  | 'semantic'
  | 'performance'
  | 'style'
  | 'security'
  | 'compatibility';

/**

- Position information for diagnostics
 */
export interface DiagnosticPosition {
  /**Line number (1-based)*/
  readonly line: number;

  /** Column number (1-based) */
  readonly column: number;

  /** Length of the diagnostic span */
  readonly length?: number;
}

/**

- Range information for diagnostics spanning multiple positions
 */
export interface DiagnosticRange {
  /**Start position*/
  readonly start: DiagnosticPosition;

  /** End position */
  readonly end: DiagnosticPosition;
}

/**

- Fix suggestion for a diagnostic
 */
export interface DiagnosticFix {
  /**Description of the fix*/
  readonly description: string;

  /** Range to replace */
  readonly range: DiagnosticRange;

  /** New text to insert */
  readonly newText: string;

  /** Whether this fix can be applied automatically */
  readonly isAutomatic: boolean;
}

/**

- Compilation diagnostic message
 */
export interface CompilationDiagnostic {
  /**Unique identifier for this diagnostic*/
  readonly id: string;

  /** Severity level */
  readonly severity: DiagnosticSeverity;

  /** Category of the diagnostic */
  readonly category: DiagnosticCategory;

  /** Diagnostic message */
  readonly message: string;

  /** Error code if applicable */
  readonly code?: ErrorCode;

  /** Source file where diagnostic occurred */
  readonly sourceFile: SafeFilePath;

  /** Position or range in the source file */
  readonly location: DiagnosticPosition | DiagnosticRange;

  /** Optional suggested fixes */
  readonly fixes: readonly DiagnosticFix[];

  /** Related diagnostics */
  readonly related: readonly CompilationDiagnostic[];

  /** Additional context information */
  readonly context: Record<string, unknown>;
}

/**

- Performance metrics for compilation
 */
export interface CompilationMetrics {
  /**Total compilation time in milliseconds*/
  readonly totalTimeMs: number;

  /** Time spent parsing source files */
  readonly parseTimeMs: number;

  /** Time spent in template processing */
  readonly templateTimeMs: number;

  /** Time spent generating output */
  readonly outputTimeMs: number;

  /** Time spent in validation */
  readonly validationTimeMs: number;

  /** Memory usage at peak (bytes) */
  readonly peakMemoryBytes: number;

  /** Number of files processed */
  readonly filesProcessed: number;

  /** Total size of input content (bytes) */
  readonly inputSizeBytes: number;

  /** Total size of output content (bytes) */
  readonly outputSizeBytes: number;

  /** Compression ratio (output/input) */
  readonly compressionRatio: number;
}

/**

- Information about a generated output file
 */
export interface OutputFile {
  /**Path where the file was written*/
  readonly filePath: SafeFilePath;

  /** Generated content */
  readonly content: CompiledContent;

  /** Size of the file in bytes */
  readonly sizeBytes: number;

  /** Checksum of the file content */
  readonly checksum: string;

  /** Timestamp when file was generated */
  readonly generatedAt: Timestamp;

  /** Source files that contributed to this output */
  readonly sourceMappings: readonly SafeFilePath[];

  /** Whether this file is a backup of existing content */
  readonly isBackup: boolean;

  /** MIME type of the generated content */
  readonly mimeType: string;

  /** Additional metadata about the file */
  readonly metadata: Record<string, unknown>;
}

/**

- Provider-specific compilation result
 */
export interface ProviderResult {
  /**Provider type that generated this result*/
  readonly provider: string;

  /** Whether compilation succeeded for this provider */
  readonly success: boolean;

  /** Generated output files for this provider */
  readonly outputFiles: readonly OutputFile[];

  /** Diagnostics specific to this provider */
  readonly diagnostics: readonly CompilationDiagnostic[];

  /** Time taken to process this provider */
  readonly processingTimeMs: number;

  /** Provider-specific metadata */
  readonly metadata: Record<string, unknown>;
}

/**

- Overall compilation result status
 */
export type CompilationResultStatus =
  | 'success' // All providers succeeded
  | 'partial_success' // Some providers succeeded
  | 'failure' // All providers failed
  | 'cancelled'; // Compilation was cancelled

/**

- Complete compilation result
 */
export interface CompilationResult {
  /**Unique identifier for this result*/
  readonly id: CompilationResultId;

  /** ID of the compilation request that generated this result */
  readonly requestId: CompilationRequestId;

  /** Overall status of the compilation */
  readonly status: CompilationResultStatus;

  /** Timestamp when compilation started */
  readonly startedAt: Timestamp;

  /** Timestamp when compilation completed */
  readonly completedAt: Timestamp;

  /** Results for each provider */
  readonly providerResults: readonly ProviderResult[];

  /** All diagnostics from the compilation */
  readonly diagnostics: readonly CompilationDiagnostic[];

  /** Performance metrics */
  readonly metrics: CompilationMetrics;

  /** Errors that occurred during compilation */
  readonly errors: readonly SandboxError[];

  /** All generated output files */
  readonly outputFiles: readonly OutputFile[];

  /** Additional compilation metadata */
  readonly metadata: Record<string, unknown>;
}

/**

- Summary statistics for a compilation result
 */
export interface CompilationSummary {
  /**Total number of source files processed*/
  readonly sourceFileCount: number;

  /** Total number of output files generated */
  readonly outputFileCount: number;

  /** Total number of providers processed */
  readonly providerCount: number;

  /** Number of successful providers */
  readonly successfulProviders: number;

  /** Number of failed providers */
  readonly failedProviders: number;

  /** Total number of diagnostics */
  readonly totalDiagnostics: number;

  /** Number of errors */
  readonly errorCount: number;

  /** Number of warnings */
  readonly warningCount: number;

  /** Number of info messages */
  readonly infoCount: number;

  /** Total compilation time */
  readonly totalTimeMs: number;

  /** Success rate as percentage */
  readonly successRate: number;
}

/**

- Utility functions for working with compilation results
 */
export const CompilationResultUtils = {
  /**
  - Checks if the compilation was completely successful
   */
  isSuccess: (result: CompilationResult): boolean => {
    return result.status === 'success';
  },

  /**

- Checks if the compilation had any success
   */
  hasAnySuccess: (result: CompilationResult): boolean => {
    return result.status === 'success' || result.status === 'partial_success';
  },

  /**

- Checks if the compilation failed completely
   */
  isFailure: (result: CompilationResult): boolean => {
    return result.status === 'failure';
  },

  /**

- Gets all diagnostics of a specific severity
   */
  getDiagnosticsBySeverity: (
    result: CompilationResult,
    severity: DiagnosticSeverity
  ): readonly CompilationDiagnostic[] => {
    return result.diagnostics.filter((d) => d.severity === severity);
  },

  /**

- Gets all errors from the compilation
   */
  getErrors: (result: CompilationResult): readonly CompilationDiagnostic[] => {
    return CompilationResultUtils.getDiagnosticsBySeverity(result, 'error');
  },

  /**

- Gets all warnings from the compilation
   */
  getWarnings: (
    result: CompilationResult
  ): readonly CompilationDiagnostic[] => {
    return CompilationResultUtils.getDiagnosticsBySeverity(result, 'warning');
  },

  /**

- Gets successful provider results
   */
  getSuccessfulProviders: (
    result: CompilationResult
  ): readonly ProviderResult[] => {
    return result.providerResults.filter((p) => p.success);
  },

  /**

- Gets failed provider results
   */
  getFailedProviders: (
    result: CompilationResult
  ): readonly ProviderResult[] => {
    return result.providerResults.filter((p) => !p.success);
  },

  /**

- Calculates total duration of the compilation
   */
  getDurationMs: (result: CompilationResult): number => {
    return result.completedAt - result.startedAt;
  },

  /**

- Gets all output files that are not backups
   */
  getPrimaryOutputFiles: (result: CompilationResult): readonly OutputFile[] => {
    return result.outputFiles.filter((f) => !f.isBackup);
  },

  /**

- Gets all backup files
   */
  getBackupFiles: (result: CompilationResult): readonly OutputFile[] => {
    return result.outputFiles.filter((f) => f.isBackup);
  },

  /**

- Calculates compression ratio across all files
   */
  getOverallCompressionRatio: (result: CompilationResult): number => {
    const { inputSizeBytes, outputSizeBytes } = result.metrics;
    return inputSizeBytes > 0 ? outputSizeBytes / inputSizeBytes : 1;
  },

  /**

- Generates a summary of the compilation result
   */
  getSummary: (result: CompilationResult): CompilationSummary => {
    const diagnostics = result.diagnostics;
    const providerResults = result.providerResults;

    return {
      sourceFileCount: new Set(
        result.outputFiles.flatMap((f) => f.sourceMappings)
      ).size,
      outputFileCount: result.outputFiles.length,
      providerCount: providerResults.length,
      successfulProviders: providerResults.filter((p) => p.success).length,
      failedProviders: providerResults.filter((p) => !p.success).length,
      totalDiagnostics: diagnostics.length,
      errorCount: diagnostics.filter((d) => d.severity === 'error').length,
      warningCount: diagnostics.filter((d) => d.severity === 'warning').length,
      infoCount: diagnostics.filter((d) => d.severity === 'info').length,
      totalTimeMs: CompilationResultUtils.getDurationMs(result),
      successRate:
        providerResults.length > 0
          ? (providerResults.filter((p) => p.success).length /
              providerResults.length) *
            100
          : 0,
    };
  },

  /**

- Checks if the result has any diagnostics that can be auto-fixed
   */
  hasAutoFixableDiagnostics: (result: CompilationResult): boolean => {
    return result.diagnostics.some((d) => d.fixes.some((f) => f.isAutomatic));
  },

  /**

- Gets all auto-fixable diagnostics
   */
  getAutoFixableDiagnostics: (
    result: CompilationResult
  ): readonly CompilationDiagnostic[] => {
    return result.diagnostics.filter((d) => d.fixes.some((f) => f.isAutomatic));
  },

  /**

- Formats the result for human-readable display
   */
  formatSummaryMessage: (result: CompilationResult): string => {
    const summary = CompilationResultUtils.getSummary(result);
    const duration = (summary.totalTimeMs / 1000).toFixed(2);

    if (result.status === 'success') {
      return `✅ Compilation successful in ${duration}s - ${summary.outputFileCount} files generated for ${summary.providerCount} providers`;
    }

    if (result.status === 'partial_success') {
      return `⚠️  Partial success in ${duration}s - ${summary.successfulProviders}/${summary.providerCount} providers succeeded, ${summary.errorCount} errors, ${summary.warningCount} warnings`;
    }

    if (result.status === 'failure') {
      return `❌ Compilation failed in ${duration}s - ${summary.errorCount} errors, ${summary.warningCount} warnings`;
    }

    return `🚫 Compilation cancelled after ${duration}s`;
  },
} as const;

/**

- Builder for creating compilation results
 */
export class CompilationResultBuilder {
  private result: {
    id?: CompilationResultId;
    requestId?: CompilationRequestId;
    startedAt?: Timestamp;
    metrics?: CompilationMetrics;
    metadata?: Record<string, unknown>;
  } = {};
  private providerResults: ProviderResult[] = [];
  private diagnostics: CompilationDiagnostic[] = [];
  private outputFiles: OutputFile[] = [];
  private errors: SandboxError[] = [];

  constructor(id: CompilationResultId, requestId: CompilationRequestId) {
    this.result.id = id;
    this.result.requestId = requestId;
    this.result.startedAt = Date.now() as Timestamp;
  }

  public addProviderResult(providerResult: ProviderResult): this {
    this.providerResults.push(providerResult);
    this.diagnostics.push(...providerResult.diagnostics);
    this.outputFiles.push(...providerResult.outputFiles);
    return this;
  }

  public addDiagnostic(diagnostic: CompilationDiagnostic): this {
    this.diagnostics.push(diagnostic);
    return this;
  }

  public addError(error: SandboxError): this {
    this.errors.push(error);
    return this;
  }

  public addOutputFile(outputFile: OutputFile): this {
    this.outputFiles.push(outputFile);
    return this;
  }

  public setMetrics(metrics: CompilationMetrics): this {
    this.result.metrics = metrics;
    return this;
  }

  public setMetadata(metadata: Record<string, unknown>): this {
    this.result.metadata = metadata;
    return this;
  }

  public build(): CompilationResult {
    const completedAt = Date.now() as Timestamp;

    // Determine overall status
    let status: CompilationResultStatus;
    const successfulProviders = this.providerResults.filter(
      (p) => p.success
    ).length;
    const totalProviders = this.providerResults.length;

    if (successfulProviders === totalProviders && totalProviders > 0) {
      status = 'success';
    } else if (successfulProviders > 0) {
      status = 'partial_success';
    } else {
      status = 'failure';
    }

    // Build default metrics if not provided
    const metrics = this.result.metrics || {
      totalTimeMs: completedAt - (this.result.startedAt as Timestamp),
      parseTimeMs: 0,
      templateTimeMs: 0,
      outputTimeMs: 0,
      validationTimeMs: 0,
      peakMemoryBytes: 0,
      filesProcessed: this.outputFiles.length,
      inputSizeBytes: 0,
      outputSizeBytes: this.outputFiles.reduce(
        (sum, f) => sum + f.sizeBytes,
        0
      ),
      compressionRatio: 1,
    };

    return {
      id: this.result.id!,
      requestId: this.result.requestId!,
      status,
      startedAt: this.result.startedAt!,
      completedAt,
      providerResults: [...this.providerResults],
      diagnostics: [...this.diagnostics],
      metrics,
      errors: [...this.errors],
      outputFiles: [...this.outputFiles],
      metadata: this.result.metadata || {},
    };
  }
}
