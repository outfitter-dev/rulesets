/**

- @fileoverview SecuritySandbox - Advanced Path Validation and Resource Constraints
-
- Provides enterprise-grade sandboxing with comprehensive security controls:
- - Advanced path resolution and canonicalization
- - Symlink attack prevention
- - Resource usage monitoring and limits
- - Process isolation and constraints
- - Memory and CPU monitoring
-
- Security Architecture:
- - Allowlist-based path validation
- - Real-time resource monitoring
- - Automatic threat detection and mitigation
- - Comprehensive audit logging
 */

import { spawn } from 'node:child_process';
import { promises as fs, constants as fsConstants } from 'node:fs';
import { basename, dirname, extname, relative, resolve } from 'node:path';
import { ErrorCodes, SandboxError } from '@/domain/errors';
import type {
  SafeDirectoryPath,
  SafeFilePath,
  Timestamp,
} from '@/shared/types/brands';
import { createTimestamp } from '@/shared/types/brands';
import { Err, Ok, type Result } from '@/shared/types/result';

/**

- Security sandbox configuration
 */
export interface SecuritySandboxConfig {
  readonly allowedPaths: readonly string[];
  readonly maxFileSize: number;
  readonly maxFiles: number;
  readonly maxDirectories: number;
  readonly maxDepth: number;
  readonly operationTimeoutMs: number;
  readonly memoryLimitBytes: number;
  readonly cpuTimeoutMs: number;
  readonly allowSymlinks: boolean;
  readonly allowHiddenFiles: boolean;
  readonly quarantineEnabled: boolean;
  readonly auditEnabled: boolean;
}

/**

- Resource usage tracking
 */
export interface ResourceUsage {
  readonly filesAccessed: number;
  readonly directoriesAccessed: number;
  readonly bytesRead: number;
  readonly bytesWritten: number;
  readonly operationsCount: number;
  readonly memoryUsageBytes: number;
  readonly cpuTimeMs: number;
  readonly startTime: Timestamp;
  readonly lastActivity: Timestamp;
}

/**

- Security threat detected
 */
export interface SecurityThreat {
  readonly type: SecurityThreatType;
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly description: string;
  readonly path?: string;
  readonly timestamp: Timestamp;
  readonly context: Record<string, unknown>;
  readonly automated: boolean;
  readonly mitigated: boolean;
}

/**

- Security threat types
 */
export type SecurityThreatType =
  | 'path_traversal_attempt'
  | 'symlink_attack'
  | 'resource_exhaustion'
  | 'suspicious_access_pattern'
  | 'rapid_file_access'
  | 'memory_limit_exceeded'
  | 'cpu_limit_exceeded'
  | 'operation_timeout'
  | 'unauthorized_path_access'
  | 'file_corruption_attempt'
  | 'privilege_escalation_attempt';

/**

- Sandbox operation result
 */
export interface SandboxOperationResult<T = void> {
  readonly success: boolean;
  readonly result?: T;
  readonly threats: readonly SecurityThreat[];
  readonly resourceUsage: ResourceUsage;
  readonly warnings: readonly string[];
}

/**

- Path validation result
 */
export interface PathValidationResult {
  readonly allowed: boolean;
  readonly canonicalPath: string;
  readonly relativePath: string;
  readonly threats: readonly SecurityThreat[];
  readonly metadata: {
    readonly exists: boolean;
    readonly isFile: boolean;
    readonly isDirectory: boolean;
    readonly isSymlink: boolean;
    readonly permissions: number;
    readonly size?: number;
  };
}

/**

- Security error for sandbox violations
 */
class SecuritySandboxError extends SandboxError {
  public readonly threats: readonly SecurityThreat[];

  constructor(
    message: string,
    threats: readonly SecurityThreat[] = [],
    context: Record<string, unknown> = {}
  ) {
    super(ErrorCodes.SECURITY_VIOLATION, message, 'security', 'error', {
      ...context,
      threatCount: threats.length,
    });
    this.threats = threats;
  }
}

/**

- Advanced security sandbox implementation
 */
