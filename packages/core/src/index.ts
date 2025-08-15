// TLDR: Main entry point and CLI orchestration for Rulesets (mixd-v0)
// TLDR: v0.1.0 Basic orchestration for single file processing with minimal features

import { dirname } from 'node:path';
import { compile } from '@rulesets/compiler';
import { lint } from '@rulesets/linter';
import { parse } from '@rulesets/parser';
import type { CompiledDoc, Logger, ParsedDoc } from '@rulesets/types';
import { hasGeneratedPaths } from '@rulesets/types';
import type { RulesetConfig } from './config';
import { loadConfig } from './config';
import { createGitignoreManager } from './gitignore';
import { ConsoleLogger } from './logger';
import { destinations, providers as providerRegistry } from './providers';

export { compile } from '@rulesets/compiler';
export type { LinterConfig, LintResult } from '@rulesets/linter';
export { lint } from '@rulesets/linter';

// Re-export from other packages
export { parse } from '@rulesets/parser';
// Re-export from types for backward compatibility
export type { CompiledDoc, Logger, ParsedDoc } from '@rulesets/types';
export type {
  ConfigContext,
  ConfigFileResult,
  ConfigLoader as IConfigLoader,
  ConfigLoadOptions,
  ConfigLoadResult,
  ProviderConfig,
  RulesetConfig,
} from './config';
// Export Configuration system
export {
  applyEnvOverrides,
  CONFIG_FILE_NAMES,
  ConfigLoader,
  DEFAULT_CONFIG,
  DEFAULT_LOAD_OPTIONS,
  findConfigFile,
  getConfigLoader,
  KNOWN_PROVIDERS,
  loadConfig,
  mergeConfigs,
  parseConfigContent,
  validateConfig,
} from './config';
export type {
  GitignoreConfig,
  GitignoreOverrides,
  GitignoreResult,
  ManagedBlockConfig,
} from './gitignore';
// Export GitignoreManager functionality
export {
  createGitignoreManager,
  GitignoreManager,
  matchesAnyPattern,
  normalizeGitignorePath,
  parseOverrideFile,
} from './gitignore';
export { ConsoleLogger } from './logger';
// Export local APIs - Modern provider exports
// Legacy exports for backwards compatibility
// @deprecated - Use providers instead. Will be removed in v1.0
export {
  AmpProvider,
  ClaudeCodeProvider,
  CodexProvider,
  CursorProvider,
  claudeCodePlugin as ClaudeCodePlugin,
  cursorPlugin as CursorPlugin,
  destinations,
  getAllProviders,
  getProvider,
  getProviderIds,
  OpenCodeProvider,
  providers,
  WindsurfProvider,
  windsurfPlugin as WindsurfPlugin,
} from './providers';

/**
 * Orchestrates the Rulesets v0.1.0 build process for a single file.
 * Reads, parses, lints, compiles, and writes to destinations with configuration support.
 *
 * @example
 * ```typescript
 * import { runRulesetsV0 } from '@rulesets/core';
 * import { ConsoleLogger } from '@rulesets/core';
 *
 * async function main() {
 *   const logger = new ConsoleLogger();
 *   try {
 *     await runRulesetsV0('./my-rules.ruleset.md', logger);
 *     logger.info('Rulesets v0.1.0 process completed.');
 *   } catch (error) {
 *     logger.error('Rulesets v0.1.0 process failed:', error);
 *   }
 * }
 *
 * main();
 * ```
 *
 * @param sourceFilePath - The path to the source Rulesets file (e.g., my-rules.ruleset.md).
 * @param logger - An instance of the Logger interface.
 * @param configOverride - Optional: Configuration override (takes precedence over config files).
 * @returns A promise that resolves when the process is complete, or rejects on error.
 */
/**
 * Load and validate configuration for Rulesets processing
 */
