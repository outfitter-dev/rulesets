/**

- @fileoverview Output file domain model
-
- Represents generated file information with metadata and source mappings
 */

import type {
  CompiledContent,
  ProviderType,
  SafeFilePath,
  Timestamp,
} from '@/shared/types/brands';

/**

- File generation status
 */
export type OutputFileStatus = 'generated' | 'skipped' | 'failed' | 'backup';

/**

- Source mapping information
 */
export interface SourceMapping {
  /**Original source file path*/
  readonly sourcePath: SafeFilePath;

  /** Line number in source file (1-based) */
  readonly sourceLine: number;

  /** Column number in source file (1-based) */
  readonly sourceColumn: number;

  /** Line number in generated file (1-based) */
  readonly generatedLine: number;

  /** Column number in generated file (1-based) */
  readonly generatedColumn: number;

  /** Length of the mapped segment */
  readonly length?: number;

  /** Name of the original symbol */
  readonly name?: string;
}

/**

- Generated output file information
 */
export interface OutputFile {
  /**Unique identifier for this output file*/
  readonly id: string;

  /** Path where the file was written */
  readonly filePath: SafeFilePath;

  /** Generated content */
  readonly content: CompiledContent;

  /** File generation status */
  readonly status: OutputFileStatus;

  /** Provider that generated this file */
  readonly provider: ProviderType;

  /** File size in bytes */
  readonly sizeBytes: number;

  /** Content checksum (SHA-256) */
  readonly checksum: string;

  /** MIME type of the generated content */
  readonly mimeType: string;

  /** File encoding */
  readonly encoding: string;

  /** Timestamp when file was generated */
  readonly generatedAt: Timestamp;

  /** Source files that contributed to this output */
  readonly sourcePaths: readonly SafeFilePath[];

  /** Detailed source mappings for debugging */
  readonly sourceMappings: readonly SourceMapping[];

  /** Whether this file overwrote an existing file */
  readonly overwroteExisting: boolean;

  /** Path to backup file if one was created */
  readonly backupPath?: SafeFilePath;

  /** File permissions set on the generated file */
  readonly permissions: number;

  /** Additional metadata about the file */
  readonly metadata: Record<string, unknown>;
}

/**

- Utility functions for working with output files
 */
export const OutputFileUtils = {
  /**
  - Checks if an output file was successfully generated
   */
  isGenerated: (file: OutputFile): boolean => {
    return file.status === 'generated';
  },

  /**

- Checks if an output file is a backup
   */
  isBackup: (file: OutputFile): boolean => {
    return file.status === 'backup';
  },

  /**

- Gets the file extension from output file path
   */
  getExtension: (file: OutputFile): string => {
    const match = file.filePath.match(/\.([^.]+)$/);
    return match?.[1] ?? '';
  },

  /**

- Calculates compression ratio relative to source content
   */
  getCompressionRatio: (
    file: OutputFile,
    originalSizeBytes: number
  ): number => {
    return originalSizeBytes > 0 ? file.sizeBytes / originalSizeBytes : 1;
  },

  /**

- Formats file size in human-readable format
   */
  formatFileSize: (sizeBytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = sizeBytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  },

  /**

- Gets source mappings for a specific line in the generated file
   */
  getMappingsForLine: (
    file: OutputFile,
    lineNumber: number
  ): readonly SourceMapping[] => {
    return file.sourceMappings.filter(
      (mapping) => mapping.generatedLine === lineNumber
    );
  },

  /**

- Gets all unique source files that contributed to this output
   */
  getUniqueSources: (file: OutputFile): readonly SafeFilePath[] => {
    const uniquePaths = new Set(file.sourcePaths);
    return Array.from(uniquePaths);
  },

  /**

- Validates that the file checksum matches the content
   */
  validateChecksum: async (file: OutputFile): Promise<boolean> => {
    try {
      // In a real implementation, this would compute the actual checksum
      // and compare it to file.checksum
      const encoder = new TextEncoder();
      const data = encoder.encode(file.content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      return hashHex === file.checksum;
    } catch {
      return false;
    }
  },

  /**

- Creates a summary of output file generation
   */
  createSummary: (files: readonly OutputFile[]): OutputFileSummary => {
    const generated = files.filter((f) => f.status === 'generated');
    const skipped = files.filter((f) => f.status === 'skipped');
    const failed = files.filter((f) => f.status === 'failed');
    const backups = files.filter((f) => f.status === 'backup');

    const totalSize = files.reduce((sum, f) => sum + f.sizeBytes, 0);
    const uniqueProviders = new Set(files.map((f) => f.provider));
    const uniqueSources = new Set(files.flatMap((f) => f.sourcePaths));

    return {
      totalFiles: files.length,
      generatedFiles: generated.length,
      skippedFiles: skipped.length,
      failedFiles: failed.length,
      backupFiles: backups.length,
      totalSizeBytes: totalSize,
      providersUsed: uniqueProviders.size,
      sourcesProcessed: uniqueSources.size,
      averageFileSizeBytes: files.length > 0 ? totalSize / files.length : 0,
    };
  },
} as const;

/**

- Summary of output file generation
 */
export interface OutputFileSummary {
  /**Total number of output files*/
  readonly totalFiles: number;

  /** Number of successfully generated files */
  readonly generatedFiles: number;

  /** Number of skipped files */
  readonly skippedFiles: number;

  /** Number of failed files */
  readonly failedFiles: number;

  /** Number of backup files created */
  readonly backupFiles: number;

  /** Total size of all files in bytes */
  readonly totalSizeBytes: number;

  /** Number of unique providers used */
  readonly providersUsed: number;

  /** Number of unique source files processed */
  readonly sourcesProcessed: number;

  /** Average file size in bytes */
  readonly averageFileSizeBytes: number;
}
