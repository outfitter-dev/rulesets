// :M: tldr: Simple parser implementation that extracts frontmatter and body from markdown
// :M: v0.1.0: Basic frontmatter and body extraction without processing Rulesets notation
import * as yaml from 'js-yaml';
import type { ParsedDoc } from '../interfaces';

/**
 * Parses a Rulesets source rules file to extract frontmatter and body content.
 * For v0.1.0, this is a simple implementation that doesn't process Rulesets markers.
 * 
 * @param content - The raw markdown content to parse
 * @returns A promise that resolves to a ParsedDoc
 */
// :M: tldr: Parse frontmatter and body from markdown content
// :M: v0.1.0: Extract YAML frontmatter and raw body without marker processing
// :M: todo(v0.2.0): Add support for stem parsing
// :M: todo(v0.3.0): Add variable substitution
export async function parse(content: string): Promise<ParsedDoc> {
  const lines = content.split('\n');
  let frontmatterStart = -1;
  let frontmatterEnd = -1;
  let frontmatter: Record<string, any> = {};
  const errors: Array<{ message: string; line?: number; column?: number }> = [];

  // Check for frontmatter
  if (lines[0] === '---') {
    frontmatterStart = 0;
    // Find the closing frontmatter delimiter
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') {
        frontmatterEnd = i;
        break;
      }
    }

    if (frontmatterEnd > 0) {
      // Extract and parse frontmatter
      const frontmatterContent = lines.slice(frontmatterStart + 1, frontmatterEnd).join('\n');
      try {
        frontmatter = yaml.load(frontmatterContent) as Record<string, any> || {};
      } catch (error) {
        errors.push({
          message: `Failed to parse frontmatter YAML: ${error instanceof Error ? error.message : 'Unknown error'}`,
          line: frontmatterStart + 1,
          column: 1,
        });
      }

      // Extract body (everything after frontmatter)
      // Body extraction happens in the compiler for v0
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
      content,
      frontmatter: Object.keys(frontmatter).length > 0 ? frontmatter : undefined,
    },
    ast: {
      stems: [],      // Empty for v0 - no body processing
      imports: [],    // Empty for v0 - no body processing
      variables: [],  // Empty for v0 - no body processing
      markers: [],    // Empty for v0 - no body processing
    },
  };

  if (errors.length > 0) {
    parsedDoc.errors = errors;
  }

  return parsedDoc;
}