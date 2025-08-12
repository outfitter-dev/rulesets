// Comprehensive validation utilities for Rulesets
// Provides runtime validation, schema checking, and security validation

import type { JSONSchema7 } from 'json-schema';
import type {
  DestinationId,
  SourcePath,
  BlockName,
  VariableName,
  MarkerContent,
  RawContent,
  CompiledContent,
} from './brands';

import {
  RulesetValidationError,
  SecurityValidationError,
  PathTraversalError,
} from './brands';

import type {
  FrontmatterData,
  ValidationResult,
} from './ruleset-context';

import type {
  Marker,
  MarkerValidationResult,
  BlockMarker,
} from './markers';

// ============================================================================
// Core Validation Framework
// ============================================================================

/**
 * Base validator interface
 * All validators implement this interface for consistent behavior
 */
export interface Validator<T> {
  /** Validator name for debugging */
  readonly name: string;
  
  /** Validate the input and return detailed results */
  validate(input: unknown, context?: ValidationContext): ValidationResult<T>;
  
  /** Quick validation check (returns boolean) */
  isValid(input: unknown, context?: ValidationContext): input is T;
  
  /** Get JSON schema for this validator (if applicable) */
  getSchema?(): JSONSchema7;
}

/**
 * Validation context provides additional information for validation
 */
export interface ValidationContext {
  /** Current file being validated */
  readonly file?: SourcePath;
  
  /** Current destination context */
  readonly destination?: DestinationId;
  
  /** Base directory for path resolution */
  readonly baseDir?: string;
  
  /** Additional context data */
  readonly data?: Record<string, unknown>;
  
  /** Validation options */
  readonly options?: ValidationOptions;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Whether to enable strict validation */
  readonly strict?: boolean;
  
  /** Whether to collect warnings */
  readonly collectWarnings?: boolean;
  
  /** Maximum errors to collect before stopping */
  readonly maxErrors?: number;
  
  /** Custom validation rules */
  readonly customRules?: ReadonlyArray<CustomValidationRule>;
  
  /** Security validation settings */
  readonly security?: SecurityValidationOptions;
}

/**
 * Security validation options
 */
export interface SecurityValidationOptions {
  /** Whether to enable path traversal checking */
  readonly checkPathTraversal?: boolean;
  
  /** Whether to validate content for malicious patterns */
  readonly scanContent?: boolean;
  
  /** File size limits */
  readonly limits?: {
    readonly maxFileSize?: number;
    readonly maxContentSize?: number;
    readonly maxPathLength?: number;
  };
  
  /** Allowed file extensions */
  readonly allowedExtensions?: ReadonlyArray<string>;
  
  /** Blocked content patterns */
  readonly blockedPatterns?: ReadonlyArray<RegExp>;
}

/**
 * Custom validation rule
 */
export interface CustomValidationRule {
  /** Rule identifier */
  readonly id: string;
  
  /** Rule description */
  readonly description: string;
  
  /** Validation function */
  readonly validate: (input: unknown, context: ValidationContext) => ValidationResult<unknown>;
  
  /** Rule metadata */
  readonly metadata: {
    readonly category: string;
    readonly severity: 'error' | 'warning' | 'info';
    readonly tags: ReadonlyArray<string>;
  };
}

// ============================================================================
// Built-in Validators
// ============================================================================

/**
 * Destination ID validator
 */
export class DestinationIdValidator implements Validator<DestinationId> {
  readonly name = 'DestinationIdValidator';
  
