/**

- @fileoverview Branded types for the Rulesets Sandbox application
- Provides compile-time safety and runtime validation for core domain values
-
- These branded types prevent common programming errors by making illegal states
- unrepresentable through the type system. Each type includes comprehensive
- runtime validation to ensure data integrity.
 */

import type { Opaque } from 'type-fest';

// Compilation Request and Result IDs
export type CompilationRequestId = Opaque<string, 'CompilationRequestId'>;
export type CompilationResultId = Opaque<string, 'CompilationResultId'>;

// File system paths with security validation
export type SafeFilePath = Opaque<string, 'SafeFilePath'>;
export type SafeDirectoryPath = Opaque<string, 'SafeDirectoryPath'>;

// Configuration identifiers
export type ConfigurationKey = Opaque<string, 'ConfigurationKey'>;
export type ProviderType = Opaque<string, 'ProviderType'>;

// Content types for processing
export type SourceContent = Opaque<string, 'SourceContent'>;
export type CompiledContent = Opaque<string, 'CompiledContent'>;
export type TemplateContent = Opaque<string, 'TemplateContent'>;

// Timestamp for tracking
export type Timestamp = Opaque<number, 'Timestamp'>;

// Version information
export type SemanticVersion = Opaque<string, 'SemanticVersion'>;

// Error codes for structured error handling
export type ErrorCode = Opaque<string, 'ErrorCode'>;

// Log levels for structured logging
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

/**

- Comprehensive validation error with rich context information
 */
export class BrandValidationError extends Error {
  public readonly brandType: string;
  public readonly value: unknown;
  public readonly context?: Record<string, unknown> | undefined;
  public readonly suggestions?: readonly string[] | undefined;

  constructor(
    brandType: string,
    value: unknown,
    message: string,
    context?: Record<string, unknown>,
    suggestions?: readonly string[]
  ) {
    super(`Invalid ${brandType}: ${message}`);
    this.name = 'BrandValidationError';
    this.brandType = brandType;
    this.value = value;
    this.context = context;
    this.suggestions = suggestions;
  }
}

// Pre-compiled regex patterns for performance
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
const SAFE_PATH_PATTERN = /^[a-zA-Z0-9._/-]+$/;
// biome-ignore lint/suspicious/noControlCharactersInRegex: Intentionally detecting control characters for security validation
const CONTROL_CHARS_PATTERN = /[\x00-\x1f\x7f]/;
const CONFIG_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]*$/;
const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

/**

- Creates a compilation request ID with UUID v4 validation
 */
