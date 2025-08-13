// TLDR: Main entry point and CLI orchestration for Rulesets (mixd-v0)
// TLDR: v0.1.0 Basic orchestration for single file processing with minimal features

import { compile } from '@rulesets/compiler';
import { lint } from '@rulesets/linter';
import { parse } from '@rulesets/parser';
import type { Logger } from '@rulesets/types';
import { hasGeneratedPaths } from '@rulesets/types';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import type { RulesetConfig } from './config';
import { loadConfig } from './config';
import { createGitignoreManager } from './gitignore';
import { ConsoleLogger } from './logger';
import { destinations } from './providers';

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
  let config: RulesetConfig;

  try {
    const configResult = await loadConfig(projectPath, {}, logger);

    // Handle configuration errors and warnings
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

    if (configResult.warnings && configResult.warnings.length > 0) {
      for (const warning of configResult.warnings) {
        logger.warn(`Configuration warning: ${warning}`);
      }
    }

    // Apply configuration override if provided
    config = configOverride
      ? { ...configResult.config, ...configOverride }
      : configResult.config;

    logger.debug(
      `Configuration loaded from ${configResult.sources.length} source(s)`
    );
    if (Object.keys(configResult.envOverrides).length > 0) {
      logger.debug(
        `Environment overrides: ${Object.keys(configResult.envOverrides).join(', ')}`
      );
    }
  } catch (error) {
    logger.error('Failed to load configuration', error);
    throw error;
  }

  // Step 2: Read the source file
  let content: string;
  try {
    content = await fs.readFile(sourceFilePath, 'utf8');
    logger.debug(`Read ${content.length} characters from ${sourceFilePath}`);
  } catch (error) {
    logger.error(`Failed to read source file: ${sourceFilePath}`, error);
    throw error;
  }

  // Step 3: Parse the content
  logger.info('Parsing source file...');
  let parsedDoc;
  try {
    parsedDoc = await parse(content, sourceFilePath);

    if (parsedDoc.errors && parsedDoc.errors.length > 0) {
      logger.warn(`Parser found ${parsedDoc.errors.length} error(s)`);
    }
  } catch (error) {
    logger.error('Failed to parse source file', error);
    throw error;
  }

  // Step 4: Lint the parsed document
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
      throw new Error(
        'Linting failed with errors. Please fix the issues and try again.'
      );
    }
  } catch (error) {
    logger.error('Failed during linting', error);
    throw error;
  }

  // Step 5: Determine which destinations to compile for
  const frontmatter = parsedDoc.source.frontmatter;

  // Priority order: frontmatter destinations > config providers > config defaults > system defaults
  let destinationIds: string[] = [];

  if (
    frontmatter?.destinations &&
    typeof frontmatter.destinations === 'object' &&
    !Array.isArray(frontmatter.destinations)
  ) {
    // Use destinations from frontmatter
    destinationIds = Object.keys(
      frontmatter.destinations as Record<string, unknown>
    );
    logger.debug('Using destinations from frontmatter');
  } else {
    // Use enabled providers from configuration
    const enabledProviders = Object.entries(config.providers || {})
      .filter(([_, providerConfig]) => providerConfig.enabled !== false)
      .map(([providerId]) => providerId);

    if (enabledProviders.length > 0) {
      destinationIds = enabledProviders;
      logger.debug('Using enabled providers from configuration');
    } else if (config.defaultProviders && config.defaultProviders.length > 0) {
      destinationIds = config.defaultProviders;
      logger.debug('Using default providers from configuration');
    } else {
      // Fallback to all available destinations
      destinationIds = Array.from(destinations.keys());
      logger.debug('Using all available destinations as fallback');
    }
  }

  logger.info(`Compiling for destinations: ${destinationIds.join(', ')}`);

  // Step 6: Compile and write for each destination
  // Collect generated file paths for gitignore management
  const allGeneratedPaths: string[] = [];

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
      compiledDoc = compile(parsedDoc, destinationId, config);
    } catch (error) {
      logger.error(
        `Failed to compile for destination: ${destinationId}`,
        error
      );
      continue; // Continue with other destinations
    }

    // Determine output path using configuration hierarchy
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

    // Get provider configuration
    const providerConfig = config.providers?.[destinationId] || {};

    // Merge configurations: frontmatter > provider config > defaults
    const destConfig = {
      ...providerConfig,
      ...frontmatterDestConfig,
    };

    // Determine output path with configuration precedence
    const outputDir = config.outputDirectory || '.ruleset/dist';
    const defaultPath = `${outputDir}/${destinationId}/my-rules.md`;
    const destPath =
      (typeof frontmatterDestConfig.outputPath === 'string'
        ? frontmatterDestConfig.outputPath
        : undefined) ||
      (typeof frontmatterDestConfig.path === 'string'
        ? frontmatterDestConfig.path
        : undefined) ||
      (typeof providerConfig.outputPath === 'string'
        ? providerConfig.outputPath
        : undefined) ||
      defaultPath;

    // Write using the plugin
    try {
      const writeResult = await plugin.write({
        compiled: compiledDoc,
        destPath,
        config: destConfig,
        logger,
      });

      // Collect generated file paths if returned by the plugin
      if (hasGeneratedPaths(writeResult)) {
        allGeneratedPaths.push(...writeResult.generatedPaths);
        logger.debug(
          `Generated paths from ${destinationId}: ${writeResult.generatedPaths.join(', ')}`
        );
      }
    } catch (error) {
      logger.error(`Failed to write ${destinationId} output`, error);
      throw error;
    }
  }

  // Step 7: Update .gitignore with generated file paths
  if (allGeneratedPaths.length > 0 && config.gitignore?.enabled !== false) {
    logger.info('Updating .gitignore with generated file paths...');
    try {
      // Create gitignore manager with configuration
      const gitignoreConfig = {
        enabled: config.gitignore?.enabled ?? true,
        keep: config.gitignore?.keep || [],
        ignore: config.gitignore?.ignore || [],
        options: {
          comment:
            config.gitignore?.options?.comment || 'Rulesets Generated Files',
          sort: config.gitignore?.options?.sort ?? true,
        },
      };

      const gitignoreManager = createGitignoreManager(gitignoreConfig);
      const gitignoreResult =
        await gitignoreManager.updateGitignore(allGeneratedPaths);

      if (gitignoreResult.success) {
        if (gitignoreResult.added.length > 0) {
          logger.info(
            `Added ${gitignoreResult.added.length} files to .gitignore`
          );
          logger.debug(`Added: ${gitignoreResult.added.join(', ')}`);
        }
        if (gitignoreResult.kept.length > 0) {
          logger.info(
            `Kept ${gitignoreResult.kept.length} files due to override rules`
          );
          logger.debug(`Kept: ${gitignoreResult.kept.join(', ')}`);
        }
        for (const message of gitignoreResult.messages) {
          logger.debug(`GitignoreManager: ${message}`);
        }
      } else {
        logger.warn('Failed to update .gitignore:');
        for (const message of gitignoreResult.messages) {
          logger.warn(`  ${message}`);
        }
      }
    } catch (error) {
      logger.warn(
        `GitignoreManager error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      // Don't throw - gitignore management is non-critical
    }
  } else if (allGeneratedPaths.length > 0) {
    logger.debug('Gitignore management is disabled by configuration');
  } else {
    logger.debug('No generated file paths to add to .gitignore');
  }

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
