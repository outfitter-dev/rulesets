/**

- @fileoverview Validation result domain model
-
- Represents the outcome of input validation with detailed error reporting
 */

import type { ErrorCode } from '@/shared/types/brands';

/**

- Validation severity levels
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**

- Validation issue with detailed information
 */
export interface ValidationIssue {
  /**Severity level*/
  readonly severity: ValidationSeverity;

  /** Error or warning code */
  readonly code: ErrorCode;

  /** Human-readable message */
  readonly message: string;

  /** Path to the field that failed validation */
  readonly fieldPath: string;

  /** Input value that caused the issue */
  readonly value?: unknown;

  /** Expected value or format */
  readonly expected?: string;

  /** Suggested fix or action */
  readonly suggestion?: string;

  /** Additional context information */
  readonly context: Record<string, unknown>;
}

/**

- Complete validation result
 */
export interface ValidationResult<T = unknown> {
  /**Whether validation passed without errors*/
  readonly isValid: boolean;

  /** Validated and potentially transformed value */
  readonly value?: T;

  /** All validation issues found */
  readonly issues: readonly ValidationIssue[];

  /** Performance metrics for validation */
  readonly metrics: ValidationMetrics;

  /** Additional metadata */
  readonly metadata: Record<string, unknown>;
}

/**

- Validation performance metrics
 */
export interface ValidationMetrics {
  /**Time taken to validate in milliseconds*/
  readonly validationTimeMs: number;

  /** Number of fields validated */
  readonly fieldsValidated: number;

  /** Number of rules applied */
  readonly rulesApplied: number;

  /** Memory used during validation in bytes */
  readonly memoryUsedBytes?: number;
}

/**

- Utility functions for working with validation results
 */
export const ValidationResultUtils = {
  /**
  - Gets only error issues from validation result
   */
  getErrors: (result: ValidationResult): readonly ValidationIssue[] => {
    return result.issues.filter((issue) => issue.severity === 'error');
  },

  /**

- Gets only warning issues from validation result
   */
  getWarnings: (result: ValidationResult): readonly ValidationIssue[] => {
    return result.issues.filter((issue) => issue.severity === 'warning');
  },

  /**

- Gets only info issues from validation result
   */
  getInfo: (result: ValidationResult): readonly ValidationIssue[] => {
    return result.issues.filter((issue) => issue.severity === 'info');
  },

  /**

- Checks if validation result has any errors
   */
  hasErrors: (result: ValidationResult): boolean => {
    return result.issues.some((issue) => issue.severity === 'error');
  },

  /**

- Checks if validation result has any warnings
   */
  hasWarnings: (result: ValidationResult): boolean => {
    return result.issues.some((issue) => issue.severity === 'warning');
  },

  /**

- Formats validation issues for display
   */
  formatIssues: (issues: readonly ValidationIssue[]): string => {
    return issues
      .map(
        (issue) =>
          `${issue.severity.toUpperCase()}: ${issue.message} (${issue.fieldPath})`
      )
      .join('\n');
  },

  /**

- Creates a successful validation result
   */
  success: <T>(
    value: T,
    metrics?: Partial<ValidationMetrics>
  ): ValidationResult<T> => ({
    isValid: true,
    value,
    issues: [],
    metrics: {
      validationTimeMs: 0,
      fieldsValidated: 0,
      rulesApplied: 0,
      ...metrics,
    },
    metadata: {},
  }),

  /**

- Creates a failed validation result
   */
  failure: (
    issues: readonly ValidationIssue[],
    metrics?: Partial<ValidationMetrics>
  ): ValidationResult => ({
    isValid: false,
    issues: [...issues],
    metrics: {
      validationTimeMs: 0,
      fieldsValidated: 0,
      rulesApplied: 0,
      ...metrics,
    },
    metadata: {},
  }),
} as const;
