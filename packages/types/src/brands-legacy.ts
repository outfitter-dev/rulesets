/**
 * Branded types for Rulesets - Inspired by Grapple's security-first approach
 * Provides compile-time safety and runtime validation for core domain values
 */

import type { Opaque } from 'type-fest';

/**
 * Brand types for core Rulesets domain values
 */
export type DestinationId = Opaque<string, 'DestinationId'>;
export type SourcePath = Opaque<string, 'SourcePath'>;
export type DestPath = Opaque<string, 'DestPath'>;
export type BlockName = Opaque<string, 'BlockName'>;
export type VariableName = Opaque<string, 'VariableName'>;
export type PropertyName = Opaque<string, 'PropertyName'>;
export type MarkerContent = Opaque<string, 'MarkerContent'>;
export type RawContent = Opaque<string, 'RawContent'>;
export type CompiledContent = Opaque<string, 'CompiledContent'>;
export type Version = Opaque<string, 'Version'>;

/**
 * Brand validation errors with rich context
 */
export class BrandValidationError extends Error {
  constructor(
    public readonly brandType: string,
    public readonly value: unknown,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(`Invalid ${brandType}: ${message}`);
    this.name = 'BrandValidationError';
  }
}

/**
 * Destination ID validation and creation
 * Must match a known destination provider
 */
const VALID_DESTINATIONS = [
  'cursor',
  'windsurf',
  'claude-code',
  'cline',
  'roo-code',
  'codex',
  'bolt',
  'v0',
  'replit',
  'github-copilot',
] as const;

export function createDestinationId(value: string): DestinationId {
  if (!value || typeof value !== 'string') {
    throw new BrandValidationError(
      'DestinationId',
      value,
      'must be a non-empty string'
    );
  }

  if (!VALID_DESTINATIONS.includes(value as any)) {
    throw new BrandValidationError(
      'DestinationId',
      value,
      `must be one of: ${VALID_DESTINATIONS.join(', ')}`,
      { validDestinations: VALID_DESTINATIONS }
    );
  }

  return value as DestinationId;
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
  if (/[\x00-\x1f\x7f]/.test(value)) {
    throw new BrandValidationError(
      'SourcePath',
      value,
      'control characters not allowed'
    );
  }

  return value as SourcePath;
}

/**
 * Destination path validation - for compiled output
 */
export function createDestPath(value: string): DestPath {
  if (!value || typeof value !== 'string') {
    throw new BrandValidationError(
      'DestPath',
      value,
      'must be a non-empty string'
    );
  }

  // Prevent path traversal
  if (value.includes('../') || value.includes('..\\')) {
    throw new BrandValidationError(
      'DestPath',
      value,
      'path traversal not allowed'
    );
  }

  // Prevent absolute paths that might escape project
  if (value.startsWith('/') && !value.startsWith('/.')) {
    throw new BrandValidationError(
      'DestPath',
      value,
      'absolute paths not recommended'
    );
  }

  // Length limits
  if (value.length > 255) {
    throw new BrandValidationError(
      'DestPath',
      value,
      'path too long (max 255 characters)'
    );
  }

  // Prevent null bytes
  if (value.includes('\0')) {
    throw new BrandValidationError('DestPath', value, 'null bytes not allowed');
  }

  return value as DestPath;
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

  // Must be kebab-case
  if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(value)) {
    throw new BrandValidationError(
      'BlockName',
      value,
      'must be kebab-case (e.g., user-instructions)'
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
  if (!(value.startsWith('$') || /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value))) {
    throw new BrandValidationError(
      'VariableName',
      value,
      'must start with $ or be a valid identifier'
    );
  }

  // If starts with $, validate the rest
  if (value.startsWith('$')) {
    const rest = value.slice(1);
    if (!(rest && /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(rest))) {
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
  if (!/^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/.test(value)) {
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
  if (!/^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/.test(value)) {
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
export function isDestinationId(value: unknown): value is DestinationId {
  try {
    if (typeof value !== 'string') {
      return false;
    }
    createDestinationId(value);
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

export function isDestPath(value: unknown): value is DestPath {
  try {
    if (typeof value !== 'string') {
      return false;
    }
    createDestPath(value);
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
  destinationId: (value: string): DestinationId => value as DestinationId,
  sourcePath: (value: string): SourcePath => value as SourcePath,
  destPath: (value: string): DestPath => value as DestPath,
  blockName: (value: string): BlockName => value as BlockName,
  variableName: (value: string): VariableName => value as VariableName,
  propertyName: (value: string): PropertyName => value as PropertyName,
  markerContent: (value: string): MarkerContent => value as MarkerContent,
  rawContent: (value: string): RawContent => value as RawContent,
  compiledContent: (value: string): CompiledContent => value as CompiledContent,
  version: (value: string): Version => value as Version,
} as const;
