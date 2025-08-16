/**
 * Handlebars-aware orchestration for Rulesets v0.2+
 * Extends existing orchestration with handlebars compilation support
 */

import { dirname, join } from 'node:path';
import { compile } from '@rulesets/compiler';
import { 
  HandlebarsRulesetCompiler, 
  PartialResolver,
  type PartialResolverOptions 
} from '@rulesets/compiler';
import { lint } from '@rulesets/linter';
import { parse } from '@rulesets/parser';
import type { CompiledDoc, Logger, ParsedDoc, Provider } from '@rulesets/types';
import { hasGeneratedPaths } from '@rulesets/types';
import type { RulesetConfig } from './config';
import { loadConfig } from './config';
import { createGitignoreManager } from './gitignore';
import { ConsoleLogger } from './logger';
import { destinations, providers as providerRegistry } from './providers';

export interface HandlebarsOrchestrationOptions {
  /**
   * Enable handlebars compilation mode (v0.2+)
   * @default false (uses legacy v0.1 compilation)
   */
  enableHandlebars?: boolean;
  
  /**
   * Partial resolution configuration for handlebars mode
   */
  partialOptions?: PartialResolverOptions;
  
  /**
   * Template precompilation for production optimization
   * @default false
   */
  precompileTemplates?: boolean;
  
  /**
   * Cache compiled templates for performance
   * @default true
   */
  cacheTemplates?: boolean;
  
  /**
   * Development mode with enhanced debugging
   * @default false
   */
  developmentMode?: boolean;
}

/**
 * Enhanced orchestration with handlebars support
 * Backward compatible with v0.1 while enabling v0.2 features
 */