  validate(input: unknown, _context?: ValidationContext): ValidationResult<DestinationId> {
    const errors: Array<{ path: string; message: string; code: string; value?: unknown }> = [];
    const warnings: Array<{ path: string; message: string; value?: unknown }> = [];
    
    if (typeof input !== 'string') {
      errors.push({
        path: 'destination',
        message: 'Destination ID must be a string',
        code: 'INVALID_TYPE',
        value: input,
      });
      return { valid: false, errors, warnings };
    }
    
    try {
      const validDestinations = ['cursor', 'windsurf', 'claude-code', 'cline', 'roo-code', 'codex-cli', 'codex-agent', 'bolt', 'v0', 'replit', 'github-copilot'];
      
      if (!validDestinations.includes(input)) {
        errors.push({
          path: 'destination',
          message: `Invalid destination '${input}'. Valid destinations: ${validDestinations.join(', ')}`,
          code: 'INVALID_DESTINATION',
          value: input,
        });
        return { valid: false, errors, warnings };
      }
      
      return {
        valid: true,
        data: input as DestinationId,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push({
        path: 'destination',
        message: error instanceof Error ? error.message : 'Unknown validation error',
        code: 'VALIDATION_ERROR',
        value: input,
      });
      return { valid: false, errors, warnings };
    }
  }
  
  isValid(input: unknown): input is DestinationId {
    return this.validate(input).valid;
  }
  
  getSchema(): JSONSchema7 {
    return {
      type: 'string',
      enum: ['cursor', 'windsurf', 'claude-code', 'cline', 'roo-code', 'codex-cli', 'codex-agent', 'bolt', 'v0', 'replit', 'github-copilot'],
    };
  }
}

/**
 * Source path validator with security checks
 */
export class SourcePathValidator implements Validator<SourcePath> {
  readonly name = 'SourcePathValidator';
  
  validate(input: unknown, context?: ValidationContext): ValidationResult<SourcePath> {
    const errors: Array<{ path: string; message: string; code: string; value?: unknown }> = [];
    const warnings: Array<{ path: string; message: string; value?: unknown }> = [];
    
    if (typeof input !== 'string') {
      errors.push({
        path: 'sourcePath',
        message: 'Source path must be a string',
        code: 'INVALID_TYPE',
        value: input,
      });
      return { valid: false, errors, warnings };
    }
    
    try {
      // Basic security checks
      this.validatePathSecurity(input, context);
      
      // File extension validation
      if (!input.endsWith('.md') && !input.endsWith('.rule.md')) {
        errors.push({
          path: 'sourcePath',
          message: 'Source path must end with .md or .rule.md',
          code: 'INVALID_EXTENSION',
          value: input,
        });
        return { valid: false, errors, warnings };
      }
      
      // Path length validation
      const maxLength = context?.options?.security?.limits?.maxPathLength ?? 4096;
      if (input.length > maxLength) {
        errors.push({
          path: 'sourcePath',
          message: `Path length ${input.length} exceeds maximum ${maxLength}`,
          code: 'PATH_TOO_LONG',
          value: input,
        });
        return { valid: false, errors, warnings };
      }
      
      return {
        valid: true,
        data: input as SourcePath,
        errors,
        warnings,
      };
    } catch (error) {
      if (error instanceof RulesetValidationError) {
        errors.push({
          path: 'sourcePath',
          message: error.message,
          code: error.code,
          value: input,
        });
      } else {
        errors.push({
          path: 'sourcePath',
          message: error instanceof Error ? error.message : 'Unknown validation error',
          code: 'VALIDATION_ERROR',
          value: input,
        });
      }
      return { valid: false, errors, warnings };
    }
  }
  
  isValid(input: unknown, context?: ValidationContext): input is SourcePath {
    return this.validate(input, context).valid;
  }
  
  private validatePathSecurity(path: string, context?: ValidationContext): void {
    const options = context?.options?.security;
    
    if (options?.checkPathTraversal !== false) {
      const traversalPatterns = ['../', '..\\', '~/', '$HOME', '%USERPROFILE%'];
      for (const pattern of traversalPatterns) {
        if (path.includes(pattern)) {
          throw new PathTraversalError(path, context?.baseDir ?? process.cwd());
        }
      }
    }
    
    if (options?.scanContent !== false) {
      const dangerousChars = ['\0', '\x08', '\x0c', '\x7f', '\x1b'];
      for (const char of dangerousChars) {
        if (path.includes(char)) {
          throw new SecurityValidationError(
            `Dangerous character detected in path: '${char.charCodeAt(0).toString(16)}'`
          );
        }
      }
    }
  }
}

/**
 * Block name validator
 */
export class BlockNameValidator implements Validator<BlockName> {
  readonly name = 'BlockNameValidator';
  