async function loadAndValidateConfig(
  projectPath: string,
  logger: Logger,
  configOverride?: Partial<RulesetConfig>
): Promise<RulesetConfig> {
  const configResult = await loadConfig(projectPath, {}, logger);

  // Handle configuration errors
  if (configResult.errors && configResult.errors.length > 0) {
    if (configResult.config.strict) {
      throw new Error(
        `Configuration validation failed: ${configResult.errors.join(', ')}`
      );
    }
    for (const error of configResult.errors) {
      logger.warn(`Configuration error: ${error}`);
    }
  }

  // Handle configuration warnings
  if (configResult.warnings && configResult.warnings.length > 0) {
    for (const warning of configResult.warnings) {
      logger.warn(`Configuration warning: ${warning}`);
    }
  }

  // Log configuration sources
  logger.debug(
    `Configuration loaded from ${configResult.sources.length} source(s)`
  );
  if (Object.keys(configResult.envOverrides).length > 0) {
    logger.debug(
      `Environment overrides: ${Object.keys(configResult.envOverrides).join(', ')}`
    );
  }

  // Apply configuration override if provided
  return configOverride
    ? { ...configResult.config, ...configOverride }
    : configResult.config;
}

/**
 * Read source file content
 */
async function readSourceFile(
  sourceFilePath: string,
  logger: Logger
): Promise<string> {
  try {
    const content = await Bun.file(sourceFilePath).text();
    logger.debug(`Read ${content.length} characters from ${sourceFilePath}`);
    return content;
  } catch (error) {
    logger.error(`Failed to read source file: ${sourceFilePath}`, error);
    throw error;
  }
}

/**
 * Parse source file content
 */
async function parseSourceFile(
  content: string,
  _sourceFilePath: string,
  logger: Logger
): Promise<ParsedDoc> {
  try {
    const parsedDoc = await parse(content);
    if (parsedDoc.errors && parsedDoc.errors.length > 0) {
      logger.warn(`Parser found ${parsedDoc.errors.length} error(s)`);
    }
    return parsedDoc;
  } catch (error) {
    logger.error('Failed to parse source file', error);
    throw error;
  }
}

/**
 * Perform linting and handle results
 */
function performLinting(parsedDoc: ParsedDoc, logger: Logger): void {
  const lintResults = lint(parsedDoc, {
    requireRulesetsVersion: true,
    allowedDestinations: Array.from(destinations.keys()),
  });

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
      default:
        break;
    }
  }

  if (hasErrors) {
    throw new Error(
      'Linting failed with errors. Please fix the issues and try again.'
    );
  }
}

/**
 * Determine destination IDs based on configuration hierarchy
 */
function determineDestinationIds(
  parsedDoc: ParsedDoc,
  config: RulesetConfig,
  logger: Logger
): string[] {
  const frontmatter = parsedDoc.source.frontmatter;

  // Check frontmatter destinations first
  if (
    frontmatter?.destinations &&
    typeof frontmatter.destinations === 'object' &&
    !Array.isArray(frontmatter.destinations)
  ) {
    logger.debug('Using destinations from frontmatter');
    return Object.keys(frontmatter.destinations as Record<string, unknown>);
  }

  // Use enabled providers from configuration
  const enabledProviders = Object.entries(config.providers || {})
    .filter(([_, providerConfig]) => providerConfig.enabled !== false)
    .map(([providerId]) => providerId);

  if (enabledProviders.length > 0) {
    logger.debug('Using enabled providers from configuration');
    return enabledProviders;
  }

  // Use default providers from configuration
  if (config.defaultProviders && config.defaultProviders.length > 0) {
    logger.debug('Using default providers from configuration');
    return [...config.defaultProviders];
  }

  // Fallback to all available destinations
  logger.debug('Using all available destinations as fallback');
  return Array.from(destinations.keys());
}

/**
 * Process a single destination
 */
