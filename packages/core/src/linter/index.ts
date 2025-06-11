// :M: tldr: Linter implementation for Rulesets notation
// :M: v0.1.0: Basic frontmatter schema validation only
import type { ParsedDoc } from '../interfaces';

export interface LinterConfig {
  requireRulesetsVersion?: boolean;
  allowedDestinations?: string[];
}

export interface LintResult {
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
}

// Human-readable field names for error messages
const FIELD_NAMES: Record<string, string> = {
  '/rulesets': 'Rulesets version declaration',
  '/rulesets/version': 'Rulesets version number',
  '/destinations': 'Destination configurations',
  '/title': 'Document title',
  '/description': 'Document description',
  '/version': 'Document version',
};

function getFieldName(path: string): string {
  return FIELD_NAMES[path] || path;
}

/**
 * Lints a parsed Rulesets document by validating its frontmatter.
 * For v0.1.0, this performs basic schema validation on the frontmatter.
 * 
 * @param parsedDoc - The parsed document to lint
 * @param config - Optional linter configuration
 * @returns A promise that resolves to an array of lint results
 */
// :M: tldr: Validate frontmatter against basic schema requirements
// :M: v0.1.0: Validates presence and types of frontmatter fields
// :M: todo(v0.2.0): Add validation for stem properties
/**
 * Validates the frontmatter of a parsed Rulesets document and returns linting results.
 *
 * Checks for required and recommended fields in the frontmatter, including the presence and validity of the rulesets version and allowed destinations. Includes any parsing errors from the document in the results.
 *
 * @param parsedDoc - The parsed Rulesets document to validate.
 * @param config - Optional configuration to enforce rulesets version and restrict allowed destinations.
 * @returns An array of lint results detailing errors, warnings, or informational messages found during validation.
 */
export async function lint(
  parsedDoc: ParsedDoc,
  config: LinterConfig = {},
): Promise<LintResult[]> {
  const results: LintResult[] = [];
  const { frontmatter } = parsedDoc.source;

  // Add any parsing errors as lint errors
  if (parsedDoc.errors) {
    for (const error of parsedDoc.errors) {
      results.push({
        message: error.message,
        line: error.line,
        column: error.column,
        severity: 'error',
      });
    }
  }

  // If no frontmatter, warn
  if (!frontmatter) {
    results.push({
      message: 'No frontmatter found. Consider adding frontmatter with rulesets version and metadata.',
      line: 1,
      column: 1,
      severity: 'warning',
    });
    return results;
  }

  // Check for rulesets version
  if (config.requireRulesetsVersion !== false) {
    if (!frontmatter.rulesets) {
      results.push({
        message: `Missing required ${getFieldName('/rulesets')}. Specify the Rulesets version (e.g., rulesets: { version: "0.1.0" }).`,
        line: 1,
        column: 1,
        severity: 'error',
      });
    } else if (typeof frontmatter.rulesets !== 'object' || frontmatter.rulesets === null || !('version' in frontmatter.rulesets) || !frontmatter.rulesets.version) {
      results.push({
        message: `Invalid ${getFieldName('/rulesets')}. Expected object with version property, got ${typeof frontmatter.rulesets}.`,
        line: 1,
        column: 1,
        severity: 'error',
      });
    }
  }

  // Check destinations if specified
  if (frontmatter.destinations) {
    if (typeof frontmatter.destinations !== 'object' || Array.isArray(frontmatter.destinations)) {
      results.push({
        message: `Invalid ${getFieldName('/destinations')}. Expected an object mapping destination IDs to configuration.`,
        line: 1,
        column: 1,
        severity: 'error',
      });
    } else {
      // Validate allowed destinations if configured
      if (config.allowedDestinations && config.allowedDestinations.length > 0) {
        for (const destId of Object.keys(frontmatter.destinations)) {
          if (!config.allowedDestinations.includes(destId)) {
            results.push({
              message: `Unknown destination "${destId}". Allowed destinations: ${config.allowedDestinations.join(', ')}.`,
              line: 1,
              column: 1,
              severity: 'warning',
            });
          }
        }
      }
    }
  }

  // Check for recommended fields
  if (!frontmatter.title) {
    results.push({
      message: `Consider adding a ${getFieldName('/title')} to the frontmatter for better documentation.`,
      line: 1,
      column: 1,
      severity: 'info',
    });
  }

  if (!frontmatter.description) {
    results.push({
      message: `Consider adding a ${getFieldName('/description')} to the frontmatter for better documentation.`,
      line: 1,
      column: 1,
      severity: 'info',
    });
  }

  return results;
}