  validate(input: unknown): ValidationResult<BlockName> {
    const errors: Array<{ path: string; message: string; code: string; value?: unknown }> = [];
    const warnings: Array<{ path: string; message: string; value?: unknown }> = [];
    
    if (typeof input !== 'string') {
      errors.push({
        path: 'blockName',
        message: 'Block name must be a string',
        code: 'INVALID_TYPE',
        value: input,
      });
      return { valid: false, errors, warnings };
    }
    
    try {
      // Length validation
      if (input.length === 0) {
        errors.push({
          path: 'blockName',
          message: 'Block name cannot be empty',
          code: 'EMPTY_NAME',
          value: input,
        });
        return { valid: false, errors, warnings };
      }
      
      if (input.length > 128) {
        errors.push({
          path: 'blockName',
          message: `Block name length ${input.length} exceeds maximum 128`,
          code: 'NAME_TOO_LONG',
          value: input,
        });
        return { valid: false, errors, warnings };
      }
      
      // Kebab-case validation
      const kebabCasePattern = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
      if (!kebabCasePattern.test(input)) {
        errors.push({
          path: 'blockName',
          message: 'Block name must be in kebab-case format (lowercase letters, numbers, and hyphens only)',
          code: 'INVALID_FORMAT',
          value: input,
        });
        return { valid: false, errors, warnings };
      }
      
      // Reserved words check
      const reservedWords = ['if', 'else', 'for', 'while', 'function', 'var', 'let', 'const', 'import', 'export', 'default', 'class', 'extends', 'implements', 'null', 'undefined', 'true', 'false', 'this', 'super', 'new', 'return', 'throw', 'try', 'catch', 'finally', 'block', 'import', 'variable', 'marker', 'destination', 'source', 'compiled', 'ruleset', 'config', 'schema'];
      if (reservedWords.includes(input)) {
        errors.push({
          path: 'blockName',
          message: `Block name '${input}' is a reserved word`,
          code: 'RESERVED_WORD',
          value: input,
        });
        return { valid: false, errors, warnings };
      }
      
      return {
        valid: true,
        data: input as BlockName,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push({
        path: 'blockName',
        message: error instanceof Error ? error.message : 'Unknown validation error',
        code: 'VALIDATION_ERROR',
        value: input,
      });
      return { valid: false, errors, warnings };
    }
  }
  
  isValid(input: unknown): input is BlockName {
    return this.validate(input).valid;
  }
  
  getSchema(): JSONSchema7 {
    return {
      type: 'string',
      pattern: '^[a-z][a-z0-9]*(-[a-z0-9]+)*$',
      minLength: 1,
      maxLength: 128,
    };
  }
}

/**
 * Variable name validator
 */
export class VariableNameValidator implements Validator<VariableName> {
  readonly name = 'VariableNameValidator';
  
  validate(input: unknown): ValidationResult<VariableName> {
    const errors: Array<{ path: string; message: string; code: string; value?: unknown }> = [];
    const warnings: Array<{ path: string; message: string; value?: unknown }> = [];
    
    if (typeof input !== 'string') {
      errors.push({
        path: 'variableName',
        message: 'Variable name must be a string',
        code: 'INVALID_TYPE',
        value: input,
      });
      return { valid: false, errors, warnings };
    }
    
    try {
      // Length validation
      if (input.length === 0) {
        errors.push({
          path: 'variableName',
          message: 'Variable name cannot be empty',
          code: 'EMPTY_NAME',
          value: input,
        });
        return { valid: false, errors, warnings };
      }
      
      if (input.length > 64) {
        errors.push({
          path: 'variableName',
          message: `Variable name length ${input.length} exceeds maximum 64`,
          code: 'NAME_TOO_LONG',
          value: input,
        });
        return { valid: false, errors, warnings };
      }
      
      // Variable naming pattern validation
      const variablePattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
      if (!variablePattern.test(input)) {
        errors.push({
          path: 'variableName',
          message: 'Variable name must start with letter, underscore, or dollar sign, followed by letters, numbers, underscores, or dollar signs',
          code: 'INVALID_FORMAT',
          value: input,
        });
        return { valid: false, errors, warnings };
      }
      
      // Reserved words check
      const reservedWords = ['if', 'else', 'for', 'while', 'function', 'var', 'let', 'const', 'import', 'export', 'default', 'class', 'extends', 'implements', 'null', 'undefined', 'true', 'false', 'this', 'super', 'new', 'return', 'throw', 'try', 'catch', 'finally', 'block', 'import', 'variable', 'marker', 'destination', 'source', 'compiled', 'ruleset', 'config', 'schema'];
      if (reservedWords.includes(input)) {
        errors.push({
          path: 'variableName',
          message: `Variable name '${input}' is a reserved word`,
          code: 'RESERVED_WORD',
          value: input,
        });
        return { valid: false, errors, warnings };
      }
      
      return {
        valid: true,
        data: input as VariableName,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push({
        path: 'variableName',
        message: error instanceof Error ? error.message : 'Unknown validation error',
        code: 'VALIDATION_ERROR',
        value: input,
      });
      return { valid: false, errors, warnings };
    }
  }
  
  isValid(input: unknown): input is VariableName {
    return this.validate(input).valid;
  }
  
  getSchema(): JSONSchema7 {
    return {
      type: 'string',
      pattern: '^[a-zA-Z_$][a-zA-Z0-9_$]*$',
      minLength: 1,
      maxLength: 64,
    };
  }
}

/**
 * Content validator with size and security checks
 */
export class ContentValidator implements Validator<RawContent | CompiledContent> {
  readonly name = 'ContentValidator';
  
