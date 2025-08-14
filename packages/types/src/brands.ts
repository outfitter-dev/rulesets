/**
 * Branded types for Rulesets - Provider-based terminology
 * Provides compile-time safety and runtime validation for core domain values
 */

import type { Opaque } from 'type-fest';

/**
 * Brand types for core Rulesets domain values
 */
export type ProviderId = Opaque<string, 'ProviderId'>;
export type SourcePath = Opaque<string, 'SourcePath'>;
export type OutputPath = Opaque<string, 'OutputPath'>;
export type BlockName = Opaque<string, 'BlockName'>;
export type VariableName = Opaque<string, 'VariableName'>;
export type PropertyName = Opaque<string, 'PropertyName'>;
export type MarkerContent = Opaque<string, 'MarkerContent'>;
export type RawContent = Opaque<string, 'RawContent'>;
export type CompiledContent = Opaque<string, 'CompiledContent'>;
export type Version = Opaque<string, 'Version'>;

// Regular expression patterns defined at top level for performance
const KEBAB_CASE_PATTERN = /^[a-z][a-z0-9-]*[a-z0-9]$/;
const VARIABLE_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const VARIABLE_REST_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;
const PROPERTY_NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/;
// biome-ignore lint/suspicious/noControlCharactersInRegex: Intentionally detecting control characters for validation
const CONTROL_CHARS_PATTERN = /[\x00-\x1f\x7f]/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+([-\w.]+)?(\+[\w.]+)?$/;

/**
 * Brand validation errors with rich context
 */
export class BrandValidationError extends Error {
  readonly brandType: string;
  readonly value: unknown;
  readonly context?: Record<string, unknown>;

  constructor(
    brandType: string,
    value: unknown,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(`Invalid ${brandType}: ${message}`);
    this.name = 'BrandValidationError';
    this.brandType = brandType;
    this.value = value;
    this.context = context;
  }
}

/**
 * Provider ID validation and creation
 * Must match a known provider
 */
export const VALID_PROVIDERS = [
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
  'jules',
  'aider',
  'continue',
  'amp',
  'opencode',
] as const;

export type ValidProviderId = (typeof VALID_PROVIDERS)[number];

export function createProviderId(value: string): ProviderId {
  if (!value || typeof value !== 'string') {
    throw new BrandValidationError(
      'ProviderId',
      value,
      'must be a non-empty string'
    );
  }

  if (!VALID_PROVIDERS.includes(value as ValidProviderId)) {
    throw new BrandValidationError(
      'ProviderId',
      value,
      `must be one of: ${VALID_PROVIDERS.join(', ')}`,
      { validProviders: VALID_PROVIDERS }
    );
  }

  return value as ProviderId;
}

/**
 * Source path validation - for .rule.md and .md files
 * Enforces security and format requirements
 */
export function createSourcePath(value: string): SourcePath {
  if (!value || typeof value !== 'string') {
    throw new BrandValidationError(
      'SourcePath',
      value,
      'must be a non-empty string'
    );
  }

  // Must be relative path (no absolute paths for portability)
  if (value.startsWith('/')) {
    throw new BrandValidationError(
      'SourcePath',
      value,
      'must be a relative path (not starting with /)'
    );
  }

  // Must end with .md or .rule.md
  if (!(value.endsWith('.md') || value.endsWith('.rule.md'))) {
    throw new BrandValidationError(
      'SourcePath',
      value,
      'must end with .md or .rule.md'
    );
  }

  // Prevent path traversal
  if (value.includes('../') || value.includes('..\\')) {
    throw new BrandValidationError(
      'SourcePath',
      value,
      'path traversal not allowed'
    );
  }

  // Prevent hidden files (security)
  if (value.includes('/.') || value.startsWith('.')) {
    throw new BrandValidationError(
      'SourcePath',
      value,
      'hidden files not allowed'
    );
  }

  // Length limits
  if (value.length > 255) {
    throw new BrandValidationError(
      'SourcePath',
      value,
      'path too long (max 255 characters)'
    );
  }

  // Prevent null bytes and control characters
  if (CONTROL_CHARS_PATTERN.test(value)) {
    throw new BrandValidationError(
      'SourcePath',
      value,
      'control characters not allowed'
    );
  }

  return value as SourcePath;
}

/**
 * Output path validation - for compiled output
 */
