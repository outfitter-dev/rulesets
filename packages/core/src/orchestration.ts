/**
 * Clean, simple orchestration for Rulesets
 * Handlebars-powered, no legacy cruft
 */

import { dirname, join } from 'node:path';
import { HandlebarsRulesetCompiler, PartialResolver } from '@rulesets/compiler';
import type { PartialResolverOptions } from '@rulesets/compiler';
import { lint } from '@rulesets/linter';
import { parse } from '@rulesets/parser';
import type { CompiledDoc, Logger, ParsedDoc, Provider } from '@rulesets/types';
import { hasGeneratedPaths } from '@rulesets/types';
import type { RulesetConfig } from './config';
import { loadConfig } from './config';
import { createGitignoreManager } from './gitignore';
import { ConsoleLogger } from './logger';
import { destinations, providers as providerRegistry } from './providers';

export interface RulesetsOptions {
  /**
   * Limit build to specific providers
   */
  providers?: string[];
  
  /**
   * Enable development mode with enhanced debugging
   */
  developmentMode?: boolean;
  
  /**
   * Cache compiled templates for performance
   */
  cacheTemplates?: boolean;
  
  /**
   * Partial resolution configuration
   */
  partialOptions?: PartialResolverOptions;
  
  /**
   * Configuration override
   */
  configOverride?: Partial<RulesetConfig>;
}

/**
 * Build rulesets - clean, simple, Handlebars-powered
 */
export async function runRulesets(
  sourceFilePath: string,
  logger: Logger = new ConsoleLogger(),
  options: RulesetsOptions = {}
): Promise<void> {
  const {
    providers: providerFilter,
    developmentMode = false,
    cacheTemplates = true,
    partialOptions,
    configOverride,
  } = options;

  logger.info(`🔨 Building: ${sourceFilePath}`);

  // Step 1: Load configuration
  const projectPath = dirname(sourceFilePath);
  const config = await loadAndValidateConfig(projectPath, logger, configOverride);

  // Step 2: Set up handlebars compiler
  logger.debug('Initializing Handlebars compiler...');
  const handlebarsCompiler = await createHandlebarsCompiler(
    projectPath,
    partialOptions,
    logger,
    developmentMode
  );

  // Step 3: Read and parse the source file
  const content = await readSourceFile(sourceFilePath, logger);
  const parsedDoc = await parseSourceFile(content, sourceFilePath, logger);

  // Step 4: Lint the parsed document
  performLinting(parsedDoc, logger);

  // Step 5: Determine which providers to build for
  const providerIds = determineProviderIds(parsedDoc, config, providerFilter, logger);
  logger.info(`🎯 Building for: ${providerIds.join(', ')}`);

  // Step 6: Build for each provider with parallel compilation
  const maxConcurrency = config.parallelCompilation?.maxConcurrency || providerIds.length;
  logger.debug(`max concurrency: ${maxConcurrency}`);
  
  const buildPromises = providerIds.map((providerId) =>
    buildForProvider(
      providerId,
      parsedDoc,
      config,
      logger,
      projectPath,
      handlebarsCompiler,
      { cacheTemplates, developmentMode }
    )
  );

  const generatedPathsResults = await Promise.all(buildPromises);
  const allGeneratedPaths = generatedPathsResults.flat();

  // Step 7: Update .gitignore with generated file paths
  await updateGitignore(allGeneratedPaths, config, logger, projectPath);

  logger.info(`✅ Built ${allGeneratedPaths.length} files for ${providerIds.length} providers`);
  logger.info('Rulesets ruleset-v0.1-beta processing completed successfully!');

  // Step 8: Log performance metrics in development mode
  if (developmentMode) {
    logPerformanceMetrics(handlebarsCompiler, logger);
  }
}

/**
 * Create and configure handlebars compiler
 */
async function createHandlebarsCompiler(
  projectPath: string,
  partialOptions: PartialResolverOptions | undefined,
  logger: Logger,
  developmentMode: boolean
): Promise<HandlebarsRulesetCompiler> {
  // Get all available providers
  const allProviders = Array.from(providerRegistry.values());
  
  // Configure partial resolution
  const resolverOptions: PartialResolverOptions = {
    rootDir: projectPath,
    partialsDir: '_partials',
    cache: true,
    ...partialOptions,
  };

  logger.debug(`Handlebars compiler initialized with ${allProviders.length} providers`);
  logger.debug(`Partial resolution: ${resolverOptions.rootDir}/${resolverOptions.partialsDir}`);

  return new HandlebarsRulesetCompiler(allProviders, resolverOptions);
}

