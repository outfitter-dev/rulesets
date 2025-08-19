/**

- @fileoverview Specific error types for the Rulesets Sandbox application
-
- Provides concrete error classes for different failure scenarios with
- appropriate error codes, context, and recovery suggestions.
 */

import type { ErrorContext, RecoverySuggestion } from './base';
import {
  CommonSuggestions,
  createRecoverySuggestion,
  ErrorCodes,
  SandboxError,
} from './base';

/**

- Validation errors for input validation failures
 */
export class ValidationError extends SandboxError {
  constructor(
    message: string,
    context: ErrorContext = {},
    suggestions: readonly RecoverySuggestion[] = [
      CommonSuggestions.validateInput,
    ]
  ) {
    super(
      ErrorCodes.VALIDATION_FAILED,
      message,
      'validation',
      'error',
      context,
      suggestions
    );
  }

  /**

- Creates a ValidationError for missing required fields
   */
  static missingRequiredField(
    fieldName: string,
    context: ErrorContext = {}
  ): ValidationError {
    return new ValidationError(
      `Missing required field: ${fieldName}`,
      { fieldName, ...context },
      [
        createRecoverySuggestion(
          `Provide a value for the required field '${fieldName}'`
        ),
        CommonSuggestions.checkDocumentation,
      ]
    );
  }

  /**

- Creates a ValidationError for invalid format
   */
  static invalidFormat(
    fieldName: string,
    expectedFormat: string,
    receivedValue: unknown,
    context: ErrorContext = {}
  ): ValidationError {
    return new ValidationError(
      `Invalid format for field '${fieldName}': expected ${expectedFormat}`,
      { fieldName, expectedFormat, receivedValue, ...context },
      [
        createRecoverySuggestion(
          `Ensure '${fieldName}' follows the format: ${expectedFormat}`
        ),
        CommonSuggestions.checkDocumentation,
      ]
    );
  }

  /**

- Creates a ValidationError for out-of-range values
   */
  static outOfRange(
    fieldName: string,
    min: number | string,
    max: number | string,
    receivedValue: unknown,
    context: ErrorContext = {}
  ): ValidationError {
    return new ValidationError(
      `Value for '${fieldName}' is out of range: must be between ${min} and ${max}`,
      { fieldName, min, max, receivedValue, ...context },
      [
        createRecoverySuggestion(
          `Provide a value for '${fieldName}' between ${min} and ${max}`
        ),
        CommonSuggestions.validateInput,
      ]
    );
  }
}

/**

- Compilation errors for ruleset processing failures
 */
export class CompilationError extends SandboxError {
  constructor(
    message: string,
    context: ErrorContext = {},
    suggestions: readonly RecoverySuggestion[] = []
  ) {
    super(
      ErrorCodes.COMPILATION_FAILED,
      message,
      'compilation',
      'error',
      context,
      suggestions
    );
  }

  /**

- Creates a CompilationError for parsing failures
   */
  static parseError(
    fileName: string,
    lineNumber?: number,
    columnNumber?: number,
    details?: string,
    context: ErrorContext = {}
  ): CompilationError {
    const location =
      lineNumber && columnNumber
        ? `at line ${lineNumber}, column ${columnNumber}`
        : '';
    const message = `Parse error in ${fileName}${location}${details ?`: ${details}`: ''}`;

    return new CompilationError(
      message,
      { fileName, lineNumber, columnNumber, details, ...context },
      [
        createRecoverySuggestion(`Check the syntax in ${fileName}${location}`),
        createRecoverySuggestion(
          'Ensure all opening markers have closing markers'
        ),
        CommonSuggestions.checkDocumentation,
      ]
    );
  }

  /**

- Creates a CompilationError for template processing failures
   */
  static templateError(
    templateName: string,
    details: string,
    context: ErrorContext = {}
  ): CompilationError {
    return new CompilationError(
      `Template error in ${templateName}: ${details}`,
      { templateName, details, ...context },
      [
        createRecoverySuggestion(
          `Review the template syntax in ${templateName}`
        ),
        createRecoverySuggestion('Ensure all template variables are defined'),
        CommonSuggestions.checkDocumentation,
      ]
    );
  }

