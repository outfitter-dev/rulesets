// TLDR: Parser implementation for Rulesets notation (ruleset-v0.1-beta)
// TLDR: ruleset-v0.1-beta Basic frontmatter extraction without marker processing

import type { ParsedDoc } from '@rulesets/types';
import { JSON_SCHEMA, load } from 'js-yaml';

interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

// Helper functions to reduce complexity
function findFrontmatterBounds(lines: string[]): {
  start: number;
  end: number;
} {
  if (lines[0]?.trim() !== '---') {
    return { start: -1, end: -1 };
  }

  const start = 0;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === '---') {
      return { start, end: i };
    }
  }

  return { start, end: -1 };
}

function parseFrontmatterContent(
  content: string
): Record<string, unknown> | undefined {
  const parsed = load(content, {
    schema: JSON_SCHEMA, // Use JSON_SCHEMA which is safer than DEFAULT_SCHEMA
    json: true,
  }) as Record<string, unknown> | null;

  if (!parsed) {
    return;
  }

  // Security: Validate frontmatter size
  const serializedSize = JSON.stringify(parsed).length;
  if (serializedSize > 1024 * 1024) {
    // 1MB limit
    throw new Error('Frontmatter too large (max 1MB)');
  }

  // Security: Validate frontmatter structure
  validateFrontmatter(parsed);

  return parsed;
}

function createYamlErrorMessage(error: unknown): string {
  let friendlyMessage = 'Invalid YAML syntax in frontmatter. ';

  if (!(error instanceof Error)) {
    return `${friendlyMessage}Please check your frontmatter formatting.`;
  }

  const message = error.message.toLowerCase();

  // Add user-friendly context based on common YAML errors
  if (message.includes('unexpected end')) {
    friendlyMessage += 'Make sure all strings are properly quoted and closed.';
  } else if (message.includes('bad indentation')) {
    friendlyMessage +=
      'Check that your indentation is consistent (use spaces, not tabs).';
  } else if (message.includes('duplicate key')) {
    friendlyMessage += 'You have duplicate keys in your frontmatter.';
  } else if (
    message.includes('unexpected token') ||
    message.includes('unexpected character')
  ) {
    friendlyMessage +=
      'Check for special characters that need to be quoted or escaped.';
  } else {
    friendlyMessage += `Details: ${error.message}`;
  }

  return friendlyMessage;
}

/**
 * Parses a Rulesets source rules file to extract frontmatter and body content.
 * For ruleset-v0.1-beta, this is a simple implementation that doesn't process Rulesets markers.
 *
 * @param content - The raw markdown content to parse
 * @returns A promise that resolves to a ParsedDoc
 */
// TLDR: Parse frontmatter and body from markdown content (ruleset-v0.1-beta)
// TLDR: ruleset-v0.1-beta Simple YAML frontmatter extraction only
// TODO(ruleset-v0.2-beta): Add support for block parsing
// TODO(ruleset-v0.3-beta): Add variable substitution
export function parse(content: string, sourcePath?: string): ParsedDoc {
  const lines = content.split('\n');
  const errors: ParseError[] = [];
  let frontmatter: Record<string, unknown> | undefined;

  const { start: frontmatterStart, end: frontmatterEnd } =
    findFrontmatterBounds(lines);

  if (frontmatterStart >= 0) {
    if (frontmatterEnd > 0) {
      // Extract and parse frontmatter
      const frontmatterContent = lines
        .slice(frontmatterStart + 1, frontmatterEnd)
        .join('\n');

      try {
        frontmatter = parseFrontmatterContent(frontmatterContent);
      } catch (error) {
        errors.push({
          message: createYamlErrorMessage(error),
          line: frontmatterStart + 1,
          column: 1,
        });
      }
    } else {
      // Unclosed frontmatter
      errors.push({
        message: 'Unclosed frontmatter block - missing closing ---',
        line: frontmatterStart + 1,
        column: 1,
      });
    }
  }

  const parsedDoc: ParsedDoc = {
    source: {
      path: sourcePath,
      content,
      frontmatter,
    },
    ast: {
      blocks: [], // Empty for v0 - no body processing
      imports: [], // Empty for v0 - no body processing
      variables: [], // Empty for v0 - no body processing
      markers: [], // Empty for v0 - no body processing
    },
  };

  if (errors.length > 0) {
    parsedDoc.errors = errors;
  }

  return parsedDoc;
}

// Check for suspicious keys that might indicate malicious intent
const SUSPICIOUS_KEYS = ['__proto__', 'constructor', 'prototype'];
const MAX_NESTING_DEPTH = 20;
const MAX_STRING_LENGTH = 10_000;

function validateKeyName(key: string, fullPath: string): void {
  if (SUSPICIOUS_KEYS.includes(key)) {
    throw new Error(
      `Security violation: Suspicious key "${fullPath}" detected`
    );
  }
}

function validateNestingDepth(path: string): void {
  if (path.split('.').length > MAX_NESTING_DEPTH) {
    throw new Error(
      `Frontmatter too deeply nested (max ${MAX_NESTING_DEPTH} levels)`
    );
  }
}

function validateStringLength(value: unknown, fullPath: string): void {
  if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
    throw new Error(`String value too long at "${fullPath}" (max 10KB)`);
  }
}

function checkKeys(obj: unknown, path = ''): void {
  if (obj === null || typeof obj !== 'object') {
    return;
  }

  const record = obj as Record<string, unknown>;

  for (const key in record) {
    // Guard against prototype chain properties
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      continue;
    }

    const fullPath = path ? `${path}.${key}` : key;

    // Validate the key name
    validateKeyName(key, fullPath);

    // Check for excessively nested objects (DoS protection)
    validateNestingDepth(path);

    const value = record[key];

    // Check for excessively long strings
    validateStringLength(value, fullPath);

    // Recursively check nested objects
    if (typeof value === 'object' && value !== null) {
      checkKeys(value, fullPath);
    }
  }
}

/**
 * Security validation for frontmatter to prevent malicious content
 */
function validateFrontmatter(frontmatter: Record<string, unknown>): void {
  checkKeys(frontmatter);
}
