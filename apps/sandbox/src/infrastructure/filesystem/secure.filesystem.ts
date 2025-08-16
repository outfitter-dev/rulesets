/**

- @fileoverview SecureFileSystemService implementation
-
- Provides secure file operations with comprehensive validation,
- permission checking, and sandboxed access patterns.
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

/**

- File system error for specific file system operations
 */
class FileSystemError extends SandboxError {
  constructor(
    code: string,
    message: string,
    context: Record<string, unknown> = {},
    cause?: Error
  ) {
    super(
      code,
      message,
      'filesystem',
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

- Secure file system service implementation
 */
export class SecureFileSystemService
  implements IFileSystemService<SourceContent | CompiledContent>
{
  private readonly workingDirectory: string;
  private readonly maxFileSize: number;

  constructor(workingDirectory = process.cwd(), maxFileSize = 10_000_000) {
    this.workingDirectory = workingDirectory;
    this.maxFileSize = maxFileSize;
  }

  /**

- Resolves a safe path to absolute path within working directory
   */
  private resolveSafePath(path: SafeFilePath | SafeDirectoryPath): string {
    return resolve(this.workingDirectory, path);
  }

  /**

- Validates that a path is within the working directory (sandbox)
   */
  private validateSandboxPath(
    absolutePath: string
  ): Result<void, SandboxError> {
    const normalizedWorkingDir = resolve(this.workingDirectory);
    const normalizedPath = resolve(absolutePath);

    if (!normalizedPath.startsWith(normalizedWorkingDir)) {
      return Err(
        new FileSystemError(
          ErrorCodes.SECURITY_VIOLATION,
          'Path is outside sandbox boundary',
          {
            path: absolutePath,
            workingDirectory: this.workingDirectory,
            securityReason: 'sandbox_escape_attempt',
          }
        )
      );
    }

    return Ok(undefined);
  }

  async exists(
    path: SafeFilePath | SafeDirectoryPath
  ): Promise<Result<boolean, SandboxError>> {
    try {
      const absolutePath = this.resolveSafePath(path);
      const sandboxCheck = this.validateSandboxPath(absolutePath);

      if (!sandboxCheck.success) {
        return sandboxCheck;
      }

      await fs.access(absolutePath);
      return Ok(true);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return Ok(false);
      }

      return Err(
        new FileSystemError(
          ErrorCodes.FILE_READ_FAILED,
          `Failed to check if path exists: ${(error as Error).message}`,
          { path },
          error as Error
        )
      );
    }
  }

  async getMetadata(
    path: SafeFilePath | SafeDirectoryPath
  ): Promise<Result<FileMetadata, SandboxError>> {
    try {
      const absolutePath = this.resolveSafePath(path);
      const sandboxCheck = this.validateSandboxPath(absolutePath);

      if (!sandboxCheck.success) {
        return sandboxCheck;
      }

      const stats = await fs.stat(absolutePath);
      const safePath = path as SafeFilePath; // Safe because we validated it

      return Ok({
        path: safePath,
        sizeBytes: stats.size,
        permissions: {
          readable: true, // Simplified for now
          writable: true, // Simplified for now
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
      });
    } catch (error) {
      return Err(
        new FileSystemError(
          ErrorCodes.FILE_READ_FAILED,
          `Failed to get metadata: ${(error as Error).message}`,
          { path },
          error as Error
        )
      );
    }
  }

  async readFile(
    path: SafeFilePath,
    options?: ReadFileOptions
  ): Promise<Result<SourceContent | CompiledContent, SandboxError>> {
    try {
      const absolutePath = this.resolveSafePath(path);
      const sandboxCheck = this.validateSandboxPath(absolutePath);

      if (!sandboxCheck.success) {
        return sandboxCheck;
      }

      // Check if file exists
      const existsResult = await this.exists(path);
      if (!existsResult.success) {
        return existsResult;
      }

      if (!existsResult.value) {
        return Err(
          new FileSystemError(
            ErrorCodes.FILE_NOT_FOUND,
            `File not found: ${path}`,
            { path }
          )
        );
      }

      // Check file size if maxSizeBytes specified
      if (options?.maxSizeBytes) {
        const metadataResult = await this.getMetadata(path);
        if (!metadataResult.success) {
          return metadataResult;
        }

        if (metadataResult.value.sizeBytes > options.maxSizeBytes) {
          return Err(
            new FileSystemError(
              ErrorCodes.FILE_READ_FAILED,
              `File too large: ${metadataResult.value.sizeBytes} bytes (max: ${options.maxSizeBytes})`,
              {
                path,
                actualSize: metadataResult.value.sizeBytes,
                maxSize: options.maxSizeBytes,
              }
            )
          );
        }
      }

      const encoding = options?.encoding || 'utf8';
      const content = await fs.readFile(absolutePath, encoding);

      return Ok(content as SourceContent | CompiledContent);
    } catch (error) {
      return Err(
        new FileSystemError(
          ErrorCodes.FILE_READ_FAILED,
          `Failed to read file: ${(error as Error).message}`,
          { path },
          error as Error
        )
      );
    }
  }

  async writeFile(
    path: SafeFilePath,
    content: SourceContent | CompiledContent,
    options?: WriteFileOptions
  ): Promise<Result<void, SandboxError>> {
    try {
      const absolutePath = this.resolveSafePath(path);
      const sandboxCheck = this.validateSandboxPath(absolutePath);

      if (!sandboxCheck.success) {
        return sandboxCheck;
      }

      // Create parent directories if requested
      const parentDir = dirname(absolutePath);

      if (options?.createParents !== false) {
        // Default to true
        try {
          await fs.mkdir(parentDir, { recursive: true, mode: 0o755 });
        } catch (error) {
          return Err(
            new FileSystemError(
              ErrorCodes.DIRECTORY_NOT_FOUND,
              `Failed to create parent directory: ${parentDir}`,
              { path, parentDir },
              error as Error
            )
          );
        }
      } else {
        // Check if parent directory exists
        try {
          await fs.access(parentDir);
        } catch (error) {
          return Err(
            new FileSystemError(
              ErrorCodes.DIRECTORY_NOT_FOUND,
              `Parent directory does not exist: ${parentDir}`,
              { path, parentDir },
              error as Error
            )
          );
        }
      }

      const encoding = options?.encoding || 'utf8';
      const mode = options?.mode || 0o644;

      if (options?.atomic) {
        // Write to temporary file first, then rename
        const tempPath = `${absolutePath}.tmp.${Date.now()}`;
        await fs.writeFile(tempPath, content, { encoding, mode });
        await fs.rename(tempPath, absolutePath);
      } else {
        await fs.writeFile(absolutePath, content, { encoding, mode });
      }

      if (options?.sync) {
        // Force flush to disk (simplified implementation)
        const fd = await fs.open(absolutePath, 'r+');
        try {
          await fd.sync();
        } finally {
          await fd.close();
        }
      }

      return Ok(undefined);
    } catch (error) {
      return Err(
        new FileSystemError(
          ErrorCodes.FILE_WRITE_FAILED,
          `Failed to write file: ${(error as Error).message}`,
          { path },
          error as Error
        )
      );
    }
  }

  async copyFile(
    sourcePath: SafeFilePath,
    destinationPath: SafeFilePath,
    options?: CopyFileOptions
  ): Promise<Result<void, SandboxError>> {
    try {
      const sourceAbsolute = this.resolveSafePath(sourcePath);
      const destAbsolute = this.resolveSafePath(destinationPath);

      const sourceSandboxCheck = this.validateSandboxPath(sourceAbsolute);
      if (!sourceSandboxCheck.success) {
        return sourceSandboxCheck;
      }

      const destSandboxCheck = this.validateSandboxPath(destAbsolute);
      if (!destSandboxCheck.success) {
        return destSandboxCheck;
      }

      await fs.copyFile(sourceAbsolute, destAbsolute);
      return Ok(undefined);
    } catch (error) {
      return Err(
        new FileSystemError(
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

      const sourceSandboxCheck = this.validateSandboxPath(sourceAbsolute);
      if (!sourceSandboxCheck.success) {
        return sourceSandboxCheck;
      }

      const destSandboxCheck = this.validateSandboxPath(destAbsolute);
      if (!destSandboxCheck.success) {
        return destSandboxCheck;
      }

      await fs.rename(sourceAbsolute, destAbsolute);
      return Ok(undefined);
    } catch (error) {
      return Err(
        new FileSystemError(
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
      const sandboxCheck = this.validateSandboxPath(absolutePath);

      if (!sandboxCheck.success) {
        return sandboxCheck;
      }

      // Create backup if requested
      if (options?.createBackup) {
        const backupPath = `${absolutePath}.bak.${Date.now()}`;
        await fs.copyFile(absolutePath, backupPath);
      }

      await fs.unlink(absolutePath);
      return Ok(undefined);
    } catch (error) {
      return Err(
        new FileSystemError(
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
      const sandboxCheck = this.validateSandboxPath(absolutePath);

      if (!sandboxCheck.success) {
        return sandboxCheck;
      }

      const mode = options?.mode || 0o755;
      const recursive = options?.recursive !== false; // Default to true

      await fs.mkdir(absolutePath, { recursive, mode });
      return Ok(undefined);
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code === 'EEXIST' &&
        options?.ignoreExists
      ) {
        return Ok(undefined);
      }

      return Err(
        new FileSystemError(
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

  async listDirectory(
    path: SafeDirectoryPath,
    options?: ListDirectoryOptions
  ): Promise<Result<readonly DirectoryEntry[], SandboxError>> {
    try {
      const absolutePath = this.resolveSafePath(path);
      const sandboxCheck = this.validateSandboxPath(absolutePath);

      if (!sandboxCheck.success) {
        return sandboxCheck;
      }

      const entries = await fs.readdir(absolutePath, { withFileTypes: true });
      const directoryEntries: DirectoryEntry[] = [];

      for (const entry of entries) {
        // Skip hidden files unless explicitly requested
        if (!options?.includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        const entryPath = join(path, entry.name) as SafeFilePath;
        const entryAbsolutePath = this.resolveSafePath(entryPath);

        let stats;
        try {
          stats = await fs.stat(entryAbsolutePath);
        } catch {
          continue; // Skip entries we can't stat
        }

        directoryEntries.push({
          name: entry.name,
          path: entryPath,
          isFile: entry.isFile(),
          isDirectory: entry.isDirectory(),
          isSymbolicLink: entry.isSymbolicLink(),
          sizeBytes: stats.size,
          modifiedAt: createTimestamp(stats.mtime.getTime()),
        });
      }

      // Sort if requested
      if (options?.sortBy) {
        directoryEntries.sort((a, b) => {
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

      return Ok(directoryEntries);
    } catch (error) {
      return Err(
        new FileSystemError(
          ErrorCodes.FILE_READ_FAILED,
          `Failed to list directory: ${(error as Error).message}`,
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
      const sandboxCheck = this.validateSandboxPath(absolutePath);

      if (!sandboxCheck.success) {
        return sandboxCheck;
      }

      const recursive = options?.recursive;
      await fs.rmdir(absolutePath, { recursive });
      return Ok(undefined);
    } catch (error) {
      return Err(
        new FileSystemError(
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
      const sandboxCheck = this.validateSandboxPath(absolutePath);

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
        new FileSystemError(
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
      const sandboxCheck = this.validateSandboxPath(absolutePath);

      if (!sandboxCheck.success) {
        return sandboxCheck;
      }

      await fs.chmod(absolutePath, mode);
      return Ok(undefined);
    } catch (error) {
      return Err(
        new FileSystemError(
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
      const sandboxCheck = this.validateSandboxPath(absolutePath);

      if (!sandboxCheck.success) {
        return sandboxCheck;
      }

      const realPath = await fs.realpath(absolutePath);

      // Convert back to relative path for safety
      const relativePath = realPath.replace(this.workingDirectory + '/', '');
      return Ok(relativePath as SafeFilePath);
    } catch (error) {
      return Err(
        new FileSystemError(
          ErrorCodes.FILE_READ_FAILED,
          `Failed to resolve path: ${(error as Error).message}`,
          { path },
          error as Error
        )
      );
    }
  }

  async createWatcher(): Promise<Result<IFileSystemWatcher, SandboxError>> {
    // Simple stub implementation for now
    return Err(
      new FileSystemError(
        ErrorCodes.NOT_IMPLEMENTED,
        'File watching not yet implemented',
        {}
      )
    );
  }

  async cleanup(olderThanMs?: number): Promise<Result<number, SandboxError>> {
    // Simple stub implementation for now
    return Ok(0);
  }

  async getHealthStatus(): Promise<Result<FileSystemHealth, SandboxError>> {
    try {
      const stats = await fs.statfs(this.workingDirectory);

      return Ok({
        healthy: true,
        availableSpaceBytes: stats.bavail * stats.bsize,
        totalSpaceBytes: stats.blocks * stats.bsize,
        usedSpaceBytes: (stats.blocks - stats.bavail) * stats.bsize,
        cachedFiles: 0,
        cacheSizeBytes: 0,
        activeWatchers: 0,
        averageOperationTimeMs: 0,
        warnings: [],
        diagnostics: {
          workingDirectory: this.workingDirectory,
          maxFileSize: this.maxFileSize,
        },
      });
    } catch (error) {
      return Err(
        new FileSystemError(
          ErrorCodes.INTERNAL_ERROR,
          `Failed to get health status: ${(error as Error).message}`,
          {},
          error as Error
        )
      );
    }
  }
}