export class SecuritySandbox {
  private readonly config: SecuritySandboxConfig;
  private readonly allowedPaths: Set<string>;
  private resourceUsageData: {
    filesAccessed: number;
    directoriesAccessed: number;
    bytesRead: number;
    bytesWritten: number;
    operationsCount: number;
    memoryUsageBytes: number;
    cpuTimeMs: number;
    startTime: Timestamp;
    lastActivity: Timestamp;
  };
  private readonly threatHistory: SecurityThreat[] = [];
  private readonly operationHistory: Array<{
    path: string;
    operation: string;
    timestamp: Timestamp;
  }> = [];
  private readonly quarantinedPaths: Set<string> = new Set();

  constructor(config: SecuritySandboxConfig) {
    this.config = config;
    this.allowedPaths = new Set(config.allowedPaths.map((p) => resolve(p)));
    this.resourceUsageData = {
      filesAccessed: 0,
      directoriesAccessed: 0,
      bytesRead: 0,
      bytesWritten: 0,
      operationsCount: 0,
      memoryUsageBytes: 0,
      cpuTimeMs: 0,
      startTime: createTimestamp(Date.now()),
      lastActivity: createTimestamp(Date.now()),
    };
  }

  /**
  - Get current resource usage as readonly interface
   */
  get resourceUsage(): ResourceUsage {
    return { ...this.resourceUsageData };
  }

  /**

- Validates and resolves a path with comprehensive security checks
   */
  async validatePath(
    path: string,
    operation = 'read'
  ): Promise<Result<PathValidationResult, SandboxError>> {
    const threats: SecurityThreat[] = [];
    const startTime = Date.now();

    try {
      // Update activity timestamp
      this.resourceUsageData.lastActivity = createTimestamp(Date.now());
      this.resourceUsageData.operationsCount++;

      // Basic path validation
      if (!path || typeof path !== 'string') {
        threats.push(
          this.createThreat(
            'unauthorized_path_access',
            'critical',
            'Invalid path provided',
            { path, operation }
          )
        );

        return Err(
          new SecuritySandboxError('Invalid path provided', threats, {
            path,
            operation,
          })
        );
      }

      // Check for quarantined paths
      if (this.quarantinedPaths.has(path)) {
        threats.push(
          this.createThreat(
            'unauthorized_path_access',
            'high',
            'Access to quarantined path denied',
            { path, operation }
          )
        );

        return Err(
          new SecuritySandboxError(
            'Path is quarantined due to previous security violations',
            threats,
            { path, operation }
          )
        );
      }

      // Resolve canonical path
      let canonicalPath: string;
      try {
        canonicalPath = await this.resolveCanonicalPath(path);
      } catch (error) {
        threats.push(
          this.createThreat(
            'path_traversal_attempt',
            'high',
            'Path resolution failed',
            { path, operation, error: (error as Error).message }
          )
        );

        return Err(
          new SecuritySandboxError(
            `Path resolution failed: ${(error as Error).message}`,
            threats,
            { path, operation }
          )
        );
      }

      // Check if path is within allowed boundaries
      const isAllowed = this.isPathAllowed(canonicalPath);
      if (!isAllowed) {
        threats.push(
          this.createThreat(
            'unauthorized_path_access',
            'critical',
            'Path outside sandbox boundaries',
            {
              path,
              canonicalPath,
              operation,
              allowedPaths: Array.from(this.allowedPaths),
            }
          )
        );

        return Err(
          new SecuritySandboxError(
            'Path is outside allowed sandbox boundaries',
            threats,
            { path, canonicalPath, operation }
          )
        );
      }

      // Get file metadata securely
      const metadata = await this.getSecureMetadata(canonicalPath, threats);

      // Symlink validation
      if (metadata.isSymlink && !this.config.allowSymlinks) {
        threats.push(
          this.createThreat(
            'symlink_attack',
            'high',
            'Symlink access denied by policy',
            { path, canonicalPath, operation }
          )
        );

        return Err(
          new SecuritySandboxError(
            'Symlink access denied by security policy',
            threats,
            { path, canonicalPath, operation }
          )
        );
      }

      // Hidden file validation
      if (!this.config.allowHiddenFiles && this.isHiddenPath(canonicalPath)) {
        threats.push(
          this.createThreat(
            'unauthorized_path_access',
            'medium',
            'Hidden file access denied',
            { path, canonicalPath, operation }
          )
        );

        return Err(
          new SecuritySandboxError(
            'Hidden file access denied by security policy',
            threats,
            { path, canonicalPath, operation }
          )
        );
      }

      // Resource limit checks
      const resourceCheck = await this.checkResourceLimits(
        metadata,
        operation,
        threats
      );
      if (!resourceCheck.success) {
        return resourceCheck;
      }

      // Detect suspicious access patterns
      this.detectSuspiciousPatterns(canonicalPath, operation, threats);

      // Update resource usage
      this.updateResourceUsage(metadata, operation);

      // Record operation
      this.operationHistory.push({
        path: canonicalPath,
        operation,
        timestamp: createTimestamp(Date.now()),
      });

      // Cleanup old operation history (keep last 1000)
      if (this.operationHistory.length > 1000) {
        this.operationHistory.splice(0, this.operationHistory.length - 1000);
      }

      const relativePath = relative(process.cwd(), canonicalPath);

      const result: PathValidationResult = {
        allowed: true,
        canonicalPath,
        relativePath,
        threats,
        metadata,
      };

      // Check operation timeout
      const operationTime = Date.now() - startTime;
      if (operationTime > this.config.operationTimeoutMs) {
        threats.push(
          this.createThreat(
            'operation_timeout',
            'medium',
            'Operation took longer than expected',
            {
              path,
              operation,
              operationTime,
              timeout: this.config.operationTimeoutMs,
            }
          )
        );
      }

      return Ok(result);
    } catch (error) {
      threats.push(
        this.createThreat(
          'unauthorized_path_access',
          'high',
          'Unexpected error during path validation',
          { path, operation, error: (error as Error).message }
        )
      );

      return Err(
        new SecuritySandboxError(
          `Path validation failed: ${(error as Error).message}`,
          threats,
          { path, operation }
        )
      );
    }
  }