export function createCompilationRequestId(
  value: string
): CompilationRequestId {
  if (!value || typeof value !== 'string') {
    throw new BrandValidationError(
      'CompilationRequestId',
      value,
      'must be a non-empty string'
    );
  }

  if (!UUID_V4_PATTERN.test(value)) {
    throw new BrandValidationError(
      'CompilationRequestId',
      value,
      'must be a valid UUID v4',
      { pattern: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx' }
    );
  }

  return value as CompilationRequestId;
}

/**

- Creates a compilation result ID with UUID v4 validation
 */
export function createCompilationResultId(value: string): CompilationResultId {
  if (!value || typeof value !== 'string') {
    throw new BrandValidationError(
      'CompilationResultId',
      value,
      'must be a non-empty string'
    );
  }

  if (!UUID_V4_PATTERN.test(value)) {
    throw new BrandValidationError(
      'CompilationResultId',
      value,
      'must be a valid UUID v4',
      { pattern: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx' }
    );
  }

  return value as CompilationResultId;
}

/**

- Creates a safe file path with comprehensive security validation
 */
export function createSafeFilePath(value: string): SafeFilePath {
  if (!value || typeof value !== 'string') {
    throw new BrandValidationError(
      'SafeFilePath',
      value,
      'must be a non-empty string'
    );
  }

  // Prevent absolute paths for portability and security
  if (value.startsWith('/') || value.match(/^[a-zA-Z]:\\/)) {
    throw new BrandValidationError(
      'SafeFilePath',
      value,
      'absolute paths not allowed for security',
      { suggestion: 'Use relative paths only' }
    );
  }

  // Prevent path traversal attacks
  if (value.includes('../') || value.includes('..\\')) {
    throw new BrandValidationError(
      'SafeFilePath',
      value,
      'path traversal not allowed',
      { attackType: 'directory_traversal' }
    );
  }

  // Prevent access to hidden files
  if (value.includes('/.') || value.startsWith('.')) {
    throw new BrandValidationError(
      'SafeFilePath',
      value,
      'hidden files not allowed',
      { securityReason: 'hidden_file_access' }
    );
  }

  // Character validation for security
  if (!SAFE_PATH_PATTERN.test(value)) {
    throw new BrandValidationError(
      'SafeFilePath',
      value,
      'contains invalid characters',
      { allowedChars: 'a-z, A-Z, 0-9, ., _, /, -' }
    );
  }

  // Prevent control characters
  if (CONTROL_CHARS_PATTERN.test(value)) {
    throw new BrandValidationError(
      'SafeFilePath',
      value,
      'control characters not allowed',
      { securityReason: 'injection_prevention' }
    );
  }

  // Length validation
  if (value.length > 260) {
    // Windows MAX_PATH limit
    throw new BrandValidationError(
      'SafeFilePath',
      value,
      'path too long (max 260 characters)',
      { maxLength: 260, actualLength: value.length }
    );
  }

  return value as SafeFilePath;
}

/**

- Creates a safe directory path with validation
 */
export function createSafeDirectoryPath(value: string): SafeDirectoryPath {
  if (!value || typeof value !== 'string') {
    throw new BrandValidationError(
      'SafeDirectoryPath',
      value,
      'must be a non-empty string'
    );
  }

  // Apply same security validations as file paths
  try {
    createSafeFilePath(value);
  } catch (error) {
    if (error instanceof BrandValidationError) {
      throw new BrandValidationError(
        'SafeDirectoryPath',
        value,
        error.message.replace('SafeFilePath', 'SafeDirectoryPath'),
        error.context
      );
    }
    throw error;
  }

  // Ensure directory path ends with / for consistency
  const normalizedPath = value.endsWith('/') ? value : `${value}/`;
  return normalizedPath as SafeDirectoryPath;
}

/**

- Creates a configuration key with validation
 */
export function createConfigurationKey(value: string): ConfigurationKey {
  if (!value || typeof value !== 'string') {
    throw new BrandValidationError(
      'ConfigurationKey',
      value,
      'must be a non-empty string'
    );
  }

  if (!CONFIG_KEY_PATTERN.test(value)) {
    throw new BrandValidationError(
      'ConfigurationKey',
      value,
      'must start with letter and contain only letters, numbers, dots, underscores, and hyphens',
      {
        pattern: '^[a-zA-Z][a-zA-Z0-9._-]*$',
        examples: ['database.host', 'api_key', 'feature-flag'],
      }
    );
  }

  if (value.length > 100) {
    throw new BrandValidationError(
      'ConfigurationKey',
      value,
      'must be at most 100 characters',
      { maxLength: 100, actualLength: value.length }
    );
  }

  return value as ConfigurationKey;
}

/**

- Validates provider types
 */
const VALID_PROVIDER_TYPES = [
  'cursor',
  'claude-code',
  'windsurf',
  'cline',
  'roo-code',
] as const;

export function createProviderType(value: string): ProviderType {
  if (!value || typeof value !== 'string') {
    throw new BrandValidationError(
      'ProviderType',
      value,
      'must be a non-empty string'
    );
  }

  if (
    !VALID_PROVIDER_TYPES.includes(
      value as (typeof VALID_PROVIDER_TYPES)[number]
    )
  ) {
    throw new BrandValidationError(
      'ProviderType',
      value,
      'must be a valid provider type',
      {
        validTypes: VALID_PROVIDER_TYPES,
        suggestion: `Use one of: ${VALID_PROVIDER_TYPES.join(', ')}`,
      }
    );
  }

  return value as ProviderType;
}

/**

- Creates source content with validation
 */
export function createSourceContent(
  value: string,
  maxLength = 1_000_000
): SourceContent {
  if (typeof value !== 'string') {
    throw new BrandValidationError('SourceContent', value, 'must be a string');
  }

  if (value.length > maxLength) {
    throw new BrandValidationError(
      'SourceContent',
      `${value.slice(0, 100)}...`,
      `content too long (max ${maxLength} characters)`,
      { actualLength: value.length, maxLength }
    );
  }

  // Prevent null bytes for security
  if (value.includes('\0')) {
    throw new BrandValidationError(
      'SourceContent',
      value,
      'null bytes not allowed',
      { securityReason: 'injection_prevention' }
    );
  }

  return value as SourceContent;
}

/**

- Creates compiled content with validation
 */
export function createCompiledContent(
  value: string,
  maxLength = 5_000_000
): CompiledContent {
  if (typeof value !== 'string') {
    throw new BrandValidationError(
      'CompiledContent',
      value,
      'must be a string'
    );
  }

  if (value.length > maxLength) {
    throw new BrandValidationError(
      'CompiledContent',
      `${value.slice(0, 100)}...`,
      `content too long (max ${maxLength} characters)`,
      { actualLength: value.length, maxLength }
    );
  }

  return value as CompiledContent;
}

/**

- Creates template content with validation
 */
export function createTemplateContent(
  value: string,
  maxLength = 100_000
): TemplateContent {
  if (typeof value !== 'string') {
    throw new BrandValidationError(
      'TemplateContent',
      value,
      'must be a string'
    );
  }

  if (value.length > maxLength) {
    throw new BrandValidationError(
      'TemplateContent',
      `${value.slice(0, 100)}...`,
      `content too long (max ${maxLength} characters)`,
      { actualLength: value.length, maxLength }
    );
  }

  // Basic template syntax validation
  const openBrackets = (value.match(/\{\{/g) || []).length;
  const closeBrackets = (value.match(/\}\}/g) || []).length;

  if (openBrackets !== closeBrackets) {
    throw new BrandValidationError(
      'TemplateContent',
      value,
      'unmatched template brackets',
      {
        openBrackets,
        closeBrackets,
        suggestion: 'Ensure all {{ have matching }}',
      }
    );
  }

  return value as TemplateContent;
}

/**

- Creates a validated timestamp
 */
export function createTimestamp(value: number): Timestamp {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new BrandValidationError('Timestamp', value, 'must be an integer');
  }

  if (value < 0) {
    throw new BrandValidationError('Timestamp', value, 'must be non-negative');
  }

  // Reasonable bounds check (not before 1970, not too far in future)
  const minTimestamp = 0; // Unix epoch
  const maxTimestamp = Date.now() + 365 * 24 * 60 * 60 * 1000; // One year from now

  if (value < minTimestamp || value > maxTimestamp) {
    throw new BrandValidationError(
      'Timestamp',
      value,
      'timestamp out of reasonable range',
      {
        minTimestamp,
        maxTimestamp,
        providedDate: new Date(value).toISOString(),
      }
    );
  }

  return value as Timestamp;
}

/**

- Creates a semantic version with validation
 */
export function createSemanticVersion(value: string): SemanticVersion {
  if (!value || typeof value !== 'string') {
    throw new BrandValidationError(
      'SemanticVersion',
      value,
      'must be a non-empty string'
    );
  }

  if (!SEMVER_PATTERN.test(value)) {
    throw new BrandValidationError(
      'SemanticVersion',
      value,
      'must be a valid semantic version',
      {
        pattern: 'MAJOR.MINOR.PATCH[-prerelease][+buildmetadata]',
        examples: ['1.0.0', '2.1.0-beta.1', '1.0.0+20230101'],
      }
    );
  }

  return value as SemanticVersion;
}

/**

- Creates an error code with validation
 */
export function createErrorCode(value: string): ErrorCode {
  if (!value || typeof value !== 'string') {
    throw new BrandValidationError(
      'ErrorCode',
      value,
      'must be a non-empty string'
    );
  }

  if (!ERROR_CODE_PATTERN.test(value)) {
    throw new BrandValidationError(
      'ErrorCode',
      value,
      'must be uppercase with underscores',
      {
        pattern: '^[A-Z][A-Z0-9_]*$',
        examples: ['VALIDATION_ERROR', 'FILE_NOT_FOUND', 'COMPILATION_FAILED'],
      }
    );
  }

  if (value.length > 50) {
    throw new BrandValidationError(
      'ErrorCode',
      value,
      'must be at most 50 characters',
      { maxLength: 50, actualLength: value.length }
    );
  }

  return value as ErrorCode;
}

/**

- Type guards for branded types
 */
export function isCompilationRequestId(
  value: unknown
): value is CompilationRequestId {
  try {
    if (typeof value !== 'string') return false;
    createCompilationRequestId(value);
    return true;
  } catch {
    return false;
  }
}

export function isCompilationResultId(
  value: unknown
): value is CompilationResultId {
  try {
    if (typeof value !== 'string') return false;
    createCompilationResultId(value);
    return true;
  } catch {
    return false;
  }
}

export function isSafeFilePath(value: unknown): value is SafeFilePath {
  try {
    if (typeof value !== 'string') return false;
    createSafeFilePath(value);
    return true;
  } catch {
    return false;
  }
}

export function isSafeDirectoryPath(
  value: unknown
): value is SafeDirectoryPath {
  try {
    if (typeof value !== 'string') return false;
    createSafeDirectoryPath(value);
    return true;
  } catch {
    return false;
  }
}

export function isSemanticVersion(value: unknown): value is SemanticVersion {
  try {
    if (typeof value !== 'string') return false;
    createSemanticVersion(value);
    return true;
  } catch {
    return false;
  }
}

export function isErrorCode(value: unknown): value is ErrorCode {
  try {
    if (typeof value !== 'string') return false;
    createErrorCode(value);
    return true;
  } catch {
    return false;
  }
}

/**

- Utility functions for generating branded type values
 */
export const BrandedTypeUtils = {
  generateCompilationRequestId: (): CompilationRequestId => {
    return createCompilationRequestId(crypto.randomUUID());
  },

  generateCompilationResultId: (): CompilationResultId => {
    return createCompilationResultId(crypto.randomUUID());
  },

  generateTimestamp: (): Timestamp => {
    return createTimestamp(Date.now());
  },

  normalizeFilePath: (path: string): SafeFilePath => {
    // Normalize slashes and remove leading ./
    const normalized = path.replace(/\\/g, '/').replace(/^\.\//, '');
    return createSafeFilePath(normalized);
  },

  normalizeDirectoryPath: (path: string): SafeDirectoryPath => {
    // Normalize slashes, ensure trailing slash
    const normalized = path.replace(/\\/g, '/');
    const withTrailingSlash = normalized.endsWith('/')
      ? normalized
      : `${normalized}/`;
    return createSafeDirectoryPath(withTrailingSlash);
  },
} as const;

/**

- Unsafe brand creators for performance-critical paths
- Use with extreme caution - validation must have already occurred
 */
export const UnsafeBrands = {
  compilationRequestId: (value: string): CompilationRequestId =>
    value as CompilationRequestId,
  compilationResultId: (value: string): CompilationResultId =>
    value as CompilationResultId,
  safeFilePath: (value: string): SafeFilePath => value as SafeFilePath,
  safeDirectoryPath: (value: string): SafeDirectoryPath =>
    value as SafeDirectoryPath,
  configurationKey: (value: string): ConfigurationKey =>
    value as ConfigurationKey,
  providerType: (value: string): ProviderType => value as ProviderType,
  sourceContent: (value: string): SourceContent => value as SourceContent,
  compiledContent: (value: string): CompiledContent => value as CompiledContent,
  templateContent: (value: string): TemplateContent => value as TemplateContent,
  timestamp: (value: number): Timestamp => value as Timestamp,
  semanticVersion: (value: string): SemanticVersion => value as SemanticVersion,
  errorCode: (value: string): ErrorCode => value as ErrorCode,
} as const;
