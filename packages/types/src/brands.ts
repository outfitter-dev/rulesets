// Branded types for Rulesets with comprehensive validation and security
// Adopts Grapple patterns for type safety and runtime validation

import * as path from 'path';

// ============================================================================
// Brand Symbol System
// ============================================================================

/**
 * Unique symbol for branding types to prevent accidental mixing
 * Each branded type gets its own symbol for maximum type safety
 */
declare const __brand: unique symbol;

/**
 * Core branded type utility
 * Adopts Grapple's pattern of making branded types nominal rather than structural
 */
type Brand<T, TBrand extends string> = T & {
  readonly [__brand]: TBrand;
};

// ============================================================================
// Core Domain Brands
// ============================================================================

/**
 * Branded destination identifier
 * Ensures only valid destination IDs can be used throughout the system
 */
export type DestinationId = Brand<string, 'DestinationId'>;

/**
 * Branded source file path - paths to .rule.md or .md files
 * Enforces security checks and path validation
 */
export type SourcePath = Brand<string, 'SourcePath'>;

/**
 * Branded destination path - where compiled rules are written
 * Enforces path traversal protection and permission checks
 */
export type DestPath = Brand<string, 'DestPath'>;

/**
 * Branded block name - kebab-case identifiers for blocks
 * Ensures consistent naming conventions across the system
 */
export type BlockName = Brand<string, 'BlockName'>;

/**
 * Branded partial path - paths to reusable components in _partials/
 * Enforces partial-specific validation rules
 */
export type PartialPath = Brand<string, 'PartialPath'>;

/**
 * Branded variable name - valid variable identifiers
 * Ensures proper variable naming and prevents injection
 */
export type VariableName = Brand<string, 'VariableName'>;

/**
 * Branded property name - property identifiers with family validation
 * Enforces property naming conventions and prevents malicious properties
 */
export type PropertyName = Brand<string, 'PropertyName'>;

/**
 * Branded marker content - the raw text within {{...}} markers
 * Ensures safe processing of marker content
 */
export type MarkerContent = Brand<string, 'MarkerContent'>;

/**
 * Branded file content at different processing stages
 */
export type RawContent = Brand<string, 'RawContent'>;
export type CompiledContent = Brand<string, 'CompiledContent'>;
export type ValidatedContent = Brand<string, 'ValidatedContent'>;

/**
 * Branded version string for semantic versioning
 */
export type Version = Brand<string, 'Version'>;

/**
 * Branded JSON Schema definition
 */
export type SchemaId = Brand<string, 'SchemaId'>;

// ============================================================================
// Validation Errors
// ============================================================================

/**
 * Base class for all Rulesets validation errors
 * Provides structured error information for better debugging
 */
export abstract class RulesetValidationError extends Error {
  abstract readonly code: string;
  abstract readonly category: 'security' | 'syntax' | 'semantic' | 'runtime';
  
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      message: this.message,
      context: this.context,
    };
  }
}

/**
 * Security-related validation errors
 */
export class SecurityValidationError extends RulesetValidationError {
  readonly code = 'SECURITY_VIOLATION';
  readonly category = 'security' as const;
}

/**
 * Path-related security errors
 */
export class PathTraversalError extends SecurityValidationError {
  override readonly code = 'SECURITY_VIOLATION' as const;
  
  constructor(attemptedPath: string, basePath: string) {
    super(`Path traversal detected: '${attemptedPath}' would escape base directory '${basePath}'`, {
      attemptedPath,
      basePath,
    });
  }
}

/**
 * Invalid destination ID errors
 */
export class InvalidDestinationError extends RulesetValidationError {
  readonly code = 'INVALID_DESTINATION';
  readonly category = 'semantic' as const;
  
  constructor(destinationId: string, validDestinations: string[]) {
    super(`Invalid destination '${destinationId}'. Valid destinations: ${validDestinations.join(', ')}`, {
      destinationId,
      validDestinations,
    });
  }
}

/**
 * Block name validation errors
 */
export class InvalidBlockNameError extends RulesetValidationError {
  readonly code = 'INVALID_BLOCK_NAME';
  readonly category = 'syntax' as const;
  
  constructor(blockName: string, reason: string) {
    super(`Invalid block name '${blockName}': ${reason}`, {
      blockName,
      reason,
    });
  }
}

/**
 * Variable name validation errors
 */
export class InvalidVariableNameError extends RulesetValidationError {
  readonly code = 'INVALID_VARIABLE_NAME';
  readonly category = 'syntax' as const;
  