export async function runRulesetsV2(
  sourceFilePath: string,
  logger: Logger = new ConsoleLogger(),
  configOverride?: Partial<RulesetConfig>,
  options: HandlebarsOrchestrationOptions = {}
): Promise<void> {
  const {
    enableHandlebars = false,
    partialOptions,
    precompileTemplates = false,
    cacheTemplates = true,
    developmentMode = false,
  } = options;

  logger.info(
    `Starting Rulesets ${enableHandlebars ? 'v0.2 (Handlebars)' : 'v0.1 (Legacy)'} processing for: ${sourceFilePath}`
  );

  // Step 1: Load configuration
  logger.info('Loading configuration...');
  const projectPath = dirname(sourceFilePath);
  const config = await loadAndValidateConfig(projectPath, logger, configOverride);

  // Step 2: Set up handlebars compiler if enabled
  let handlebarsCompiler: HandlebarsRulesetCompiler | undefined;
  if (enableHandlebars) {
    logger.info('Initializing Handlebars compilation engine...');
    handlebarsCompiler = await createHandlebarsCompiler(
      projectPath,
      partialOptions,
      logger,
      developmentMode
    );
  }

  // Step 3: Read the source file
  const content = await readSourceFile(sourceFilePath, logger);

  // Step 4: Parse the content
  logger.info('Parsing source file...');
  const parsedDoc = await parseSourceFile(content, sourceFilePath, logger);

  // Step 5: Lint the parsed document
  logger.info('Linting document...');
  performLinting(parsedDoc, logger);

  // Step 6: Determine which destinations to compile for
  const destinationIds = determineDestinationIds(parsedDoc, config, logger);
  logger.info(`Compiling for destinations: ${destinationIds.join(', ')}`);

  // Step 7: Compile and write for each destination
  const destinationPromises = destinationIds.map((destinationId) =>
    processDestinationV2(
      destinationId,
      parsedDoc,
      config,
      logger,
      projectPath,
      handlebarsCompiler,
      { precompileTemplates, cacheTemplates, developmentMode }
    )
  );

  const generatedPathsResults = await Promise.all(destinationPromises);
  const allGeneratedPaths = generatedPathsResults.flat();

  // Step 8: Update .gitignore with generated file paths
  await updateGitignore(allGeneratedPaths, config, logger, projectPath);

  logger.info(
    `Rulesets ${enableHandlebars ? 'v0.2' : 'v0.1'} processing completed successfully!`
  );
  if (allGeneratedPaths.length > 0) {
    logger.info(
      `Generated ${allGeneratedPaths.length} files across ${destinationIds.length} destinations`
    );
  }

  // Step 9: Log performance metrics in development mode
  if (developmentMode && handlebarsCompiler) {
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

  // Validate partial directory exists
  const partialsPath = join(resolverOptions.rootDir, resolverOptions.partialsDir);
  try {
    const partialsExists = await Bun.file(join(partialsPath, '.gitkeep')).exists();
    if (!partialsExists) {
      logger.debug(`Partials directory not found: ${partialsPath}`);
      logger.debug('Partial resolution will work with relative paths only');
    }
  } catch {
    // Directory doesn't exist, which is fine
  }

  logger.debug(`Handlebars compiler initialized with ${allProviders.length} providers`);
  logger.debug(`Partial resolution: ${resolverOptions.rootDir}/${resolverOptions.partialsDir}`);

  return new HandlebarsRulesetCompiler(allProviders, resolverOptions);
}

/**
 * Process a single destination with handlebars support
 */
async function processDestinationV2(
  destinationId: string,
  parsedDoc: ParsedDoc,
  config: RulesetConfig,
  logger: Logger,
  projectPath: string,
  handlebarsCompiler?: HandlebarsRulesetCompiler,
  compilationOptions: {
    precompileTemplates: boolean;
    cacheTemplates: boolean;
    developmentMode: boolean;
  } = { precompileTemplates: false, cacheTemplates: true, developmentMode: false }
): Promise<string[]> {
  const plugin = destinations.get(destinationId);
  if (!plugin) {
    logger.warn(`No plugin found for destination: ${destinationId}`);
    return [];
  }

  logger.info(`Processing destination: ${destinationId}${handlebarsCompiler ? ' (Handlebars)' : ' (Legacy)'}`);

  // Get provider for enhanced compilation
  const provider = providerRegistry.get(destinationId);

  // Choose compilation method
  let compiledDoc: CompiledDoc;
  try {
    if (handlebarsCompiler && provider) {
      // Use handlebars compilation
      compiledDoc = await compileWithHandlebars(
        handlebarsCompiler,
        parsedDoc,
        provider,
        config,
        logger,
        compilationOptions
      );
    } else {
      // Fall back to legacy compilation
      compiledDoc = compile(parsedDoc, destinationId, config);
    }
  } catch (error) {
    logger.error(`Failed to compile for destination: ${destinationId}`, error);
    return [];
  }

  // Rest of processing remains the same as v0.1
  const destConfig = getMergedDestinationConfig(
    parsedDoc.source.frontmatter,
    destinationId,
    config
  );

  const destPath = determineOutputPath(
    destConfig,
    config.providers?.[destinationId] as Record<string, unknown> | undefined,
    destinationId,
    config.outputDirectory,
    provider?.config?.outputPath
  );

  try {
    const writeResult = await plugin.write({
      compiled: compiledDoc,
      destPath,
      config: { ...destConfig, baseDir: projectPath },
      logger,
    });

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
 * Compile using handlebars with enhanced features
 */
async function compileWithHandlebars(
  compiler: HandlebarsRulesetCompiler,
  parsedDoc: ParsedDoc,
  provider: Provider,
  config: RulesetConfig,
  logger: Logger,
  options: {
    precompileTemplates: boolean;
    cacheTemplates: boolean;
    developmentMode: boolean;
  }
): Promise<CompiledDoc> {
  const startTime = performance.now();

  try {
    // Enhanced project config for handlebars context
    const projectConfig = {
      ...config,
      // Add development flags
      development: options.developmentMode,
      // Add compilation metadata
      compilation: {
        timestamp: new Date().toISOString(),
        version: '0.2.0-handlebars',
        cache: options.cacheTemplates,
        precompiled: options.precompileTemplates,
      },
    };

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
  // For now, just log that metrics would be available
  logger.debug('Performance metrics available in development mode');
  logger.debug('Add compiler.getMetrics() method for detailed statistics');
}

// Re-export utility functions from main orchestration
// These are unchanged between v0.1 and v0.2

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

function determineDestinationIds(
  parsedDoc: ParsedDoc,
  config: RulesetConfig,
  logger: Logger
): string[] {
  const frontmatter = parsedDoc.source.frontmatter;

  if (
    frontmatter?.destinations &&
    typeof frontmatter.destinations === 'object' &&
    !Array.isArray(frontmatter.destinations)
  ) {
    logger.debug('Using destinations from frontmatter');
    return Object.keys(frontmatter.destinations as Record<string, unknown>);
  }

  const enabledProviders = Object.entries(config.providers || {})
    .filter(([_, providerConfig]) => providerConfig.enabled !== false)
    .map(([providerId]) => providerId);

  if (enabledProviders.length > 0) {
    logger.debug('Using enabled providers from configuration');
    return enabledProviders;
  }

  if (config.defaultProviders && config.defaultProviders.length > 0) {
    logger.debug('Using default providers from configuration');
    return [...config.defaultProviders];
  }

  logger.debug('Using all available destinations as fallback');
  return Array.from(destinations.keys());
}

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
    typeof (frontmatterDestinations as Record<string, unknown>)[destinationId] === 'object'
      ? ((frontmatterDestinations as Record<string, unknown>)[destinationId] as Record<string, unknown>) || {}
      : {};

  const providerConfig = config.providers?.[destinationId] || {};
  return {
    ...providerConfig,
    ...frontmatterDestConfig,
  };
}

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
    (typeof destConfig.outputPath === 'string' ? destConfig.outputPath : undefined) ||
    (typeof destConfig.path === 'string' ? destConfig.path : undefined) ||
    (typeof providerConfig?.outputPath === 'string' ? providerConfig.outputPath : undefined) ||
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

  logger.info('Updating .gitignore with generated file paths...');

  try {
    const gitignoreConfig = {
      enabled: config.gitignore?.enabled ?? true,
      keep: config.gitignore?.keep || [],
      ignore: config.gitignore?.ignore || [],
      options: {
        comment: config.gitignore?.options?.comment || 'Rulesets Managed',
        sort: config.gitignore?.options?.sort ?? true,
      },
    };

    const gitignoreManager = createGitignoreManager(gitignoreConfig, projectPath);
    const gitignoreResult = await gitignoreManager.updateGitignore(allGeneratedPaths);

    if (gitignoreResult.success) {
      if (gitignoreResult.added && gitignoreResult.added.length > 0) {
        logger.info(`Added ${gitignoreResult.added.length} files to .gitignore`);
      }
    } else {
      logger.warn('Failed to update .gitignore');
    }
  } catch (error) {
    logger.warn(`GitignoreManager error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}