/**

- @fileoverview Enhanced Secure File System Service
-
- Enhanced version of SecureFileSystemService with comprehensive security integration:
- - SecurityValidator for input validation and sanitization
- - SecuritySandbox for advanced path validation and resource limits
- - SecurityMonitor for security event logging and monitoring
- - SecureErrorHandler for safe error handling
- - Real-time threat detection and response
-
- This implementation provides enterprise-grade security for all file operations
- with comprehensive audit trails and automatic threat mitigation.
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
import type {
  ErrorHandlingContext,
  SecureErrorHandler,
  SecurityConfig,
  SecurityMonitor,
  SecuritySandbox,
  SecurityValidator,
} from '../security';

/**

- Enhanced secure file system service with comprehensive security integration
 */
export class EnhancedSecureFileSystemService
  implements IFileSystemService<SourceContent | CompiledContent>
{
  private readonly workingDirectory: string;
  private readonly maxFileSize: number;
  private readonly validator: SecurityValidator;
  private readonly sandbox: SecuritySandbox;
  private readonly monitor: SecurityMonitor;
  private readonly errorHandler: SecureErrorHandler;
  private readonly securityConfig: SecurityConfig;

  constructor(
    securityServices: {
      validator: SecurityValidator;
      sandbox: SecuritySandbox;
      monitor: SecurityMonitor;
      errorHandler: SecureErrorHandler;
      config: SecurityConfig;
    },
    workingDirectory = process.cwd(),
    maxFileSize = 10_000_000
  ) {
    this.workingDirectory = workingDirectory;
    this.maxFileSize = maxFileSize;
    this.validator = securityServices.validator;
    this.sandbox = securityServices.sandbox;
    this.monitor = securityServices.monitor;
    this.errorHandler = securityServices.errorHandler;
    this.securityConfig = securityServices.config;
  }

  /**

- Creates error handling context for operations
   */
  private createErrorContext(
    operation: string,
    path?: string
  ): ErrorHandlingContext {
    return {
      operation,
      path,
      exposureLevel: this.securityConfig.errorHandling.defaultExposureLevel,
      operationId: `fs_${operation}_${Date.now()}`,
    };
  }

  /**

- Validates and secures a file path operation
   */
  private async validateAndSecurePath(
    path: SafeFilePath | SafeDirectoryPath,
    operation: string
  ): Promise<
    Result<{ canonicalPath: string; relativePath: string }, SandboxError>

  > {
    try {
      // Input validation
      const validationResult = await this.validator.validateFilePath(
        path,
        'fileOperation'
      );
      if (!validationResult.success) {
        await this.monitor.logSecurityEvent(
          'policy_violation',
          'high',
          'File path validation failed',
          {
            path,
            operation,
            violations:
              validationResult.error instanceof Error
                ? (validationResult.error as any).violations
                : undefined,
          }
        );
        return validationResult;
      }

      if (!validationResult.value.valid) {
        await this.monitor.logSecurityEvent(
          'policy_violation',
          'high',
          'File path security violations detected',
          {
            path,
            operation,
            violations: validationResult.value.violations,
            riskLevel: validationResult.value.riskLevel,
          }
        );

        return Err(
          new SandboxError(
            ErrorCodes.SECURITY_VIOLATION,
            'File path contains security violations',
            'security',
            'error',
            { path, violations: validationResult.value.violations }
          )
        );
      }

      // Sandbox validation
      const sandboxResult = await this.sandbox.validatePath(path, operation);
      if (!sandboxResult.success) {
        await this.monitor.logSecurityEvent(
          'attack_blocked',
          'critical',
          'Sandbox violation detected',
          {
            path,
            operation,
            error: sandboxResult.error.message,
          }
        );
        return sandboxResult;
      }

      // Log security threats if any
      if (sandboxResult.value.threats.length > 0) {
        for (const threat of sandboxResult.value.threats) {
          await this.monitor.reportThreat(threat);
        }
      }

      return Ok({
        canonicalPath: sandboxResult.value.canonicalPath,
        relativePath: sandboxResult.value.relativePath,
      });
    } catch (error) {
      const context = this.createErrorContext(operation, path);
      const errorResult = await this.errorHandler.handleError(
        error as Error,
        context
      );

      if (errorResult.success) {
        return Err(
          new SandboxError(
            ErrorCodes.SECURITY_VIOLATION,
            errorResult.value.sanitizedError.message,
            'security',
            'error',
            { path, operation }
          )
        );
      }

      return Err(
        new SandboxError(
          ErrorCodes.INTERNAL_ERROR,
          'Security validation failed',
          'security',
          'error',
          { path, operation }
        )
      );
    }
  }

  /**

- Validates file content for security issues
   */
  private async validateContent(
    content: string,
    operation: string,
    path?: string
  ): Promise<Result<void, SandboxError>> {
    try {
      const validationResult = await this.validator.validateFileContent(
        content,
        'file'
      );
      if (!validationResult.success) {
        return validationResult;
      }

      if (!validationResult.value.valid) {
        await this.monitor.logSecurityEvent(
          'policy_violation',
          'high',
          'File content security violations detected',
          {
            path,
            operation,
            violations: validationResult.value.violations,
            riskLevel: validationResult.value.riskLevel,
            contentLength: content.length,
          }
        );

        return Err(
          new SandboxError(
            ErrorCodes.SECURITY_VIOLATION,
            'File content contains security violations',
            'security',
            'error',
            { path, violations: validationResult.value.violations }
          )
        );
      }

      return Ok(undefined);
    } catch (error) {
      const context = this.createErrorContext(operation, path);
      const errorResult = await this.errorHandler.handleError(
        error as Error,
        context
      );

      if (errorResult.success) {
        return Err(
          new SandboxError(
            ErrorCodes.SECURITY_VIOLATION,
            errorResult.value.sanitizedError.message,
            'security',
            'error',
            { path, operation }
          )
        );
      }

      return Err(
        new SandboxError(
          ErrorCodes.INTERNAL_ERROR,
          'Content validation failed',
          'security',
          'error',
          { path, operation }
        )
      );
    }
  }

  /**

- Enforces resource limits for operation
   */
  private async enforceResourceLimits(
    operation: string,
    estimatedSize = 0,
    path?: string
  ): Promise<Result<void, SandboxError>> {
    try {
      const result = await this.sandbox.enforceResourceLimits(
        operation,
        estimatedSize
      );
      if (!result.success) {
        await this.monitor.logSecurityEvent(
          'resource_limit_exceeded',
          'high',
          'Resource limit enforcement failed',
          {
            path,
            operation,
            estimatedSize,
            error: result.error.message,
          }
        );
      }
      return result;
    } catch (error) {
      const context = this.createErrorContext(operation, path);
      await this.errorHandler.handleError(error as Error, context);

      return Err(
        new SandboxError(
          ErrorCodes.INTERNAL_ERROR,
          'Resource limit enforcement failed',
          'security',
          'error',
          { path, operation }
        )
      );
    }
  }

  async exists(
    path: SafeFilePath | SafeDirectoryPath
  ): Promise<Result<boolean, SandboxError>> {
    const operation = 'exists';

    try {
      // Security validation
      const pathResult = await this.validateAndSecurePath(path, operation);
      if (!pathResult.success) {
        return pathResult;
      }

      // Resource limits
      const resourceResult = await this.enforceResourceLimits(
        operation,
        0,
        path
      );
      if (!resourceResult.success) {
        return resourceResult;
      }

      // Perform operation
      await fs.access(pathResult.value.canonicalPath);

      // Log successful operation
      await this.monitor.logSecurityEvent(
        'access_granted',
        'info',
        'File existence check completed',
        { path, operation, result: true }
      );

      return Ok(true);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await this.monitor.logSecurityEvent(
          'access_granted',
          'info',
          'File existence check completed',
          { path, operation, result: false }
        );
        return Ok(false);
      }

      const context = this.createErrorContext(operation, path);
      const errorResult = await this.errorHandler.handleError(
        error as Error,
        context
      );

      if (errorResult.success) {
        return Err(
          new SandboxError(
            ErrorCodes.FILE_READ_FAILED,
            errorResult.value.sanitizedError.message,
            'filesystem',
            'error',
            { path },
            [
              CommonSuggestions.checkFileExists,
              CommonSuggestions.checkPermissions,
            ]
          )
        );
      }

      return Err(
        new SandboxError(
          ErrorCodes.FILE_READ_FAILED,
          'Failed to check file existence',
          'filesystem',
          'error',
          { path }
        )
      );
    }
  }

  async getMetadata(
    path: SafeFilePath | SafeDirectoryPath
  ): Promise<Result<FileMetadata, SandboxError>> {
    const operation = 'getMetadata';

    try {
      // Security validation
      const pathResult = await this.validateAndSecurePath(path, operation);
      if (!pathResult.success) {
        return pathResult;
      }

      // Resource limits
      const resourceResult = await this.enforceResourceLimits(
        operation,
        0,
        path
      );
      if (!resourceResult.success) {
        return resourceResult;
      }

      // Perform operation
      const stats = await fs.stat(pathResult.value.canonicalPath);
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

      // Log successful operation
      await this.monitor.logSecurityEvent(
        'access_granted',
        'info',
        'File metadata retrieved',
        {
          path,
          operation,
          fileSize: stats.size,
          fileType: stats.isFile() ? 'file' : 'directory',
        }
      );

      return Ok(metadata);
    } catch (error) {
      const context = this.createErrorContext(operation, path);
      const errorResult = await this.errorHandler.handleError(
        error as Error,
        context
      );

      if (errorResult.success) {
        return Err(
          new SandboxError(
            ErrorCodes.FILE_READ_FAILED,
            errorResult.value.sanitizedError.message,
            'filesystem',
            'error',
            { path },
            [
              CommonSuggestions.checkFileExists,
              CommonSuggestions.checkPermissions,
            ]
          )
        );
      }

      return Err(
        new SandboxError(
          ErrorCodes.FILE_READ_FAILED,
          'Failed to get file metadata',
          'filesystem',
          'error',
          { path }
        )
      );
    }
  }

  async readFile(
    path: SafeFilePath,
    options?: ReadFileOptions
  ): Promise<Result<SourceContent | CompiledContent, SandboxError>> {
    const operation = 'readFile';

    try {
      // Security validation
      const pathResult = await this.validateAndSecurePath(path, operation);
      if (!pathResult.success) {
        return pathResult;
      }

      // Check if file exists
      const existsResult = await this.exists(path);
      if (!existsResult.success) {
        return existsResult;
      }

      if (!existsResult.value) {
        await this.monitor.logSecurityEvent(
          'access_denied',
          'medium',
          'Attempt to read non-existent file',
          { path, operation }
        );

        return Err(
          new SandboxError(
            ErrorCodes.FILE_NOT_FOUND,
            'File not found',
            'filesystem',
            'error',
            { path },
            [CommonSuggestions.checkFileExists]
          )
        );
      }

      // Get file metadata for size check
      const metadataResult = await this.getMetadata(path);
      if (!metadataResult.success) {
        return metadataResult;
      }

      const fileSize = metadataResult.value.sizeBytes;

      // Check file size limits
      if (options?.maxSizeBytes && fileSize > options.maxSizeBytes) {
        await this.monitor.logSecurityEvent(
          'policy_violation',
          'medium',
          'File size exceeds requested limit',
          { path, operation, fileSize, maxSizeBytes: options.maxSizeBytes }
        );

        return Err(
          new SandboxError(
            ErrorCodes.FILE_READ_FAILED,
            `File too large: ${fileSize} bytes (max: ${options.maxSizeBytes})`,
            'filesystem',
            'error',
            { path, actualSize: fileSize, maxSize: options.maxSizeBytes }
          )
        );
      }

      // Resource limits
      const resourceResult = await this.enforceResourceLimits(
        operation,
        fileSize,
        path
      );
      if (!resourceResult.success) {
        return resourceResult;
      }

      // Perform read operation
      const encoding = options?.encoding || 'utf8';
      const content = await fs.readFile(
        pathResult.value.canonicalPath,
        encoding
      );

      // Validate content for security issues
      const contentValidation = await this.validateContent(
        content,
        operation,
        path
      );
      if (!contentValidation.success) {
        return contentValidation;
      }

      // Log successful operation
      await this.monitor.logSecurityEvent(
        'access_granted',
        'info',
        'File read completed successfully',
        { path, operation, fileSize, encoding }
      );

      return Ok(content as SourceContent | CompiledContent);
    } catch (error) {
      const context = this.createErrorContext(operation, path);
      const errorResult = await this.errorHandler.handleError(
        error as Error,
        context
      );

      if (errorResult.success) {
        return Err(
          new SandboxError(
            ErrorCodes.FILE_READ_FAILED,
            errorResult.value.sanitizedError.message,
            'filesystem',
            'error',
            { path },
            [
              CommonSuggestions.checkFileExists,
              CommonSuggestions.checkPermissions,
            ]
          )
        );
      }

      return Err(
        new SandboxError(
          ErrorCodes.FILE_READ_FAILED,
          'Failed to read file',
          'filesystem',
          'error',
          { path }
        )
      );
    }
  }

  async writeFile(
    path: SafeFilePath,
    content: SourceContent | CompiledContent,
    options?: WriteFileOptions
  ): Promise<Result<void, SandboxError>> {
    const operation = 'writeFile';

    try {
      // Security validation
      const pathResult = await this.validateAndSecurePath(path, operation);
      if (!pathResult.success) {
        return pathResult;
      }

      // Validate content
      const contentValidation = await this.validateContent(
        content,
        operation,
        path
      );
      if (!contentValidation.success) {
        return contentValidation;
      }

      // Resource limits
      const contentSize = Buffer.byteLength(content, 'utf8');
      const resourceResult = await this.enforceResourceLimits(
        operation,
        contentSize,
        path
      );
      if (!resourceResult.success) {
        return resourceResult;
      }

      // Create parent directories if requested
      const parentDir = dirname(pathResult.value.canonicalPath);

      if (options?.createParents !== false) {
        try {
          await fs.mkdir(parentDir, { recursive: true, mode: 0o755 });
        } catch (error) {
          const context = this.createErrorContext(operation, path);
          await this.errorHandler.handleError(error as Error, context);

          return Err(
            new SandboxError(
              ErrorCodes.DIRECTORY_NOT_FOUND,
              'Failed to create parent directory',
              'filesystem',
              'error',
              { path, parentDir }
            )
          );
        }
      } else {
        try {
          await fs.access(parentDir);
        } catch (error) {
          await this.monitor.logSecurityEvent(
            'access_denied',
            'medium',
            'Parent directory does not exist',
            { path, operation, parentDir }
          );

          return Err(
            new SandboxError(
              ErrorCodes.DIRECTORY_NOT_FOUND,
              'Parent directory does not exist',
              'filesystem',
              'error',
              { path, parentDir }
            )
          );
        }
      }

      // Perform write operation
      const encoding = options?.encoding || 'utf8';
      const mode = options?.mode || 0o644;

      if (options?.atomic) {
        const tempPath = `${pathResult.value.canonicalPath}.tmp.${Date.now()}`;
        await fs.writeFile(tempPath, content, { encoding, mode });
        await fs.rename(tempPath, pathResult.value.canonicalPath);
      } else {
        await fs.writeFile(pathResult.value.canonicalPath, content, {
          encoding,
          mode,
        });
      }

      if (options?.sync) {
        const fd = await fs.open(pathResult.value.canonicalPath, 'r+');
        try {
          await fd.sync();
        } finally {
          await fd.close();
        }
      }

      // Log successful operation
      await this.monitor.logSecurityEvent(
        'access_granted',
        'info',
        'File write completed successfully',
        {
          path,
          operation,
          contentSize,
          encoding,
          atomic: options?.atomic,
          sync: options?.sync,
        }
      );

      return Ok(undefined);
    } catch (error) {
      const context = this.createErrorContext(operation, path);
      const errorResult = await this.errorHandler.handleError(
        error as Error,
        context
      );

      if (errorResult.success) {
        return Err(
          new SandboxError(
            ErrorCodes.FILE_WRITE_FAILED,
            errorResult.value.sanitizedError.message,
            'filesystem',
            'error',
            { path },
            [
              CommonSuggestions.checkPermissions,
              CommonSuggestions.retryOperation,
            ]
          )
        );
      }

      return Err(
        new SandboxError(
          ErrorCodes.FILE_WRITE_FAILED,
          'Failed to write file',
          'filesystem',
          'error',
          { path }
        )
      );
    }
  }

  async copyFile(
    sourcePath: SafeFilePath,
    destinationPath: SafeFilePath,
    options?: CopyFileOptions
  ): Promise<Result<void, SandboxError>> {
    const operation = 'copyFile';

    try {
      // Validate both paths
      const sourceResult = await this.validateAndSecurePath(
        sourcePath,
        operation
      );
      if (!sourceResult.success) {
        return sourceResult;
      }

      const destResult = await this.validateAndSecurePath(
        destinationPath,
        operation
      );
      if (!destResult.success) {
        return destResult;
      }

      // Get source file size for resource limits
      const metadataResult = await this.getMetadata(sourcePath);
      if (!metadataResult.success) {
        return metadataResult;
      }

      const fileSize = metadataResult.value.sizeBytes;

      // Resource limits
      const resourceResult = await this.enforceResourceLimits(
        operation,
        fileSize * 2,
        sourcePath
      ); // *2 for copy
      if (!resourceResult.success) {
        return resourceResult;
      }

      // Perform copy operation
      await fs.copyFile(
        sourceResult.value.canonicalPath,
        destResult.value.canonicalPath
      );

      // Log successful operation
      await this.monitor.logSecurityEvent(
        'access_granted',
        'info',
        'File copy completed successfully',
        { sourcePath, destinationPath, operation, fileSize }
      );

      return Ok(undefined);
    } catch (error) {
      const context = this.createErrorContext(operation, sourcePath);
      const errorResult = await this.errorHandler.handleError(
        error as Error,
        context
      );

      if (errorResult.success) {
        return Err(
          new SandboxError(
            ErrorCodes.FILE_WRITE_FAILED,
            errorResult.value.sanitizedError.message,
            'filesystem',
            'error',
            { sourcePath, destinationPath },
            [
              CommonSuggestions.checkFileExists,
              CommonSuggestions.checkPermissions,
            ]
          )
        );
      }

      return Err(
        new SandboxError(
          ErrorCodes.FILE_WRITE_FAILED,
          'Failed to copy file',
          'filesystem',
          'error',
          { sourcePath, destinationPath }
        )
      );
    }
  }

  // Implement remaining methods with similar security integration...
  async moveFile(
    sourcePath: SafeFilePath | SafeDirectoryPath,
    destinationPath: SafeFilePath | SafeDirectoryPath
  ): Promise<Result<void, SandboxError>> {
    const operation = 'moveFile';

    try {
      const sourceResult = await this.validateAndSecurePath(
        sourcePath,
        operation
      );
      if (!sourceResult.success) return sourceResult;

      const destResult = await this.validateAndSecurePath(
        destinationPath,
        operation
      );
      if (!destResult.success) return destResult;

      const resourceResult = await this.enforceResourceLimits(
        operation,
        0,
        sourcePath
      );
      if (!resourceResult.success) return resourceResult;

      await fs.rename(
        sourceResult.value.canonicalPath,
        destResult.value.canonicalPath
      );

      await this.monitor.logSecurityEvent(
        'access_granted',
        'info',
        'File move completed successfully',
        { sourcePath, destinationPath, operation }
      );

      return Ok(undefined);
    } catch (error) {
      const context = this.createErrorContext(operation, sourcePath);
      await this.errorHandler.handleError(error as Error, context);

      return Err(
        new SandboxError(
          ErrorCodes.FILE_WRITE_FAILED,
          'Failed to move file',
          'filesystem',
          'error',
          { sourcePath, destinationPath }
        )
      );
    }
  }

  async deleteFile(
    path: SafeFilePath,
    options?: DeleteOptions
  ): Promise<Result<void, SandboxError>> {
    const operation = 'deleteFile';

    try {
      const pathResult = await this.validateAndSecurePath(path, operation);
      if (!pathResult.success) return pathResult;

      const resourceResult = await this.enforceResourceLimits(
        operation,
        0,
        path
      );
      if (!resourceResult.success) return resourceResult;

      if (options?.createBackup) {
        const backupPath = `${pathResult.value.canonicalPath}.bak.${Date.now()}`;
        await fs.copyFile(pathResult.value.canonicalPath, backupPath);
      }

      await fs.unlink(pathResult.value.canonicalPath);

      await this.monitor.logSecurityEvent(
        'access_granted',
        'info',
        'File deletion completed successfully',
        { path, operation, backup: options?.createBackup }
      );

      return Ok(undefined);
    } catch (error) {
      const context = this.createErrorContext(operation, path);
      await this.errorHandler.handleError(error as Error, context);

      return Err(
        new SandboxError(
          ErrorCodes.FILE_WRITE_FAILED,
          'Failed to delete file',
          'filesystem',
          'error',
          { path }
        )
      );
    }
  }

  async createDirectory(
    path: SafeDirectoryPath,
    options?: CreateDirectoryOptions
  ): Promise<Result<void, SandboxError>> {
    const operation = 'createDirectory';

    try {
      const pathResult = await this.validateAndSecurePath(path, operation);
      if (!pathResult.success) return pathResult;

      const resourceResult = await this.enforceResourceLimits(
        operation,
        0,
        path
      );
      if (!resourceResult.success) return resourceResult;

      const mode = options?.mode || 0o755;
      const recursive = options?.recursive !== false;

      await fs.mkdir(pathResult.value.canonicalPath, { recursive, mode });

      await this.monitor.logSecurityEvent(
        'access_granted',
        'info',
        'Directory creation completed successfully',
        { path, operation, recursive, mode }
      );

      return Ok(undefined);
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code === 'EEXIST' &&
        options?.ignoreExists
      ) {
        return Ok(undefined);
      }

      const context = this.createErrorContext(operation, path);
      await this.errorHandler.handleError(error as Error, context);

      return Err(
        new SandboxError(
          ErrorCodes.FILE_WRITE_FAILED,
          'Failed to create directory',
          'filesystem',
          'error',
          { path }
        )
      );
    }
  }

  async listDirectory(
    path: SafeDirectoryPath,
    options?: ListDirectoryOptions
  ): Promise<Result<readonly DirectoryEntry[], SandboxError>> {
    const operation = 'listDirectory';

    try {
      const pathResult = await this.validateAndSecurePath(path, operation);
      if (!pathResult.success) return pathResult;

      const resourceResult = await this.enforceResourceLimits(
        operation,
        0,
        path
      );
      if (!resourceResult.success) return resourceResult;

      const entries = await fs.readdir(pathResult.value.canonicalPath, {
        withFileTypes: true,
      });
      const directoryEntries: DirectoryEntry[] = [];

      for (const entry of entries) {
        if (!options?.includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        const entryPath = join(path, entry.name) as SafeFilePath;
        const entryAbsolutePath = join(
          pathResult.value.canonicalPath,
          entry.name
        );

        let stats;
        try {
          stats = await fs.stat(entryAbsolutePath);
        } catch {
          continue;
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

      await this.monitor.logSecurityEvent(
        'access_granted',
        'info',
        'Directory listing completed successfully',
        { path, operation, entryCount: directoryEntries.length }
      );

      return Ok(directoryEntries);
    } catch (error) {
      const context = this.createErrorContext(operation, path);
      await this.errorHandler.handleError(error as Error, context);

      return Err(
        new SandboxError(
          ErrorCodes.FILE_READ_FAILED,
          'Failed to list directory',
          'filesystem',
          'error',
          { path }
        )
      );
    }
  }

  async deleteDirectory(
    path: SafeDirectoryPath,
    options?: DeleteOptions
  ): Promise<Result<void, SandboxError>> {
    const operation = 'deleteDirectory';

    try {
      const pathResult = await this.validateAndSecurePath(path, operation);
      if (!pathResult.success) return pathResult;

      const resourceResult = await this.enforceResourceLimits(
        operation,
        0,
        path
      );
      if (!resourceResult.success) return resourceResult;

      const recursive = options?.recursive;
      await fs.rmdir(pathResult.value.canonicalPath, { recursive });

      await this.monitor.logSecurityEvent(
        'access_granted',
        'info',
        'Directory deletion completed successfully',
        { path, operation, recursive }
      );

      return Ok(undefined);
    } catch (error) {
      const context = this.createErrorContext(operation, path);
      await this.errorHandler.handleError(error as Error, context);

      return Err(
        new SandboxError(
          ErrorCodes.FILE_WRITE_FAILED,
          'Failed to delete directory',
          'filesystem',
          'error',
          { path }
        )
      );
    }
  }

  async checkPermissions(
    path: SafeFilePath | SafeDirectoryPath,
    permissions: readonly ('read' | 'write' | 'execute')[]
  ): Promise<Result<Record<string, boolean>, SandboxError>> {
    const operation = 'checkPermissions';

    try {
      const pathResult = await this.validateAndSecurePath(path, operation);
      if (!pathResult.success) return pathResult;

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

          await fs.access(pathResult.value.canonicalPath, mode);
          result[permission] = true;
        } catch {
          result[permission] = false;
        }
      }

      await this.monitor.logSecurityEvent(
        'access_granted',
        'info',
        'Permission check completed successfully',
        { path, operation, permissions: result }
      );

      return Ok(result);
    } catch (error) {
      const context = this.createErrorContext(operation, path);
      await this.errorHandler.handleError(error as Error, context);

      return Err(
        new SandboxError(
          ErrorCodes.FILE_READ_FAILED,
          'Failed to check permissions',
          'filesystem',
          'error',
          { path }
        )
      );
    }
  }

  async changePermissions(
    path: SafeFilePath | SafeDirectoryPath,
    mode: number
  ): Promise<Result<void, SandboxError>> {
    const operation = 'changePermissions';

    try {
      const pathResult = await this.validateAndSecurePath(path, operation);
      if (!pathResult.success) return pathResult;

      await fs.chmod(pathResult.value.canonicalPath, mode);

      await this.monitor.logSecurityEvent(
        'access_granted',
        'info',
        'Permission change completed successfully',
        { path, operation, mode }
      );

      return Ok(undefined);
    } catch (error) {
      const context = this.createErrorContext(operation, path);
      await this.errorHandler.handleError(error as Error, context);

      return Err(
        new SandboxError(
          ErrorCodes.FILE_WRITE_FAILED,
          'Failed to change permissions',
          'filesystem',
          'error',
          { path, mode }
        )
      );
    }
  }

  async resolvePath(
    path: SafeFilePath | SafeDirectoryPath
  ): Promise<Result<SafeFilePath, SandboxError>> {
    const operation = 'resolvePath';

    try {
      const pathResult = await this.validateAndSecurePath(path, operation);
      if (!pathResult.success) return pathResult;

      const realPath = await fs.realpath(pathResult.value.canonicalPath);
      const relativePath = realPath.replace(this.workingDirectory + '/', '');

      await this.monitor.logSecurityEvent(
        'access_granted',
        'info',
        'Path resolution completed successfully',
        { path, operation, resolvedPath: relativePath }
      );

      return Ok(relativePath as SafeFilePath);
    } catch (error) {
      const context = this.createErrorContext(operation, path);
      await this.errorHandler.handleError(error as Error, context);

      return Err(
        new SandboxError(
          ErrorCodes.FILE_READ_FAILED,
          'Failed to resolve path',
          'filesystem',
          'error',
          { path }
        )
      );
    }
  }

  async createWatcher(): Promise<Result<IFileSystemWatcher, SandboxError>> {
    return Err(
      new SandboxError(
        ErrorCodes.NOT_IMPLEMENTED,
        'File watching not yet implemented with security integration',
        'filesystem',
        'error'
      )
    );
  }

  async cleanup(olderThanMs?: number): Promise<Result<number, SandboxError>> {
    await this.monitor.logSecurityEvent(
      'system_anomaly',
      'info',
      'File system cleanup requested',
      { operation: 'cleanup', olderThanMs }
    );

    return Ok(0);
  }

  async getHealthStatus(): Promise<Result<FileSystemHealth, SandboxError>> {
    try {
      const stats = await fs.statfs(this.workingDirectory);
      const resourceUsage = this.sandbox.getResourceUsage();
      const securityMetrics = this.monitor.getMetrics();

      const health: FileSystemHealth = {
        healthy: securityMetrics.threatsDetected < 10,
        availableSpaceBytes: stats.bavail * stats.bsize,
        totalSpaceBytes: stats.blocks * stats.bsize,
        usedSpaceBytes: (stats.blocks - stats.bavail) * stats.bsize,
        cachedFiles: 0,
        cacheSizeBytes: 0,
        activeWatchers: 0,
        averageOperationTimeMs: 0,
        warnings:
          securityMetrics.threatsDetected > 5
            ? ['Security threats detected']
            : [],
        diagnostics: {
          workingDirectory: this.workingDirectory,
          maxFileSize: this.maxFileSize,
          securityThreats: securityMetrics.threatsDetected,
          resourceUsage,
          lastSecurityEvent: securityMetrics.lastEventTime,
        },
      };

      await this.monitor.logSecurityEvent(
        'system_anomaly',
        'info',
        'File system health check completed',
        {
          operation: 'getHealthStatus',
          healthy: health.healthy,
          threats: securityMetrics.threatsDetected,
        }
      );

      return Ok(health);
    } catch (error) {
      const context = this.createErrorContext('getHealthStatus');
      await this.errorHandler.handleError(error as Error, context);

      return Err(
        new SandboxError(
          ErrorCodes.INTERNAL_ERROR,
          'Failed to get health status',
          'filesystem',
          'error'
        )
      );
    }
  }
}