async function processDestination(
  destinationId: string,
  parsedDoc: ParsedDoc,
  config: RulesetConfig,
  logger: Logger,
  projectPath: string
): Promise<string[]> {
  const plugin = destinations.get(destinationId);
  if (!plugin) {
    logger.warn(`No plugin found for destination: ${destinationId}`);
    return [];
  }

  logger.info(`Processing destination: ${destinationId}`);

  // Prefer modern provider from registry when available
  const provider = providerRegistry.get(destinationId);

  // Use standard compilation for now - provider compilation will be added in v0.2
  let compiledDoc: CompiledDoc;
  try {
    compiledDoc = compile(parsedDoc, destinationId, config);
  } catch (error) {
    logger.error(`Failed to compile for destination: ${destinationId}`, error);
    return [];
  }

  // Get merged configuration
  const destConfig = getMergedDestinationConfig(
    parsedDoc.source.frontmatter,
    destinationId,
    config
  );

  // Determine output path
  const destPath = determineOutputPath(
    destConfig,
    config.providers?.[destinationId] as Record<string, unknown> | undefined,
    destinationId,
    config.outputDirectory,
    provider?.config?.outputPath
  );

  // Write using the plugin
  try {
    const writeResult = await plugin.write({
      compiled: compiledDoc,
      destPath,
      config: { ...destConfig, baseDir: projectPath },
      logger,
    });

    // Return generated paths if available
    if (hasGeneratedPaths(writeResult)) {
      logger.debug(
        `Generated paths from ${destinationId}: ${writeResult.generatedPaths.join(', ')}`
      );
      return [...writeResult.generatedPaths];
    }
    return [];
  } catch (error) {
    logger.error(`Failed to write ${destinationId} output`, error);
    throw error;
  }
}

/**
 * Get merged destination configuration
 */
function getMergedDestinationConfig(
  frontmatter: Record<string, unknown> | undefined,
  destinationId: string,
  config: RulesetConfig
): Record<string, unknown> {
  const frontmatterDestinations = frontmatter?.destinations;
  const frontmatterDestConfig: Record<string, unknown> =
    frontmatterDestinations &&
    typeof frontmatterDestinations === 'object' &&
    !Array.isArray(frontmatterDestinations) &&
    typeof (frontmatterDestinations as Record<string, unknown>)[
      destinationId
    ] === 'object'
      ? ((frontmatterDestinations as Record<string, unknown>)[
          destinationId
        ] as Record<string, unknown>) || {}
      : {};

  const providerConfig = config.providers?.[destinationId] || {};
  return {
    ...providerConfig,
    ...frontmatterDestConfig,
  };
}

/**
 * Determine output path for destination
 */
function determineOutputPath(
  destConfig: Record<string, unknown>,
  providerConfig: Record<string, unknown> | undefined,
  destinationId: string,
  outputDirectory?: string,
  providerDefaultPath?: string
): string {
  const outputDir = outputDirectory || '.ruleset/dist';
  const fallbackPath = `${outputDir}/${destinationId}/my-rules.md`;

  return (
    (typeof destConfig.outputPath === 'string'
      ? destConfig.outputPath
      : undefined) ||
    (typeof destConfig.path === 'string' ? destConfig.path : undefined) ||
    (typeof providerConfig?.outputPath === 'string'
      ? providerConfig.outputPath
      : undefined) ||
    providerDefaultPath ||
    fallbackPath
  );
}

/**
 * Build gitignore configuration
 */
function buildGitignoreConfig(config: RulesetConfig) {
  return {
    enabled: config.gitignore?.enabled ?? true,
    keep: config.gitignore?.keep || [],
    ignore: config.gitignore?.ignore || [],
    options: {
      comment: config.gitignore?.options?.comment || 'Rulesets Managed',
      sort: config.gitignore?.options?.sort ?? true,
    },
  };
}

/**
 * Log gitignore update results
 */