  constructor(_contentType: 'raw' | 'compiled' = 'raw') {
    // Content type is currently unused but kept for future extensibility
    void _contentType;
  }
  
  validate(input: unknown, context?: ValidationContext): ValidationResult<RawContent | CompiledContent> {
    const errors: Array<{ path: string; message: string; code: string; value?: unknown }> = [];
    const warnings: Array<{ path: string; message: string; value?: unknown }> = [];
    
    if (typeof input !== 'string') {
      errors.push({
        path: 'content',
        message: 'Content must be a string',
        code: 'INVALID_TYPE',
        value: input,
      });
      return { valid: false, errors, warnings };
    }
    
    try {
      // Size validation
      const maxSize = context?.options?.security?.limits?.maxFileSize ?? (10 * 1024 * 1024); // 10MB default
      if (input.length > maxSize) {
        errors.push({
          path: 'content',
          message: `Content size ${input.length} bytes exceeds maximum ${maxSize} bytes`,
          code: 'CONTENT_TOO_LARGE',
          value: input.length,
        });
        return { valid: false, errors, warnings };
      }
      
      // Security content scanning
      if (context?.options?.security?.scanContent !== false) {
        this.validateContentSecurity(input, context);
      }
      
      return {
        valid: true,
        data: input as RawContent | CompiledContent,
        errors,
        warnings,
      };
    } catch (error) {
      if (error instanceof RulesetValidationError) {
        errors.push({
          path: 'content',
          message: error.message,
          code: error.code,
          value: input,
        });
      } else {
        errors.push({
          path: 'content',
          message: error instanceof Error ? error.message : 'Unknown validation error',
          code: 'VALIDATION_ERROR',
          value: input,
        });
      }
      return { valid: false, errors, warnings };
    }
  }
  
  isValid(input: unknown, context?: ValidationContext): input is RawContent | CompiledContent {
    return this.validate(input, context).valid;
  }
  
  private validateContentSecurity(content: string, context?: ValidationContext): void {
    // Check for dangerous characters
    const dangerousChars = ['\0', '\x08', '\x0c', '\x7f', '\x1b'];
    for (const char of dangerousChars) {
      if (content.includes(char)) {
        throw new SecurityValidationError(
          `Dangerous character detected in content: '${char.charCodeAt(0).toString(16)}'`
        );
      }
    }
    
    // Check for potentially malicious patterns
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i,
      /on\w+\s*=/i, // onevent handlers
    ];
    
    for (const pattern of maliciousPatterns) {
      if (pattern.test(content)) {
        throw new SecurityValidationError(
          `Potentially malicious content pattern detected: ${pattern.source}`
        );
      }
    }
    
