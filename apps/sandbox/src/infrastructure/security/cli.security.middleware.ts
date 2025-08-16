/**

- @fileoverview CLI Security Middleware
-
- Provides comprehensive security middleware for CLI commands:
- - Command line argument validation and sanitization
- - Command execution security controls
- - User context validation and session management
- - Rate limiting for CLI operations
- - Audit logging for all CLI interactions
- - Security headers and environment validation
-
- Security Features:
- - Input validation for all CLI arguments
- - Command injection prevention
- - Privilege escalation prevention
- - Resource limit enforcement
- - Real-time security monitoring
 */

import type { Command } from 'commander';
import { ErrorCodes, SandboxError } from '@/domain/errors';
import type { Timestamp } from '@/shared/types/brands';
import { createTimestamp } from '@/shared/types/brands';
import { Err, Ok, type Result } from '@/shared/types/result';
import type {
  ErrorHandlingContext,
  SecureErrorHandler,
  SecurityConfig,
  SecurityMonitor,
  SecurityValidator,
} from './index';

/**

- CLI security context
 */
export interface CLISecurityContext {
  readonly command: string;
  readonly arguments: readonly string[];
  readonly options: Record<string, unknown>;
  readonly user?: string;
  readonly sessionId: string;
  readonly timestamp: Timestamp;
  readonly environment: Record<string, string>;
  readonly workingDirectory: string;
  readonly executablePath: string;
}

/**

- CLI security validation result
 */
export interface CLISecurityValidation {
  readonly valid: boolean;
  readonly violations: readonly CLISecurityViolation[];
  readonly sanitizedArguments: readonly string[];
  readonly sanitizedOptions: Record<string, unknown>;
  readonly blockedCommands: readonly string[];
  readonly warnings: readonly string[];
}

/**

- CLI security violation
 */
export interface CLISecurityViolation {
  readonly type: CLISecurityViolationType;
  readonly argument?: string;
  readonly option?: string;
  readonly value?: string;
  readonly description: string;
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly suggestion: string;
}

/**

- CLI security violation types
 */
export type CLISecurityViolationType =
  | 'malicious_argument'
  | 'command_injection'
  | 'path_traversal'
  | 'privilege_escalation'
  | 'resource_abuse'
  | 'suspicious_pattern'
  | 'blocked_command'
  | 'invalid_option'
  | 'encoding_violation'
  | 'length_violation';

/**

- CLI security configuration
 */
export interface CLISecurityConfig {
  readonly argumentValidation: {
    readonly enabled: boolean;
    readonly maxArgumentLength: number;
    readonly maxArgumentCount: number;
    readonly allowedCharacters: RegExp;
    readonly blockedPatterns: readonly RegExp[];
  };
  readonly commandFiltering: {
    readonly enabled: boolean;
    readonly allowedCommands: readonly string[];
    readonly blockedCommands: readonly string[];
    readonly requireExplicitAllowlist: boolean;
  };
  readonly optionValidation: {
    readonly enabled: boolean;
    readonly maxOptionLength: number;
    readonly maxOptionCount: number;
    readonly strictTypeChecking: boolean;
  };
  readonly rateLimiting: {
    readonly enabled: boolean;
    readonly maxCommandsPerMinute: number;
    readonly maxFailuresPerMinute: number;
    readonly penaltyDurationMs: number;
  };
  readonly environmentValidation: {
    readonly enabled: boolean;
    readonly allowedVariables: readonly string[];
    readonly blockedVariables: readonly string[];
    readonly validateValues: boolean;
  };
}

/**

- CLI command execution context
 */
export interface CLIExecutionContext {
  readonly securityContext: CLISecurityContext;
  readonly validation: CLISecurityValidation;
  readonly resourceLimits: {
    readonly maxMemoryBytes: number;
    readonly maxExecutionTimeMs: number;
    readonly maxOutputSizeBytes: number;
  };
  readonly monitoring: {
    readonly logExecution: boolean;
    readonly logOutput: boolean;
    readonly logErrors: boolean;
  };
}

/**

- CLI security middleware
 */
export class CLISecurityMiddleware {
  private readonly validator: SecurityValidator;
  private readonly monitor: SecurityMonitor;
  private readonly errorHandler: SecureErrorHandler;
  private readonly config: CLISecurityConfig;
  private readonly sessionHistory = new Map<
    string,
    Array<{ command: string; timestamp: Timestamp }>

  >();
  private readonly failureCount = new Map<
    string,
    { count: number; lastFailure: Timestamp }
  >();

