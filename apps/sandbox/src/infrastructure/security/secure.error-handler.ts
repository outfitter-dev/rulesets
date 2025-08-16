/**

- @fileoverview SecureErrorHandler - Safe Error Handling and Information Disclosure Prevention
-
- Provides enterprise-grade error handling with:
- - Information disclosure prevention
- - Safe error sanitization for public consumption
- - Comprehensive error logging and monitoring
- - Context-aware error responses
- - Security event integration
-
- Security Features:
- - Automatic PII and sensitive data scrubbing
- - Path and internal information sanitization
- - Context-based error response levels
- - Integration with security monitoring
- - Audit trail for all errors
 */

import {
  type ErrorCategory,
  ErrorCodes,
  type ErrorSeverity,
  SandboxError,
} from '@/domain/errors';
import type { Timestamp } from '@/shared/types/brands';
import { createTimestamp } from '@/shared/types/brands';
import { Err, Ok, type Result } from '@/shared/types/result';
import type { SecurityMonitor } from './security.monitor';

/**

- Error exposure levels for different contexts
 */
export type ErrorExposureLevel = 'none' | 'minimal' | 'detailed' | 'internal';

/**

- Public error response (safe for external consumption)
 */
export interface PublicError {
  readonly code: string;
  readonly message: string;
  readonly timestamp: Timestamp;
  readonly requestId?: string;
  readonly suggestions?: readonly string[];
  readonly documentation?: string;
}

/**

- Internal error context (for logging and debugging)
 */
export interface InternalErrorContext {
  readonly originalError: Error;
  readonly sanitizedError: PublicError;
  readonly stackTrace?: string;
  readonly context: Record<string, unknown>;
  readonly severity: ErrorSeverity;
  readonly category: ErrorCategory;
  readonly timestamp: Timestamp;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly operationId?: string;
  readonly path?: string;
  readonly sensitive: boolean;
  readonly scrubbed: readonly string[];
}

/**

- Error sanitization configuration
 */
export interface ErrorSanitizationConfig {
  readonly exposureLevel: ErrorExposureLevel;
  readonly includeStackTrace: boolean;
  readonly includeContext: boolean;
  readonly includeSuggestions: boolean;
  readonly maxMessageLength: number;
  readonly scrubPatterns: readonly RegExp[];
  readonly allowedFields: readonly string[];
  readonly sensitiveFields: readonly string[];
}

/**

- Context for error handling
 */
export interface ErrorHandlingContext {
  readonly userId?: string;
  readonly sessionId?: string;
  readonly operationId?: string;
  readonly requestId?: string;
  readonly path?: string;
  readonly operation?: string;
  readonly exposureLevel: ErrorExposureLevel;
  readonly userAgent?: string;
  readonly remoteAddress?: string;
}

/**

- Error statistics
 */
export interface ErrorStatistics {
  readonly totalErrors: number;
  readonly errorsByCategory: Record<ErrorCategory, number>;
  readonly errorsBySeverity: Record<ErrorSeverity, number>;
  readonly errorsByCode: Record<string, number>;
  readonly sensitiveErrorsBlocked: number;
  readonly informationLeaksBlocked: number;
  readonly averageResponseTime: number;
  readonly lastErrorTime: Timestamp;
}

/**

- Secure error handler error
 */
class SecureErrorHandlerError extends SandboxError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(ErrorCodes.INTERNAL_ERROR, message, 'security', 'error', context);
  }
}

/**

- Comprehensive secure error handler
 */
export class SecureErrorHandler {
  private readonly securityMonitor: SecurityMonitor;
  private readonly statistics: ErrorStatistics;
  private readonly defaultConfig: ErrorSanitizationConfig;