    // Check custom blocked patterns
    const blockedPatterns = context?.options?.security?.blockedPatterns ?? [];
    for (const pattern of blockedPatterns) {
      if (pattern.test(content)) {
        throw new SecurityValidationError(
          `Content matches blocked pattern: ${pattern.source}`
        );
      }
    }
  }
}

// ============================================================================
// Configuration Validators
// ============================================================================

/**
 * Frontmatter validator
 */
export class FrontmatterValidator implements Validator<FrontmatterData> {
  readonly name = 'FrontmatterValidator';
  
  validate(input: unknown): ValidationResult<FrontmatterData> {
    const errors: Array<{ path: string; message: string; code: string; value?: unknown }> = [];
    const warnings: Array<{ path: string; message: string; value?: unknown }> = [];
    
    if (input === null || input === undefined) {
      return {
        valid: true,
        data: {} as FrontmatterData,
        errors,
        warnings,
      };
    }
    
    if (typeof input !== 'object' || Array.isArray(input)) {
      errors.push({
        path: 'frontmatter',
        message: 'Frontmatter must be an object',
        code: 'INVALID_TYPE',
        value: input,
      });
      return { valid: false, errors, warnings };
    }
    
    const data = input as Record<string, unknown>;
    
    // Validate ruleset section
    if (data.ruleset !== undefined) {
      if (typeof data.ruleset !== 'object' || data.ruleset === null || Array.isArray(data.ruleset)) {
        errors.push({
          path: 'frontmatter.ruleset',
          message: 'Ruleset section must be an object',
          code: 'INVALID_TYPE',
          value: data.ruleset,
        });
      } else {
        const ruleset = data.ruleset as Record<string, unknown>;
        if (ruleset.version !== undefined && typeof ruleset.version !== 'string') {
          errors.push({
            path: 'frontmatter.ruleset.version',
            message: 'Ruleset version must be a string',
            code: 'INVALID_TYPE',
            value: ruleset.version,
          });
        }
      }
    }
    
    // Validate destination section
    if (data.destination !== undefined) {
      if (typeof data.destination !== 'object' || data.destination === null || Array.isArray(data.destination)) {
        errors.push({
          path: 'frontmatter.destination',
          message: 'Destination section must be an object',
          code: 'INVALID_TYPE',
          value: data.destination,
        });
      } else {
        const destination = data.destination as Record<string, unknown>;
        
        if (destination.include !== undefined) {
          if (!Array.isArray(destination.include)) {
            errors.push({
              path: 'frontmatter.destination.include',
              message: 'Destination include must be an array',
              code: 'INVALID_TYPE',
              value: destination.include,
            });
          } else {
            for (let i = 0; i < destination.include.length; i++) {
              const item = destination.include[i];
              if (typeof item !== 'string') {
                errors.push({
                  path: `frontmatter.destination.include[${i}]`,
                  message: 'Destination include items must be strings',
                  code: 'INVALID_TYPE',
                  value: item,
                });
              }
            }
          }
        }
        
        if (destination.exclude !== undefined) {
          if (!Array.isArray(destination.exclude)) {
            errors.push({
              path: 'frontmatter.destination.exclude',
              message: 'Destination exclude must be an array',
              code: 'INVALID_TYPE',
              value: destination.exclude,
            });
          } else {
            for (let i = 0; i < destination.exclude.length; i++) {
              const item = destination.exclude[i];
              if (typeof item !== 'string') {
                errors.push({
                  path: `frontmatter.destination.exclude[${i}]`,
                  message: 'Destination exclude items must be strings',
                  code: 'INVALID_TYPE',
                  value: item,
                });
              }
            }
          }
        }
      }
    }
    
    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }
    
    return {
      valid: true,
      data: data as FrontmatterData,
      errors,
      warnings,
    };
  }
  
  isValid(input: unknown): input is FrontmatterData {
    return this.validate(input).valid;
  }
  
