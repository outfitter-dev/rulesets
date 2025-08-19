// TLDR: Parser implementation for Rulesets notation (ruleset-v0.1-beta)
// TLDR: ruleset-v0.1-beta Basic frontmatter extraction without marker processing
import { load as yamlLoad } from 'js-yaml';
import type { ParsedDoc } from '../interfaces';

type ParseError = { message: string; line?: number; column?: number };

/**
 * Find the closing frontmatter delimiter
 */
function findFrontmatterEnd(lines: string[], startIndex: number): number {
  for (let i = startIndex; i < lines.length; i++) {
    if (lines[i]?.trim() === '---') {
      return i;
    }
  }
  return -1;
}

/**
 * Build a user-friendly error message for YAML parsing errors
 */
function buildYamlErrorMessage(error: unknown): string {
  let friendlyMessage = 'Invalid YAML syntax in frontmatter. ';

  if (!(error instanceof Error)) {
    return `${friendlyMessage}Please check your frontmatter formatting.`;
  }

  const message = error.message.toLowerCase();

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
 * Parse YAML frontmatter content
 */
function parseFrontmatterContent(
  content: string,
  lineNumber: number
): { frontmatter: Record<string, unknown>; error?: ParseError } {
  try {
    const frontmatter = (yamlLoad(content) as Record<string, unknown>) || {};
    return { frontmatter };
  } catch (error) {
    return {
      frontmatter: {},
      error: {
        message: buildYamlErrorMessage(error),
        line: lineNumber,
        column: 1,
      },
    };
  }
}

/**
 * Extract and parse frontmatter from lines
 */
function extractFrontmatter(lines: string[]): {
  frontmatter: Record<string, unknown>;
  errors: ParseError[];
} {
  const errors: ParseError[] = [];

  // Check if document starts with frontmatter delimiter
  if (lines[0]?.trim() !== '---') {
    return { frontmatter: {}, errors };
  }

  // Find closing delimiter
  const frontmatterEnd = findFrontmatterEnd(lines, 1);

  if (frontmatterEnd === -1) {
    errors.push({
      message: 'Unclosed frontmatter block - missing closing ---',
      line: 1,
      column: 1,
    });
    return { frontmatter: {}, errors };
  }

  // Extract frontmatter content
  const frontmatterContent = lines.slice(1, frontmatterEnd).join('\n');
  const { frontmatter, error } = parseFrontmatterContent(frontmatterContent, 1);

  if (error) {
    errors.push(error);
  }

  return { frontmatter, errors };
}

/**
 * Create an empty AST structure for v0
 */
function createEmptyAst() {
  return {
    blocks: [], // Empty for v0 - no body processing
    imports: [], // Empty for v0 - no body processing
    variables: [], // Empty for v0 - no body processing
    markers: [], // Empty for v0 - no body processing
  };
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
export function parse(content: string): ParsedDoc {
  const lines = content.split('\n');
  const { frontmatter, errors } = extractFrontmatter(lines);

  const parsedDoc: ParsedDoc = {
    source: {
      content,
      frontmatter:
        Object.keys(frontmatter).length > 0 ? frontmatter : undefined,
    },
    ast: createEmptyAst(),
  };

  if (errors.length > 0) {
    parsedDoc.errors = errors;
  }

  return parsedDoc;
}