  // Patterns for detecting sensitive information
  private readonly sensitivePatterns = {
    // File paths (absolute paths, internal structure)
    paths: [
      /\/[a-zA-Z]:[\\/]/g, // Windows absolute paths
      /\/home\/[^/\s]+/g, // Unix home directories
      /\/var\/[^/\s]+/g, // System directories
      /\/etc\/[^/\s]+/g, // Configuration directories
      /\/tmp\/[^/\s]+/g, // Temporary directories
      /\/Users\/[^/\s]+/g, // macOS user directories
      /C:\\[^\\s]+/g, // Windows paths
    ],

    // Authentication and security
    credentials: [
      /password[=:\s]+[^\s]+/gi,
      /token[=:\s]+[^\s]+/gi,
      /api[_-]?key[=:\s]+[^\s]+/gi,
      /secret[=:\s]+[^\s]+/gi,
      /auth[=:\s]+[^\s]+/gi,
      /bearer\s+[^\s]+/gi,
      /basic\s+[^\s]+/gi,
    ],

    // System information
    systemInfo: [
      /version\s+\d+\.\d+\.\d+/gi,
      /build\s+\d+/gi,
      /node\s+v\d+\.\d+\.\d+/gi,
      /npm\s+\d+\.\d+\.\d+/gi,
    ],

    // Network information
    network: [
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, // IP addresses
      /localhost:\d+/g,
      /127\.0\.0\.1:\d+/g,
    ],

    // Database and connection strings
    database: [
      /mongodb:\/\/[^\s]+/gi,
      /postgres:\/\/[^\s]+/gi,
      /mysql:\/\/[^\s]+/gi,
      /redis:\/\/[^\s]+/gi,
    ],

    // Email and PII
    pii: [
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Email addresses
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN pattern
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card pattern
    ],
  };

  constructor(securityMonitor: SecurityMonitor) {
    this.securityMonitor = securityMonitor;
    this.statistics = this.initializeStatistics();
    this.defaultConfig = {
      exposureLevel: 'minimal',
      includeStackTrace: false,
      includeContext: false,
      includeSuggestions: true,
      maxMessageLength: 500,
      scrubPatterns: [
        ...this.sensitivePatterns.paths,
        ...this.sensitivePatterns.credentials,
        ...this.sensitivePatterns.network,
        ...this.sensitivePatterns.database,
        ...this.sensitivePatterns.pii,
      ],
      allowedFields: ['code', 'message', 'timestamp', 'suggestions'],
      sensitiveFields: [
        'stack',
        'context',
        'cause',
        'path',
        'userId',
        'sessionId',
      ],
    };
  }

  /**

- Handles an error safely with comprehensive sanitization
   */
  async handleError(
    error: Error,
    context: ErrorHandlingContext
  ): Promise<Result<InternalErrorContext, SandboxError>> {
    try {
      const startTime = Date.now();

      // Create sanitization config based on context
      const config = this.createSanitizationConfig(context);

      // Sanitize the error for public consumption
      const sanitizationResult = await this.sanitizeError(
        error,
        config,
        context
      );
      if (!sanitizationResult.success) {
        return sanitizationResult;
      }

      const { publicError, scrubbed, sensitive } = sanitizationResult.value;

      // Create internal error context
      const internalContext: InternalErrorContext = {
        originalError: error,
        sanitizedError: publicError,
        stackTrace: config.includeStackTrace ? error.stack : undefined,
        context: this.sanitizeContext(context, config),
        severity: this.determineSeverity(error),
        category: this.determineCategory(error),
        timestamp: createTimestamp(Date.now()),
        userId: context.userId,
        sessionId: context.sessionId,
        operationId: context.operationId,
        path: context.path,
        sensitive,
        scrubbed,
      };

      // Update statistics
      this.updateStatistics(internalContext);

      // Log to security monitor
      await this.logSecurityEvent(internalContext, context);

      // Log performance metrics
      const processingTime = Date.now() - startTime;
      if (processingTime > 100) {
        // Log slow error processing
        await this.securityMonitor.logSecurityEvent(
          'performance_degradation',
          'medium',
          'Slow error processing detected',
          {
            processingTime,
            errorType: error.constructor.name,
            operation: context.operation,
            path: context.path,
          }
        );
      }

      return Ok(internalContext);
    } catch (handlingError) {
      // Fallback error handling - must not throw
      const fallbackError = new SecureErrorHandlerError(
        'Error handling failed',
        {
          originalError: error.message,
          handlingError: (handlingError as Error).message,
          context: this.sanitizeContext(context, this.defaultConfig),
        }
      );

      return Err(fallbackError);
    }
  }

