// TLDR: Compiler implementation for Rulesets notation (v0.2.0+)
// TLDR: Handlebars-based implementation with full marker processing
import type { CompiledDoc, ParsedDoc } from '../interfaces';
import { getChildLogger } from '../utils/logger';
import { HandlebarsRulesetCompiler } from './handlebars-compiler';

const pinoLogger = getChildLogger('compiler');

// Create global Handlebars compiler instance
const handlebarsCompiler = new HandlebarsRulesetCompiler();

/**
 * Compiles a parsed Rulesets document for a specific provider.
 * v0.2.0+ implementation with full Handlebars processing of markers.
 *
 * @param parsedDoc - The parsed document to compile
 * @param providerId - The ID of the provider to compile for (updated from destinationId)
 * @param projectConfig - Optional project configuration
 * @returns A compiled document with processed Handlebars content
 */
export function compile(
  parsedDoc: ParsedDoc,
  providerId: string,
  projectConfig: Record<string, unknown> = {}
): CompiledDoc {
  try {
    return handlebarsCompiler.compile(parsedDoc, providerId, projectConfig);
  } catch (error) {
    pinoLogger.error(
      { error, path: parsedDoc.source.path, providerId },
      'Failed to compile document'
    );
    throw error;
  }
}