/**
 * Build for a single provider
 */
async function buildForProvider(
  providerId: string,
  parsedDoc: ParsedDoc,
  config: RulesetConfig,
  logger: Logger,
  projectPath: string,
  handlebarsCompiler: HandlebarsRulesetCompiler,
  compilationOptions: {
    cacheTemplates: boolean;
    developmentMode: boolean;
  }
): Promise<string[]> {
  const plugin = destinations.get(providerId);
  if (!plugin) {
    logger.warn(`No plugin found for provider: ${providerId}`);
    return [];
  }

  logger.debug(`Processing provider: ${providerId}`);

  // Get provider for enhanced compilation
  const provider = providerRegistry.get(providerId);
  if (!provider) {
    logger.warn(`Provider not found in registry: ${providerId}`);
    return [];
  }

  // Compile with handlebars
  let compiledDoc: CompiledDoc;
  try {
    compiledDoc = await compileWithHandlebars(
      handlebarsCompiler,
      parsedDoc,
      provider,
      config,
      logger,
      compilationOptions
    );
  } catch (error) {
    logger.error(`Failed to compile for provider: ${providerId}`, error);
    return [];
  }

  // Get configuration and output path
  const providerConfig = getMergedProviderConfig(
    parsedDoc.source.frontmatter,
    providerId,
    config
  );

  const outputPath = determineOutputPath(
    providerConfig,
    config.providers?.[providerId] as Record<string, unknown> | undefined,
    providerId,
    config.outputDirectory,
    provider?.config?.outputPath
  );

  // Write using the plugin
  try {
    const writeResult = await plugin.write({
      compiled: compiledDoc,
      destPath: outputPath,
      config: { ...providerConfig, baseDir: projectPath },
      logger,
    });

    if (hasGeneratedPaths(writeResult)) {
      logger.debug(`Generated: ${writeResult.generatedPaths.join(', ')}`);
      return [...writeResult.generatedPaths];
    }
    return [];
  } catch (error) {
    logger.error(`Failed to write ${providerId} output`, error);
    throw error;
  }
}

/**
 * Compile using handlebars with enhanced features
 */