  /**

- Creates a safe public error response
   */
  createPublicError(error: Error, context: ErrorHandlingContext): PublicError {
    const config = this.createSanitizationConfig(context);
    const sanitizedMessage = this.sanitizeMessage(error.message, config);

    return {
      code: this.extractErrorCode(error),
      message: sanitizedMessage,
      timestamp: createTimestamp(Date.now()),
      requestId: context.requestId,
      suggestions: config.includeSuggestions
        ? this.getSafeSuggestions(error)
        : undefined,
      documentation: this.getDocumentationLink(error),
    };
  }

  /**

- Gets error statistics
   */
  getStatistics(): ErrorStatistics {
    return { ...this.statistics };
  }

  /**

- Resets statistics (for testing)
   */
  resetStatistics(): void {
    Object.assign(this.statistics, this.initializeStatistics());
  }

  /**

- Sanitizes an error for public consumption
   */
  private async sanitizeError(
    error: Error,
    config: ErrorSanitizationConfig,
    context: ErrorHandlingContext
  ): Promise<
    Result<
      {
        publicError: PublicError;
        scrubbed: readonly string[];
        sensitive: boolean;
      },
      SandboxError
    >

  > {
    try {
      const scrubbed: string[] = [];
      let sensitive = false;

      // Detect if error contains sensitive information
      const sensitivityCheck = this.detectSensitiveInformation(error);
      sensitive = sensitivityCheck.sensitive;
      scrubbed.push(...sensitivityCheck.patterns);

      // Create public error based on exposure level
      let publicMessage: string;

      switch (config.exposureLevel) {
        case 'none':
          publicMessage = 'An error occurred';
          break;

        case 'minimal':
          publicMessage = sensitive
            ? 'An error occurred'
            : this.sanitizeMessage(error.message, config);
          break;

        case 'detailed':
          publicMessage = this.sanitizeMessage(error.message, config);
          break;

        case 'internal':
          publicMessage = error.message; // No sanitization for internal use
          break;

        default:
          publicMessage = 'An error occurred';
      }

      // Truncate message if too long
      if (publicMessage.length > config.maxMessageLength) {
        publicMessage =
          publicMessage.substring(0, config.maxMessageLength - 3) + '...';
        scrubbed.push('message_truncated');
      }

      const publicError: PublicError = {
        code: this.extractErrorCode(error),
        message: publicMessage,
        timestamp: createTimestamp(Date.now()),
        requestId: context.requestId,
        suggestions: config.includeSuggestions
          ? this.getSafeSuggestions(error)
          : undefined,
        documentation: this.getDocumentationLink(error),
      };

      // If sensitive information was detected, log it
      if (sensitive) {
        await this.securityMonitor.logSecurityEvent(
          'policy_violation',
          'medium',
          'Sensitive information in error prevented from disclosure',
          {
            originalErrorType: error.constructor.name,
            scrubbedPatterns: scrubbed,
            operation: context.operation,
            path: context.path,
            exposureLevel: config.exposureLevel,
          }
        );
      }

      return Ok({ publicError, scrubbed, sensitive });
    } catch (sanitizationError) {
      return Err(
        new SecureErrorHandlerError('Error sanitization failed', {
          originalError: error.message,
          sanitizationError: (sanitizationError as Error).message,
        })
      );
    }
  }

  /**

- Detects sensitive information in error
   */
  private detectSensitiveInformation(error: Error): {
    sensitive: boolean;
    patterns: string[];
  } {
    const patterns: string[] = [];
    let sensitive = false;

    const content = `${error.message} ${error.stack || ''}`;

    // Check each pattern category
    for (const [category, categoryPatterns] of Object.entries(
      this.sensitivePatterns
    )) {
      for (const pattern of categoryPatterns) {
        if (pattern.test(content)) {
          sensitive = true;
          patterns.push(category);
          break; // One match per category is enough
        }
      }
    }

    return { sensitive, patterns };
  }

