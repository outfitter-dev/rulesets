/**

- @fileoverview Base error classes for the Rulesets Sandbox application
-
- Provides a structured error hierarchy with proper inheritance, error codes,
- context information, and recovery suggestions. All errors include structured
- metadata for logging, monitoring, and user feedback.
 */

import type { ErrorCode, Timestamp } from '@/shared/types/brands';
import { createErrorCode, createTimestamp } from '@/shared/types/brands';

/**

- Severity levels for errors - matches common logging standards
 */
export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

/**

- Categories for error classification and handling
 */
export type ErrorCategory =
  | 'validation'
  | 'configuration'
  | 'filesystem'
  | 'compilation'
  | 'provider'
  | 'network'
  | 'security'
  | 'internal';

/**

- Context information for error debugging and recovery
 */
export interface ErrorContext {
  readonly [key: string]: unknown;
}

/**

- Recovery suggestions for error handling
 */
export interface RecoverySuggestion {
  readonly description: string;
  readonly action?: string;
  readonly automated?: boolean;
}

/**

- Base error class that all sandbox errors inherit from
- Provides rich context, error codes, and recovery information
 */
export abstract class SandboxError extends Error {
  public readonly code: ErrorCode;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly timestamp: Timestamp;
  public readonly context: ErrorContext;
  public readonly suggestions: readonly RecoverySuggestion[];
  public override readonly cause?: Error | undefined;

  constructor(
    code: string,
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity = 'error',
    context: ErrorContext = {},
    suggestions: readonly RecoverySuggestion[] = [],
    cause?: Error
  ) {
    super(message);

    Object.defineProperty(this, 'name', {
      value: this.constructor.name,
      configurable: true,
    });
    this.code = createErrorCode(code);
    this.category = category;
    this.severity = severity;
    this.timestamp = createTimestamp(Date.now());
    this.context = { ...context };
    this.suggestions = [...suggestions];
    this.cause = cause;

    // Maintain stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**

- Returns a user-friendly error message with context
   */
  public getUserMessage(): string {
    const baseMessage = `${this.message}`;

    if (this.suggestions.length > 0) {
      const suggestionText = this.suggestions
        .map((s) => `- ${s.description}`)
        .join('\n');
      return `${baseMessage}\n\nSuggestions:\n${suggestionText}`;
    }

    return baseMessage;
  }

  /**

- Returns structured error information for logging
   */
  public toStructuredLog(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      timestamp: this.timestamp,
      context: this.context,
      suggestions: this.suggestions,
      stack: this.stack,
      cause: this.cause?.message,
    };
  }

  /**

- Returns a JSON representation of the error
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      timestamp: this.timestamp,
      context: this.context,
      suggestions: this.suggestions,
    };
  }

  /**

- Checks if this error is retryable based on category and code
   */
  public isRetryable(): boolean {
    // Override in subclasses for specific retry logic
    return (
      this.category === 'network' ||
      this.category === 'filesystem' ||
      (this.category === 'internal' && this.severity !== 'critical')
    );
  }

  /**

- Checks if this error is recoverable with user action
   */
  public isRecoverable(): boolean {
    return this.suggestions.some((s) => !s.automated);
  }

  /**

- Gets automated recovery suggestions
   */
  public getAutomatedSuggestions(): readonly RecoverySuggestion[] {
    return this.suggestions.filter((s) => s.automated === true);
  }

  /**

- Gets manual recovery suggestions
   */
  public getManualSuggestions(): readonly RecoverySuggestion[] {
    return this.suggestions.filter((s) => s.automated !== true);
  }
}

/**

- Creates a recovery suggestion with proper typing
 */
export function createRecoverySuggestion(
  description: string,
  action?: string,
  automated = false
): RecoverySuggestion {
  return {
    description,
    ...(action !== undefined && { action }),
    automated,
  };
}

/**

- Common error codes used throughout the application
 */
