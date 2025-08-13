/**
 * Validation utilities for Rulesets
 * Provides a framework for composable validation with detailed error reporting
 */

import type { BrandValidationError } from './brands';

/**
 * Validation result - can be success or failure
 */
export type ValidationResult<T> =
  | { success: true; value: T }
  | { success: false; errors: ValidationError[] };

/**
 * Validation error with context
 */
export interface ValidationError {
  readonly path: string; // Path to the error (e.g., "frontmatter.version")
  readonly message: string;
  readonly code?: string; // Error code for programmatic handling
  readonly severity: 'error' | 'warning' | 'info';
  readonly context?: Record<string, unknown>;
}

/**
 * Validator function type
 */
export type Validator<T> = (
  value: unknown,
  path?: string
) => ValidationResult<T>;

/**
 * Async validator function type
 */
export type AsyncValidator<T> = (
  value: unknown,
  path?: string
) => Promise<ValidationResult<T>>;

/**
 * Create a successful validation result
 */
export function success<T>(value: T): ValidationResult<T> {
  return { success: true, value };
}

/**
 * Create a failed validation result
 */
export function failure(errors: ValidationError[]): ValidationResult<never> {
  return { success: false, errors };
}

/**
 * Create a validation error
 */
export function error(
  path: string,
  message: string,
  options?: {
    code?: string;
    severity?: 'error' | 'warning' | 'info';
    context?: Record<string, unknown>;
  }
): ValidationError {
  return {
    path,
    message,
    code: options?.code,
    severity: options?.severity ?? 'error',
    context: options?.context,
  };
}

/**
 * Combine multiple validators
 */
export function combine<T>(...validators: Validator<T>[]): Validator<T> {
  return (value, path = '') => {
    const errors: ValidationError[] = [];
    let result: T | undefined;

    for (const validator of validators) {
      const validation = validator(value, path);
      if (!validation.success) {
        errors.push(...validation.errors);
      } else if (!result) {
        result = validation.value;
      }
    }

    if (errors.length > 0) {
      return failure(errors);
    }

    return success(result!);
  };
}

/**
 * Chain validators - stops at first failure
 */
export function chain<T>(...validators: Validator<T>[]): Validator<T> {
  return (value, path = '') => {
    for (const validator of validators) {
      const result = validator(value, path);
      if (!result.success) {
        return result;
      }
      value = result.value; // Pass transformed value to next validator
    }
    return success(value as T);
  };
}

/**
 * Validate array of items
 */
export function array<T>(itemValidator: Validator<T>): Validator<T[]> {
  return (value, path = '') => {
    if (!Array.isArray(value)) {
      return failure([error(path, 'Expected an array')]);
    }

    const results: T[] = [];
    const errors: ValidationError[] = [];

    for (let i = 0; i < value.length; i++) {
      const itemPath = `${path}[${i}]`;
      const result = itemValidator(value[i], itemPath);

      if (result.success) {
        results.push(result.value);
      } else {
        errors.push(...result.errors);
      }
    }

    if (errors.length > 0) {
      return failure(errors);
    }

    return success(results);
  };
}

/**
 * Validate object properties
 */
export function object<T extends Record<string, unknown>>(
  schema: { [K in keyof T]: Validator<T[K]> }
): Validator<T> {
  return (value, path = '') => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return failure([error(path, 'Expected an object')]);
    }

    const result: Partial<T> = {};
    const errors: ValidationError[] = [];

    for (const [key, validator] of Object.entries(schema)) {
      const propPath = path ? `${path}.${key}` : key;
      const propValue = (value as any)[key];
      const validation = validator(propValue, propPath);

      if (validation.success) {
        result[key as keyof T] = validation.value;
      } else {
        errors.push(...validation.errors);
      }
    }

    if (errors.length > 0) {
      return failure(errors);
    }

    return success(result as T);
  };
}

/**
 * Optional validator - allows undefined
 */
export function optional<T>(validator: Validator<T>): Validator<T | undefined> {
  return (value, path) => {
    if (value === undefined) {
      return success(undefined);
    }
    return validator(value, path);
  };
}

/**
 * Required validator - ensures value is not null/undefined
 */
export function required<T>(validator: Validator<T>): Validator<T> {
  return (value, path = '') => {
    if (value === null || value === undefined) {
      return failure([error(path, 'Value is required')]);
    }
    return validator(value, path);
  };
}

/**
 * String validator with options
 */
export function string(options?: {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: readonly string[];
}): Validator<string> {
  return (value, path = '') => {
    if (typeof value !== 'string') {
      return failure([error(path, 'Expected a string')]);
    }

    const errors: ValidationError[] = [];

    if (options?.minLength && value.length < options.minLength) {
      errors.push(
        error(path, `String must be at least ${options.minLength} characters`)
      );
    }

    if (options?.maxLength && value.length > options.maxLength) {
      errors.push(
        error(path, `String must be at most ${options.maxLength} characters`)
      );
    }

    if (options?.pattern && !options.pattern.test(value)) {
      errors.push(error(path, 'String does not match required pattern'));
    }

    if (options?.enum && !options.enum.includes(value)) {
      errors.push(
        error(path, `String must be one of: ${options.enum.join(', ')}`)
      );
    }

    if (errors.length > 0) {
      return failure(errors);
    }

    return success(value);
  };
}

/**
 * Number validator with options
 */
export function number(options?: {
  min?: number;
  max?: number;
  integer?: boolean;
}): Validator<number> {
  return (value, path = '') => {
    if (typeof value !== 'number' || isNaN(value)) {
      return failure([error(path, 'Expected a number')]);
    }

    const errors: ValidationError[] = [];

    if (options?.min !== undefined && value < options.min) {
      errors.push(error(path, `Number must be at least ${options.min}`));
    }

    if (options?.max !== undefined && value > options.max) {
      errors.push(error(path, `Number must be at most ${options.max}`));
    }

    if (options?.integer && !Number.isInteger(value)) {
      errors.push(error(path, 'Number must be an integer'));
    }

    if (errors.length > 0) {
      return failure(errors);
    }

    return success(value);
  };
}

/**
 * Boolean validator
 */
export function boolean(): Validator<boolean> {
  return (value, path = '') => {
    if (typeof value !== 'boolean') {
      return failure([error(path, 'Expected a boolean')]);
    }
    return success(value);
  };
}

/**
 * Transform a validation error to include brand information
 */
export function fromBrandError(
  err: BrandValidationError,
  path?: string
): ValidationError {
  return {
    path: path ?? err.brandType,
    message: err.message,
    code: `BRAND_${err.brandType.toUpperCase()}_INVALID`,
    severity: 'error',
    context: {
      ...err.context,
      value: err.value,
    },
  };
}

/**
 * Validator registry for extensibility
 */
export class ValidatorRegistry {
  private validators = new Map<string, Validator<unknown>>();

  /**
   * Register a named validator
   */
  register(name: string, validator: Validator<unknown>): void {
    this.validators.set(name, validator);
  }

  /**
   * Get a registered validator
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
   * Create a validator that references a registered validator
   */
  ref<T>(name: string): Validator<T> {
    return (value, path) => {
      const validator = this.get<T>(name);
      if (!validator) {
        return failure([
          error(path ?? '', `Unknown validator reference: ${name}`),
        ]);
      }
      return validator(value, path);
    };
  }
}

/**
 * Global validator registry
 */
export const validators = new ValidatorRegistry();