  /**

- Creates a CompilationError for syntax errors
   */
  static syntaxError(
    fileName: string,
    syntaxIssue: string,
    context: ErrorContext = {}
  ): CompilationError {
    return new CompilationError(
      `Syntax error in ${fileName}: ${syntaxIssue}`,
      { fileName, syntaxIssue, ...context },
      [
        createRecoverySuggestion(`Fix the syntax issue: ${syntaxIssue}`),
        createRecoverySuggestion(
          'Validate the file against the Rulesets schema'
        ),
        CommonSuggestions.checkDocumentation,
      ]
    );
  }
}

/**

- File system errors for file and directory operations
 */
export class FileSystemError extends SandboxError {
  constructor(
    code: string,
    message: string,
    context: ErrorContext = {},
    suggestions: readonly RecoverySuggestion[] = []
  ) {
    super(code, message, 'filesystem', 'error', context, suggestions);
  }

  /**

- Creates a FileSystemError for file not found
   */
  static fileNotFound(
    filePath: string,
    context: ErrorContext = {}
  ): FileSystemError {
    return new FileSystemError(
      ErrorCodes.FILE_NOT_FOUND,
      `File not found: ${filePath}`,
      { filePath, ...context },
      [
        createRecoverySuggestion(`Verify that the file exists at: ${filePath}`),
        createRecoverySuggestion('Check the file path for typos'),
        CommonSuggestions.checkPermissions,
      ]
    );
  }

  /**

- Creates a FileSystemError for directory not found
   */
  static directoryNotFound(
    directoryPath: string,
    context: ErrorContext = {}
  ): FileSystemError {
    return new FileSystemError(
      ErrorCodes.DIRECTORY_NOT_FOUND,
      `Directory not found: ${directoryPath}`,
      { directoryPath, ...context },
      [
        createRecoverySuggestion(
          `Verify that the directory exists at: ${directoryPath}`
        ),
        createRecoverySuggestion('Create the directory if it should exist'),
        CommonSuggestions.checkPermissions,
      ]
    );
  }

  /**

- Creates a FileSystemError for permission denied
   */
  static permissionDenied(
    path: string,
    operation: string,
    context: ErrorContext = {}
  ): FileSystemError {
    return new FileSystemError(
      ErrorCodes.PERMISSION_DENIED,
      `Permission denied: cannot ${operation} ${path}`,
      { path, operation, ...context },
      [
        createRecoverySuggestion(`Grant ${operation} permissions for: ${path}`),
        createRecoverySuggestion('Check the file/directory ownership'),
        createRecoverySuggestion(
          'Run with appropriate privileges if necessary'
        ),
      ]
    );
  }

  /**

- Creates a FileSystemError for path traversal detection
   */
  static pathTraversalDetected(
    path: string,
    context: ErrorContext = {}
  ): FileSystemError {
    return new FileSystemError(
      ErrorCodes.PATH_TRAVERSAL_DETECTED,
      `Path traversal detected in: ${path}`,
      { path, ...context },
      [
        createRecoverySuggestion(
          'Use relative paths within the project directory'
        ),
        createRecoverySuggestion('Remove any ".." sequences from the path'),
        createRecoverySuggestion('Use only forward slashes in paths'),
      ]
    );
  }

  /**

- Always retryable for transient filesystem issues
   */
  public override isRetryable(): boolean {
    return (
      this.code !== ErrorCodes.PERMISSION_DENIED &&
      this.code !== ErrorCodes.PATH_TRAVERSAL_DETECTED
    );
  }
}

/**

- Configuration errors for configuration loading and validation
 */
export class ConfigurationError extends SandboxError {
  constructor(
    message: string,
    context: ErrorContext = {},
    suggestions: readonly RecoverySuggestion[] = [
      CommonSuggestions.checkConfiguration,
    ]
  ) {
    super(
      ErrorCodes.CONFIG_INVALID,
      message,
      'configuration',
      'error',
      context,
      suggestions
    );
  }

  /**

- Creates a ConfigurationError for missing configuration file
   */
  static configNotFound(
    configPath: string,
    context: ErrorContext = {}
  ): ConfigurationError {
    return new ConfigurationError(
      `Configuration file not found: ${configPath}`,
      { configPath, ...context },
      [
        createRecoverySuggestion(
          `Create a configuration file at: ${configPath}`
        ),
        createRecoverySuggestion('Use the default configuration template'),
        CommonSuggestions.checkDocumentation,
      ]
    );
  }

  /**

- Creates a ConfigurationError for invalid configuration format
   */
  static invalidFormat(
    configPath: string,
    details: string,
    context: ErrorContext = {}
  ): ConfigurationError {
    return new ConfigurationError(
      `Invalid configuration format in ${configPath}: ${details}`,
      { configPath, details, ...context },
      [
        createRecoverySuggestion('Validate the configuration file syntax'),
        createRecoverySuggestion('Check for missing quotes, commas, or braces'),
        CommonSuggestions.checkDocumentation,
      ]
    );
  }

