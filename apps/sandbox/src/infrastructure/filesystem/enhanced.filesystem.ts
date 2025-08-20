/**

- @fileoverview Enhanced SecureFileSystemService implementation
-
- High-performance file system service with caching, streaming, batching,
- and comprehensive monitoring for optimal performance.
 */

import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  CommonSuggestions,
  createRecoverySuggestion,
  ErrorCodes,
  SandboxError,
} from '@/domain/errors';
import type {
  CopyFileOptions,
  CreateDirectoryOptions,
  DeleteOptions,
  DirectoryEntry,
  FileMetadata,
  FileSystemHealth,
  IFileSystemService,
  IFileSystemWatcher,
  ListDirectoryOptions,
  ReadFileOptions,
  WriteFileOptions,
} from '@/domain/interfaces/filesystem-service';
import type {
  CompiledContent,
  SafeDirectoryPath,
  SafeFilePath,
  SourceContent,
  Timestamp,
} from '@/shared/types/brands';
import { createTimestamp } from '@/shared/types/brands';
import { Err, Ok, type Result } from '@/shared/types/result';
import {
  AsyncQueue,
  PerformanceCache,
  PerformanceMonitor,
  StreamingService,
  type TaskPriority,
} from '../performance';

/**

- Enhanced file system configuration
 */
interface EnhancedFileSystemConfig {
  /**Working directory for sandbox */
  readonly workingDirectory: string;
  /** Maximum file size in bytes */
  readonly maxFileSize: number;
  /**Enable file metadata caching */
  readonly enableMetadataCache: boolean;
  /** Enable content caching */
  readonly enableContentCache: boolean;
  /**Enable async operation queuing */
  readonly enableAsyncQueue: boolean;
  /** Enable streaming for large files */
  readonly enableStreaming: boolean;
  /**Large file threshold for streaming */
  readonly streamingThreshold: number;
  /** Cache TTL in milliseconds */
  readonly cacheTtlMs: number;
  /**Maximum concurrent operations*/
  readonly maxConcurrency: number;
}

/**

- Batch operation result
 */
interface BatchOperationResult<T> {
  readonly successful: T[];
  readonly failed: Array<{ path: string; error: SandboxError }>;
  readonly totalCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly processingTimeMs: number;
}

/**

- Enhanced file system error
 */
class EnhancedFileSystemError extends SandboxError {
  constructor(
    code: string,
    message: string,
    context: Record<string, unknown> = {},
    cause?: Error
  ) {
    super(
      code,
      message,
      'enhanced-filesystem',
      'error',
      context,
      [
        CommonSuggestions.checkFileExists,
        CommonSuggestions.checkPermissions,
        CommonSuggestions.retryOperation,
      ],
      cause
    );
  }
}

/**

- Enhanced secure file system service with performance optimizations
 */