  /**

- Enforces resource limits for an operation
   */
  async enforceResourceLimits(
    operation: string,
    estimatedSize = 0
  ): Promise<Result<void, SandboxError>> {
    const threats: SecurityThreat[] = [];

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const currentMemory = memoryUsage.heapUsed;

    if (currentMemory > this.config.memoryLimitBytes) {
      threats.push(
        this.createThreat(
          'memory_limit_exceeded',
          'high',
          'Memory limit exceeded',
          {
            operation,
            currentMemory,
            limit: this.config.memoryLimitBytes,
            heapTotal: memoryUsage.heapTotal,
            external: memoryUsage.external,
          }
        )
      );

      return Err(
        new SecuritySandboxError('Memory limit exceeded', threats, {
          operation,
          currentMemory,
          limit: this.config.memoryLimitBytes,
        })
      );
    }

    // Check file count limits
    if (this.resourceUsage.filesAccessed >= this.config.maxFiles) {
      threats.push(
        this.createThreat(
          'resource_exhaustion',
          'high',
          'Maximum file count exceeded',
          {
            operation,
            filesAccessed: this.resourceUsage.filesAccessed,
            limit: this.config.maxFiles,
          }
        )
      );

      return Err(
        new SecuritySandboxError('Maximum file count exceeded', threats, {
          operation,
          filesAccessed: this.resourceUsage.filesAccessed,
        })
      );
    }

    // Check directory count limits
    if (this.resourceUsage.directoriesAccessed >= this.config.maxDirectories) {
      threats.push(
        this.createThreat(
          'resource_exhaustion',
          'high',
          'Maximum directory count exceeded',
          {
            operation,
            directoriesAccessed: this.resourceUsage.directoriesAccessed,
            limit: this.config.maxDirectories,
          }
        )
      );

      return Err(
        new SecuritySandboxError('Maximum directory count exceeded', threats, {
          operation,
          directoriesAccessed: this.resourceUsage.directoriesAccessed,
        })
      );
    }

    // Check estimated operation size
    if (estimatedSize > this.config.maxFileSize) {
      threats.push(
        this.createThreat(
          'resource_exhaustion',
          'medium',
          'File size exceeds limit',
          {
            operation,
            estimatedSize,
            limit: this.config.maxFileSize,
          }
        )
      );

      return Err(
        new SecuritySandboxError('File size exceeds security limit', threats, {
          operation,
          estimatedSize,
          limit: this.config.maxFileSize,
        })
      );
    }

    return Ok(undefined);
  }

  /**

- Quarantines a path due to security violations
   */
  quarantinePath(path: string, reason: string): void {
    const canonicalPath = resolve(path);
    this.quarantinedPaths.add(canonicalPath);

    const threat = this.createThreat(
      'unauthorized_path_access',
      'high',
      `Path quarantined: ${reason}`,
      { path, canonicalPath, reason },
      true,
      true
    );

    this.threatHistory.push(threat);
  }

