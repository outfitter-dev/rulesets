// TLDR: Compiler implementation for Rulesets notation (ruleset-v0.1-beta)
// TLDR: ruleset-v0.1-beta Pass-through implementation without marker processing
import type { CompiledDoc, ParsedDoc, Provider } from '@rulesets/types';

// Export new Handlebars-based compiler (v0.2+)
export { 
  HandlebarsRulesetCompiler, 
  compileWithHandlebars,
  type HandlebarsContext,
  type SectionOptions
} from './handlebars-compiler';

/**
 * Compiles a parsed Rulesets document for a specific provider.
 * For ruleset-v0.1-beta, this is a pass-through implementation that doesn't process markers.
 *
 * @param parsedDoc - The parsed document to compile
 * @param destinationId - The ID of the provider to compile for (legacy parameter name)
 * @param projectConfig - Optional project configuration
 * @returns A promise that resolves to a CompiledDoc
 */
// TLDR: Compiles parsed document to provider format (ruleset-v0.1-beta)
// TLDR: ruleset-v0.1-beta Pass-through implementation without transformation
// TODO(ruleset-v0.2-beta): Process block markers and convert to XML
// TODO(ruleset-v0.3-beta): Process variables and perform substitution
export function compile(
  parsedDoc: ParsedDoc,
  destinationId: string,
  projectConfig: Record<string, unknown> = {}
): CompiledDoc {
  const { source, ast } = parsedDoc;

  // Handle empty files consistently
  if (!source.content.trim()) {
    // Empty source file - will result in empty output
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
        bodyContent = lines
          .slice(frontmatterEnd + 1)
          .join('\n')
          .trim();
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
      blocks: ast.blocks, // Pass through from parser (empty for ruleset-v0.1-beta)
      imports: ast.imports, // Pass through from parser (empty for ruleset-v0.1-beta)
      variables: ast.variables, // Pass through from parser (empty for ruleset-v0.1-beta)
      markers: ast.markers, // Pass through from parser (empty for ruleset-v0.1-beta)
    },
    output: {
      content: bodyContent, // Raw body content for ruleset-v0.1-beta
      metadata: {
        // Include relevant frontmatter metadata
        title: source.frontmatter?.title,
        description: source.frontmatter?.description,
        version: source.frontmatter?.version,
        // Include provider-specific metadata if available
        ...(source.frontmatter?.destinations &&
        typeof source.frontmatter.destinations === 'object' &&
        !Array.isArray(source.frontmatter.destinations)
          ? ((source.frontmatter.destinations as Record<string, unknown>)[
              destinationId
            ] as Record<string, unknown>) || {}
          : {}),
      },
    },
    context: {
      destinationId,
      config: {
        ...projectConfig,
        // Merge provider-specific config from frontmatter
        ...(source.frontmatter?.destinations &&
        typeof source.frontmatter.destinations === 'object' &&
        !Array.isArray(source.frontmatter.destinations)
          ? ((source.frontmatter.destinations as Record<string, unknown>)[
              destinationId
            ] as Record<string, unknown>) || {}
          : {}),
      },
    },
  };

  return compiledDoc;
}

/**
 * Compiles a parsed Rulesets document using a Provider definition.
 * Centralized compiler entry that consumes provider metadata/capabilities.
 * Currently behaves like pass-through (ruleset-v0.1-beta) but sets context from provider.id
 * to enable a single compiler for all providers.
 */
export function compileWithProvider(
  parsedDoc: ParsedDoc,
  provider: Provider,
  projectConfig: Record<string, unknown> = {}
): CompiledDoc {
  const compiled = compile(
    parsedDoc,
    provider.id as unknown as string,
    projectConfig
  );

  // Preserve output/content from base compile; enrich metadata minimally for now
  return {
    ...compiled,
    output: {
      ...compiled.output,
      metadata: {
        ...compiled.output.metadata,
        provider: provider.id,
        providerName: provider.name,
        providerFormat: provider.config.format,
      },
    },
    context: {
      ...compiled.context,
      // destinationId already set to provider.id by base compile
    },
  };
}