export function createOutputPath(value: string): OutputPath {
  if (!value || typeof value !== 'string') {
    throw new BrandValidationError(
      'OutputPath',
      value,
      'must be a non-empty string'
    );
  }

  // Prevent path traversal
  if (value.includes('../') || value.includes('..\\')) {
    throw new BrandValidationError(
      'OutputPath',
      value,
      'path traversal not allowed'
    );
  }

  // Prevent absolute paths that might escape project
  if (value.startsWith('/') && !value.startsWith('/.')) {
    throw new BrandValidationError(
      'OutputPath',
      value,
      'absolute paths not recommended'
    );
  }

  // Length limits
  if (value.length > 255) {
    throw new BrandValidationError(
      'OutputPath',
      value,
      'path too long (max 255 characters)'
    );
  }

  // Prevent null bytes
  if (value.includes('\0')) {
    throw new BrandValidationError(
      'OutputPath',
      value,
      'null bytes not allowed'
    );
  }

  return value as OutputPath;
}

/**
 * Block name validation - kebab-case identifiers
 */
export function createBlockName(value: string): BlockName {
  if (!value || typeof value !== 'string') {
    throw new BrandValidationError(
      'BlockName',
      value,
      'must be a non-empty string'
    );
  }

  // Length limits
  if (value.length < 2) {
    throw new BrandValidationError(
      'BlockName',
      value,
      'must be at least 2 characters'
    );
  }

  if (value.length > 50) {
    throw new BrandValidationError(
      'BlockName',
      value,
      'must be at most 50 characters'
    );
  }

  // Must be kebab-case
  if (!KEBAB_CASE_PATTERN.test(value)) {
    throw new BrandValidationError(
      'BlockName',
      value,
      'must be kebab-case (e.g., user-instructions)'
    );
  }

  // Prevent double hyphens
  if (value.includes('--')) {
    throw new BrandValidationError(
      'BlockName',
      value,
      'cannot contain consecutive hyphens'
    );
  }

  return value as BlockName;
}

/**
 * Variable name validation - $-prefixed identifiers
 */
export function createVariableName(value: string): VariableName {
  if (!value || typeof value !== 'string') {
    throw new BrandValidationError(
      'VariableName',
      value,
      'must be a non-empty string'
    );
  }

  // Must start with $ or be a valid JS identifier
  if (!(value.startsWith('$') || VARIABLE_NAME_PATTERN.test(value))) {
    throw new BrandValidationError(
      'VariableName',
      value,
      'must start with $ or be a valid identifier'
    );
  }

  // Prevent prototype pollution attacks
  const dangerousNames = [
    '__proto__',
    'constructor',
    'prototype',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toString',
    'valueOf',
  ];

  const normalizedValue = value.startsWith('$') ? value.slice(1) : value;
  if (
    dangerousNames.includes(normalizedValue) ||
    normalizedValue.includes('constructor.prototype')
  ) {
    throw new BrandValidationError(
      'VariableName',
      value,
      'contains dangerous property name that could lead to prototype pollution'
    );
  }
  // If starts with $, validate the rest
  if (value.startsWith('$')) {
    const rest = value.slice(1);
    if (!(rest && VARIABLE_REST_PATTERN.test(rest))) {
      throw new BrandValidationError(
        'VariableName',
        value,
        'invalid variable name format after $'
      );
    }
  }

  // Length limits
  if (value.length > 100) {
    throw new BrandValidationError(
      'VariableName',
      value,
      'must be at most 100 characters'
    );
  }

  return value as VariableName;
}

/**
 * Property name validation - for Rulesets properties
 */
export function createPropertyName(value: string): PropertyName {
  if (!value || typeof value !== 'string') {
    throw new BrandValidationError(
      'PropertyName',
      value,
      'must be a non-empty string'
    );
  }

  // Must follow property format: name or name-family
  if (!PROPERTY_NAME_PATTERN.test(value)) {
    throw new BrandValidationError(
      'PropertyName',
      value,
      'must be lowercase with optional hyphens'
    );
  }

  // Length limits
  if (value.length > 50) {
    throw new BrandValidationError(
      'PropertyName',
      value,
      'must be at most 50 characters'
    );
  }

  return value as PropertyName;
}

/**
 * Marker content validation - content within {{...}}
 */
export function createMarkerContent(value: string): MarkerContent {
  if (typeof value !== 'string') {
    throw new BrandValidationError('MarkerContent', value, 'must be a string');
  }

  // Can be empty for self-closing markers
  if (value.length > 5000) {
    throw new BrandValidationError(
      'MarkerContent',
      value,
      'marker content too long (max 5000 characters)'
    );
  }

  // Prevent nested markers (basic check)
  if (value.includes('{{') && value.includes('}}')) {
    throw new BrandValidationError(
      'MarkerContent',
      value,
      'nested markers not allowed in this context'
    );
  }

  // Security: prevent script injection attempts
  const dangerous = [
    '<script',
    'javascript:',
    'data:text/html',
    'onclick=',
    'onerror=',
    'eval(',
    'Function(',
  ];

  for (const pattern of dangerous) {
    if (value.toLowerCase().includes(pattern)) {
      throw new BrandValidationError(
        'MarkerContent',
        value,
        `potentially dangerous content detected: ${pattern}`,
        { detectedPattern: pattern }
      );
    }
  }

  return value as MarkerContent;
}