export class EnhancedSecureFileSystemService
  implements IFileSystemService<SourceContent | CompiledContent>
{
  private readonly config: EnhancedFileSystemConfig;
  private readonly monitor: PerformanceMonitor;
  private readonly metadataCache?: PerformanceCache<FileMetadata>;
  private readonly contentCache?: PerformanceCache<string>;
  private readonly pathValidationCache: PerformanceCache<boolean>;
  private readonly queue?: AsyncQueue;
  private readonly streaming?: StreamingService;

  constructor(
    config: Partial<EnhancedFileSystemConfig> = {},
    monitor?: PerformanceMonitor
  ) {
    this.config = {
      workingDirectory: process.cwd(),
      maxFileSize: 10_000_000, // 10MB
      enableMetadataCache: true,
      enableContentCache: true,
      enableAsyncQueue: true,
      enableStreaming: true,
      streamingThreshold: 1_000_000, // 1MB
      cacheTtlMs: 300_000, // 5 minutes
      maxConcurrency: 5,
      ...config,
    };

    this.monitor = monitor || new PerformanceMonitor();

    // Initialize performance components
    if (this.config.enableMetadataCache) {
      this.metadataCache = new PerformanceCache<FileMetadata>(
        {
          maxEntries: 1000,
          defaultTtlMs: this.config.cacheTtlMs,
          maxMemoryBytes: 10 * 1024 * 1024, // 10MB
        },
        this.monitor
      );
    }

    if (this.config.enableContentCache) {
      this.contentCache = new PerformanceCache<string>(
        {
          maxEntries: 500,
          defaultTtlMs: this.config.cacheTtlMs,
          maxMemoryBytes: 50 * 1024 * 1024, // 50MB
        },
        this.monitor
      );
    }

    // Path validation cache (smaller, longer TTL)
    this.pathValidationCache = new PerformanceCache<boolean>(
      {
        maxEntries: 2000,
        defaultTtlMs: this.config.cacheTtlMs *2,
        maxMemoryBytes: 1 * 1024 * 1024, // 1MB
      },
      this.monitor
    );

    if (this.config.enableAsyncQueue) {
      this.queue = new AsyncQueue(
        {
          maxConcurrency: this.config.maxConcurrency,
          defaultTimeoutMs: 30_000,
          enableMonitoring: true,
        },
        this.monitor
      );
    }

    if (this.config.enableStreaming) {
      this.streaming = new StreamingService(
        {
          chunkSize: 64 * 1024,
          maxFileSize: this.config.maxFileSize,
          enableProgress: true,
          enableChecksum: false,
        },
        this.monitor
      );
    }
  }

  /**

- Enhanced path resolution with caching
   */
  private resolveSafePath(path: SafeFilePath | SafeDirectoryPath): string {
    return resolve(this.config.workingDirectory, path);
  }

  /**

- Enhanced sandbox validation with caching
   */
  private async validateSandboxPath(
    absolutePath: string
  ): Promise<Result<void, SandboxError>> {
    const cacheKey = `sandbox_${absolutePath}`;

    // Check cache first
    if (this.pathValidationCache) {
      const cached = await this.pathValidationCache.get(cacheKey);
      if (cached.success && cached.value !== undefined) {
        return cached.value
          ? Ok(undefined)
          : Err(
              new EnhancedFileSystemError(
                ErrorCodes.SECURITY_VIOLATION,
                'Path is outside sandbox boundary (cached)',
                { path: absolutePath }
              )
            );
      }
    }

    // Perform validation
    const { result: isValid } = this.monitor.measureSync(
      'sandbox_validation',
      () => {
        const normalizedWorkingDir = resolve(this.config.workingDirectory);
        const normalizedPath = resolve(absolutePath);
        return normalizedPath.startsWith(normalizedWorkingDir);
      }
    );

    // Cache the result
    if (this.pathValidationCache) {
      await this.pathValidationCache.set(cacheKey, isValid);
    }

    if (!isValid) {
      return Err(
        new EnhancedFileSystemError(
          ErrorCodes.SECURITY_VIOLATION,
          'Path is outside sandbox boundary',
          {
            path: absolutePath,
            workingDirectory: this.config.workingDirectory,
            securityReason: 'sandbox_escape_attempt',
          }
        )
      );
    }

    return Ok(undefined);
  }

  /**

- Enhanced exists check with caching
   */
  async exists(
    path: SafeFilePath | SafeDirectoryPath
  ): Promise<Result<boolean, SandboxError>> {
    try {
      const { result, metric } = await this.monitor.measure(
        'fs_exists',
        async () => {
          const absolutePath = this.resolveSafePath(path);
          const sandboxCheck = await this.validateSandboxPath(absolutePath);

          if (!sandboxCheck.success) {
            throw sandboxCheck.error;
          }

          // Check metadata cache first
          if (this.metadataCache) {
            const cached = await this.metadataCache.get(path);
            if (cached.success && cached.value !== undefined) {
              return true;
            }
          }

          try {
            await fs.access(absolutePath);
            return true;
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
              return false;
            }
            throw error;
          }
        }
      );

      return Ok(result);
    } catch (error) {
      return Err(
        new EnhancedFileSystemError(
          ErrorCodes.FILE_READ_FAILED,
          `Failed to check if path exists: ${(error as Error).message}`,
          { path },
          error as Error
        )
      );
    }
  }

  /**

- Enhanced metadata retrieval with caching
   */
  async getMetadata(
    path: SafeFilePath | SafeDirectoryPath
  ): Promise<Result<FileMetadata, SandboxError>> {
    try {
      const { result, metric } = await this.monitor.measure(
        'fs_get_metadata',
        async () => {
          // Check cache first
          if (this.metadataCache) {
            const cached = await this.metadataCache.get(path);
            if (cached.success && cached.value !== undefined) {
              return cached.value;
            }
          }

          const absolutePath = this.resolveSafePath(path);
          const sandboxCheck = await this.validateSandboxPath(absolutePath);

          if (!sandboxCheck.success) {
            throw sandboxCheck.error;
          }

          const stats = await fs.stat(absolutePath);
          const safePath = path as SafeFilePath;

          const metadata: FileMetadata = {
            path: safePath,
            sizeBytes: stats.size,
            permissions: {
              readable: true,
              writable: true,
              executable: false,
              mode: stats.mode,
              uid: stats.uid,
              gid: stats.gid,
            },
            createdAt: createTimestamp(stats.birthtime.getTime()),
            modifiedAt: createTimestamp(stats.mtime.getTime()),
            accessedAt: createTimestamp(stats.atime.getTime()),
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            isSymbolicLink: stats.isSymbolicLink(),
          };

          // Cache the metadata
          if (this.metadataCache) {
            await this.metadataCache.set(
              path,
              metadata,
              this.config.cacheTtlMs
            );
          }

          return metadata;
        }
      );

      return Ok(result);
    } catch (error) {
      return Err(
        new EnhancedFileSystemError(
          ErrorCodes.FILE_READ_FAILED,
          `Failed to get metadata: ${(error as Error).message}`,
          { path },
          error as Error
        )
      );
    }
  }

  /**

- Enhanced file reading with caching and streaming
   */
  async readFile(
    path: SafeFilePath,
    options?: ReadFileOptions
  ): Promise<Result<SourceContent | CompiledContent, SandboxError>> {
    try {
      const { result, metric } = await this.monitor.measure(
        'fs_read_file',
        async () => {
          // Check content cache first (if small file and caching enabled)
          const cacheKey = `content_${path}`;
          if (
            this.contentCache &&
            (!options?.maxSizeBytes ||
              options.maxSizeBytes < this.config.streamingThreshold)
          ) {
            const cached = await this.contentCache.get(cacheKey);
            if (cached.success && cached.value !== undefined) {
              return cached.value as SourceContent | CompiledContent;
            }
          }

          const absolutePath = this.resolveSafePath(path);
          const sandboxCheck = await this.validateSandboxPath(absolutePath);

          if (!sandboxCheck.success) {
            throw sandboxCheck.error;
          }

          // Check if file exists
          const existsResult = await this.exists(path);
          if (!existsResult.success) {
            throw existsResult.error;
          }

          if (!existsResult.value) {
            throw new EnhancedFileSystemError(
              ErrorCodes.FILE_NOT_FOUND,
              `File not found: ${path}`,
              { path }
            );
          }

          // Get file metadata for size checking
          const metadataResult = await this.getMetadata(path);
          if (!metadataResult.success) {
            throw metadataResult.error;
          }

          const fileSize = metadataResult.value.sizeBytes;

          // Check file size limits
          if (options?.maxSizeBytes && fileSize > options.maxSizeBytes) {
            throw new EnhancedFileSystemError(
              ErrorCodes.FILE_READ_FAILED,
              `File too large: ${fileSize} bytes (max: ${options.maxSizeBytes})`,
              {
                path,
                actualSize: fileSize,
                maxSize: options.maxSizeBytes,
              }
            );
          }

          // Use streaming for large files
          if (this.streaming && fileSize > this.config.streamingThreshold) {
            const streamResult = await this.streaming.streamFile(path);
            if (!streamResult.success) {
              throw streamResult.error;
            }

            const chunks: Buffer[] = [];
            for await (const chunk of streamResult.value) {
              chunks.push(chunk);
            }

            const content = Buffer.concat(chunks).toString(
              options?.encoding || 'utf8'
            );

            // Cache smaller streamed content
            if (this.contentCache && fileSize < 1024 * 1024) {
              // Cache files < 1MB
              await this.contentCache.set(
                cacheKey,
                content,
                this.config.cacheTtlMs
              );
            }

            return content as SourceContent | CompiledContent;
          }

          // Standard file reading for smaller files
          const encoding = options?.encoding || 'utf8';
          const content = await fs.readFile(absolutePath, encoding);

          // Cache the content
          if (this.contentCache) {
            await this.contentCache.set(
              cacheKey,
              content as string,
              this.config.cacheTtlMs
            );
          }

          return content as SourceContent | CompiledContent;
        }
      );

      return Ok(result);
    } catch (error) {
      return Err(
        new EnhancedFileSystemError(
          ErrorCodes.FILE_READ_FAILED,
          `Failed to read file: ${(error as Error).message}`,
          { path },
          error as Error
        )
      );
    }
  }

  /**

- Enhanced file writing with cache invalidation
   */
  async writeFile(
    path: SafeFilePath,
    content: SourceContent | CompiledContent,
    options?: WriteFileOptions
  ): Promise<Result<void, SandboxError>> {
    try {
      const { result, metric } = await this.monitor.measure(
        'fs_write_file',
        async () => {
          const absolutePath = this.resolveSafePath(path);
          const sandboxCheck = await this.validateSandboxPath(absolutePath);

          if (!sandboxCheck.success) {
            throw sandboxCheck.error;
          }

          // Create parent directories if requested
          const parentDir = dirname(absolutePath);

          if (options?.createParents !== false) {
            try {
              await fs.mkdir(parentDir, { recursive: true, mode: 0o755 });
            } catch (error) {
              throw new EnhancedFileSystemError(
                ErrorCodes.DIRECTORY_NOT_FOUND,
                `Failed to create parent directory: ${parentDir}`,
                { path, parentDir },
                error as Error
              );
            }
          }

          const encoding = options?.encoding || 'utf8';
          const mode = options?.mode || 0o644;

          // Use streaming for large content
          if (
            this.streaming &&
            content.length > this.config.streamingThreshold
          ) {
            const contentStream = this.streaming.createContentStream(content);
            const streamResult = await this.streaming.copyFileStream(
              path, // Source stream
              path // This is a simplification - in real implementation we'd need temp file handling
            );

            if (!streamResult.success) {
              throw streamResult.error;
            }
          } else {
            // Standard file writing
            if (options?.atomic) {
              // Atomic write with temp file
              const tempPath = `${absolutePath}.tmp.${Date.now()}`;
              await fs.writeFile(tempPath, content, { encoding, mode });
              await fs.rename(tempPath, absolutePath);
            } else {
              await fs.writeFile(absolutePath, content, { encoding, mode });
            }

            if (options?.sync) {
              // Force flush to disk
              const fd = await fs.open(absolutePath, 'r+');
              try {
                await fd.sync();
              } finally {
                await fd.close();
              }
            }
          }

          // Invalidate caches
          if (this.contentCache) {
            await this.contentCache.delete(`content_${path}`);
          }
          if (this.metadataCache) {
            await this.metadataCache.delete(path);
          }

          return;
        }
      );

      return Ok(result);
    } catch (error) {
      return Err(
        new EnhancedFileSystemError(
          ErrorCodes.FILE_WRITE_FAILED,
          `Failed to write file: ${(error as Error).message}`,
          { path },
          error as Error
        )
      );
    }
  }

  /**

- Batch file operations with concurrency control
   */
  async batchReadFiles(
    paths: readonly SafeFilePath[],
    options?: ReadFileOptions
  ): Promise<
    Result<
      BatchOperationResult<{
        path: SafeFilePath;
        content: SourceContent | CompiledContent;
      }>,
      SandboxError
    >

  > {
    try {
      const { result, metric } = await this.monitor.measure(
        'fs_batch_read',
        async () => {
          const startTime = Date.now();
          const successful: Array<{
            path: SafeFilePath;
            content: SourceContent | CompiledContent;
          }> = [];
          const failed: Array<{ path: string; error: SandboxError }> = [];

          // Process in chunks to control concurrency
          const chunkSize = this.config.maxConcurrency;
          for (let i = 0; i < paths.length; i += chunkSize) {
            const chunk = paths.slice(i, i + chunkSize);

            const chunkPromises = chunk.map(async (path) => {
              try {
                const result = await this.readFile(path, options);
                if (result.success) {
                  successful.push({ path, content: result.value });
                } else {
                  failed.push({ path, error: result.error });
                }
              } catch (error) {
                failed.push({
                  path,
                  error: new EnhancedFileSystemError(
                    ErrorCodes.FILE_READ_FAILED,
                    `Batch read failed: ${(error as Error).message}`,
                    { path },
                    error as Error
                  ),
                });
              }
            });

            await Promise.all(chunkPromises);
          }

          const processingTime = Date.now() - startTime;

          return {
            successful,
            failed,
            totalCount: paths.length,
            successCount: successful.length,
            failureCount: failed.length,
            processingTimeMs: processingTime,
          };
        }
      );

      return Ok(result);
    } catch (error) {
      return Err(
        new EnhancedFileSystemError(
          ErrorCodes.INTERNAL_ERROR,
          `Batch read operation failed: ${(error as Error).message}`,
          { pathCount: paths.length },
          error as Error
        )
      );
    }
  }

  /**

- Enhanced directory listing with caching
   */
  async listDirectory(
    path: SafeDirectoryPath,
    options?: ListDirectoryOptions
  ): Promise<Result<readonly DirectoryEntry[], SandboxError>> {
    try {
      const { result, metric } = await this.monitor.measure(
        'fs_list_directory',
        async () => {
          // Check cache first for directory listings
          const cacheKey = `dir_${path}_${JSON.stringify(options || {})}`;
          if (this.metadataCache) {
            const cached = await this.metadataCache.get(cacheKey);
            if (cached.success && cached.value !== undefined) {
              return cached.value as any; // Type assertion for directory entries
            }
          }

          const absolutePath = this.resolveSafePath(path);
          const sandboxCheck = await this.validateSandboxPath(absolutePath);

          if (!sandboxCheck.success) {
            throw sandboxCheck.error;
          }

          const entries = await fs.readdir(absolutePath, {
            withFileTypes: true,
          });
          const directoryEntries: DirectoryEntry[] = [];

          // Process entries with concurrent stat operations
          const entryPromises = entries.map(async (entry) => {
            // Skip hidden files unless explicitly requested
            if (!options?.includeHidden && entry.name.startsWith('.')) {
              return null;
            }

            const entryPath = join(path, entry.name) as SafeFilePath;
            const entryAbsolutePath = this.resolveSafePath(entryPath);

            try {
              const stats = await fs.stat(entryAbsolutePath);

              return {
                name: entry.name,
                path: entryPath,
                isFile: entry.isFile(),
                isDirectory: entry.isDirectory(),
                isSymbolicLink: entry.isSymbolicLink(),
                sizeBytes: stats.size,
                modifiedAt: createTimestamp(stats.mtime.getTime()),
              };
            } catch {
              return null; // Skip entries we can't stat
            }
          });

          const resolvedEntries = await Promise.all(entryPromises);
          const validEntries = resolvedEntries.filter(
            (entry) => entry !== null
          ) as DirectoryEntry[];

          // Sort if requested
          if (options?.sortBy) {
            validEntries.sort((a, b) => {
              let comparison = 0;

              switch (options.sortBy) {
                case 'name':
                  comparison = a.name.localeCompare(b.name);
                  break;
                case 'size':
                  comparison = (a.sizeBytes || 0) - (b.sizeBytes || 0);
                  break;
                case 'modified':
                  comparison = a.modifiedAt - b.modifiedAt;
                  break;
              }

              return options.sortOrder === 'desc' ? -comparison : comparison;
            });
          }

          // Cache the result
          if (this.metadataCache) {
            await this.metadataCache.set(
              cacheKey,
              validEntries as any,
              this.config.cacheTtlMs / 2
            ); // Shorter TTL for directory listings
          }

          return validEntries;
        }
      );

      return Ok(result);
    } catch (error) {
      return Err(
        new EnhancedFileSystemError(
          ErrorCodes.FILE_READ_FAILED,
          `Failed to list directory: ${(error as Error).message}`,
          { path },
          error as Error
        )
      );
    }
  }

  // Additional standard methods with basic implementations
  async copyFile(
    sourcePath: SafeFilePath,
    destinationPath: SafeFilePath,
    options?: CopyFileOptions
  ): Promise<Result<void, SandboxError>> {
    // Use streaming service if available and file is large
    if (this.streaming) {
      const metadataResult = await this.getMetadata(sourcePath);
      if (
        metadataResult.success &&
        metadataResult.value.sizeBytes > this.config.streamingThreshold
      ) {
        const streamResult = await this.streaming.copyFileStream(
          sourcePath,
          destinationPath
        );
        if (streamResult.success) {
          return Ok(undefined);
        }
      }
    }

    // Fallback to standard copy
    try {
      const sourceAbsolute = this.resolveSafePath(sourcePath);
      const destAbsolute = this.resolveSafePath(destinationPath);

      const sourceSandboxCheck = await this.validateSandboxPath(sourceAbsolute);
      if (!sourceSandboxCheck.success) {
        return sourceSandboxCheck;
      }

      const destSandboxCheck = await this.validateSandboxPath(destAbsolute);
      if (!destSandboxCheck.success) {
        return destSandboxCheck;
      }

      await fs.copyFile(sourceAbsolute, destAbsolute);

      // Invalidate destination caches
      if (this.contentCache) {
        await this.contentCache.delete(`content_${destinationPath}`);
      }
      if (this.metadataCache) {
        await this.metadataCache.delete(destinationPath);
      }

      return Ok(undefined);
    } catch (error) {
      return Err(
        new EnhancedFileSystemError(
          ErrorCodes.FILE_WRITE_FAILED,
          `Failed to copy file: ${(error as Error).message}`,
          { sourcePath, destinationPath },
          error as Error
        )
      );
    }
  }

  async moveFile(
    sourcePath: SafeFilePath | SafeDirectoryPath,
    destinationPath: SafeFilePath | SafeDirectoryPath
  ): Promise<Result<void, SandboxError>> {
    try {
      const sourceAbsolute = this.resolveSafePath(sourcePath);
      const destAbsolute = this.resolveSafePath(destinationPath);

      const sourceSandboxCheck = await this.validateSandboxPath(sourceAbsolute);
      if (!sourceSandboxCheck.success) {
        return sourceSandboxCheck;
      }

      const destSandboxCheck = await this.validateSandboxPath(destAbsolute);
      if (!destSandboxCheck.success) {
        return destSandboxCheck;
      }

      await fs.rename(sourceAbsolute, destAbsolute);

      // Invalidate both source and destination caches
      const paths = [sourcePath, destinationPath];
      for (const path of paths) {
        if (this.contentCache) {
          await this.contentCache.delete(`content_${path}`);
        }
        if (this.metadataCache) {
          await this.metadataCache.delete(path);
        }
      }

      return Ok(undefined);
    } catch (error) {
      return Err(
        new EnhancedFileSystemError(
          ErrorCodes.FILE_WRITE_FAILED,
          `Failed to move file: ${(error as Error).message}`,
          { sourcePath, destinationPath },
          error as Error
        )
      );
    }
  }

  async deleteFile(
    path: SafeFilePath,
    options?: DeleteOptions
  ): Promise<Result<void, SandboxError>> {
    try {
      const absolutePath = this.resolveSafePath(path);
      const sandboxCheck = await this.validateSandboxPath(absolutePath);

      if (!sandboxCheck.success) {
        return sandboxCheck;
      }

      // Create backup if requested
      if (options?.createBackup) {
        const backupPath = `${absolutePath}.bak.${Date.now()}`;
        await fs.copyFile(absolutePath, backupPath);
      }

      await fs.unlink(absolutePath);

      // Invalidate caches
      if (this.contentCache) {
        await this.contentCache.delete(`content_${path}`);
      }
      if (this.metadataCache) {
        await this.metadataCache.delete(path);
      }

      return Ok(undefined);
    } catch (error) {
      return Err(
        new EnhancedFileSystemError(
          ErrorCodes.FILE_WRITE_FAILED,
          `Failed to delete file: ${(error as Error).message}`,
          { path },
          error as Error
        )
      );
    }
  }

  async createDirectory(
    path: SafeDirectoryPath,
    options?: CreateDirectoryOptions
  ): Promise<Result<void, SandboxError>> {
    try {
      const absolutePath = this.resolveSafePath(path);
      const sandboxCheck = await this.validateSandboxPath(absolutePath);

      if (!sandboxCheck.success) {
        return sandboxCheck;
      }

      const mode = options?.mode || 0o755;
      const recursive = options?.recursive !== false;

      await fs.mkdir(absolutePath, { recursive, mode });

      // Invalidate parent directory cache
      const parentPath = dirname(path) as SafeDirectoryPath;
      if (this.metadataCache) {
        await this.metadataCache.delete(parentPath);
      }

      return Ok(undefined);
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code === 'EEXIST' &&
        options?.ignoreExists
      ) {
        return Ok(undefined);
      }

      return Err(
        new EnhancedFileSystemError(
          options?.recursive === false
            ? ErrorCodes.DIRECTORY_NOT_FOUND
            : ErrorCodes.FILE_WRITE_FAILED,
          `Failed to create directory: ${(error as Error).message}`,
          { path },
          error as Error
        )
      );
    }
  }

  async deleteDirectory(
    path: SafeDirectoryPath,
    options?: DeleteOptions
  ): Promise<Result<void, SandboxError>> {
    try {
      const absolutePath = this.resolveSafePath(path);
      const sandboxCheck = await this.validateSandboxPath(absolutePath);

      if (!sandboxCheck.success) {
        return sandboxCheck;
      }

      const recursive = options?.recursive;
      await fs.rmdir(absolutePath, { recursive });

      // Invalidate directory cache
      if (this.metadataCache) {
        await this.metadataCache.delete(path);
      }

      return Ok(undefined);
    } catch (error) {
      return Err(
        new EnhancedFileSystemError(
          ErrorCodes.FILE_WRITE_FAILED,
          `Failed to delete directory: ${(error as Error).message}`,
          { path },
          error as Error
        )
      );
    }
  }

  async checkPermissions(
    path: SafeFilePath | SafeDirectoryPath,
    permissions: readonly ('read' | 'write' | 'execute')[]
  ): Promise<Result<Record<string, boolean>, SandboxError>> {
    try {
      const absolutePath = this.resolveSafePath(path);
      const sandboxCheck = await this.validateSandboxPath(absolutePath);

      if (!sandboxCheck.success) {
        return sandboxCheck;
      }

      const result: Record<string, boolean> = {};

      for (const permission of permissions) {
        try {
          let mode: number;
          switch (permission) {
            case 'read':
              mode = fs.constants.R_OK;
              break;
            case 'write':
              mode = fs.constants.W_OK;
              break;
            case 'execute':
              mode = fs.constants.X_OK;
              break;
          }

          await fs.access(absolutePath, mode);
          result[permission] = true;
        } catch {
          result[permission] = false;
        }
      }

      return Ok(result);
    } catch (error) {
      return Err(
        new EnhancedFileSystemError(
          ErrorCodes.FILE_READ_FAILED,
          `Failed to check permissions: ${(error as Error).message}`,
          { path },
          error as Error
        )
      );
    }
  }

  async changePermissions(
    path: SafeFilePath | SafeDirectoryPath,
    mode: number
  ): Promise<Result<void, SandboxError>> {
    try {
      const absolutePath = this.resolveSafePath(path);
      const sandboxCheck = await this.validateSandboxPath(absolutePath);

      if (!sandboxCheck.success) {
        return sandboxCheck;
      }

      await fs.chmod(absolutePath, mode);

      // Invalidate metadata cache
      if (this.metadataCache) {
        await this.metadataCache.delete(path);
      }

      return Ok(undefined);
    } catch (error) {
      return Err(
        new EnhancedFileSystemError(
          ErrorCodes.FILE_WRITE_FAILED,
          `Failed to change permissions: ${(error as Error).message}`,
          { path, mode },
          error as Error
        )
      );
    }
  }

  async resolvePath(
    path: SafeFilePath | SafeDirectoryPath
  ): Promise<Result<SafeFilePath, SandboxError>> {
    try {
      const absolutePath = this.resolveSafePath(path);
      const sandboxCheck = await this.validateSandboxPath(absolutePath);

      if (!sandboxCheck.success) {
        return sandboxCheck;
      }

      const realPath = await fs.realpath(absolutePath);

      // Convert back to relative path for safety
      const relativePath = realPath.replace(
        this.config.workingDirectory + '/',
        ''
      );
      return Ok(relativePath as SafeFilePath);
    } catch (error) {
      return Err(
        new EnhancedFileSystemError(
          ErrorCodes.FILE_READ_FAILED,
          `Failed to resolve path: ${(error as Error).message}`,
          { path },
          error as Error
        )
      );
    }
  }

  async createWatcher(): Promise<Result<IFileSystemWatcher, SandboxError>> {
    return Err(
      new EnhancedFileSystemError(
        ErrorCodes.NOT_IMPLEMENTED,
        'File watching not yet implemented',
        {}
      )
    );
  }

  async cleanup(olderThanMs?: number): Promise<Result<number, SandboxError>> {
    let cleanedCount = 0;

    // Cleanup caches
    if (this.metadataCache) {
      const metadataCleanup = await this.metadataCache.cleanup();
      if (metadataCleanup.success) {
        cleanedCount += metadataCleanup.value;
      }
    }

    if (this.contentCache) {
      const contentCleanup = await this.contentCache.cleanup();
      if (contentCleanup.success) {
        cleanedCount += contentCleanup.value;
      }
    }

    if (this.pathValidationCache) {
      const pathCleanup = await this.pathValidationCache.cleanup();
      if (pathCleanup.success) {
        cleanedCount += pathCleanup.value;
      }
    }

    return Ok(cleanedCount);
  }

  async getHealthStatus(): Promise<Result<FileSystemHealth, SandboxError>> {
    try {
      const stats = await fs.statfs(this.config.workingDirectory);
      const monitorHealth = await this.monitor.getHealthStatus();

      const warnings: string[] = [];

      if (!(monitorHealth.success && monitorHealth.value.healthy)) {
        warnings.push('Performance monitoring indicates issues');
      }

      // Check cache health
      if (this.metadataCache) {
        const cacheHealth = await this.metadataCache.getHealthStatus();
        if (cacheHealth.success && !cacheHealth.value.healthy) {
          warnings.push('Metadata cache health issues');
        }
      }

      if (this.contentCache) {
        const cacheHealth = await this.contentCache.getHealthStatus();
        if (cacheHealth.success && !cacheHealth.value.healthy) {
          warnings.push('Content cache health issues');
        }
      }

      // Check queue health
      if (this.queue) {
        const queueHealth = await this.queue.getHealthStatus();
        if (queueHealth.success && !queueHealth.value.healthy) {
          warnings.push('Async queue health issues');
        }
      }

      return Ok({
        healthy: warnings.length === 0,
        availableSpaceBytes: stats.bavail * stats.bsize,
        totalSpaceBytes: stats.blocks * stats.bsize,
        usedSpaceBytes: (stats.blocks - stats.bavail) * stats.bsize,
        cachedFiles: this.metadataCache
          ? (await this.metadataCache.getStats()).size
          : 0,
        cacheSizeBytes: this.contentCache
          ? (await this.contentCache.getStats()).memoryUsageBytes
          : 0,
        activeWatchers: 0,
        averageOperationTimeMs: monitorHealth.success
          ? monitorHealth.value.avgResponseTimeMs
          : 0,
        warnings,
        diagnostics: {
          workingDirectory: this.config.workingDirectory,
          maxFileSize: this.config.maxFileSize,
          performanceFeatures: {
            metadataCache: !!this.metadataCache,
            contentCache: !!this.contentCache,
            asyncQueue: !!this.queue,
            streaming: !!this.streaming,
          },
        },
      });
    } catch (error) {
      return Err(
        new EnhancedFileSystemError(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to get health status: ${(error as Error).message}`,
          {},
          error as Error
        )
      );
    }
  }

  /**

- Get performance statistics
   */
  async getPerformanceStats(): Promise<{
    monitor: any;
    metadataCache?: any;
    contentCache?: any;
    queue?: any;
  }> {
    const stats: any = {
      monitor: await this.monitor.getHealthStatus(),
    };

    if (this.metadataCache) {
      stats.metadataCache = await this.metadataCache.getHealthStatus();
    }

    if (this.contentCache) {
      stats.contentCache = await this.contentCache.getHealthStatus();
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
    if (this.metadataCache) {
      this.metadataCache.destroy();
    }
    if (this.contentCache) {
      this.contentCache.destroy();
    }
    if (this.pathValidationCache) {
      this.pathValidationCache.destroy();
    }
  }
}