  constructor(variableName: string, reason: string) {
    super(`Invalid variable name '${variableName}': ${reason}`, {
      variableName,
      reason,
    });
  }
}

/**
 * Content size validation errors
 */
export class ContentSizeError extends RulesetValidationError {
  readonly code = 'CONTENT_SIZE_EXCEEDED';
  readonly category = 'runtime' as const;
  
  constructor(actualSize: number, maxSize: number, contentType: string) {
    super(`${contentType} size ${actualSize} bytes exceeds maximum ${maxSize} bytes`, {
      actualSize,
      maxSize,
      contentType,
    });
  }
}

// ============================================================================
// Validation Constants
// ============================================================================

/**
 * Security and validation limits
 */
export const VALIDATION_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_CONTENT_SIZE: 5 * 1024 * 1024, // 5MB for individual content blocks
  MAX_PATH_LENGTH: 4096, // Maximum path length
  MAX_BLOCK_NAME_LENGTH: 128,
  MAX_VARIABLE_NAME_LENGTH: 64,
  MAX_PROPERTY_NAME_LENGTH: 128,
  MAX_MARKER_CONTENT_LENGTH: 1024,
} as const;

/**
 * Valid destination IDs
 * Must be kept in sync with provider types
 */
export const VALID_DESTINATIONS = [
  'cursor',
  'windsurf', 
  'claude-code',
  'cline',
  'roo-code',
  'codex-cli',
  'codex-agent',
  'bolt',
  'v0',
  'replit',
  'github-copilot',
] as const;

/**
 * Reserved words that cannot be used as block names or variable names
 */
export const RESERVED_WORDS = [
  'if', 'else', 'for', 'while', 'function', 'var', 'let', 'const',
  'import', 'export', 'default', 'class', 'extends', 'implements',
  'null', 'undefined', 'true', 'false', 'this', 'super', 'new',
  'return', 'throw', 'try', 'catch', 'finally',
  // Rulesets-specific reserved words
  'block', 'import', 'variable', 'marker', 'destination', 'source',
  'compiled', 'ruleset', 'config', 'schema',
] as const;

/**
 * Dangerous characters that should be blocked in user input
 */
export const DANGEROUS_CHARS = [
  '\0', // null byte
  '\x08', // backspace
  '\x0c', // form feed
  '\x7f', // DEL
  '\x1b', // ESC
] as const;

/**
 * Path characters that indicate potential traversal attempts
 */
export const PATH_TRAVERSAL_PATTERNS = [
  '../',
  '..\\',
  '..',
  '//',
  '\\\\',
  '~/',
  '$HOME',
  '%USERPROFILE%',
] as const;

// ============================================================================
// Core Validation Functions
// ============================================================================

/**
 * Validates that a string contains only safe characters
 */
function validateSafeString(input: string, context: string): void {
  // Check for dangerous characters
  for (const char of DANGEROUS_CHARS) {
    if (input.includes(char)) {
      throw new SecurityValidationError(
        `Dangerous character detected in ${context}: '${char.charCodeAt(0).toString(16)}'`,
        { input, context, dangerousChar: char }
      );
    }
  }
  
  // Check for potential script injection patterns
  const scriptPatterns = [
    /<script/i,
    /javascript:/i,
    /data:text\/html/i,
    /vbscript:/i,
    /on\w+\s*=/i, // onevent handlers
  ];
  
  for (const pattern of scriptPatterns) {
    if (pattern.test(input)) {
      throw new SecurityValidationError(
        `Potentially malicious content detected in ${context}`,
        { input, context, pattern: pattern.source }
      );
    }
  }
}

/**
 * Validates and normalizes file paths with security checks
 */
function validatePath(userPath: string, basePath: string, context: string): string {
  if (!userPath || typeof userPath !== 'string') {
    throw new SecurityValidationError(`Invalid path in ${context}: path must be a non-empty string`);
  }
  
  if (userPath.length > VALIDATION_LIMITS.MAX_PATH_LENGTH) {
    throw new SecurityValidationError(`Path too long in ${context}: ${userPath.length} chars (max ${VALIDATION_LIMITS.MAX_PATH_LENGTH})`);
  }
  
  validateSafeString(userPath, context);
  
  // Check for path traversal patterns
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (userPath.includes(pattern)) {
      throw new PathTraversalError(userPath, basePath);
    }
  }
  
  // Resolve and normalize the path
  const resolved = path.isAbsolute(userPath)
    ? path.resolve(userPath)
    : path.resolve(basePath, userPath);
    
  const normalized = path.normalize(resolved);
  const baseDirResolved = path.resolve(basePath);
  
  // Ensure the resolved path is within the base directory
  if (!normalized.startsWith(baseDirResolved + path.sep) && normalized !== baseDirResolved) {
    throw new PathTraversalError(userPath, basePath);
  }
  
  return normalized;
}

