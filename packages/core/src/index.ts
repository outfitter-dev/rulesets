// TLDR: Entry point for the Mixdown core package (mixd-v0)

import path from 'path';
import fs from 'fs/promises';
import { parse } from './parser';
import { lint, LinterConfig } from './linter';
import { compile } from './compiler';
import { getPlugin } from './destinations';
import { Logger, ConsoleLogger } from './interfaces/logger';

// Export all the necessary modules and interfaces
export * from './parser';
export * from './linter';
export * from './compiler';
export * from './destinations';
export * from './interfaces/compiled-doc';
export * from './interfaces/destination-plugin';
export * from './interfaces/logger';

/**
 * Configuration for the Mixdown v0 orchestration function
 */
export interface MixdownConfig {
  /**
   * Base output directory for compiled rules files
   * @default '.mixdown/dist'
   */
  outputDir?: string;
  
  /**
   * Linter configuration
   */
  linter?: LinterConfig;
  
  /**
   * Project configuration passed to the compiler
   */
  project?: Record<string, any>;
}

/**
 * Process a Mixdown source file through the entire pipeline: parse -> lint -> compile -> write.
 * For v0, this is a simplified implementation with pass-through compiling.
 * 
 * TLDR: Main orchestration function for end-to-end Mixdown v0 processing (mixd-v0)
 * 
 * @param sourceFilePath - Path to the source Mixdown file
 * @param logger - Logger instance
 * @param config - Optional Mixdown configuration
 * @returns A promise that resolves when the processing is complete
 */
export async function runMixdownV0(
  sourceFilePath: string,
  logger: Logger = new ConsoleLogger(),
  config: MixdownConfig = {}
): Promise<void> {
  const outputDir = config.outputDir || '.mixdown/dist';
  
  try {
    // Step 1: Read the source file
    logger.info(`Reading source file: ${sourceFilePath}`);
    const content = await fs.readFile(sourceFilePath, 'utf8');
    
    // Step 2: Parse the source content
    logger.info('Parsing source file...');
    const parsedDoc = await parse(content);
    
    // Set the source path in the parsed document
    parsedDoc.source.path = sourceFilePath;
    
    // Step 3: Lint the parsed document
    logger.info('Linting parsed document...');
    const lintResults = await lint(parsedDoc, config.linter);
    
    // Check if there are any linting errors
    const hasErrors = lintResults.some(result => result.severity === 'error');
    if (hasErrors) {
      logger.error('Linting errors found:');
      lintResults.forEach(result => {
        const location = result.line ? ` at line ${result.line}` : '';
        logger[result.severity](`- ${result.message}${location}`);
      });
      
      logger.error('Processing stopped due to linting errors.');
      return;
    }
    
    // Log any linting warnings
    const warnings = lintResults.filter(result => result.severity === 'warning');
    if (warnings.length > 0) {
      logger.warn('Linting warnings:');
      warnings.forEach(warning => {
        const location = warning.line ? ` at line ${warning.line}` : '';
        logger.warn(`- ${warning.message}${location}`);
      });
    }
    
    // Get the destinations from the frontmatter
    const destinations = parsedDoc.source.frontmatter?.destinations as Record<string, any> || {};
    const destinationIds = Object.keys(destinations);
    
    if (destinationIds.length === 0) {
      logger.warn('No destinations found in frontmatter. No files will be generated.');
      return;
    }
    
    // Step 4: Compile and write for each destination
    for (const destinationId of destinationIds) {
      const plugin = getPlugin(destinationId);
      
      if (!plugin) {
        logger.warn(`No plugin found for destination '${destinationId}'. Skipping.`);
        continue;
      }
      
      logger.info(`Compiling for destination: ${destinationId}`);
      const compiledDoc = await compile(parsedDoc, destinationId, config.project);
      
      // Determine the output path
      let destPath = destinations[destinationId]?.outputPath;
      
      if (!destPath) {
        // Use default path: {outputDir}/{destinationId}/{filename}
        const sourceBasename = path.basename(sourceFilePath, '.mix.md');
        destPath = path.join(outputDir, destinationId, `${sourceBasename}.md`);
        logger.info(`No outputPath specified for ${destinationId}, using default: ${destPath}`);
      } else if (!path.isAbsolute(destPath)) {
        // If the path is relative, resolve it against the output directory
        destPath = path.join(outputDir, destPath);
      }
      
      // Step 5: Write the compiled document to the destination
      logger.info(`Writing compiled document to ${destPath}`);
      await plugin.write({
        compiled: compiledDoc,
        destPath,
        config: destinations[destinationId] || {},
        logger,
      });
    }
    
    logger.info('Mixdown v0 processing completed successfully');
  } catch (error) {
    logger.error(`Failed to process Mixdown file: ${(error as Error).message}`);
    throw error;
  }
}