function logGitignoreResults(result: any, logger: Logger): void {
  if (!result.success) {
    logger.warn('Failed to update .gitignore:');
    if (result.messages) {
      for (const message of result.messages) {
        logger.warn(`  ${message}`);
      }
    }
    return;
  }

  if (result.added && result.added.length > 0) {
    logger.info(`Added ${result.added.length} files to .gitignore`);
    logger.debug(`Added: ${result.added.join(', ')}`);
  }

  if (result.kept && result.kept.length > 0) {
    logger.info(`Kept ${result.kept.length} files due to override rules`);
    logger.debug(`Kept: ${result.kept.join(', ')}`);
  }

  if (result.messages) {
    for (const message of result.messages) {
      logger.debug(`GitignoreManager: ${message}`);
    }
  }
}

/**
 * Update gitignore with generated paths
 */
async function updateGitignore(
  allGeneratedPaths: string[],
  config: RulesetConfig,
  logger: Logger,
  projectPath: string
): Promise<void> {
  // Skip if no paths or gitignore is disabled
  if (allGeneratedPaths.length === 0 || config.gitignore?.enabled === false) {
    if (allGeneratedPaths.length > 0) {
      logger.debug('Gitignore management is disabled by configuration');
    }
    return;
  }

  logger.info('Updating .gitignore with generated file paths...');

  try {
    const gitignoreConfig = buildGitignoreConfig(config);
    const gitignoreManager = createGitignoreManager(
      gitignoreConfig,
      projectPath
    );
    const gitignoreResult =
      await gitignoreManager.updateGitignore(allGeneratedPaths);

    logGitignoreResults(gitignoreResult, logger);
  } catch (error) {
    logger.warn(
      `GitignoreManager error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    // Don't throw - gitignore management is non-critical
  }
}

// TLDR: Main orchestration logic for reading, parsing, linting, compiling, and writing a Rulesets file (mixd-v0)
// TLDR: v0.1.0 Sequential processing of parse → lint → compile → write for each destination
export async function runRulesetsV0(
  sourceFilePath: string,
  logger: Logger = new ConsoleLogger(),
  configOverride?: Partial<RulesetConfig>
): Promise<void> {
  logger.info(`Starting Rulesets v0.1.0 processing for: ${sourceFilePath}`);

  // Step 1: Load configuration
  logger.info('Loading configuration...');
  const projectPath = dirname(sourceFilePath);
  const config = await loadAndValidateConfig(
    projectPath,
    logger,
    configOverride
  );

  // Step 2: Read the source file
  const content = await readSourceFile(sourceFilePath, logger);

  // Step 3: Parse the content
  logger.info('Parsing source file...');
  const parsedDoc = await parseSourceFile(content, sourceFilePath, logger);

  // Step 4: Lint the parsed document
  logger.info('Linting document...');
  performLinting(parsedDoc, logger);

  // Step 5: Determine which destinations to compile for
  const destinationIds = determineDestinationIds(parsedDoc, config, logger);
  logger.info(`Compiling for destinations: ${destinationIds.join(', ')}`);

  // Step 6: Compile and write for each destination
  const destinationPromises = destinationIds.map((destinationId) =>
    processDestination(destinationId, parsedDoc, config, logger, projectPath)
  );

  const generatedPathsResults = await Promise.all(destinationPromises);
  const allGeneratedPaths = generatedPathsResults.flat();

  // Step 7: Update .gitignore with generated file paths
  await updateGitignore(allGeneratedPaths, config, logger, projectPath);

  logger.info('Rulesets v0.1.0 processing completed successfully!');
  if (allGeneratedPaths.length > 0) {
    logger.info(
      `Generated ${allGeneratedPaths.length} files across ${destinationIds.length} destinations`
    );
  }
}

// CLI entry point for testing
// TLDR: Simple CLI wrapper for testing the orchestration logic (mixd-v0)
// TLDR: v0.1.0 Basic CLI for development testing only
// TODO(v0.2.0): Replace with proper CLI using commander or yargs
if (require.main === module) {
  const logger = new ConsoleLogger();
  const sourceFile = process.argv[2] || './my-rules.ruleset.md';

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