  constructor(
    validator: SecurityValidator,
    monitor: SecurityMonitor,
    errorHandler: SecureErrorHandler,
    config?: Partial<CLISecurityConfig>
  ) {
    this.validator = validator;
    this.monitor = monitor;
    this.errorHandler = errorHandler;
    this.config = this.mergeConfig(config);
  }

  /**

- Creates security middleware for Commander.js
   */
  createCommanderMiddleware(): (command: Command) => Command {
    return (command: Command) => {
      // Add global security options
      command
        .option('--security-session <id>', 'Security session ID for auditing')
        .option('--security-user <user>', 'User context for security logging')
        .option(
          '--security-disable-validation',
          'Disable security validation (dangerous)'
        )
        .hook('preAction', this.createPreActionHook())
        .hook('postAction', this.createPostActionHook());

      return command;
    };
  }

  /**

- Validates CLI security context
   */
  async validateCLIContext(
    context: CLISecurityContext
  ): Promise<Result<CLISecurityValidation, SandboxError>> {
    try {
      const violations: CLISecurityViolation[] = [];
      const warnings: string[] = [];
      const blockedCommands: string[] = [];

      // Command validation
      if (this.config.commandFiltering.enabled) {
        const commandResult = this.validateCommand(context.command);
        violations.push(...commandResult.violations);
        if (commandResult.blocked) {
          blockedCommands.push(context.command);
        }
      }

      // Argument validation
      const argumentResults = await this.validateArguments(context.arguments);
      violations.push(...argumentResults.violations);
      const sanitizedArguments = argumentResults.sanitized;

      // Option validation
      const optionResults = this.validateOptions(context.options);
      violations.push(...optionResults.violations);
      const sanitizedOptions = optionResults.sanitized;

      // Environment validation
      if (this.config.environmentValidation.enabled) {
        const envResults = this.validateEnvironment(context.environment);
        violations.push(...envResults.violations);
        warnings.push(...envResults.warnings);
      }

      // Rate limiting
      if (this.config.rateLimiting.enabled) {
        const rateLimitResult = this.checkRateLimit(
          context.sessionId,
          context.command
        );
        if (!rateLimitResult.success) {
          violations.push({
            type: 'resource_abuse',
            description: 'Command rate limit exceeded',
            severity: 'high',
            suggestion: 'Reduce command frequency',
          });
        }
      }

      // Session analysis
      const sessionResult = this.analyzeSession(
        context.sessionId,
        context.command
      );
      violations.push(...sessionResult.violations);
      warnings.push(...sessionResult.warnings);

      const validation: CLISecurityValidation = {
        valid: violations.length === 0 && blockedCommands.length === 0,
        violations,
        sanitizedArguments,
        sanitizedOptions,
        blockedCommands,
        warnings,
      };

      // Log security events
      await this.logValidationResults(context, validation);

      return Ok(validation);
    } catch (error) {
      const errorContext: ErrorHandlingContext = {
        operation: 'validateCLIContext',
        exposureLevel: 'minimal',
        operationId: `cli_validation_${Date.now()}`,
      };

      await this.errorHandler.handleError(error as Error, errorContext);

      return Err(
        new SandboxError(
          ErrorCodes.SECURITY_VIOLATION,
          'CLI security validation failed',
          'security',
          'error',
          { command: context.command }
        )
      );
    }
  }

  /**

- Creates execution context with security controls
   */
  async createExecutionContext(
    securityContext: CLISecurityContext,
    validation: CLISecurityValidation
  ): Promise<CLIExecutionContext> {
    const resourceLimits = {
      maxMemoryBytes: 512* 1024 *1024, // 512MB
      maxExecutionTimeMs: 300_000, // 5 minutes
      maxOutputSizeBytes: 10* 1024 * 1024, // 10MB
    };

    const monitoring = {
      logExecution: true,
      logOutput: !validation.violations.some((v) => v.severity === 'critical'),
      logErrors: true,
    };

    return {
      securityContext,
      validation,
      resourceLimits,
      monitoring,
    };
  }

