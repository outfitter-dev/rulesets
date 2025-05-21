// TLDR: Pass-through compiler for Mixdown v0 (mixd-v0)
import type { ParsedDoc, CompiledDoc } from '../interfaces/compiled-doc';

// <!-- TLDR: Compiles parsed doc for a destination without processing body -->
export async function compile(parsed: ParsedDoc, destinationId: string, projectConfig: any = {}): Promise<CompiledDoc> {
  const match = parsed.source.content.match(/^---\n([\s\S]*?)\n---\n?/);
  const body = match ? parsed.source.content.slice(match[0].length) : parsed.source.content;
  return {
    source: parsed.source,
    ast: parsed.ast,
    output: {
      content: body,
      metadata: { ...parsed.source.frontmatter }
    },
    context: {
      destinationId,
      config: projectConfig
    }
  };
}