/**
 * Validates kebab-case naming convention
 */
function validateKebabCase(input: string, context: string): void {
  const kebabCasePattern = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  
  if (!kebabCasePattern.test(input)) {
    throw new InvalidBlockNameError(
      input,
      `${context} must be in kebab-case format (lowercase letters, numbers, and hyphens only)`
    );
  }
}

/**
 * Validates variable naming convention
 */
function validateVariableNaming(input: string): void {
  const variablePattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
  
  if (!variablePattern.test(input)) {
    throw new InvalidVariableNameError(
      input,
      'must start with letter, underscore, or dollar sign, followed by letters, numbers, underscores, or dollar signs'
    );
  }
  
  if (RESERVED_WORDS.includes(input as any)) {
    throw new InvalidVariableNameError(input, 'cannot use reserved word');
  }
}

// ============================================================================
// Brand Creation Functions (Type Guards)
// ============================================================================

/**
 * Creates a validated DestinationId
 */
export function createDestinationId(id: string): DestinationId {
  if (!id || typeof id !== 'string') {
    throw new InvalidDestinationError(id, [...VALID_DESTINATIONS]);
  }
  
  validateSafeString(id, 'destination ID');
  
  if (!VALID_DESTINATIONS.includes(id as any)) {
    throw new InvalidDestinationError(id, [...VALID_DESTINATIONS]);
  }
  
  return id as DestinationId;
}

/**
 * Creates a validated SourcePath
 */
export function createSourcePath(filePath: string, basePath: string = process.cwd()): SourcePath {
  const normalized = validatePath(filePath, basePath, 'source path');
  
  // Additional validation for source files
  if (!normalized.endsWith('.md') && !normalized.endsWith('.rule.md')) {
    throw new SecurityValidationError(
      'Source path must end with .md or .rule.md',
      { filePath, normalized }
    );
  }
  
  return normalized as SourcePath;
}

/**
 * Creates a validated DestPath
 */
export function createDestPath(filePath: string, basePath: string = process.cwd()): DestPath {
  const normalized = validatePath(filePath, basePath, 'destination path');
  return normalized as DestPath;
}

/**
 * Creates a validated BlockName
 */
export function createBlockName(name: string): BlockName {
  if (!name || typeof name !== 'string') {
    throw new InvalidBlockNameError(name, 'must be a non-empty string');
  }
  
  if (name.length > VALIDATION_LIMITS.MAX_BLOCK_NAME_LENGTH) {
    throw new InvalidBlockNameError(
      name,
      `length ${name.length} exceeds maximum ${VALIDATION_LIMITS.MAX_BLOCK_NAME_LENGTH}`
    );
  }
  
  validateSafeString(name, 'block name');
  validateKebabCase(name, 'block name');
  
  if (RESERVED_WORDS.includes(name as any)) {
    throw new InvalidBlockNameError(name, 'cannot use reserved word');
  }
  
  return name as BlockName;
}

/**
 * Creates a validated PartialPath
 */
export function createPartialPath(filePath: string, basePath: string = process.cwd()): PartialPath {
  const normalized = validatePath(filePath, basePath, 'partial path');
  
  // Partials must be in _partials directory
  if (!normalized.includes('_partials') || !normalized.endsWith('.md')) {
    throw new SecurityValidationError(
      'Partial path must be in _partials directory and end with .md',
      { filePath, normalized }
    );
  }
  
  return normalized as PartialPath;
}

/**
 * Creates a validated VariableName
 */
export function createVariableName(name: string): VariableName {
  if (!name || typeof name !== 'string') {
    throw new InvalidVariableNameError(name, 'must be a non-empty string');
  }
  
  if (name.length > VALIDATION_LIMITS.MAX_VARIABLE_NAME_LENGTH) {
    throw new InvalidVariableNameError(
      name,
      `length ${name.length} exceeds maximum ${VALIDATION_LIMITS.MAX_VARIABLE_NAME_LENGTH}`
    );
  }
  
  validateSafeString(name, 'variable name');
  validateVariableNaming(name);
  
  return name as VariableName;
}

/**
 * Creates a validated PropertyName
 */
