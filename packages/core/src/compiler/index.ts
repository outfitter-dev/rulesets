// TLDR: Compiler implementation for Rulesets notation (mixd-v0)
// TLDR: v0.1.0 Pass-through implementation without marker processing
import type { CompiledDoc, ParsedDoc } from '../interfaces';
import { getChildLogger } from '../utils/logger';

const pinoLogger = getChildLogger('compiler');

/**
 * Compiles a parsed Rulesets document for a specific provider.
 * v0.1.0 behavior: pass-through body content; preserves markers.
 */
export function compile(
  parsedDoc: ParsedDoc,
  providerId: string,
  projectConfig: Record<string, unknown> = {}
): CompiledDoc {
  try {
    const { source, ast } = parsedDoc;

    // Extract the body content (everything after frontmatter)
    let bodyContent = source.content;

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

    const compiledDoc: CompiledDoc = {
      source: {
        path: source.path,
        content: source.content,
        frontmatter: source.frontmatter,
      },
      ast: {
        blocks: ast.blocks,
        imports: ast.imports,
        variables: ast.variables,
        markers: ast.markers,
      },
      output: {
        content: bodyContent,
        metadata: {
          title: source.frontmatter?.title,
          description: source.frontmatter?.description,
          version: source.frontmatter?.version,
          ...(source.frontmatter?.destinations &&
          typeof source.frontmatter.destinations === 'object' &&
          !Array.isArray(source.frontmatter.destinations)
            ? ((source.frontmatter.destinations as Record<string, unknown>)[
                providerId
              ] as Record<string, unknown>) || {}
            : {}),
        },
      },
      context: {
        destinationId: providerId,
        config: {
          ...projectConfig,
          ...(source.frontmatter?.destinations &&
          typeof source.frontmatter.destinations === 'object' &&
          !Array.isArray(source.frontmatter.destinations)
            ? ((source.frontmatter.destinations as Record<string, unknown>)[
                providerId
              ] as Record<string, unknown>) || {}
            : {}),
        },
      },
    };

    return compiledDoc;
  } catch (error) {
    pinoLogger.error(
      { error, path: parsedDoc.source.path, providerId },
      'Failed to compile document'
    );
    throw error;
  }
}

// TODO: Add compileWithProvider function for v0.2.0 when Provider interface compilation is implemented
