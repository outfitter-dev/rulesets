// :M: tldr: Parser implementation for Rulesets notation
// :M: v0.1.0: Basic frontmatter extraction without marker processing
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
// :M: v0.1.0: Simple YAML frontmatter extraction only
// :M: todo(v0.2.0): Add support for block parsing
// :M: todo(v0.3.0): Add variable substitution
export async function parse(content: string): Promise<ParsedDoc> {
  const lines = content.split('\n');
  let frontmatterStart = -1;
  let frontmatterEnd = -1;
  let frontmatter: Record<string, unknown> = {};
  const errors: Array<{ message: string; line?: number; column?: number }> = [];

  // Check for frontmatter
  if (lines[0].trim() === '---') {
    frontmatterStart = 0;
    // Find the closing frontmatter delimiter
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        frontmatterEnd = i;
        break;
      }
    }

    if (frontmatterEnd > 0) {
      // Extract and parse frontmatter
      const frontmatterContent = lines.slice(frontmatterStart + 1, frontmatterEnd).join('\n');
      try {
        frontmatter = yaml.load(frontmatterContent) as Record<string, unknown> || {};
      } catch (error) {
        let friendlyMessage = 'Invalid YAML syntax in frontmatter. ';
        
        if (error instanceof Error) {
          const message = error.message.toLowerCase();
          
          // Add user-friendly context based on common YAML errors
          if (message.includes('unexpected end')) {
            friendlyMessage += 'Make sure all strings are properly quoted and closed.';
          } else if (message.includes('bad indentation')) {
            friendlyMessage += 'Check that your indentation is consistent (use spaces, not tabs).';
          } else if (message.includes('duplicate key')) {
            friendlyMessage += 'You have duplicate keys in your frontmatter.';
          } else if (message.includes('unexpected token') || message.includes('unexpected character')) {
            friendlyMessage += 'Check for special characters that need to be quoted or escaped.';
          } else {
            friendlyMessage += `Details: ${error.message}`;
          }
        } else {
          friendlyMessage += 'Please check your frontmatter formatting.';
        }
        
        errors.push({
          message: friendlyMessage,
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
      blocks: [],     // Empty for v0 - no body processing
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