export function createPropertyName(name: string): PropertyName {
  if (!name || typeof name !== 'string') {
    throw new SecurityValidationError('Property name must be a non-empty string');
  }
  
  if (name.length > VALIDATION_LIMITS.MAX_PROPERTY_NAME_LENGTH) {
    throw new SecurityValidationError(
      `Property name length ${name.length} exceeds maximum ${VALIDATION_LIMITS.MAX_PROPERTY_NAME_LENGTH}`
    );
  }
  
  validateSafeString(name, 'property name');
  
  // Property names can be kebab-case with optional family prefix
  const propertyPattern = /^[a-z][a-z0-9]*(-[a-z0-9]+)*(\([^)]+\))?$/;
  if (!propertyPattern.test(name)) {
    throw new SecurityValidationError(
      `Invalid property name '${name}': must be kebab-case with optional parentheses value`
    );
  }
  
  return name as PropertyName;
}

/**
 * Creates validated MarkerContent
 */
export function createMarkerContent(content: string): MarkerContent {
  if (typeof content !== 'string') {
    throw new SecurityValidationError('Marker content must be a string');
  }
  
  if (content.length > VALIDATION_LIMITS.MAX_MARKER_CONTENT_LENGTH) {
    throw new ContentSizeError(
      content.length,
      VALIDATION_LIMITS.MAX_MARKER_CONTENT_LENGTH,
      'marker content'
    );
  }
  
  validateSafeString(content, 'marker content');
  
  return content as MarkerContent;
}

/**
 * Creates validated RawContent
 */
export function createRawContent(content: string): RawContent {
  if (typeof content !== 'string') {
    throw new SecurityValidationError('Raw content must be a string');
  }
  
  if (content.length > VALIDATION_LIMITS.MAX_FILE_SIZE) {
    throw new ContentSizeError(content.length, VALIDATION_LIMITS.MAX_FILE_SIZE, 'raw content');
  }
  
  return content as RawContent;
}

/**
 * Creates validated CompiledContent
 */
export function createCompiledContent(content: string): CompiledContent {
  if (typeof content !== 'string') {
    throw new SecurityValidationError('Compiled content must be a string');
  }
  
  if (content.length > VALIDATION_LIMITS.MAX_FILE_SIZE) {
    throw new ContentSizeError(content.length, VALIDATION_LIMITS.MAX_FILE_SIZE, 'compiled content');
  }
  
  return content as CompiledContent;
}

/**
 * Creates validated Version string
 */
export function createVersion(version: string): Version {
  if (!version || typeof version !== 'string') {
    throw new SecurityValidationError('Version must be a non-empty string');
  }
  
  validateSafeString(version, 'version');
  
  // Basic semantic versioning validation
  const semverPattern = /^\d+\.\d+\.\d+(-[\w.-]+)?(\+[\w.-]+)?$/;
  if (!semverPattern.test(version)) {
    throw new SecurityValidationError(
      `Invalid version format '${version}': must follow semantic versioning (e.g., 1.0.0)`
    );
  }
  
  return version as Version;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isDestinationId(value: unknown): value is DestinationId {
  return typeof value === 'string' && VALID_DESTINATIONS.includes(value as any);
}

export function isSourcePath(value: unknown): value is SourcePath {
  if (typeof value !== 'string') return false;
  try {
    createSourcePath(value);
    return true;
  } catch {
    return false;
  }
}

export function isDestPath(value: unknown): value is DestPath {
  if (typeof value !== 'string') return false;
  try {
    createDestPath(value);
    return true;
  } catch {
    return false;
  }
}

export function isBlockName(value: unknown): value is BlockName {
  if (typeof value !== 'string') return false;
  try {
    createBlockName(value);
    return true;
  } catch {
    return false;
  }
}

export function isVariableName(value: unknown): value is VariableName {
  if (typeof value !== 'string') return false;
  try {
    createVariableName(value);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extracts the underlying string value from any branded string type
 * Use sparingly and only when interfacing with untyped APIs
 */
export function unbrand<T extends string>(branded: Brand<string, T>): string {
  return branded as string;
}

/**
 * Safely converts unknown values to branded types with validation
 */
export function safeBrand<T extends Brand<string, any>>(
  value: unknown,
  brandFn: (input: string) => T
): T | null {
  if (typeof value !== 'string') return null;
  
  try {
    return brandFn(value);
  } catch {
    return null;
  }
}

/**
 * Batch validation for multiple values
 */
export function validateBatch<T>(
  values: unknown[],
  validator: (value: unknown) => T
): { valid: T[]; errors: Error[] } {
  const valid: T[] = [];
  const errors: Error[] = [];
  
  for (const value of values) {
    try {
      valid.push(validator(value));
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  return { valid, errors };
}