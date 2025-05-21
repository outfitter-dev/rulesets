// TLDR: Basic frontmatter schema validation for Mixdown source files (mixd-v0)
// TODO (mixd-v0.1): Add content body linting

import { ParsedDoc } from '../interfaces/compiled-doc';

/**
 * Represents a linting result message with severity
 */
export interface LintResult {
  message: string;
  severity: 'error' | 'warning' | 'info';
  line?: number;
  column?: number;
}

/**
 * Configuration for the linter
 */
export interface LinterConfig {
  /**
   * Whether the 'mixdown' key is required in frontmatter
   * @default true
   */
  requireMixdownKey?: boolean;
  
  /**
   * Whether to require at least one destination in frontmatter
   * @default true
   */
  requireDestinations?: boolean;
  
  /**
   * Whether to validate destination configuration
   * @default true
   */
  validateDestinations?: boolean;
}

/**
 * Default linter configuration
 */
const defaultConfig: LinterConfig = {
  requireMixdownKey: true,
  requireDestinations: true,
  validateDestinations: true,
};

/**
 * Lint a parsed Mixdown document against schema rules
 * 
 * TLDR: Validates ParsedDoc frontmatter against basic schema rules (mixd-v0)
 * 
 * @param parsedDoc - The parsed document to lint
 * @param config - Optional linter configuration
 * @returns A promise that resolves to an array of LintResult objects
 */
export async function lint(
  parsedDoc: ParsedDoc,
  config: LinterConfig = defaultConfig
): Promise<LintResult[]> {
  const results: LintResult[] = [];
  const fullConfig = { ...defaultConfig, ...config };
  
  // Check if there are parser errors
  if (parsedDoc.errors && parsedDoc.errors.length > 0) {
    parsedDoc.errors.forEach(error => {
      results.push({
        message: error.message,
        severity: 'error',
        line: error.line,
        column: error.column,
      });
    });
  }
  
  // Check if frontmatter exists
  const frontmatter = parsedDoc.source.frontmatter;
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    results.push({
      message: 'No frontmatter found. Frontmatter is required for Mixdown source files.',
      severity: 'error',
    });
    return results; // Early return if no frontmatter to validate
  }
  
  // Validate mixdown key
  if (fullConfig.requireMixdownKey && !frontmatter.mixdown) {
    results.push({
      message: "Required 'mixdown' key is missing in frontmatter",
      severity: 'error',
    });
  }
  
  // Validate destinations
  if (fullConfig.requireDestinations) {
    if (!frontmatter.destinations || typeof frontmatter.destinations !== 'object' || Array.isArray(frontmatter.destinations)) {
      results.push({
        message: "Required 'destinations' object is missing or invalid in frontmatter",
        severity: 'error',
      });
    } else if (fullConfig.validateDestinations) {
      const destinations = frontmatter.destinations as Record<string, any>;
      
      // Check if there are any destinations
      if (Object.keys(destinations).length === 0) {
        results.push({
          message: "At least one destination must be defined in frontmatter",
          severity: 'error',
        });
      }
      
      // Validate each destination
      for (const [destId, destConfig] of Object.entries(destinations)) {
        // Destination ID must be kebab-case
        if (!/^[a-z][a-z0-9-]*$/.test(destId)) {
          results.push({
            message: `Destination ID '${destId}' must be kebab-case (lowercase with hyphens)`,
            severity: 'error',
          });
        }
        
        // Destination config must be an object
        if (!destConfig || typeof destConfig !== 'object' || Array.isArray(destConfig)) {
          results.push({
            message: `Destination '${destId}' configuration must be an object`,
            severity: 'error',
          });
        }
      }
    }
  }
  
  return results;
}