  getSchema(): JSONSchema7 {
    return {
      type: 'object',
      properties: {
        ruleset: {
          type: 'object',
          properties: {
            version: { type: 'string' },
          },
        },
        name: { type: 'string' },
        description: { type: 'string' },
        version: { type: 'string' },
        globs: {
          type: 'array',
          items: { type: 'string' },
        },
        destination: {
          type: 'object',
          properties: {
            include: {
              type: 'array',
              items: { type: 'string' },
            },
            exclude: {
              type: 'array',
              items: { type: 'string' },
            },
            path: { type: 'string' },
          },
        },
      },
      additionalProperties: true,
    };
  }
}

// ============================================================================
// Marker Validators
// ============================================================================

/**
 * Marker validation utilities
 */
export class MarkerValidationUtil {
  private static readonly blockPattern = /^{{(\/?[a-z][a-z0-9-]*(?:\s+[^}]+)?)}}$/;
  private static readonly importPattern = /^{{\s*>\s*([^}\s]+)(?:\s+[^}]+)?}}$/;
  private static readonly variablePattern = /^{{\s*\$([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s+[^}]+)?}}$/;
  private static readonly rawPattern = /^{{{([^}]*)}}}/;
  private static readonly commentPattern = /^{{\s*!\s*([^}]*)}}$/;
  
  /**
   * Validate marker syntax and structure
   */
  static validateMarkerSyntax(content: MarkerContent): MarkerValidationResult {
    const errors: Array<{ code: string; message: string; location: any; severity: 'error' | 'warning' }> = [];
    const suggestions: Array<{ description: string; fix: string; confidence: number }> = [];
    
    const raw = content.toString();
    
    // Basic brace matching
    if (!raw.startsWith('{{') || !raw.endsWith('}}')) {
      errors.push({
        code: 'INVALID_MARKER_BRACES',
        message: 'Marker must start with {{ and end with }}',
        location: { line: 1, column: 1, offset: 0 },
        severity: 'error',
      });
      return { valid: false, errors, suggestions };
    }
    
    // Check for triple braces (raw content)
    if (raw.startsWith('{{{') && raw.endsWith('}}}')) {
      if (!this.rawPattern.test(raw)) {
        errors.push({
          code: 'INVALID_RAW_MARKER',
          message: 'Invalid raw marker format',
          location: { line: 1, column: 1, offset: 0 },
          severity: 'error',
        });
        suggestions.push({
          description: 'Use {{{content}}} for raw content',
          fix: '{{{content}}}',
          confidence: 0.8,
        });
      }
      return { valid: errors.length === 0, errors, suggestions };
    }
    
    const innerContent = raw.slice(2, -2).trim();
    
    // Empty marker check
    if (innerContent.length === 0) {
      errors.push({
        code: 'EMPTY_MARKER',
        message: 'Marker cannot be empty',
        location: { line: 1, column: 3, offset: 2 },
        severity: 'error',
      });
      return { valid: false, errors, suggestions };
    }
    
    // Validate specific marker types
    if (innerContent.startsWith('!')) {
      // Comment marker
      if (!this.commentPattern.test(raw)) {
        errors.push({
          code: 'INVALID_COMMENT_MARKER',
          message: 'Invalid comment marker format',
          location: { line: 1, column: 1, offset: 0 },
          severity: 'error',
        });
      }
    } else if (innerContent.startsWith('>')) {
      // Import marker
      if (!this.importPattern.test(raw)) {
        errors.push({
          code: 'INVALID_IMPORT_MARKER',
          message: 'Invalid import marker format',
          location: { line: 1, column: 1, offset: 0 },
          severity: 'error',
        });
        suggestions.push({
          description: 'Use {{> path}} for imports',
          fix: '{{> path}}',
          confidence: 0.9,
        });
      }
    } else if (innerContent.startsWith('$')) {
      // Variable marker
      if (!this.variablePattern.test(raw)) {
        errors.push({
          code: 'INVALID_VARIABLE_MARKER',
          message: 'Invalid variable marker format',
          location: { line: 1, column: 1, offset: 0 },
          severity: 'error',
        });
        suggestions.push({
          description: 'Use {{$variableName}} for variables',
          fix: '{{$variableName}}',
          confidence: 0.9,
        });
      }
    } else if (innerContent.startsWith('/')) {
      // Block end marker
      const blockName = innerContent.slice(1).trim();
      if (!blockName || !/^[a-z][a-z0-9-]*$/.test(blockName)) {
        errors.push({
          code: 'INVALID_BLOCK_END_MARKER',
          message: 'Invalid block end marker format',
          location: { line: 1, column: 1, offset: 0 },
          severity: 'error',
        });
        suggestions.push({
          description: 'Use {{/block-name}} for block endings',
          fix: '{{/block-name}}',
          confidence: 0.9,
        });
      }
    } else {
      // Block start marker
      if (!this.blockPattern.test(raw)) {
        errors.push({
          code: 'INVALID_BLOCK_MARKER',
          message: 'Invalid block marker format',
          location: { line: 1, column: 1, offset: 0 },
          severity: 'error',
        });
        suggestions.push({
          description: 'Use {{block-name}} for blocks',
          fix: '{{block-name}}',
          confidence: 0.8,
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      suggestions,
    };
  }
  
  /**
   * Validate that block markers are properly paired
   */
  static validateBlockPairing(markers: ReadonlyArray<Marker>): ValidationResult<ReadonlyArray<Marker>> {
    const errors: Array<{ path: string; message: string; code: string; value?: unknown }> = [];
    const warnings: Array<{ path: string; message: string; value?: unknown }> = [];
    
    const blockStack: Array<{ marker: BlockMarker; index: number }> = [];
    
    for (let i = 0; i < markers.length; i++) {
      const marker = markers[i];
      
      if (marker.type === 'block') {
        blockStack.push({ marker: marker as BlockMarker, index: i });
      } else if (marker.type === 'block-end') {
        const endMarker = marker as any; // BlockEndMarker type
        
        if (blockStack.length === 0) {
          errors.push({
            path: `markers[${i}]`,
            message: `Unmatched block end marker: {{/${endMarker.name}}}`,
            code: 'UNMATCHED_BLOCK_END',
            value: endMarker.name,
          });
          continue;
        }
        
        const lastBlock = blockStack.pop();
        if (lastBlock && lastBlock.marker.name !== endMarker.name) {
          errors.push({
            path: `markers[${i}]`,
            message: `Block name mismatch: expected {{/${lastBlock.marker.name}}} but found {{/${endMarker.name}}}`,
            code: 'BLOCK_NAME_MISMATCH',
            value: { expected: lastBlock.marker.name, actual: endMarker.name },
          });
        }
      }
    }
    
    // Check for unclosed blocks
    for (const unclosed of blockStack) {
      errors.push({
        path: `markers[${unclosed.index}]`,
        message: `Unclosed block: {{${unclosed.marker.name}}} needs {{/${unclosed.marker.name}}}`,
        code: 'UNCLOSED_BLOCK',
        value: unclosed.marker.name,
      });
    }
    
    return {
      valid: errors.length === 0,
      data: errors.length === 0 ? markers : undefined,
      errors,
      warnings,
    };
  }
}

// ============================================================================
// Validator Registry
// ============================================================================

/**
 * Registry for managing validators
 */
export class ValidatorRegistry {
  private readonly validators = new Map<string, Validator<unknown>>();
  
  constructor() {
    // Register built-in validators
    this.register('destinationId', new DestinationIdValidator());
    this.register('sourcePath', new SourcePathValidator());
    this.register('blockName', new BlockNameValidator());
    this.register('variableName', new VariableNameValidator());
    this.register('rawContent', new ContentValidator('raw'));
    this.register('compiledContent', new ContentValidator('compiled'));
    this.register('frontmatter', new FrontmatterValidator());
  }
  
  /**
   * Register a validator
   */
  register<T>(name: string, validator: Validator<T>): void {
    this.validators.set(name, validator as Validator<unknown>);
  }
  
  /**
   * Get a validator by name
   */
  get<T>(name: string): Validator<T> | undefined {
    return this.validators.get(name) as Validator<T> | undefined;
  }
  
  /**
   * Check if a validator is registered
   */
  has(name: string): boolean {
    return this.validators.has(name);
  }
  
  /**
   * List all registered validators
   */
  list(): string[] {
    return Array.from(this.validators.keys());
  }
  
  /**
   * Validate using a registered validator
   */
  validate<T>(validatorName: string, input: unknown, context?: ValidationContext): ValidationResult<T> {
    const validator = this.get<T>(validatorName);
    if (!validator) {
      throw new Error(`Validator '${validatorName}' not found`);
    }
    return validator.validate(input, context);
  }
}

// ============================================================================
// Default Export
// ============================================================================

/**
 * Default validator registry instance
 */
export const validators = new ValidatorRegistry();