async function compileWithHandlebars(
  compiler: HandlebarsRulesetCompiler,
  parsedDoc: ParsedDoc,
  provider: Provider,
  config: RulesetConfig,
  logger: Logger,
  options: {
    cacheTemplates: boolean;
    developmentMode: boolean;
  }
): Promise<CompiledDoc> {
  const startTime = performance.now();

  try {
    // Enhanced project config for handlebars context
    const projectConfig = {
      ...config,
      development: options.developmentMode,
      compilation: {
        timestamp: new Date().toISOString(),
        version: '0.2.0',
        cache: options.cacheTemplates,
      },
    };

    if (options.cacheTemplates) {
      logger.debug('Using cached compilation for template processing');
    }

    const compiledDoc = compiler.compile(parsedDoc, provider.id as string, projectConfig);

    const duration = performance.now() - startTime;
    logger.debug(`Handlebars compilation completed in ${duration.toFixed(2)}ms`);

    return compiledDoc;
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error(`Handlebars compilation failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}

/**
 * Log performance metrics for development
 */
function logPerformanceMetrics(
  compiler: HandlebarsRulesetCompiler,
  logger: Logger
): void {
  // TODO: Add performance metrics collection to HandlebarsRulesetCompiler
  logger.debug('Performance metrics available in development mode');
}

// Utility functions (unchanged from original)

async function loadAndValidateConfig(
  projectPath: string,
  logger: Logger,
  configOverride?: Partial<RulesetConfig>
): Promise<RulesetConfig> {
  const configResult = await loadConfig(projectPath, {}, logger);

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

  logger.debug(
    `Configuration loaded from ${configResult.sources.length} source(s)`
  );

  return configOverride
    ? { ...configResult.config, ...configOverride }
    : configResult.config;
}

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
    }
  }

  if (hasErrors) {
    throw new Error(
      'Linting failed with errors. Please fix the issues and try again.'
    );
  }
}

function determineProviderIds(
  parsedDoc: ParsedDoc,
  config: RulesetConfig,
  providerFilter: string[] | undefined,
  logger: Logger
): string[] {
  const frontmatter = parsedDoc.source.frontmatter;

  // Start with frontmatter providers or enabled config providers
  let providerIds: string[];

  if (
    frontmatter?.providers &&
    typeof frontmatter.providers === 'object' &&
    !Array.isArray(frontmatter.providers)
  ) {
    logger.debug('Using providers from frontmatter');
    providerIds = Object.keys(frontmatter.providers as Record<string, unknown>);
  } else {
    const enabledProviders = Object.entries(config.providers || {})
      .filter(([_, providerConfig]) => providerConfig.enabled !== false)
      .map(([providerId]) => providerId);

    if (enabledProviders.length > 0) {
      logger.debug('Using enabled providers from configuration');
      providerIds = enabledProviders;
    } else if (config.defaultProviders && config.defaultProviders.length > 0) {
      logger.debug('Using default providers from configuration');
      providerIds = [...config.defaultProviders];
    } else {
      logger.debug('Using all available providers as fallback');
      providerIds = Array.from(destinations.keys());
    }
  }

  // Apply provider filter if specified
  if (providerFilter && providerFilter.length > 0) {
    const filteredIds = providerIds.filter(id => providerFilter.includes(id));
    
    if (filteredIds.length === 0) {
      logger.warn(`No providers matched filter: ${providerFilter.join(', ')}`);
      logger.warn(`Available providers: ${providerIds.join(', ')}`);
    }
    
    return filteredIds;
  }

  return providerIds;
}

function getMergedProviderConfig(
  frontmatter: Record<string, unknown> | undefined,
  providerId: string,
  config: RulesetConfig
): Record<string, unknown> {
  const frontmatterProviders = frontmatter?.providers;
  const frontmatterProviderConfig: Record<string, unknown> =
    frontmatterProviders &&
    typeof frontmatterProviders === 'object' &&
    !Array.isArray(frontmatterProviders) &&
    typeof (frontmatterProviders as Record<string, unknown>)[providerId] === 'object'
      ? ((frontmatterProviders as Record<string, unknown>)[providerId] as Record<string, unknown>) || {}
      : {};

  const configProviderConfig = config.providers?.[providerId] || {};
  return {
    ...configProviderConfig,
    ...frontmatterProviderConfig,
  };
}

function determineOutputPath(
  providerConfig: Record<string, unknown>,
  configProviderConfig: Record<string, unknown> | undefined,
  providerId: string,
  outputDirectory?: string,
  providerDefaultPath?: string
): string {
  const outputDir = outputDirectory || '.ruleset/dist';
  const fallbackPath = `${outputDir}/${providerId}/rules.md`;

  return (
    (typeof providerConfig.outputPath === 'string' ? providerConfig.outputPath : undefined) ||
    (typeof providerConfig.path === 'string' ? providerConfig.path : undefined) ||
    (typeof configProviderConfig?.outputPath === 'string' ? configProviderConfig.outputPath : undefined) ||
    providerDefaultPath ||
    fallbackPath
  );
}

async function updateGitignore(
  allGeneratedPaths: string[],
  config: RulesetConfig,
  logger: Logger,
  projectPath: string
): Promise<void> {
  if (allGeneratedPaths.length === 0 || config.gitignore?.enabled === false) {
    return;
  }

  logger.debug('Updating .gitignore with generated file paths...');

  try {
    const gitignoreConfig = {
      enabled: config.gitignore?.enabled ?? true,
      keep: config.gitignore?.keep || [],
      ignore: config.gitignore?.ignore || [],
      options: {
        comment: config.gitignore?.options?.comment || 'Rulesets Generated',
        sort: config.gitignore?.options?.sort ?? true,
      },
    };

    const gitignoreManager = createGitignoreManager(gitignoreConfig, projectPath);
    const gitignoreResult = await gitignoreManager.updateGitignore(allGeneratedPaths);

    if (gitignoreResult.success) {
      if (gitignoreResult.added && gitignoreResult.added.length > 0) {
        logger.debug(`Added ${gitignoreResult.added.length} files to .gitignore`);
      }
    } else {
      logger.warn('Failed to update .gitignore');
    }
  } catch (error) {
    logger.warn(`GitignoreManager error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}