  /**

- Sanitizes a message by removing sensitive patterns
   */
  private sanitizeMessage(
    message: string,
    config: ErrorSanitizationConfig
  ): string {
    let sanitized = message;

    for (const pattern of config.scrubPatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized;
  }

  /**

- Sanitizes context information
   */
  private sanitizeContext(
    context: ErrorHandlingContext,
    config: ErrorSanitizationConfig
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(context)) {
      if (config.allowedFields.includes(key)) {
        if (typeof value === 'string') {
          sanitized[key] = this.sanitizeMessage(value, config);
        } else {
          sanitized[key] = value;
        }
      } else if (!config.sensitiveFields.includes(key)) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**

- Creates sanitization config based on context
   */
  private createSanitizationConfig(
    context: ErrorHandlingContext
  ): ErrorSanitizationConfig {
    const baseConfig = { ...this.defaultConfig };

    // Adjust config based on exposure level
    switch (context.exposureLevel) {
      case 'none':
        return {
          ...baseConfig,
          includeStackTrace: false,
          includeContext: false,
          includeSuggestions: false,
          maxMessageLength: 50,
        };

      case 'minimal':
        return baseConfig;

      case 'detailed':
        return {
          ...baseConfig,
          includeContext: true,
          maxMessageLength: 1000,
        };

      case 'internal':
        return {
          ...baseConfig,
          includeStackTrace: true,
          includeContext: true,
          maxMessageLength: Number.MAX_SAFE_INTEGER,
          scrubPatterns: [], // No scrubbing for internal
        };

      default:
        return baseConfig;
    }
  }

  /**

- Extracts error code from error
   */
  private extractErrorCode(error: Error): string {
    if (error instanceof SandboxError) {
      return error.code;
    }

    // Map common Node.js errors to codes
    if ('code' in error) {
      const nodeError = error as NodeJS.ErrnoException;
      switch (nodeError.code) {
        case 'ENOENT':
          return 'FILE_NOT_FOUND';
        case 'EACCES':
          return 'PERMISSION_DENIED';
        case 'EMFILE':
          return 'TOO_MANY_FILES';
        case 'ENOMEM':
          return 'OUT_OF_MEMORY';
        case 'ETIMEDOUT':
          return 'TIMEOUT';
        default:
          return nodeError.code || 'UNKNOWN_ERROR';
      }
    }

    return error.constructor.name || 'UNKNOWN_ERROR';
  }

  /**

- Determines error severity
   */
  private determineSeverity(error: Error): ErrorSeverity {
    if (error instanceof SandboxError) {
      return error.severity;
    }

    // Check error patterns for severity
    const message = error.message.toLowerCase();

    if (
      message.includes('security') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return 'critical';
    }

    if (message.includes('permission') || message.includes('access')) {
      return 'error';
    }

    if (message.includes('not found') || message.includes('invalid')) {
      return 'warning';
    }

    return 'error';
  }

  /**

- Determines error category
   */
  private determineCategory(error: Error): ErrorCategory {
    if (error instanceof SandboxError) {
      return error.category;
    }

    const message = error.message.toLowerCase();

    if (
      message.includes('file') ||
      message.includes('directory') ||
      message.includes('path')
    ) {
      return 'filesystem';
    }

    if (message.includes('config') || message.includes('setting')) {
      return 'configuration';
    }

    if (
      message.includes('compile') ||
      message.includes('parse') ||
      message.includes('syntax')
    ) {
      return 'compilation';
    }

    if (
      message.includes('security') ||
      message.includes('unauthorized') ||
      message.includes('permission')
    ) {
      return 'security';
    }

    if (
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('timeout')
    ) {
      return 'network';
    }

    return 'internal';
  }

  /**

- Gets safe suggestions for error recovery
   */
  private getSafeSuggestions(error: Error): readonly string[] {
    if (error instanceof SandboxError && error.suggestions.length > 0) {
      return error.suggestions.map((s) => s.description);
    }

    const code = this.extractErrorCode(error);

    const suggestions: Record<string, string[]> = {
      FILE_NOT_FOUND: ['Verify the file path exists', 'Check file permissions'],
      PERMISSION_DENIED: [
        'Check file permissions',
        'Ensure you have necessary access rights',
      ],
      VALIDATION_FAILED: [
        'Check input format',
        'Verify all required fields are provided',
      ],
      CONFIG_INVALID: [
        'Review configuration syntax',
        'Check for missing required settings',
      ],
      COMPILATION_FAILED: [
        'Check source file syntax',
        'Verify template formatting',
      ],
      SECURITY_VIOLATION: [
        'Review security policies',
        'Contact administrator if needed',
      ],
    };

    return (
      suggestions[code] || [
        'Please try again',
        'Contact support if problem persists',
      ]
    );
  }

  /**

- Gets documentation link for error
   */
  private getDocumentationLink(error: Error): string | undefined {
    const code = this.extractErrorCode(error);

    const documentationLinks: Record<string, string> = {
      VALIDATION_FAILED: '/docs/validation-errors',
      CONFIG_INVALID: '/docs/configuration',
      COMPILATION_FAILED: '/docs/compilation-errors',
      SECURITY_VIOLATION: '/docs/security-policies',
      FILE_NOT_FOUND: '/docs/file-operations',
    };

    return documentationLinks[code];
  }

  /**

- Logs security event for error
   */
  private async logSecurityEvent(
    internalContext: InternalErrorContext,
    handlingContext: ErrorHandlingContext
  ): Promise<void> {
    const eventType = internalContext.sensitive
      ? 'policy_violation'
      : 'system_anomaly';
    const severity = this.mapSeverityToEventSeverity(internalContext.severity);

    await this.securityMonitor.logSecurityEvent(
      eventType,
      severity,
      `Error handled: ${internalContext.sanitizedError.code}`,
      {
        errorCode: internalContext.sanitizedError.code,
        errorCategory: internalContext.category,
        errorSeverity: internalContext.severity,
        sensitive: internalContext.sensitive,
        scrubbedPatterns: internalContext.scrubbed,
        operation: handlingContext.operation,
        path: handlingContext.path,
        userId: handlingContext.userId,
        sessionId: handlingContext.sessionId,
        exposureLevel: handlingContext.exposureLevel,
        originalErrorType: internalContext.originalError.constructor.name,
      }
    );
  }

  /**

- Maps error severity to event severity
   */
  private mapSeverityToEventSeverity(
    severity: ErrorSeverity
  ): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    switch (severity) {
      case 'critical':
        return 'critical';
      case 'error':
        return 'high';
      case 'warning':
        return 'medium';
      case 'info':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**

- Updates error statistics
   */
  private updateStatistics(context: InternalErrorContext): void {
    (this.statistics as any).totalErrors++;
    (this.statistics as any).errorsByCategory[context.category]++;
    (this.statistics as any).errorsBySeverity[context.severity]++;
    (this.statistics as any).errorsByCode[context.sanitizedError.code] =
      (this.statistics.errorsByCode[context.sanitizedError.code] || 0) + 1;

    if (context.sensitive) {
      (this.statistics as any).sensitiveErrorsBlocked++;
    }

    if (context.scrubbed.length > 0) {
      (this.statistics as any).informationLeaksBlocked++;
    }

    (this.statistics as any).lastErrorTime = context.timestamp;
  }

  /**

- Initializes statistics
   */
  private initializeStatistics(): ErrorStatistics {
    return {
      totalErrors: 0,
      errorsByCategory: {
        validation: 0,
        configuration: 0,
        filesystem: 0,
        compilation: 0,
        provider: 0,
        network: 0,
        security: 0,
        internal: 0,
      },
      errorsBySeverity: {
        critical: 0,
        error: 0,
        warning: 0,
        info: 0,
      },
      errorsByCode: {},
      sensitiveErrorsBlocked: 0,
      informationLeaksBlocked: 0,
      averageResponseTime: 0,
      lastErrorTime: createTimestamp(Date.now()),
    };
  }
}
