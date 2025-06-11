// :M: tldr: Main entry point and CLI orchestration for Rulesets
// :M: v0.1.0: Basic orchestration for single file processing with minimal features
import { promises as fs } from 'fs';
import { parse } from './parser';
import { lint } from './linter';
import { compile } from './compiler';
import { destinations } from './destinations';
import { ConsoleLogger } from './interfaces';
import type { Logger } from './interfaces';

// Export all public APIs
export * from './interfaces';
export { parse } from './parser';
export { lint, type LinterConfig, type LintResult } from './linter';
export { compile } from './compiler';
export { destinations, CursorPlugin, WindsurfPlugin } from './destinations';

/**
 * Orchestrates the Rulesets v0.1.0 build process for a single file.
 * Reads, parses, lints, compiles, and writes to destinations.
 *
 * @example
 * ```typescript
 * import { runRulesetsV0 } from '@rulesets/core';
 * import { ConsoleLogger } from '@rulesets/core';
 *
 * async function main() {
 *   const logger = new ConsoleLogger();
 *   try {
 *     await runRulesetsV0('./my-rules.mix.md', logger);
 *     logger.info('Rulesets v0.1.0 process completed.');
 *   } catch (error) {
 *     logger.error('Rulesets v0.1.0 process failed:', error);
 *   }
 * }
 *
 * main();
 * ```
 *
 * @param sourceFilePath - The path to the source Rulesets file (e.g., my-rules.mix.md).
 * @param logger - An instance of the Logger interface.
 * @param projectConfig - Optional: The root Rulesets project configuration.
 * @returns A promise that resolves when the process is complete, or rejects on error.
 */
// :M: tldr: Main orchestration logic for reading, parsing, linting, compiling, and writing a Rulesets file
/**
 * Orchestrates the full processing pipeline for a Rulesets v0.1.0 source file, including reading, parsing, linting, compiling, and writing outputs for each configured destination.
 *
 * @param sourceFilePath - Path to the Rulesets source file to process.
 *
 * @remark
 * Throws if reading, parsing, linting, or writing fails. Lint errors will halt processing before compilation and writing.
 */
export async function runRulesetsV0(
  sourceFilePath: string,
  logger: Logger = new ConsoleLogger(),
  projectConfig: Record<string, unknown> = {},
): Promise<void> {
  logger.info(`Starting Rulesets v0.1.0 processing for: ${sourceFilePath}`);

  // Step 1: Read the source file
  let content: string;
  try {
    content = await fs.readFile(sourceFilePath, 'utf-8');
    logger.debug(`Read ${content.length} characters from ${sourceFilePath}`);
  } catch (error) {
    logger.error(`Failed to read source file: ${sourceFilePath}`, error);
    throw error;
  }

  // Step 2: Parse the content
  logger.info('Parsing source file...');
  let parsedDoc;
  try {
    parsedDoc = await parse(content);
    parsedDoc.source.path = sourceFilePath;
    
    if (parsedDoc.errors && parsedDoc.errors.length > 0) {
      logger.warn(`Parser found ${parsedDoc.errors.length} error(s)`);
    }
  } catch (error) {
    logger.error('Failed to parse source file', error);
    throw error;
  }

  // Step 3: Lint the parsed document
  logger.info('Linting document...');
  let lintResults;
  try {
    lintResults = await lint(parsedDoc, {
      requireRulesetsVersion: true,
      allowedDestinations: Array.from(destinations.keys()),
    });

    // Log lint results
    let hasErrors = false;
    for (const result of lintResults) {
      const location = result.line ? ` (line ${result.line})` : '';
      const message = `${result.message}${location}`;
      
      switch (result.severity) {
        case 'error':
          logger.error(message);
          hasErrors = true;
          break;
        case 'warning':
          logger.warn(message);
          break;
        case 'info':
          logger.info(message);
          break;
      }
    }

    // Stop if there are lint errors
    if (hasErrors) {
      throw new Error('Linting failed with errors. Please fix the issues and try again.');
    }
  } catch (error) {
    logger.error('Failed during linting', error);
    throw error;
  }

  // Step 4: Determine which destinations to compile for
  const frontmatter = parsedDoc.source.frontmatter || {};
  const destinationIds = frontmatter.destinations 
    ? Object.keys(frontmatter.destinations)
    : Array.from(destinations.keys());

  logger.info(`Compiling for destinations: ${destinationIds.join(', ')}`);

  // Step 5: Compile and write for each destination
  for (const destinationId of destinationIds) {
    const plugin = destinations.get(destinationId);
    if (!plugin) {
      logger.warn(`No plugin found for destination: ${destinationId}`);
      continue;
    }

    logger.info(`Processing destination: ${destinationId}`);

    // Compile for this destination
    let compiledDoc;
    try {
      compiledDoc = compile(parsedDoc, destinationId, projectConfig);
    } catch (error) {
      logger.error(`Failed to compile for destination: ${destinationId}`, error);
      continue; // Continue with other destinations
    }

    // Determine output path
    const destConfig = (frontmatter.destinations && typeof frontmatter.destinations === 'object' && !Array.isArray(frontmatter.destinations)) ? (frontmatter.destinations as Record<string, any>)[destinationId] || {} : {};
    const defaultPath = `.rulesets/dist/${destinationId}/my-rules.md`;
    const destPath = (typeof destConfig.outputPath === 'string' ? destConfig.outputPath : undefined) || (typeof destConfig.path === 'string' ? destConfig.path : undefined) || defaultPath;

    // Write using the plugin
    try {
      await plugin.write({
        compiled: compiledDoc,
        destPath,
        config: destConfig,
        logger,
      });
    } catch (error) {
      logger.error(`Failed to write ${destinationId} output`, error);
      throw error;
    }
  }

  logger.info('Rulesets v0.1.0 processing completed successfully!');
}

// CLI entry point for testing
// :M: tldr: Simple CLI wrapper for testing the orchestration logic
// :M: v0.1.0: Basic CLI for development testing only
// :M: todo(v0.2.0): Replace with proper CLI using commander or yargs
if (require.main === module) {
  const logger = new ConsoleLogger();
  const sourceFile = process.argv[2] || './my-rules.mix.md';
  
  runRulesetsV0(sourceFile, logger)
    .then(() => {
      logger.info('Done!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Failed:', error);
      process.exit(1);
    });
}