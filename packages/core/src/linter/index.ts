// TLDR: Basic linter implementation that validates frontmatter against a schema (mixd-v0)
import type { ParsedDoc } from '../interfaces';

export interface LinterConfig {
  requireMixdownVersion?: boolean;
  allowedDestinations?: string[];
}

export interface LintResult {
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Lints a parsed Mixdown document by validating its frontmatter.
 * For v0, this performs basic schema validation on the frontmatter.
 * 
 * @param parsedDoc - The parsed document to lint
 * @param config - Optional linter configuration
 * @returns A promise that resolves to an array of lint results
 */
// TLDR: Validate frontmatter against basic schema requirements (mixd-v0)
// TODO (mixd-v0.1): Add validation for stem properties
// TODO (mixd-v0.2): Add validation for variables and imports
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
      message: 'No frontmatter found. Consider adding frontmatter with mixdown version and metadata.',
      line: 1,
      column: 1,
      severity: 'warning',
    });
    return results;
  }

  // Check for mixdown version
  if (config.requireMixdownVersion !== false) {
    if (!frontmatter.mixdown) {
      results.push({
        message: 'Missing required "mixdown" field in frontmatter. Specify the Mixdown version (e.g., mixdown: v0).',
        line: 1,
        column: 1,
        severity: 'error',
      });
    } else if (typeof frontmatter.mixdown !== 'string') {
      results.push({
        message: `Invalid "mixdown" field type. Expected string, got ${typeof frontmatter.mixdown}.`,
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
        message: 'Invalid "destinations" field. Expected an object mapping destination IDs to configuration.',
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
      message: 'Consider adding a "title" field to the frontmatter for better documentation.',
      line: 1,
      column: 1,
      severity: 'info',
    });
  }

  if (!frontmatter.description) {
    results.push({
      message: 'Consider adding a "description" field to the frontmatter for better documentation.',
      line: 1,
      column: 1,
      severity: 'info',
    });
  }

  return results;
}