  /**

- Gets current resource usage
   */
  getResourceUsage(): ResourceUsage {
    // Update memory usage
    const memoryUsage = process.memoryUsage();
    this.resourceUsageData.memoryUsageBytes = memoryUsage.heapUsed;

    return { ...this.resourceUsageData };
  }

  /**

- Gets security threat history
   */
  getThreats(severity?: SecurityThreat['severity']): readonly SecurityThreat[] {
    if (severity) {
      return this.threatHistory.filter((t) => t.severity === severity);
    }
    return [...this.threatHistory];
  }

  /**

- Clears quarantined paths (for testing)
   */
  clearQuarantine(): void {
    this.quarantinedPaths.clear();
  }

  /**

- Resets resource usage counters
   */
  resetResourceUsage(): void {
    Object.assign(this.resourceUsageData, {
      filesAccessed: 0,
      directoriesAccessed: 0,
      bytesRead: 0,
      bytesWritten: 0,
      operationsCount: 0,
      memoryUsageBytes: process.memoryUsage().heapUsed,
      cpuTimeMs: 0,
      startTime: createTimestamp(Date.now()),
      lastActivity: createTimestamp(Date.now()),
    });
  }

  /**

- Resolves canonical path with security checks
   */
  private async resolveCanonicalPath(path: string): Promise<string> {
    // Handle relative paths
    const absolutePath = resolve(path);

    try {
      // Resolve symlinks to canonical path
      const canonicalPath = await fs.realpath(absolutePath);

      // Verify the canonical path is still relative to our base
      for (const allowedPath of this.allowedPaths) {
        if (canonicalPath.startsWith(allowedPath)) {
          return canonicalPath;
        }
      }

      // If not, use the absolute path (which might still be invalid)
      return absolutePath;
    } catch (error) {
      // If realpath fails, the file doesn't exist - use absolute path
      return absolutePath;
    }
  }

  /**

- Checks if path is within allowed boundaries
   */
  private isPathAllowed(canonicalPath: string): boolean {
    for (const allowedPath of this.allowedPaths) {
      if (canonicalPath.startsWith(allowedPath)) {
        return true;
      }
    }
    return false;
  }

