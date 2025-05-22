// TLDR: Main entry point and CLI orchestration for Mixdown v0 (mixd-v0)
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
 * Orchestrates the Mixdown v0 build process for a single file.
 * Reads, parses, lints, compiles, and writes to destinations.
 *
 * @example
 * ```typescript
 * import { runMixdownV0 } from '@mixdown/core';
 * import { ConsoleLogger } from '@mixdown/core';
 *
 * async function main() {
 *   const logger = new ConsoleLogger();
 *   try {
 *     await runMixdownV0('./my-rules.mix.md', logger);
 *     logger.info('Mixdown v0 process completed.');
 *   } catch (error) {
 *     logger.error('Mixdown v0 process failed:', error);
 *   }
 * }
 *
 * main();
 * ```
 *
 * @param sourceFilePath - The path to the source Mixdown file (e.g., my-rules.mix.md).
 * @param logger - An instance of the Logger interface.
 * @param projectConfig - Optional: The root Mixdown project configuration.
 * @returns A promise that resolves when the process is complete, or rejects on error.
 */
// TLDR: Main orchestration logic for reading, parsing, linting, compiling, and writing a Mixdown file (mixd-v0)
export async function runMixdownV0(
  sourceFilePath: string,
  logger: Logger = new ConsoleLogger(),
  projectConfig: Record<string, any> = {},
): Promise<void> {
  logger.info(`Starting Mixdown v0 processing for: ${sourceFilePath}`);

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
  const parsedDoc = await parse(content);
  parsedDoc.source.path = sourceFilePath;
  
  if (parsedDoc.errors && parsedDoc.errors.length > 0) {
    logger.warn(`Parser found ${parsedDoc.errors.length} error(s)`);
  }

  // Step 3: Lint the parsed document
  logger.info('Linting document...');
  const lintResults = await lint(parsedDoc, {
    requireMixdownVersion: true,
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
    const compiledDoc = await compile(parsedDoc, destinationId, projectConfig);

    // Determine output path
    const destConfig = frontmatter.destinations?.[destinationId] || {};
    const defaultPath = `.mixdown/dist/${destinationId}/my-rules.md`;
    const destPath = destConfig.outputPath || destConfig.path || defaultPath;

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

  logger.info('Mixdown v0 processing completed successfully!');
}

// CLI entry point for testing
// TLDR: Simple CLI wrapper for testing the orchestration logic (mixd-v0)
// TODO (mixd-v0.1): Replace with proper CLI using commander or yargs
if (require.main === module) {
  const logger = new ConsoleLogger();
  const sourceFile = process.argv[2] || './my-rules.mix.md';
  
  runMixdownV0(sourceFile, logger)
    .then(() => {
      logger.info('Done!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Failed:', error);
      process.exit(1);
    });
}