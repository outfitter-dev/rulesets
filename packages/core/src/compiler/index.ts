// TLDR: Pass-through compiler implementation that doesn't process markers (mixd-v0)
// TODO (mixd-v0.1): Process Mixdown notation markers

import { ParsedDoc, CompiledDoc } from '../interfaces/compiled-doc';

/**
 * Compile a parsed document into a CompiledDoc for a specific destination.
 * For v0, this is a pass-through implementation that doesn't process markers.
 * 
 * TLDR: Transforms ParsedDoc to CompiledDoc without processing markers (mixd-v0)
 * 
 * @param parsedDoc - The parsed document to compile
 * @param destinationId - The ID of the destination to compile for
 * @param projectConfig - Optional project configuration
 * @returns A promise that resolves to a CompiledDoc
 */
export async function compile(
  parsedDoc: ParsedDoc, 
  destinationId: string,
  projectConfig: Record<string, any> = {}
): Promise<CompiledDoc> {
  // Create the compiled document with original source and empty AST for v0
  const compiledDoc: CompiledDoc = {
    source: { ...parsedDoc.source },
    ast: { ...parsedDoc.ast },
    output: {
      // For v0, just pass through the raw body content
      content: parsedDoc.source.content,
      // Copy any destination-specific metadata from frontmatter if available
      metadata: parsedDoc.source.frontmatter?.destinations?.[destinationId] || {},
    },
    context: {
      destinationId,
      config: projectConfig,
    },
  };

  return compiledDoc;
}