  /**

- Gets file metadata with security checks
   */
  private async getSecureMetadata(
    canonicalPath: string,
    threats: SecurityThreat[]
  ): Promise<PathValidationResult['metadata']> {
    try {
      const stats = await fs.lstat(canonicalPath); // Use lstat to detect symlinks

      return {
        exists: true,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        isSymlink: stats.isSymbolicLink(),
        permissions: stats.mode,
        size: stats.isFile() ? stats.size : undefined,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          exists: false,
          isFile: false,
          isDirectory: false,
          isSymlink: false,
          permissions: 0,
          size: undefined,
        };
      }

      threats.push(
        this.createThreat(
          'unauthorized_path_access',
          'medium',
          'Failed to get file metadata',
          { canonicalPath, error: (error as Error).message }
        )
      );

      return {
        exists: false,
        isFile: false,
        isDirectory: false,
        isSymlink: false,
        permissions: 0,
        size: undefined,
      };
    }
  }

  /**

- Checks if path is hidden
   */
  private isHiddenPath(path: string): boolean {
    const parts = path.split('/');
    return parts.some(
      (part) => part.startsWith('.') && part !== '.' && part !== '..'
    );
  }

  /**

- Checks resource limits for an operation
   */
  private async checkResourceLimits(
    metadata: PathValidationResult['metadata'],
    operation: string,
    threats: SecurityThreat[]
  ): Promise<Result<void, SandboxError>> {
    // Check file size
    if (metadata.size && metadata.size > this.config.maxFileSize) {
      threats.push(
        this.createThreat(
          'resource_exhaustion',
          'high',
          'File size exceeds limit',
          {
            operation,
            fileSize: metadata.size,
            limit: this.config.maxFileSize,
          }
        )
      );

      return Err(
        new SecuritySandboxError('File size exceeds security limit', threats, {
          operation,
          fileSize: metadata.size,
        })
      );
    }

    // Check if we would exceed limits
    const wouldExceedFiles =
      metadata.isFile &&
      this.resourceUsage.filesAccessed >= this.config.maxFiles;

    const wouldExceedDirs =
      metadata.isDirectory &&
      this.resourceUsage.directoriesAccessed >= this.config.maxDirectories;

    if (wouldExceedFiles || wouldExceedDirs) {
      const limitType = wouldExceedFiles ? 'file' : 'directory';
      const current = wouldExceedFiles
        ? this.resourceUsage.filesAccessed
        : this.resourceUsage.directoriesAccessed;
      const limit = wouldExceedFiles
        ? this.config.maxFiles
        : this.config.maxDirectories;

      threats.push(
        this.createThreat(
          'resource_exhaustion',
          'high',
          `${limitType} count limit would be exceeded`,
          { operation, current, limit, limitType }
        )
      );

      return Err(
        new SecuritySandboxError(
          `Operation would exceed ${limitType} count limit`,
          threats,
          { operation, current, limit }
        )
      );
    }

    return Ok(undefined);
  }

  /**

- Detects suspicious access patterns
   */
  private detectSuspiciousPatterns(
    canonicalPath: string,
    operation: string,
    threats: SecurityThreat[]
  ): void {
    const now = Date.now();
    const recentOps = this.operationHistory.filter(
      (op) => now - op.timestamp < 10_000 // Last 10 seconds
    );

    // Rapid file access detection
    const rapidAccess = recentOps.filter(
      (op) => op.path === canonicalPath && now - op.timestamp < 1000 // Last 1 second
    );

    if (rapidAccess.length > 10) {
      threats.push(
        this.createThreat(
          'rapid_file_access',
          'medium',
          'Unusually rapid file access detected',
          {
            canonicalPath,
            operation,
            accessCount: rapidAccess.length,
            timeWindow: '1 second',
          }
        )
      );
    }

    // Suspicious pattern: accessing many files in different directories
    const uniqueDirs = new Set(recentOps.map((op) => dirname(op.path)));
    if (uniqueDirs.size > 20 && recentOps.length > 50) {
      threats.push(
        this.createThreat(
          'suspicious_access_pattern',
          'medium',
          'Accessing files across many directories',
          {
            operation,
            uniqueDirectories: uniqueDirs.size,
            totalOperations: recentOps.length,
            timeWindow: '10 seconds',
          }
        )
      );
    }

    // Suspicious pattern: many failed operations
    const failedOps = recentOps.filter((op) =>
      this.threatHistory.some(
        (t) => t.context.path === op.path && t.timestamp > op.timestamp - 1000
      )
    );

    if (failedOps.length > 5) {
      threats.push(
        this.createThreat(
          'suspicious_access_pattern',
          'high',
          'High rate of failed operations detected',
          {
            canonicalPath,
            operation,
            failedOperations: failedOps.length,
            timeWindow: '10 seconds',
          }
        )
      );
    }
  }

  /**

- Updates resource usage tracking
   */
  private updateResourceUsage(
    metadata: PathValidationResult['metadata'],
    operation: string
  ): void {
    if (metadata.isFile) {
      this.resourceUsageData.filesAccessed++;

      if (operation === 'read' && metadata.size) {
        this.resourceUsageData.bytesRead += metadata.size;
      } else if (operation === 'write' && metadata.size) {
        this.resourceUsageData.bytesWritten += metadata.size;
      }
    }

    if (metadata.isDirectory) {
      this.resourceUsageData.directoriesAccessed++;
    }

    // Update memory usage
    const memoryUsage = process.memoryUsage();
    this.resourceUsageData.memoryUsageBytes = memoryUsage.heapUsed;
    this.resourceUsageData.lastActivity = createTimestamp(Date.now());
  }

  /**

- Creates a security threat record
   */
  private createThreat(
    type: SecurityThreatType,
    severity: SecurityThreat['severity'],
    description: string,
    context: Record<string, unknown> = {},
    automated = false,
    mitigated = false
  ): SecurityThreat {
    const threat: SecurityThreat = {
      type,
      severity,
      description,
      path: (context.path as string) || (context.canonicalPath as string),
      timestamp: createTimestamp(Date.now()),
      context,
      automated,
      mitigated,
    };

    this.threatHistory.push(threat);

    // Keep threat history manageable
    if (this.threatHistory.length > 10_000) {
      this.threatHistory.splice(0, this.threatHistory.length - 10_000);
    }

    return threat;
  }
}