export const ErrorCodes = {
  // Validation errors
  INVALID_INPUT: createErrorCode('INVALID_INPUT'),
  MISSING_REQUIRED_FIELD: createErrorCode('MISSING_REQUIRED_FIELD'),
  INVALID_FORMAT: createErrorCode('INVALID_FORMAT'),
  VALIDATION_FAILED: createErrorCode('VALIDATION_FAILED'),

  // Configuration errors
  CONFIG_NOT_FOUND: createErrorCode('CONFIG_NOT_FOUND'),
  CONFIG_INVALID: createErrorCode('CONFIG_INVALID'),
  CONFIG_LOAD_FAILED: createErrorCode('CONFIG_LOAD_FAILED'),

  // File system errors
  FILE_NOT_FOUND: createErrorCode('FILE_NOT_FOUND'),
  FILE_READ_FAILED: createErrorCode('FILE_READ_FAILED'),
  FILE_WRITE_FAILED: createErrorCode('FILE_WRITE_FAILED'),
  DIRECTORY_NOT_FOUND: createErrorCode('DIRECTORY_NOT_FOUND'),
  PERMISSION_DENIED: createErrorCode('PERMISSION_DENIED'),
  PATH_TRAVERSAL_DETECTED: createErrorCode('PATH_TRAVERSAL_DETECTED'),

  // Compilation errors
  COMPILATION_FAILED: createErrorCode('COMPILATION_FAILED'),
  PARSE_ERROR: createErrorCode('PARSE_ERROR'),
  TEMPLATE_ERROR: createErrorCode('TEMPLATE_ERROR'),
  SYNTAX_ERROR: createErrorCode('SYNTAX_ERROR'),
  REQUEST_NOT_FOUND: createErrorCode('REQUEST_NOT_FOUND'),
  RESULT_NOT_FOUND: createErrorCode('RESULT_NOT_FOUND'),

  // Provider errors
  PROVIDER_NOT_FOUND: createErrorCode('PROVIDER_NOT_FOUND'),
  PROVIDER_INVALID: createErrorCode('PROVIDER_INVALID'),
  PROVIDER_INITIALIZATION_FAILED: createErrorCode(
    'PROVIDER_INITIALIZATION_FAILED'
  ),

  // Security errors
  SECURITY_VIOLATION: createErrorCode('SECURITY_VIOLATION'),
  UNAUTHORIZED_ACCESS: createErrorCode('UNAUTHORIZED_ACCESS'),
  MALICIOUS_INPUT_DETECTED: createErrorCode('MALICIOUS_INPUT_DETECTED'),

  // Process security errors
  PROCESS_EXECUTION_FAILED: createErrorCode('PROCESS_EXECUTION_FAILED'),
  PROCESS_SPAWN_FAILED: createErrorCode('PROCESS_SPAWN_FAILED'),
  PROCESS_VALIDATION_FAILED: createErrorCode('PROCESS_VALIDATION_FAILED'),
  PRIVILEGE_DROP_FAILED: createErrorCode('PRIVILEGE_DROP_FAILED'),
  RESOURCE_LIMIT_SETUP_FAILED: createErrorCode('RESOURCE_LIMIT_SETUP_FAILED'),
  RESOURCE_LIMIT_EXCEEDED: createErrorCode('RESOURCE_LIMIT_EXCEEDED'),
  CONTEXT_PREPARATION_FAILED: createErrorCode('CONTEXT_PREPARATION_FAILED'),
  CLEANUP_FAILED: createErrorCode('CLEANUP_FAILED'),

  // Internal errors
  INTERNAL_ERROR: createErrorCode('INTERNAL_ERROR'),
  NOT_IMPLEMENTED: createErrorCode('NOT_IMPLEMENTED'),
  INVARIANT_VIOLATION: createErrorCode('INVARIANT_VIOLATION'),
  UNEXPECTED_STATE: createErrorCode('UNEXPECTED_STATE'),
} as const;

/**

- Common recovery suggestions for reuse across error types
 */
export const CommonSuggestions = {
  checkFileExists: createRecoverySuggestion(
    'Verify that the file exists and is accessible'
  ),

  checkPermissions: createRecoverySuggestion(
    'Check file and directory permissions'
  ),

  validateInput: createRecoverySuggestion(
    'Validate the input format and try again'
  ),

  checkConfiguration: createRecoverySuggestion(
    'Review the configuration file for errors'
  ),

  retryOperation: createRecoverySuggestion(
    'Retry the operation after a brief delay',
    'retry',
    true
  ),

  contactSupport: createRecoverySuggestion(
    'Contact support if the problem persists'
  ),

  checkDocumentation: createRecoverySuggestion(
    'Consult the documentation for proper usage'
  ),

  updateSoftware: createRecoverySuggestion(
    'Update to the latest version of the software'
  ),
} as const;

/**

- Type guard to check if an error is a SandboxError
 */
export function isSandboxError(error: unknown): error is SandboxError {
  return error instanceof SandboxError;
}

/**

- Type guard to check if an error has a specific error code
 */
export function hasErrorCode(
  error: unknown,
  code: ErrorCode
): error is SandboxError {
  return isSandboxError(error) && error.code === code;
}

/**

- Type guard to check if an error is in a specific category
 */
export function isErrorCategory(
  error: unknown,
  category: ErrorCategory
): error is SandboxError {
  return isSandboxError(error) && error.category === category;
}

/**

- Type guard to check if an error has a specific severity
 */
export function hasErrorSeverity(
  error: unknown,
  severity: ErrorSeverity
): error is SandboxError {
  return isSandboxError(error) && error.severity === severity;
}

/**

- Utility function to wrap a non-SandboxError as a SandboxError
 */
export function wrapError(
  error: unknown,
  code: ErrorCode,
  category: ErrorCategory,
  context: ErrorContext = {}
): SandboxError {
  if (isSandboxError(error)) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? error : undefined;

  return new (class extends SandboxError {
    constructor() {
      super(
        code,
        message,
        category,
        'error',
        context,
        [CommonSuggestions.contactSupport],
        cause
      );
    }
  })();
}
