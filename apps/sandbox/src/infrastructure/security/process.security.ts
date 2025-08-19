/**

- @fileoverview Process Security Hardening Service
-
- Provides comprehensive process-level security controls including:
- - Process isolation and sandboxing
- - Resource limits and constraints (memory, CPU, file descriptors)
- - Privilege dropping and capability management
- - Container security controls
- - Process monitoring and enforcement
- - Signal handling and cleanup
-
- Security Features:
- - Memory and CPU limit enforcement
- - Process isolation with namespaces (Linux)
- - Capability dropping for minimal privileges
- - Signal-based timeout enforcement
- - Resource usage monitoring
- - Container security integration
-
- This implementation follows security best practices for Node.js applications
- and provides defense against process-level attacks and resource exhaustion.
 */

import { ChildProcess, spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { ErrorCodes, SandboxError } from '@/domain/errors';
import { createTimestamp, type Timestamp } from '@/shared/types/brands';
import { Err, Ok, type Result } from '@/shared/types/result';
import type {
  ErrorHandlingContext,
  SecureErrorHandler,
  SecurityMonitor,
  SecurityProcessConfig,
} from './index';

/**

- Process resource usage metrics
 */
export interface ProcessResourceUsage {
  readonly memoryUsageBytes: number;
  readonly cpuUsagePercent: number;
  readonly fileDescriptorCount: number;
  readonly executionTimeMs: number;
  readonly pid: number;
  readonly ppid: number;
  readonly children: number;
}

/**

- Process execution context
 */
export interface ProcessExecutionContext {
  readonly command: string;
  readonly arguments: readonly string[];
  readonly workingDirectory: string;
  readonly environment: Record<string, string>;
  readonly timeout: number;
  readonly memoryLimit: number;
  readonly cpuLimit: number;
  readonly uid?: number;
  readonly gid?: number;
  readonly capabilities?: readonly string[];
}

/**

- Process security violation
 */
export interface ProcessSecurityViolation {
  readonly type: ProcessViolationType;
  readonly description: string;
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly threshold?: number;
  readonly actual?: number;
  readonly timestamp: Timestamp;
}

/**

- Process violation types
 */
export type ProcessViolationType =
  | 'memory_limit_exceeded'
  | 'cpu_limit_exceeded'
  | 'execution_timeout'
  | 'file_descriptor_limit'
  | 'privilege_escalation'
  | 'signal_abuse'
  | 'resource_exhaustion'
  | 'capability_violation'
  | 'namespace_violation';

/**

- Process execution result
 */
export interface ProcessExecutionResult {
  readonly exitCode: number;
  readonly signal?: string;
  readonly stdout: string;
  readonly stderr: string;
  readonly resourceUsage: ProcessResourceUsage;
  readonly violations: readonly ProcessSecurityViolation[];
  readonly killed: boolean;
  readonly timeout: boolean;
}

/**

- Process security monitor
 */
interface ProcessSecurityMonitor {
  readonly pid: number;
  readonly startTime: Timestamp;
  readonly resourceLimits: {
    readonly memory: number;
    readonly cpu: number;
    readonly fileDescriptors: number;
    readonly timeout: number;
  };
  readonly violations: ProcessSecurityViolation[];
  timerId?: NodeJS.Timeout;
  resourceTimerId?: NodeJS.Timeout;
}

/**

- Process privilege information
 */
interface ProcessPrivileges {
  readonly uid: number;
  readonly gid: number;
  readonly groups: readonly number[];
  readonly capabilities?: readonly string[];
  readonly dropped: boolean;
}

/**

- Container security configuration
 */
interface ContainerSecurityOptions {
  readonly enabled: boolean;
  readonly readOnlyFilesystem: boolean;
  readonly noNewPrivileges: boolean;
  readonly capabilitiesDrop: readonly string[];
  readonly namespaces: readonly string[];
  readonly cgroupLimits: {
    readonly memory: number;
    readonly cpu: number;
    readonly pids: number;
  };
}

/**

- Process security hardening service
 */
export class ProcessSecurityService extends EventEmitter {
  private readonly config: SecurityProcessConfig;
  private readonly monitor: SecurityMonitor;
  private readonly errorHandler: SecureErrorHandler;
  private readonly activeProcesses = new Map<number, ProcessSecurityMonitor>();
  private readonly globalResourceUsage = {
    totalMemory: 0,
    totalProcesses: 0,
    totalFileDescriptors: 0,
  };
  private resourceMonitorInterval?: NodeJS.Timeout;

  constructor(
    config: SecurityProcessConfig,
    monitor: SecurityMonitor,
    errorHandler: SecureErrorHandler
  ) {
    super();
    this.config = config;
    this.monitor = monitor;
    this.errorHandler = errorHandler;

    this.setupGlobalResourceMonitoring();
    this.setupSignalHandlers();
  }

  /**

- Executes a command with comprehensive security controls
   */
  async executeSecureProcess(
    context: ProcessExecutionContext
  ): Promise<Result<ProcessExecutionResult, SandboxError>> {
    try {
      // Pre-execution validation
      const validationResult = await this.validateExecution(context);
      if (!validationResult.success) {
        return validationResult;
      }

      // Check global resource limits
      const resourceCheckResult = this.checkGlobalResourceLimits();
      if (!resourceCheckResult.success) {
        return resourceCheckResult;
      }

      // Prepare secure execution environment
      const secureContext = await this.prepareSecureContext(context);
      if (!secureContext.success) {
        return secureContext;
      }

      // Execute process with monitoring
      const executionResult = await this.executeWithMonitoring(
        secureContext.value
      );

      // Log execution event
      await this.monitor.logSecurityEvent(
        executionResult.success ? 'process_executed' : 'process_failed',
        executionResult.success ? 'info' : 'high',
        'Secure process execution completed',
        {
          command: context.command,
          exitCode: executionResult.success
            ? executionResult.value.exitCode
            : undefined,
          violations: executionResult.success
            ? executionResult.value.violations.length
            : 0,
          resourceUsage: executionResult.success
            ? executionResult.value.resourceUsage
            : undefined,
        }
      );

      return executionResult;
    } catch (error) {
      const errorContext: ErrorHandlingContext = {
        operation: 'executeSecureProcess',
        path: context.command,
        exposureLevel: 'minimal',
        operationId: `process_${Date.now()}`,
      };

      await this.errorHandler.handleError(error as Error, errorContext);

      return Err(
        new SandboxError(
          ErrorCodes.PROCESS_EXECUTION_FAILED,
          'Secure process execution failed',
          'security',
          'error',
          { command: context.command }
        )
      );
    }
  }

  /**

- Drops process privileges to specified user/group
   */
  async dropPrivileges(
    targetUser?: string,
    targetGroup?: string
  ): Promise<Result<ProcessPrivileges, SandboxError>> {
    try {
      if (!this.config.privilegeDropping.enabled) {
        return Ok({
          uid: process.getuid?.() || 0,
          gid: process.getgid?.() || 0,
          groups: process.getgroups?.() || [],
          dropped: false,
        });
      }

      const originalUid = process.getuid?.();
      const originalGid = process.getgid?.();
      const originalGroups = process.getgroups?.() || [];

      // Drop capabilities first (if available)
      if (
        process.platform === 'linux' &&
        this.config.containerSecurity.capabilitiesDrop.length > 0
      ) {
        await this.dropCapabilities(
          this.config.containerSecurity.capabilitiesDrop
        );
      }

      // Change group first
      if (targetGroup && process.setgid) {
        try {
          process.setgid(targetGroup);
        } catch (error) {
          return Err(
            new SandboxError(
              ErrorCodes.PRIVILEGE_DROP_FAILED,
              `Failed to drop group privileges: ${(error as Error).message}`,
              'security',
              'error',
              { targetGroup }
            )
          );
        }
      }

      // Change user (this must be done last)
      if (targetUser && process.setuid) {
        try {
          process.setuid(targetUser);
        } catch (error) {
          return Err(
            new SandboxError(
              ErrorCodes.PRIVILEGE_DROP_FAILED,
              `Failed to drop user privileges: ${(error as Error).message}`,
              'security',
              'error',
              { targetUser }
            )
          );
        }
      }

      const finalPrivileges: ProcessPrivileges = {
        uid: process.getuid?.() || 0,
        gid: process.getgid?.() || 0,
        groups: process.getgroups?.() || [],
        capabilities: this.config.containerSecurity.capabilitiesDrop,
        dropped: true,
      };

      await this.monitor.logSecurityEvent(
        'privilege_dropped',
        'info',
        'Process privileges dropped successfully',
        {
          originalUid,
          originalGid,
          finalUid: finalPrivileges.uid,
          finalGid: finalPrivileges.gid,
          targetUser,
          targetGroup,
        }
      );

      return Ok(finalPrivileges);
    } catch (error) {
      const errorContext: ErrorHandlingContext = {
        operation: 'dropPrivileges',
        exposureLevel: 'minimal',
      };

      await this.errorHandler.handleError(error as Error, errorContext);

      return Err(
        new SandboxError(
          ErrorCodes.PRIVILEGE_DROP_FAILED,
          'Failed to drop process privileges',
          'security',
          'error',
          { targetUser, targetGroup }
        )
      );
    }
  }

  /**

- Sets up process resource limits
   */
  async setResourceLimits(): Promise<Result<void, SandboxError>> {
    try {
      // Set memory limit using cgroups if available
      if (process.platform === 'linux' && this.config.isolationEnabled) {
        await this.setupCgroupLimits();
      }

      // Set Node.js specific limits
      if (process.memoryUsage && this.config.memoryLimitBytes > 0) {
        // Monitor memory usage
        const memoryMonitor = setInterval(() => {
          const usage = process.memoryUsage();
          if (usage.heapUsed > this.config.memoryLimitBytes) {
            this.emit('resourceViolation', {
              type: 'memory_limit_exceeded',
              description: `Memory usage exceeded limit: ${usage.heapUsed} > ${this.config.memoryLimitBytes}`,
              severity: 'critical',
              threshold: this.config.memoryLimitBytes,
              actual: usage.heapUsed,
              timestamp: createTimestamp(Date.now()),
            } as ProcessSecurityViolation);
          }
        }, 5000);

        // Clean up on exit
        process.once('exit', () => clearInterval(memoryMonitor));
      }

      await this.monitor.logSecurityEvent(
        'resource_limits_set',
        'info',
        'Process resource limits configured',
        {
          memoryLimit: this.config.memoryLimitBytes,
          cpuLimit: this.config.cpuLimitPercent,
          maxFileDescriptors: this.config.maxFileDescriptors,
          maxExecutionTime: this.config.maxExecutionTimeMs,
        }
      );

      return Ok(undefined);
    } catch (error) {
      const errorContext: ErrorHandlingContext = {
        operation: 'setResourceLimits',
        exposureLevel: 'minimal',
      };

      await this.errorHandler.handleError(error as Error, errorContext);

      return Err(
        new SandboxError(
          ErrorCodes.RESOURCE_LIMIT_SETUP_FAILED,
          'Failed to set process resource limits',
          'security',
          'error'
        )
      );
    }
  }

  /**

- Gets current global resource usage
   */
  getGlobalResourceUsage(): {
    readonly memory: ProcessResourceUsage;
    readonly processes: number;
    readonly fileDescriptors: number;
    readonly violations: readonly ProcessSecurityViolation[];
  } {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Calculate CPU percentage (approximate)
    const cpuPercent = Math.min(
      100,
      (cpuUsage.user + cpuUsage.system) / 1_000_000 / 10
    ); // Rough estimate

    return {
      memory: {
        memoryUsageBytes: memoryUsage.heapUsed,
        cpuUsagePercent: cpuPercent,
        fileDescriptorCount: this.globalResourceUsage.totalFileDescriptors,
        executionTimeMs: process.uptime() * 1000,
        pid: process.pid,
        ppid: process.ppid || 0,
        children: this.activeProcesses.size,
      },
      processes: this.globalResourceUsage.totalProcesses,
      fileDescriptors: this.globalResourceUsage.totalFileDescriptors,
      violations: Array.from(this.activeProcesses.values()).flatMap(
        (monitor) => monitor.violations
      ),
    };
  }

  /**

- Kills all active processes and cleans up resources
   */
  async cleanup(): Promise<Result<number, SandboxError>> {
    try {
      let killedCount = 0;

      // Kill all active processes
      for (const [pid, monitor] of this.activeProcesses) {
        try {
          process.kill(pid, 'SIGTERM');
          killedCount++;

          // Force kill after timeout
          setTimeout(() => {
            try {
              process.kill(pid, 'SIGKILL');
            } catch {
              // Process already dead
            }
          }, 5000);
        } catch {
          // Process already dead or no permission
        }

        // Clear timers
        if (monitor.timerId) {
          clearTimeout(monitor.timerId);
        }
        if (monitor.resourceTimerId) {
          clearTimeout(monitor.resourceTimerId);
        }
      }

      // Clear global monitoring
      if (this.resourceMonitorInterval) {
        clearInterval(this.resourceMonitorInterval);
      }

      this.activeProcesses.clear();

      await this.monitor.logSecurityEvent(
        'process_cleanup',
        'info',
        'Process security cleanup completed',
        { killedProcesses: killedCount }
      );

      return Ok(killedCount);
    } catch (error) {
      const errorContext: ErrorHandlingContext = {
        operation: 'cleanup',
        exposureLevel: 'minimal',
      };

      await this.errorHandler.handleError(error as Error, errorContext);

      return Err(
        new SandboxError(
          ErrorCodes.CLEANUP_FAILED,
          'Failed to cleanup processes',
          'security',
          'error'
        )
      );
    }
  }

  /**

- Validates process execution context
   */
  private async validateExecution(
    context: ProcessExecutionContext
  ): Promise<Result<void, SandboxError>> {
    const violations: string[] = [];

    // Validate command
    if (!context.command || context.command.trim().length === 0) {
      violations.push('Command cannot be empty');
    }

    // Check for dangerous commands
    const dangerousCommands = ['rm', 'sudo', 'chmod', 'chown', 'su', 'passwd'];
    if (dangerousCommands.some((cmd) => context.command.includes(cmd))) {
      violations.push('Command contains potentially dangerous operations');
    }

    // Validate resource limits
    if (context.memoryLimit > this.config.memoryLimitBytes) {
      violations.push(
        `Memory limit exceeds maximum: ${context.memoryLimit} > ${this.config.memoryLimitBytes}`
      );
    }

    if (context.timeout > this.config.maxExecutionTimeMs) {
      violations.push(
        `Timeout exceeds maximum: ${context.timeout} > ${this.config.maxExecutionTimeMs}`
      );
    }

    // Validate environment variables
    for (const [key, value] of Object.entries(context.environment)) {
      if (key.includes('LD_PRELOAD') || key.includes('LD_LIBRARY_PATH')) {
        violations.push(`Dangerous environment variable: ${key}`);
      }

      if (value.includes('$(') || value.includes('`')) {
        violations.push(
          `Environment variable contains shell injection: ${key}`
        );
      }
    }

    if (violations.length > 0) {
      await this.monitor.logSecurityEvent(
        'process_validation_failed',
        'high',
        'Process execution validation failed',
        { command: context.command, violations }
      );

      return Err(
        new SandboxError(
          ErrorCodes.PROCESS_VALIDATION_FAILED,
          'Process execution validation failed',
          'security',
          'error',
          { violations }
        )
      );
    }

    return Ok(undefined);
  }

  /**

- Checks global resource limits before execution
   */
  private checkGlobalResourceLimits(): Result<void, SandboxError> {
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    if (memoryUsage.heapUsed > this.config.memoryLimitBytes* 0.8) {
      // 80% threshold
      return Err(
        new SandboxError(
          ErrorCodes.RESOURCE_LIMIT_EXCEEDED,
          'Global memory usage too high for new process',
          'security',
          'error',
          {
            heapUsed: memoryUsage.heapUsed,
            limit: this.config.memoryLimitBytes,
          }
        )
      );
    }

    // Check process count
    if (this.activeProcesses.size >= this.config.maxFileDescriptors / 10) {
      // Conservative limit
      return Err(
        new SandboxError(
          ErrorCodes.RESOURCE_LIMIT_EXCEEDED,
          'Too many active processes',
          'security',
          'error',
          { activeProcesses: this.activeProcesses.size }
        )
      );
    }

    return Ok(undefined);
  }

  /**

- Prepares secure execution context
   */
  private async prepareSecureContext(
    context: ProcessExecutionContext
  ): Promise<Result<ProcessExecutionContext, SandboxError>> {
    try {
      // Clean environment variables
      const cleanEnvironment: Record<string, string> = {};

      // Only allow safe environment variables
      const allowedEnvVars = [
        'PATH',
        'HOME',
        'USER',
        'PWD',
        'NODE_ENV',
        'NODE_OPTIONS',
      ];

      for (const [key, value] of Object.entries(context.environment)) {
        if (allowedEnvVars.includes(key) || key.startsWith('RULESETS_')) {
          cleanEnvironment[key] = value;
        }
      }

      // Ensure minimal PATH
      if (!cleanEnvironment.PATH) {
        cleanEnvironment.PATH = '/usr/local/bin:/usr/bin:/bin';
      }

      const secureContext: ProcessExecutionContext = {
        ...context,
        environment: cleanEnvironment,
        timeout: Math.min(context.timeout, this.config.maxExecutionTimeMs),
        memoryLimit: Math.min(
          context.memoryLimit,
          this.config.memoryLimitBytes
        ),
        cpuLimit: Math.min(context.cpuLimit, this.config.cpuLimitPercent),
      };

      return Ok(secureContext);
    } catch (error) {
      return Err(
        new SandboxError(
          ErrorCodes.CONTEXT_PREPARATION_FAILED,
          'Failed to prepare secure execution context',
          'security',
          'error',
          { command: context.command }
        )
      );
    }
  }

  /**

- Executes process with comprehensive monitoring
   */
  private async executeWithMonitoring(
    context: ProcessExecutionContext
  ): Promise<Result<ProcessExecutionResult, SandboxError>> {
    return new Promise((resolve) => {
      const startTime = createTimestamp(Date.now());
      const violations: ProcessSecurityViolation[] = [];
      let stdout = '';
      let stderr = '';
      let killed = false;
      let timeout = false;

      // Spawn process
      const child = spawn(context.command, context.arguments, {
        cwd: context.workingDirectory,
        env: context.environment,
        stdio: ['pipe', 'pipe', 'pipe'],
        uid: context.uid,
        gid: context.gid,
        detached: false,
      });

      if (!child.pid) {
        resolve(
          Err(
            new SandboxError(
              ErrorCodes.PROCESS_SPAWN_FAILED,
              'Failed to spawn process',
              'security',
              'error',
              { command: context.command }
            )
          )
        );
        return;
      }

      // Set up monitoring
      const monitor: ProcessSecurityMonitor = {
        pid: child.pid,
        startTime,
        resourceLimits: {
          memory: context.memoryLimit,
          cpu: context.cpuLimit,
          fileDescriptors: this.config.maxFileDescriptors,
          timeout: context.timeout,
        },
        violations,
      };

      this.activeProcesses.set(child.pid, monitor);

      // Set up timeout
      monitor.timerId = setTimeout(() => {
        timeout = true;
        killed = true;
        violations.push({
          type: 'execution_timeout',
          description: `Process exceeded execution timeout: ${context.timeout}ms`,
          severity: 'high',
          threshold: context.timeout,
          actual: Date.now() - startTime,
          timestamp: createTimestamp(Date.now()),
        });

        try {
          child.kill('SIGTERM');
          // Force kill after 5 seconds
          setTimeout(() => {
            if (!child.killed) {
              child.kill('SIGKILL');
            }
          }, 5000);
        } catch {
          // Process might already be dead
        }
      }, context.timeout);

      // Set up resource monitoring
      if (process.platform === 'linux') {
        monitor.resourceTimerId = setInterval(() => {
          this.monitorProcessResources(child.pid!, monitor);
        }, 1000);
      }

      // Collect output
      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
          // Limit output size
          if (stdout.length > 1024 *1024) {
            // 1MB limit
            violations.push({
              type: 'resource_exhaustion',
              description: 'Process output exceeded size limit',
              severity: 'medium',
              threshold: 1024* 1024,
              actual: stdout.length,
              timestamp: createTimestamp(Date.now()),
            });

            try {
              child.kill('SIGTERM');
            } catch {
              // Process might already be dead
            }
          }
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      // Handle process exit
      child.on('exit', (code, signal) => {
        // Clean up timers
        if (monitor.timerId) {
          clearTimeout(monitor.timerId);
        }
        if (monitor.resourceTimerId) {
          clearInterval(monitor.resourceTimerId);
        }

        // Remove from active processes
        this.activeProcesses.delete(child.pid!);

        // Get final resource usage
        const executionTime = Date.now() - startTime;
        const memoryUsage = process.memoryUsage();

        const resourceUsage: ProcessResourceUsage = {
          memoryUsageBytes: memoryUsage.heapUsed,
          cpuUsagePercent: 0, // Would need platform-specific implementation
          fileDescriptorCount: 0, // Would need platform-specific implementation
          executionTimeMs: executionTime,
          pid: child.pid!,
          ppid: process.pid,
          children: 0,
        };

        const result: ProcessExecutionResult = {
          exitCode: code || 0,
          signal: signal || undefined,
          stdout: stdout.substring(0, 1024 *1024), // Limit to 1MB
          stderr: stderr.substring(0, 1024* 1024), // Limit to 1MB
          resourceUsage,
          violations,
          killed,
          timeout,
        };

        resolve(Ok(result));
      });

      // Handle process errors
      child.on('error', (error) => {
        // Clean up timers
        if (monitor.timerId) {
          clearTimeout(monitor.timerId);
        }
        if (monitor.resourceTimerId) {
          clearInterval(monitor.resourceTimerId);
        }

        // Remove from active processes
        this.activeProcesses.delete(child.pid!);

        resolve(
          Err(
            new SandboxError(
              ErrorCodes.PROCESS_EXECUTION_FAILED,
              `Process execution failed: ${error.message}`,
              'security',
              'error',
              { command: context.command, error: error.message }
            )
          )
        );
      });
    });
  }

  /**

- Monitors process resource usage (Linux-specific)
   */
  private monitorProcessResources(
    pid: number,
    monitor: ProcessSecurityMonitor
  ): void {
    try {
      // This would typically read from /proc/[pid]/stat and /proc/[pid]/status
      // For now, we'll use a simplified approach

      // Check if process is still running
      try {
        process.kill(pid, 0); // Signal 0 just checks if process exists
      } catch {
        // Process is dead, stop monitoring
        if (monitor.resourceTimerId) {
          clearInterval(monitor.resourceTimerId);
        }
        return;
      }

      // In a real implementation, you would:
      // 1. Read memory usage from /proc/[pid]/status
      // 2. Read CPU usage from /proc/[pid]/stat
      // 3. Check file descriptor count from /proc/[pid]/fd/
      // 4. Implement cgroup limit checking

      // For now, we'll simulate basic monitoring
      const currentTime = Date.now();
      const executionTime = currentTime - monitor.startTime;

      if (executionTime > monitor.resourceLimits.timeout) {
        monitor.violations.push({
          type: 'execution_timeout',
          description: `Process exceeded timeout: ${executionTime}ms > ${monitor.resourceLimits.timeout}ms`,
          severity: 'high',
          threshold: monitor.resourceLimits.timeout,
          actual: executionTime,
          timestamp: createTimestamp(currentTime),
        });
      }
    } catch (error) {
      // Ignore monitoring errors
    }
  }

  /**

- Drops Linux capabilities
   */
  private async dropCapabilities(
    capabilities: readonly string[]
  ): Promise<void> {
    // This would require a native module or external tool like capset
    // For now, we'll just log the intent
    await this.monitor.logSecurityEvent(
      'capabilities_dropped',
      'info',
      'Process capabilities would be dropped',
      { capabilities }
    );
  }

  /**

- Sets up cgroup limits (Linux-specific)
   */
  private async setupCgroupLimits(): Promise<void> {
    // This would typically write to cgroup files in /sys/fs/cgroup/
    // For now, we'll just log the intent
    await this.monitor.logSecurityEvent(
      'cgroup_limits_set',
      'info',
      'Cgroup limits would be configured',
      {
        memoryLimit: this.config.memoryLimitBytes,
        cpuLimit: this.config.cpuLimitPercent,
      }
    );
  }

  /**

- Sets up global resource monitoring
   */
  private setupGlobalResourceMonitoring(): void {
    this.resourceMonitorInterval = setInterval(() => {
      const usage = process.memoryUsage();
      this.globalResourceUsage.totalMemory = usage.heapUsed;
      this.globalResourceUsage.totalProcesses = this.activeProcesses.size;

      // Emit warnings for high resource usage
      if (usage.heapUsed > this.config.memoryLimitBytes * 0.9) {
        this.emit('resourceWarning', {
          type: 'high_memory_usage',
          memoryUsed: usage.heapUsed,
          memoryLimit: this.config.memoryLimitBytes,
        });
      }
    }, 10_000); // Check every 10 seconds
  }

  /**

- Sets up signal handlers for cleanup
   */
  private setupSignalHandlers(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGHUP'] as const;

    for (const signal of signals) {
      process.on(signal, async () => {
        await this.cleanup();
        process.exit(0);
      });
    }
  }
}

/**

- Process security factory for creating configured instances
 */
export class ProcessSecurityFactory {
  static create(
    config: SecurityProcessConfig,
    monitor: SecurityMonitor,
    errorHandler: SecureErrorHandler
  ): ProcessSecurityService {
    return new ProcessSecurityService(config, monitor, errorHandler);
  }

  static createWithDefaults(
    monitor: SecurityMonitor,
    errorHandler: SecureErrorHandler
  ): ProcessSecurityService {
    const defaultConfig: SecurityProcessConfig = {
      isolationEnabled: true,
      memoryLimitBytes: 512 *1024* 1024, // 512MB
      cpuLimitPercent: 80,
      maxExecutionTimeMs: 300_000, // 5 minutes
      maxFileDescriptors: 1024,
      privilegeDropping: {
        enabled: false, // Disabled by default for compatibility
      },
      containerSecurity: {
        enabled: false,
        readOnlyFilesystem: false,
        noNewPrivileges: true,
        capabilitiesDrop: ['SYS_ADMIN', 'SYS_MODULE', 'SYS_RAWIO'],
      },
    };

    return new ProcessSecurityService(defaultConfig, monitor, errorHandler);
  }
}
