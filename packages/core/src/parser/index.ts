// TLDR: Simple frontmatter parser that extracts YAML frontmatter and raw Markdown body (mixd-v0)
// TODO (mixd-v0.1): Add stem parsing support

import yaml from 'js-yaml';
import { ParsedDoc } from '../interfaces/compiled-doc';

/**
 * Parse a string containing Markdown with YAML frontmatter.
 * 
 * TLDR: Extracts YAML frontmatter and raw Markdown body from a source document (mixd-v0)
 * 
 * @param content - The content to parse
 * @returns A promise that resolves to a ParsedDoc object
 */
export async function parse(content: string): Promise<ParsedDoc> {
  // Initialize the ParsedDoc with minimal AST for v0
  const parsedDoc: ParsedDoc = {
    source: {
      content,
      frontmatter: {},
    },
    ast: {
      stems: [],
      imports: [],
      variables: [],
      markers: [],
    },
  };

  // Early return for empty content
  if (!content.trim()) {
    return parsedDoc;
  }

  try {
    // Check for YAML frontmatter delimited by ---
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);

    if (frontmatterMatch) {
      const [, frontmatterYaml, bodyContent] = frontmatterMatch;
      
      try {
        // Parse the YAML frontmatter
        const frontmatter = yaml.load(frontmatterYaml);
        
        // Only assign if it's a valid object
        if (frontmatter && typeof frontmatter === 'object' && !Array.isArray(frontmatter)) {
          parsedDoc.source.frontmatter = frontmatter as Record<string, any>;
        } else {
          parsedDoc.errors = [
            { message: 'Frontmatter must be a valid YAML object' }
          ];
        }
      } catch (error) {
        // Handle YAML parsing errors
        parsedDoc.errors = [
          { 
            message: `Error parsing frontmatter: ${(error as Error).message}`,
          }
        ];
      }
      
      // Store the body content regardless of frontmatter parsing success
      parsedDoc.source.content = bodyContent.trim();
    } else {
      // No frontmatter found, the entire content is the body
      parsedDoc.source.content = content.trim();
    }
    
    return parsedDoc;
  } catch (error) {
    // Handle any unexpected errors
    return {
      ...parsedDoc,
      errors: [
        { message: `Unexpected error parsing document: ${(error as Error).message}` }
      ],
    };
  }
}