  /**

- Executes command with security controls
   */
  async executeSecurely<T>(
    context: CLIExecutionContext,
    executor: () => Promise<T>
  ): Promise<Result<T, SandboxError>> {
    const startTime = Date.now();

    try {
      // Pre-execution logging
      if (context.monitoring.logExecution) {
        await this.monitor.logSecurityEvent(
          'access_granted',
          'info',
          'CLI command execution started',
          {
            command: context.securityContext.command,
            arguments: context.securityContext.arguments,
            sessionId: context.securityContext.sessionId,
            user: context.securityContext.user,
          }
        );
      }

      // Set up resource monitoring
      const memoryMonitor = this.createMemoryMonitor(
        context.resourceLimits.maxMemoryBytes
      );
      const timeoutHandle = setTimeout(() => {
        throw new Error('Command execution timeout');
      }, context.resourceLimits.maxExecutionTimeMs);

      try {
        // Execute command
        const result = await executor();

        // Clear timeout
        clearTimeout(timeoutHandle);
        memoryMonitor.stop();

        // Post-execution logging
        const executionTime = Date.now() - startTime;
        if (context.monitoring.logExecution) {
          await this.monitor.logSecurityEvent(
            'access_granted',
            'info',
            'CLI command execution completed',
            {
              command: context.securityContext.command,
              executionTime,
              sessionId: context.securityContext.sessionId,
              success: true,
            }
          );
        }

        return Ok(result);
      } catch (executionError) {
        clearTimeout(timeoutHandle);
        memoryMonitor.stop();

        // Handle execution error
        const errorContext: ErrorHandlingContext = {
          operation: 'executeCommand',
          path: context.securityContext.command,
          exposureLevel: 'minimal',
          sessionId: context.securityContext.sessionId,
          userId: context.securityContext.user,
        };

        const errorResult = await this.errorHandler.handleError(
          executionError as Error,
          errorContext
        );

        // Log execution failure
        if (context.monitoring.logErrors) {
          await this.monitor.logSecurityEvent(
            'access_denied',
            'medium',
            'CLI command execution failed',
            {
              command: context.securityContext.command,
              executionTime: Date.now() - startTime,
              sessionId: context.securityContext.sessionId,
              error: errorResult.success
                ? errorResult.value.sanitizedError.message
                : 'Unknown error',
            }
          );
        }

        if (errorResult.success) {
          return Err(
            new SandboxError(
              ErrorCodes.INTERNAL_ERROR,
              errorResult.value.sanitizedError.message,
              'security',
              'error',
              { command: context.securityContext.command }
            )
          );
        }

        return Err(
          new SandboxError(
            ErrorCodes.INTERNAL_ERROR,
            'Command execution failed',
            'security',
            'error',
            { command: context.securityContext.command }
          )
        );
      }
    } catch (error) {
      // Handle middleware error
      const errorContext: ErrorHandlingContext = {
        operation: 'executeSecurely',
        exposureLevel: 'minimal',
      };

      await this.errorHandler.handleError(error as Error, errorContext);

      return Err(
        new SandboxError(
          ErrorCodes.SECURITY_VIOLATION,
          'Secure execution failed',
          'security',
          'error'
        )
      );
    }
  }

