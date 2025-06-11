// :M: tldr: Compiler implementation for Rulesets notation
// :M: v0.1.0: Pass-through implementation without marker processing
import type { ParsedDoc, CompiledDoc } from '../interfaces';

/**
 * Compiles a parsed Rulesets document for a specific destination.
 * For v0.1.0, this is a pass-through implementation that doesn't process markers.
 * 
 * @param parsedDoc - The parsed document to compile
 * @param destinationId - The ID of the destination to compile for
 * @param projectConfig - Optional project configuration
 * @returns A promise that resolves to a CompiledDoc
 */
// :M: tldr: Compiles parsed document to destination format
// :M: v0.1.0: Pass-through implementation without transformation
// :M: todo(v0.2.0): Process stem markers and convert to XML
/**
 * Compiles a parsed Rulesets document into a compiled document for a specified destination.
 *
 * Extracts and trims the body content after frontmatter, passes through AST properties, and merges metadata and configuration from both the project config and destination-specific frontmatter fields.
 *
 * @param parsedDoc - The parsed document containing source content and AST.
 * @param destinationId - Identifier for the compilation target destination.
 * @param projectConfig - Optional project-level configuration to merge into the context.
 * @returns The compiled document with merged metadata and configuration for the specified destination.
 *
 * @remark This function currently performs no transformation on markers or variables; it acts as a pass-through for most fields.
 */
export function compile(
  parsedDoc: ParsedDoc,
  destinationId: string,
  projectConfig: Record<string, unknown> = {},
): CompiledDoc {
  const { source, ast } = parsedDoc;
  
  // Handle empty files consistently
  if (!source.content.trim()) {
    console.warn('Compiling empty source file');
  }
  
  // Extract the body content (everything after frontmatter)
  let bodyContent = source.content;
  
  // If there's frontmatter, remove it from the body
  if (source.frontmatter) {
    const lines = source.content.split('\n');
    let frontmatterEnd = -1;
    
    if (lines[0] === '---') {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i] === '---') {
          frontmatterEnd = i;
          break;
        }
      }
      
      if (frontmatterEnd > 0) {
        bodyContent = lines.slice(frontmatterEnd + 1).join('\n').trim();
      }
    }
  }

  // Build the compiled document
  const compiledDoc: CompiledDoc = {
    source: {
      path: source.path,
      content: source.content,
      frontmatter: source.frontmatter,
    },
    ast: {
      stems: ast.stems,           // Pass through from parser (empty for v0)
      imports: ast.imports,       // Pass through from parser (empty for v0)
      variables: ast.variables,   // Pass through from parser (empty for v0)
      markers: ast.markers,       // Pass through from parser (empty for v0)
    },
    output: {
      content: bodyContent,       // Raw body content for v0
      metadata: {
        // Include relevant frontmatter metadata
        title: source.frontmatter?.title,
        description: source.frontmatter?.description,
        version: source.frontmatter?.version,
        // Include destination-specific metadata if available
        ...(source.frontmatter?.destinations && typeof source.frontmatter.destinations === 'object' && !Array.isArray(source.frontmatter.destinations) ? (source.frontmatter.destinations as Record<string, any>)[destinationId] || {} : {}),
      },
    },
    context: {
      destinationId,
      config: {
        ...projectConfig,
        // Merge destination-specific config from frontmatter
        ...(source.frontmatter?.destinations && typeof source.frontmatter.destinations === 'object' && !Array.isArray(source.frontmatter.destinations) ? (source.frontmatter.destinations as Record<string, any>)[destinationId] || {} : {}),
      },
    },
  };

  return compiledDoc;
}