  /**

- Creates a ConfigurationError for missing required configuration
   */
  static missingRequired(
    configKey: string,
    configPath: string,
    context: ErrorContext = {}
  ): ConfigurationError {
    return new ConfigurationError(
      `Missing required configuration key '${configKey}' in ${configPath}`,
      { configKey, configPath, ...context },
      [
        createRecoverySuggestion(
          `Add the required configuration key: ${configKey}`
        ),
        createRecoverySuggestion('Check the configuration schema'),
        CommonSuggestions.checkDocumentation,
      ]
    );
  }
}

/**

- Provider errors for provider-related failures
 */
export class ProviderError extends SandboxError {
  constructor(
    message: string,
    context: ErrorContext = {},
    suggestions: readonly RecoverySuggestion[] = []
  ) {
    super(
      ErrorCodes.PROVIDER_INVALID,
      message,
      'provider',
      'error',
      context,
      suggestions
    );
  }

  /**

- Creates a ProviderError for provider not found
   */
  static providerNotFound(
    providerId: string,
    context: ErrorContext = {}
  ): ProviderError {
    return new ProviderError(
      `Provider not found: ${providerId}`,
      { providerId, ...context },
      [
        createRecoverySuggestion(
          `Install the provider plugin for: ${providerId}`
        ),
        createRecoverySuggestion('Check the provider ID for typos'),
        createRecoverySuggestion(
          'Verify the provider is enabled in configuration'
        ),
      ]
    );
  }

  /**

- Creates a ProviderError for initialization failure
   */
  static initializationFailed(
    providerId: string,
    reason: string,
    context: ErrorContext = {}
  ): ProviderError {
    return new ProviderError(
      `Failed to initialize provider ${providerId}: ${reason}`,
      { providerId, reason, ...context },
      [
        createRecoverySuggestion('Check the provider configuration'),
        createRecoverySuggestion(
          'Verify all required dependencies are installed'
        ),
        CommonSuggestions.checkDocumentation,
      ]
    );
  }

  /**

- Creates a ProviderError for invalid provider configuration
   */
  static invalidConfiguration(
    providerId: string,
    configIssue: string,
    context: ErrorContext = {}
  ): ProviderError {
    return new ProviderError(
      `Invalid configuration for provider ${providerId}: ${configIssue}`,
      { providerId, configIssue, ...context },
      [
        createRecoverySuggestion(`Fix the configuration issue: ${configIssue}`),
        createRecoverySuggestion('Validate the provider configuration schema'),
        CommonSuggestions.checkDocumentation,
      ]
    );
  }
}

/**

- Security errors for security-related violations
 */
export class SecurityError extends SandboxError {
  constructor(
    message: string,
    context: ErrorContext = {},
    suggestions: readonly RecoverySuggestion[] = []
  ) {
    super(
      ErrorCodes.SECURITY_VIOLATION,
      message,
      'security',
      'critical',
      context,
      suggestions
    );
  }

  /**

- Creates a SecurityError for malicious input detection
   */
  static maliciousInputDetected(
    inputType: string,
    pattern: string,
    context: ErrorContext = {}
  ): SecurityError {
    return new SecurityError(
      `Malicious input detected in ${inputType}: potential ${pattern}`,
      { inputType, pattern, ...context },
      [
        createRecoverySuggestion('Remove any potentially malicious content'),
        createRecoverySuggestion('Use only trusted input sources'),
        createRecoverySuggestion(
          'Contact security team if this was unexpected'
        ),
      ]
    );
  }

  /**

- Creates a SecurityError for unauthorized access attempts
   */
  static unauthorizedAccess(
    resource: string,
    action: string,
    context: ErrorContext = {}
  ): SecurityError {
    return new SecurityError(
      `Unauthorized attempt to ${action} ${resource}`,
      { resource, action, ...context },
      [
        createRecoverySuggestion(
          'Verify you have permission to access this resource'
        ),
        createRecoverySuggestion('Check your authentication credentials'),
        createRecoverySuggestion('Contact an administrator for access'),
      ]
    );
  }

  /**

- Security errors are never retryable
   */
  public override isRetryable(): boolean {
    return false;
  }
}

/**

- Export all error types and utilities
 */
export* from './base';