/**
 * Raw content validation - unprocessed markdown
 */
export function createRawContent(
  value: string,
  maxLength = 10_000_000
): RawContent {
  if (typeof value !== 'string') {
    throw new BrandValidationError('RawContent', value, 'must be a string');
  }

  if (value.length > maxLength) {
    throw new BrandValidationError(
      'RawContent',
      `${value.slice(0, 100)}...`,
      `content too long (max ${maxLength} characters)`,
      { actualLength: value.length, maxLength }
    );
  }

  // Prevent null bytes
  if (value.includes('\0')) {
    throw new BrandValidationError(
      'RawContent',
      value,
      'null bytes not allowed'
    );
  }

  return value as RawContent;
}

/**
 * Compiled content validation - processed output
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
 * Version validation - semantic versioning
 */
export function createVersion(value: string): Version {
  if (!value || typeof value !== 'string') {
    throw new BrandValidationError(
      'Version',
      value,
      'must be a non-empty string'
    );
  }

  // Basic semver pattern (simplified)
  if (!VERSION_PATTERN.test(value)) {
    throw new BrandValidationError(
      'Version',
      value,
      'must be valid semantic version (e.g., 1.0.0)'
    );
  }

  return value as Version;
}

/**
 * Type guards for branded types
 */
export function isProviderId(value: unknown): value is ProviderId {
  try {
    if (typeof value !== 'string') {
      return false;
    }
    createProviderId(value);
    return true;
  } catch {
    return false;
  }
}

export function isSourcePath(value: unknown): value is SourcePath {
  try {
    if (typeof value !== 'string') {
      return false;
    }
    createSourcePath(value);
    return true;
  } catch {
    return false;
  }
}

export function isOutputPath(value: unknown): value is OutputPath {
  try {
    if (typeof value !== 'string') {
      return false;
    }
    createOutputPath(value);
    return true;
  } catch {
    return false;
  }
}

export function isBlockName(value: unknown): value is BlockName {
  try {
    if (typeof value !== 'string') {
      return false;
    }
    createBlockName(value);
    return true;
  } catch {
    return false;
  }
}

export function isVariableName(value: unknown): value is VariableName {
  try {
    if (typeof value !== 'string') {
      return false;
    }
    createVariableName(value);
    return true;
  } catch {
    return false;
  }
}

export function isPropertyName(value: unknown): value is PropertyName {
  try {
    if (typeof value !== 'string') {
      return false;
    }
    createPropertyName(value);
    return true;
  } catch {
    return false;
  }
}

export function isMarkerContent(value: unknown): value is MarkerContent {
  try {
    if (typeof value !== 'string') {
      return false;
    }
    createMarkerContent(value);
    return true;
  } catch {
    return false;
  }
}

export function isVersion(value: unknown): value is Version {
  try {
    if (typeof value !== 'string') {
      return false;
    }
    createVersion(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Unsafe brand creators for performance-critical paths
 * Use with extreme caution and only when validation has already occurred
 */
export const UnsafeBrands = {
  providerId: (value: string): ProviderId => value as ProviderId,
  sourcePath: (value: string): SourcePath => value as SourcePath,
  outputPath: (value: string): OutputPath => value as OutputPath,
  blockName: (value: string): BlockName => value as BlockName,
  variableName: (value: string): VariableName => value as VariableName,
  propertyName: (value: string): PropertyName => value as PropertyName,
  markerContent: (value: string): MarkerContent => value as MarkerContent,
  rawContent: (value: string): RawContent => value as RawContent,
  compiledContent: (value: string): CompiledContent => value as CompiledContent,
  version: (value: string): Version => value as Version,
} as const;

/**
 * Backwards compatibility aliases
 * @deprecated These will be removed in v1.0
 */
export type DestinationId = ProviderId;
export type DestPath = OutputPath;

export const createDestinationId = (value: string): ProviderId => {
  // @deprecated Use createProviderId instead - will be removed in v1.0
  if (process.env.NODE_ENV === 'development') {
    // biome-ignore lint/suspicious/noConsole: Deprecation warning for developers
    console.warn(
      'createDestinationId is deprecated. Use createProviderId instead.'
    );
  }
  return createProviderId(value);
};

export const createDestPath = (value: string): OutputPath => {
  // @deprecated Use createOutputPath instead - will be removed in v1.0
  if (process.env.NODE_ENV === 'development') {
    // biome-ignore lint/suspicious/noConsole: Deprecation warning for developers
    console.warn('createDestPath is deprecated. Use createOutputPath instead.');
  }
  return createOutputPath(value);
};

export const isDestinationId = isProviderId;
export const isDestPath = isOutputPath;