  /**

- Validates command against allowlist/blocklist
   */
  private validateCommand(command: string): {
    violations: CLISecurityViolation[];
    blocked: boolean;
  } {
    const violations: CLISecurityViolation[] = [];
    let blocked = false;

    // Check blocked commands
    if (this.config.commandFiltering.blockedCommands.includes(command)) {
      violations.push({
        type: 'blocked_command',
        argument: command,
        description: 'Command is explicitly blocked',
        severity: 'critical',
        suggestion: 'Use an allowed command instead',
      });
      blocked = true;
    }

    // Check allowed commands (if using explicit allowlist)
    if (
      this.config.commandFiltering.requireExplicitAllowlist &&
      !this.config.commandFiltering.allowedCommands.includes(command)
    ) {
      violations.push({
        type: 'blocked_command',
        argument: command,
        description: 'Command not in allowlist',
        severity: 'high',
        suggestion: 'Request command to be added to allowlist',
      });
      blocked = true;
    }

    // Check for suspicious command patterns
    const suspiciousPatterns = [
      /rm\s+-rf/i,
      /sudo/i,
      /chmod\s+777/i,
      /curl.*\|.*sh/i,
      /wget.*\|.*sh/i,
      /nc\s+-l/i,
      /netcat\s+-l/i,
      /python.*-c.*os\.system/i,
      /eval\s*\(/i,
      /exec\s*\(/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(command)) {
        violations.push({
          type: 'suspicious_pattern',
          argument: command,
          description: 'Command contains suspicious patterns',
          severity: 'high',
          suggestion: 'Avoid using potentially dangerous command patterns',
        });
        break;
      }
    }

    return { violations, blocked };
  }

  /**

- Validates command line arguments
   */
  private async validateArguments(
    arguments_: readonly string[]
  ): Promise<{
    violations: CLISecurityViolation[];
    sanitized: readonly string[];
  }> {
    const violations: CLISecurityViolation[] = [];
    const sanitized: string[] = [];

    // Check argument count
    if (arguments_.length > this.config.argumentValidation.maxArgumentCount) {
      violations.push({
        type: 'resource_abuse',
        description: `Too many arguments (${arguments_.length} > ${this.config.argumentValidation.maxArgumentCount})`,
        severity: 'medium',
        suggestion: 'Reduce number of arguments',
      });
    }

    for (const arg of arguments_) {
      // Length validation
      if (arg.length > this.config.argumentValidation.maxArgumentLength) {
        violations.push({
          type: 'length_violation',
          argument: arg.substring(0, 50) + '...',
          description: 'Argument too long',
          severity: 'medium',
          suggestion: 'Use shorter arguments',
        });
        continue;
      }

      // Character validation
      if (!this.config.argumentValidation.allowedCharacters.test(arg)) {
        violations.push({
          type: 'invalid_option',
          argument: arg,
          description: 'Argument contains invalid characters',
          severity: 'medium',
          suggestion: 'Use only allowed characters',
        });
      }

      // Pattern validation
      for (const pattern of this.config.argumentValidation.blockedPatterns) {
        if (pattern.test(arg)) {
          violations.push({
            type: 'malicious_argument',
            argument: arg,
            description: 'Argument matches blocked pattern',
            severity: 'high',
            suggestion: 'Avoid using blocked patterns',
          });
          break;
        }
      }

      // File path validation
      if (arg.includes('/') || arg.includes('\\')) {
        const pathValidation = await this.validator.validateFilePath(arg);
        if (pathValidation.success && !pathValidation.value.valid) {
          violations.push({
            type: 'path_traversal',
            argument: arg,
            description: 'Argument contains path traversal attempt',
            severity: 'critical',
            suggestion: 'Use safe file paths',
          });
        }
      }

      // Sanitize argument
      const sanitizedArg = arg
        .replace(/[^\w\-._/]/g, '') // Remove special characters except basic ones
        .substring(0, this.config.argumentValidation.maxArgumentLength);

      sanitized.push(sanitizedArg);
    }

    return { violations, sanitized };
  }

  /**

- Validates command options
   */
  private validateOptions(options: Record<string, unknown>): {
    violations: CLISecurityViolation[];
    sanitized: Record<string, unknown>;
  } {
    const violations: CLISecurityViolation[] = [];
    const sanitized: Record<string, unknown> = {};

    const optionCount = Object.keys(options).length;
    if (optionCount > this.config.optionValidation.maxOptionCount) {
      violations.push({
        type: 'resource_abuse',
        description: `Too many options (${optionCount} > ${this.config.optionValidation.maxOptionCount})`,
        severity: 'medium',
        suggestion: 'Reduce number of options',
      });
    }

    for (const [key, value] of Object.entries(options)) {
      // Key validation
      if (key.length > 50) {
        violations.push({
          type: 'length_violation',
          option: key,
          description: 'Option name too long',
          severity: 'low',
          suggestion: 'Use shorter option names',
        });
        continue;
      }

      // Value validation
      if (typeof value === 'string') {
        if (value.length > this.config.optionValidation.maxOptionLength) {
          violations.push({
            type: 'length_violation',
            option: key,
            value: value.substring(0, 50) + '...',
            description: 'Option value too long',
            severity: 'medium',
            suggestion: 'Use shorter option values',
          });
        }

        // Check for injection patterns in string values
        const injectionPatterns = [
          /[;&|`$()]/,
          /<script/i,
          /javascript:/i,
          /vbscript:/i,
          /data:text\/html/i,
        ];

        for (const pattern of injectionPatterns) {
          if (pattern.test(value)) {
            violations.push({
              type: 'command_injection',
              option: key,
              value: value.substring(0, 50),
              description: 'Option value contains injection pattern',
              severity: 'critical',
              suggestion: 'Remove special characters from option values',
            });
            break;
          }
        }

        // Sanitize string value
        sanitized[key] = value
          .replace(/[<>'"&]/g, '') // Remove HTML/XML characters
          .substring(0, this.config.optionValidation.maxOptionLength);
      } else if (this.config.optionValidation.strictTypeChecking) {
        // Type validation for non-strings
        if (typeof value !== 'boolean' && typeof value !== 'number') {
          violations.push({
            type: 'invalid_option',
            option: key,
            description: 'Option value has invalid type',
            severity: 'low',
            suggestion: 'Use string, boolean, or number values',
          });
        }
        sanitized[key] = value;
      } else {
        sanitized[key] = value;
      }
    }

    return { violations, sanitized };
  }

  /**

- Validates environment variables
   */
  private validateEnvironment(environment: Record<string, string>): {
    violations: CLISecurityViolation[];
    warnings: string[];
  } {
    const violations: CLISecurityViolation[] = [];
    const warnings: string[] = [];

    for (const [key, value] of Object.entries(environment)) {
      // Check blocked variables
      if (this.config.environmentValidation.blockedVariables.includes(key)) {
        violations.push({
          type: 'blocked_command',
          option: key,
          description: 'Environment variable is blocked',
          severity: 'medium',
          suggestion: 'Remove blocked environment variable',
        });
      }

      // Check if using allowlist
      if (
        this.config.environmentValidation.allowedVariables.length > 0 &&
        !this.config.environmentValidation.allowedVariables.includes(key)
      ) {
        warnings.push(`Environment variable ${key} not in allowlist`);
      }

      // Validate values if enabled
      if (this.config.environmentValidation.validateValues && value) {
        // Check for suspicious values
        if (
          value.includes('$(') ||
          value.includes('`') ||
          value.includes('${')
        ) {
          violations.push({
            type: 'command_injection',
            option: key,
            value: value.substring(0, 50),
            description: 'Environment variable contains injection pattern',
            severity: 'high',
            suggestion: 'Remove shell metacharacters from environment values',
          });
        }
      }
    }

    return { violations, warnings };
  }

  /**

- Checks rate limiting for commands
   */
  private checkRateLimit(
    sessionId: string,
    command: string
  ): Result<void, SandboxError> {
    const now = Date.now();
    const windowMs = 60_000; // 1 minute

    // Get or create session history
    let history = this.sessionHistory.get(sessionId) || [];

    // Filter to current window
    history = history.filter((entry) => now - entry.timestamp < windowMs);

    // Check rate limit
    if (history.length >= this.config.rateLimiting.maxCommandsPerMinute) {
      return Err(
        new SandboxError(
          ErrorCodes.SECURITY_VIOLATION,
          'Command rate limit exceeded',
          'security',
          'error',
          { sessionId, command, count: history.length }
        )
      );
    }

    // Add current command to history
    history.push({ command, timestamp: createTimestamp(now) });
    this.sessionHistory.set(sessionId, history);

    return Ok(undefined);
  }

  /**

- Analyzes session for suspicious patterns
   */
  private analyzeSession(
    sessionId: string,
    command: string
  ): { violations: CLISecurityViolation[]; warnings: string[] } {
    const violations: CLISecurityViolation[] = [];
    const warnings: string[] = [];

    const history = this.sessionHistory.get(sessionId) || [];

    // Check for rapid command execution
    const recentCommands = history.filter(
      (entry) => Date.now() - entry.timestamp < 10_000 // Last 10 seconds
    );

    if (recentCommands.length > 10) {
      violations.push({
        type: 'resource_abuse',
        description: 'Rapid command execution detected',
        severity: 'medium',
        suggestion: 'Reduce command execution frequency',
      });
    }

    // Check for repeated failed commands
    const failures = this.failureCount.get(sessionId);
    if (failures && failures.count > 5) {
      violations.push({
        type: 'suspicious_pattern',
        description: 'Multiple command failures detected',
        severity: 'medium',
        suggestion: 'Check command syntax and permissions',
      });
    }

    // Check for escalation patterns
    const escalationCommands = ['sudo', 'su', 'chmod', 'chown'];
    const hasEscalation = escalationCommands.some((cmd) =>
      command.includes(cmd)
    );
    const recentEscalation = history.some((entry) =>
      escalationCommands.some((cmd) => entry.command.includes(cmd))
    );

    if (hasEscalation && recentEscalation) {
      violations.push({
        type: 'privilege_escalation',
        description: 'Privilege escalation pattern detected',
        severity: 'high',
        suggestion: 'Avoid repeated privilege escalation attempts',
      });
    }

    return { violations, warnings };
  }

  /**

- Logs validation results
   */
  private async logValidationResults(
    context: CLISecurityContext,
    validation: CLISecurityValidation
  ): Promise<void> {
    const eventType = validation.valid ? 'access_granted' : 'access_denied';
    const severity = validation.violations.some(
      (v) => v.severity === 'critical'
    )
      ? 'critical'
      : validation.violations.some((v) => v.severity === 'high')
        ? 'high'
        : 'medium';

    await this.monitor.logSecurityEvent(
      eventType,
      severity,
      'CLI security validation completed',
      {
        command: context.command,
        valid: validation.valid,
        violationCount: validation.violations.length,
        blockedCommands: validation.blockedCommands,
        sessionId: context.sessionId,
        user: context.user,
        violations: validation.violations.map((v) => ({
          type: v.type,
          severity: v.severity,
          description: v.description,
        })),
      }
    );
  }

  /**

- Creates pre-action hook for Commander.js
   */
  private createPreActionHook() {
    return async (thisCommand: Command) => {
      const context: CLISecurityContext = {
        command: thisCommand.name(),
        arguments: thisCommand.args,
        options: thisCommand.opts(),
        sessionId:
          thisCommand.opts().securitySession || `session_${Date.now()}`,
        user: thisCommand.opts().securityUser,
        timestamp: createTimestamp(Date.now()),
        environment: process.env as Record<string, string>,
        workingDirectory: process.cwd(),
        executablePath: process.argv[0] || 'unknown',
      };

      // Skip validation if explicitly disabled (dangerous!)
      if (thisCommand.opts().securityDisableValidation) {
        await this.monitor.logSecurityEvent(
          'policy_violation',
          'critical',
          'Security validation disabled',
          { command: context.command, sessionId: context.sessionId }
        );
        return;
      }

      const validation = await this.validateCLIContext(context);
      if (!(validation.success && validation.value.valid)) {
        throw new Error(
          `Security validation failed: ${
            validation.success
              ? validation.value.violations.map((v) => v.description).join(', ')
              : validation.error.message
          }`
        );
      }

      // Store validation result for post-action hook
      (thisCommand as any)._securityValidation = validation.value;
      (thisCommand as any)._securityContext = context;
    };
  }

  /**

- Creates post-action hook for Commander.js
   */
  private createPostActionHook() {
    return async (thisCommand: Command) => {
      const context = (thisCommand as any)._securityContext as
        | CLISecurityContext
        | undefined;

      if (context) {
        await this.monitor.logSecurityEvent(
          'access_granted',
          'info',
          'CLI command completed successfully',
          {
            command: context.command,
            sessionId: context.sessionId,
            user: context.user,
            duration: Date.now() - context.timestamp,
          }
        );
      }
    };
  }

  /**

- Creates memory monitor for resource limits
   */
  private createMemoryMonitor(maxMemoryBytes: number) {
    const interval = setInterval(() => {
      const memoryUsage = process.memoryUsage();
      if (memoryUsage.heapUsed > maxMemoryBytes) {
        clearInterval(interval);
        throw new Error('Memory limit exceeded');
      }
    }, 1000);

    return {
      stop: () => clearInterval(interval),
    };
  }

  /**

- Merges configuration with defaults
   */
  private mergeConfig(config?: Partial<CLISecurityConfig>): CLISecurityConfig {
    return {
      argumentValidation: {
        enabled: true,
        maxArgumentLength: 1000,
        maxArgumentCount: 50,
        allowedCharacters: /^[a-zA-Z0-9._/-]+$/,
        blockedPatterns: [
          /\.\.\//g,
          /[;&|`$()]/g,
          /<script/gi,
          /javascript:/gi,
        ],
        ...config?.argumentValidation,
      },
      commandFiltering: {
        enabled: true,
        allowedCommands: [],
        blockedCommands: ['rm', 'sudo', 'chmod', 'chown', 'su'],
        requireExplicitAllowlist: false,
        ...config?.commandFiltering,
      },
      optionValidation: {
        enabled: true,
        maxOptionLength: 1000,
        maxOptionCount: 20,
        strictTypeChecking: false,
        ...config?.optionValidation,
      },
      rateLimiting: {
        enabled: true,
        maxCommandsPerMinute: 60,
        maxFailuresPerMinute: 10,
        penaltyDurationMs: 300_000, // 5 minutes
        ...config?.rateLimiting,
      },
      environmentValidation: {
        enabled: true,
        allowedVariables: [],
        blockedVariables: ['LD_PRELOAD', 'LD_LIBRARY_PATH'],
        validateValues: true,
        ...config?.environmentValidation,
      },
    };
  }
}
