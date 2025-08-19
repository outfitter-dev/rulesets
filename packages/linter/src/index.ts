// TLDR: Linter implementation for Rulesets notation (ruleset-v0.1-beta)
// TLDR: ruleset-v0.1-beta Basic frontmatter schema validation only
import type { ParsedDoc } from '@rulesets/types';

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
  '/ruleset': 'Rulesets version declaration',
  '/ruleset/version': 'Rulesets version number',
  '/destinations': 'Destination configurations',
  '/title': 'Document title',
  '/description': 'Document description',
  '/version': 'Document version',
};

function getFieldName(path: string): string {
  return FIELD_NAMES[path] || path;
}

// Helper functions to reduce complexity
function addParsingErrors(results: LintResult[], parsedDoc: ParsedDoc): void {
  if (!parsedDoc.errors) {
    return;
  }

  for (const error of parsedDoc.errors) {
    results.push({
      message: error.message,
      line: error.line,
      column: error.column,
      severity: 'error',
    });
  }
}

function validateRulesetVersion(
  results: LintResult[],
  frontmatter: Record<string, unknown>,
  config: LinterConfig
): void {
  if (config.requireRulesetsVersion === false) {
    return;
  }

  if (!frontmatter.ruleset) {
    results.push({
      message: `Missing required ${getFieldName('/ruleset')}. Specify the Rulesets version (e.g., ruleset: { version: "0.1.0" }).`,
      line: 1,
      column: 1,
      severity: 'error',
    });
    return;
  }

  if (
    typeof frontmatter.ruleset !== 'object' ||
    frontmatter.ruleset === null ||
    !('version' in frontmatter.ruleset) ||
    !frontmatter.ruleset.version
  ) {
    results.push({
      message: `Invalid ${getFieldName('/ruleset')}. Expected object with version property, got ${typeof frontmatter.ruleset}.`,
      line: 1,
      column: 1,
      severity: 'error',
    });
  }
}

function validateDestinations(
  results: LintResult[],
  frontmatter: Record<string, unknown>,
  config: LinterConfig
): void {
  if (!frontmatter.destinations) {
    return;
  }

  if (
    typeof frontmatter.destinations !== 'object' ||
    Array.isArray(frontmatter.destinations)
  ) {
    results.push({
      message: `Invalid ${getFieldName('/destinations')}. Expected an object mapping destination IDs to configuration.`,
      line: 1,
      column: 1,
      severity: 'error',
    });
    return;
  }

  if (!config.allowedDestinations || config.allowedDestinations.length === 0) {
    return;
  }

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

function checkRecommendedFields(
  results: LintResult[],
  frontmatter: Record<string, unknown>
): void {
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
}

/**
 * Lints a parsed Rulesets document by validating its frontmatter.
 * For ruleset-v0.1-beta, this performs basic schema validation on the frontmatter.
 *
 * @param parsedDoc - The parsed document to lint
 * @param config - Optional linter configuration
 * @returns A promise that resolves to an array of lint results
 */
// TLDR: Validate frontmatter against basic schema requirements (ruleset-v0.1-beta)
// TLDR: ruleset-v0.1-beta Validates presence and types of frontmatter fields
// TODO(ruleset-v0.2-beta): Add validation for block properties
// TODO(ruleset-v0.3-beta): Add validation for variables and imports
export function lint(
  parsedDoc: ParsedDoc,
  config: LinterConfig = {}
): LintResult[] {
  const results: LintResult[] = [];
  const { frontmatter } = parsedDoc.source;

  // Add any parsing errors as lint errors
  addParsingErrors(results, parsedDoc);

  // If no frontmatter, warn
  if (!frontmatter) {
    results.push({
      message:
        'No frontmatter found. Consider adding frontmatter with rulesets version and metadata.',
      line: 1,
      column: 1,
      severity: 'warning',
    });
    return results;
  }

  // Validate individual aspects
  validateRulesetVersion(results, frontmatter, config);
  validateDestinations(results, frontmatter, config);
  checkRecommendedFields(results, frontmatter);

  return results;
}
