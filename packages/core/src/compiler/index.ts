// TLDR: Pass-through compiler implementation that doesn't process markers (mixd-v0)
import type { ParsedDoc, CompiledDoc } from '../interfaces';

/**
 * Compiles a parsed Mixdown document for a specific destination.
 * For v0, this is a pass-through implementation that doesn't process markers.
 * 
 * @param parsedDoc - The parsed document to compile
 * @param destinationId - The ID of the destination to compile for
 * @param projectConfig - Optional project configuration
 * @returns A promise that resolves to a CompiledDoc
 */
// TLDR: Pass-through compiler that returns raw body content (mixd-v0)
// TODO (mixd-v0.1): Process stem markers and convert to XML
// TODO (mixd-v0.2): Process variables and perform substitution
export async function compile(
  parsedDoc: ParsedDoc,
  destinationId: string,
  projectConfig: Record<string, any> = {},
): Promise<CompiledDoc> {
  const { source, ast } = parsedDoc;
  
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
        ...(source.frontmatter?.destinations?.[destinationId] || {}),
      },
    },
    context: {
      destinationId,
      config: {
        ...projectConfig,
        // Merge destination-specific config from frontmatter
        ...(source.frontmatter?.destinations?.[destinationId] || {}),
      },
    },
  };

  return compiledDoc;
}