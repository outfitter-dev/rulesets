/**
 * ConfigLoader: Main configuration loading and validation system
 * Implements hierarchical discovery, validation, and environment overrides
 */

import type { Logger } from '@rulesets/types';
import Ajv from 'ajv';
import {
  rulesetConfigSchema,
  rulesetConfigSchemaEnhanced,
  ValidationMessages,
} from './schema';
import type {
  ConfigContext,
  ConfigFileResult,
  ConfigLoadOptions,
  ConfigLoadResult,
  ConfigLoader as IConfigLoader,
  ConfigValidationResult,
  RulesetConfig,
  ConfigFilePath,
  ConfigDirectoryPath,
} from './types';
import {
  createConfigFilePath,
  createConfigDirectoryPath,
  isKnownProviderID,
  KNOWN_PROVIDERS,
} from './types';
import { DEFAULT_CONFIG, DEFAULT_LOAD_OPTIONS } from './types';
import {
  applyEnvOverrides,
  findConfigFile,
  findConfigFilesHierarchy,
  getGlobalConfigDir,
  mergeConfigs,
  parseConfigContent,
} from './utils';

/**
 * Default ConfigLoader implementation with comprehensive features
 */
export class ConfigLoader implements IConfigLoader {
  private readonly ajv: Ajv;
  private readonly logger?: Logger;

  constructor(logger?: Logger) {
    this.logger = logger;
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false, // Allow additional properties for flexibility
    });

    // Add schemas
    this.ajv.addSchema(rulesetConfigSchema, 'ruleset-config');
    this.ajv.addSchema(rulesetConfigSchemaEnhanced, 'ruleset-config-enhanced');
  }

  /**
   * Load global configuration if available
   */
  private async loadGlobalConfig(
    opts: ConfigLoadOptions,
    logger?: Logger
  ): Promise<{ config?: RulesetConfig; source?: ConfigFileResult }> {
    try {
      const globalConfigDir = getGlobalConfigDir();
      const globalConfig = await findConfigFile(globalConfigDir, {
        ...opts,
        searchParents: false,
      });

      if (!globalConfig) {
        return {};
      }

      const parsedConfig = this.parseConfigFile(
        globalConfig.filePath,
        globalConfig.content
      );

      logger?.debug(`Loaded global config from: ${globalConfig.filePath}`);
      return { config: parsedConfig, source: globalConfig };
    } catch (error) {
      logger?.debug(
        `No global configuration found: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return {};
    }
  }

  /**
   * Load project configurations in hierarchy (parent to child)
   */
  private async loadProjectConfigs(
    projectPath: string,
    opts: ConfigLoadOptions,
    logger?: Logger
  ): Promise<{ configs: RulesetConfig[]; sources: ConfigFileResult[] }> {
    const projectConfigs = await findConfigFilesHierarchy(projectPath, opts);

    if (projectConfigs.length === 0) {
      logger?.debug('No project configuration files found');
      return { configs: [], sources: [] };
    }

    const configs: RulesetConfig[] = [];
    const sources: ConfigFileResult[] = [];

    for (const configFile of projectConfigs) {
      try {
        const parsedConfig = this.parseConfigFile(
          configFile.filePath,
          configFile.content
        );
        configs.push(parsedConfig);
        sources.push(configFile);
        logger?.debug(`Loaded project config from: ${configFile.filePath}`);
      } catch (error) {
        logger?.warn(
          `Failed to parse config file ${configFile.filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return { configs, sources };
  }

  /**
   * Filter environment variables to remove undefined values
   */
  private filterEnvironmentVariables(
    env: Record<string, string | undefined>
  ): Record<string, string> {
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined) {
        filtered[key] = value;
      }
    }
    return filtered;
  }

  /**
   * Perform configuration validation if enabled
   */
  private performValidation(
    config: RulesetConfig,
    opts: ConfigLoadOptions
  ): { errors: string[]; warnings: string[] } {
    if (!opts.validate) {
      return { errors: [], warnings: [] };
    }

    try {
      const validation = this.validateConfig(config);
      return {
        errors: validation.errors,
        warnings: validation.warnings
      };
    } catch (error) {
      return {
        errors: [
          `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        warnings: [],
      };
    }
  }

  /**
   * Log validation results
   */
  private logValidationResults(
    errors: string[],
    warnings: string[],
    logger?: Logger
  ): void {
    for (const error of errors) {
      logger?.error(`Config validation error: ${error}`);
    }

    for (const warning of warnings) {
      logger?.warn(`Config validation warning: ${warning}`);
    }
  }

  /**
   * Load configuration with hierarchical discovery and merging
   */
  async loadConfig(
    context: ConfigContext,
    options: ConfigLoadOptions = {}
  ): Promise<ConfigLoadResult> {
    const opts = { ...DEFAULT_LOAD_OPTIONS, ...options };
    const { projectPath, env = process.env, logger = this.logger } = context;

    logger?.debug(`Loading configuration from project: ${projectPath}`);

    // Step 1: Find and load configuration files
    const sources: ConfigFileResult[] = [];
    const configs: RulesetConfig[] = [DEFAULT_CONFIG];

    // Load global configuration
    const globalResult = await this.loadGlobalConfig(opts, logger);
    if (globalResult.config && globalResult.source) {
      configs.push(globalResult.config);
      sources.push(globalResult.source);
    }

    // Load project configurations (may be multiple in hierarchy)
    const projectResult = await this.loadProjectConfigs(
      projectPath,
      opts,
      logger
    );
    configs.push(...projectResult.configs);
    sources.push(...projectResult.sources);

    // Step 2: Merge configurations
    const mergedConfig = mergeConfigs(...configs);

    // Step 3: Apply environment overrides
    const filteredEnv = this.filterEnvironmentVariables(env);
    const { config: finalConfig, applied: envOverrides } = applyEnvOverrides(
      mergedConfig,
      filteredEnv,
      opts.envPrefix
    );

    if (Object.keys(envOverrides).length > 0) {
      logger?.debug(
        `Applied environment overrides: ${Object.keys(envOverrides).join(', ')}`
      );
    }

    // Step 4: Validate configuration
    // Always validate in tests to ensure proper error/warning reporting
    let { errors, warnings } = this.performValidation(finalConfig, opts);

    // Step 4.5: Convert validation errors to warnings if they come from env overrides
    if (Object.keys(envOverrides).length > 0 && errors.length > 0) {
      // Validate the base configuration (without env overrides) to see if it was valid
      const baseValidation = this.performValidation(mergedConfig, opts);
      
      if (baseValidation.errors.length === 0) {
        // Base config was valid, so errors must be from env overrides
        // Convert errors to warnings with helpful context
        const envErrorWarnings = errors.map(error => 
          `Environment variable override caused validation issue: ${error}`
        );
        warnings = [...warnings, ...envErrorWarnings];
        errors = []; // Clear errors since they're now warnings
      }
    }

    // Step 5: Log validation results
    this.logValidationResults(errors, warnings, logger);

    const success = errors.length === 0;
    
    logger?.info(
      `Configuration loaded ${success ? 'successfully' : 'with errors'} from ${sources.length} source(s)`
    );

    return {
      success,
      config: finalConfig,
      sources,
      envOverrides,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate basic schema structure
   */
  private validateSchema(config: unknown): string[] {
    const errors: string[] = [];
    const validate = this.ajv.getSchema('ruleset-config');

    if (!validate) {
      throw new Error('Configuration schema not found');
    }

    const isValid = validate(config);

    if (!isValid && validate.errors) {
      for (const error of validate.errors) {
        const path = error.instancePath || 'root';
        const message = error.message || 'Unknown validation error';
        errors.push(`${path}: ${message}`);
      }
    }

    return errors;
  }

  /**
   * Check for unknown providers using type-safe known provider list
   */
  private checkUnknownProviders(cfg: RulesetConfig): string[] {
    const warnings: string[] = [];

    if (!cfg.providers) {
      return warnings;
    }

    for (const providerId of Object.keys(cfg.providers)) {
      if (!isKnownProviderID(providerId)) {
        warnings.push(
          `Unknown provider '${providerId}'. ${ValidationMessages.UNKNOWN_PROVIDER} Known providers: ${KNOWN_PROVIDERS.join(', ')}`
        );
      }
    }

    return warnings;
  }

  /**
   * Validate provider output paths
   */
  private validateProviderOutputPaths(cfg: RulesetConfig): string[] {
    const errors: string[] = [];

    if (!cfg.providers) {
      return errors;
    }

    for (const [providerId, providerConfig] of Object.entries(cfg.providers)) {
      if (providerConfig.outputPath === '') {
        errors.push(
          `Provider '${providerId}': ${ValidationMessages.INVALID_OUTPUT_PATH}`
        );
      }
    }

    return errors;
  }

  /**
   * Perform enhanced validation checks
   */
  private performEnhancedValidation(cfg: RulesetConfig): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for unknown providers
    warnings.push(...this.checkUnknownProviders(cfg));

    // Check for empty default providers
    if (cfg.defaultProviders && cfg.defaultProviders.length === 0) {
      warnings.push(ValidationMessages.EMPTY_DEFAULT_PROVIDERS);
    }

    // Check for invalid output paths
    errors.push(...this.validateProviderOutputPaths(cfg));

    // Check output directory
    if (cfg.outputDirectory === '') {
      errors.push(ValidationMessages.INVALID_OUTPUT_PATH);
    }

    return { errors, warnings };
  }

  /**
   * Validate configuration against JSON schema with strict return type
   */
  validateConfig(config: unknown): ConfigValidationResult {
    // Basic structure validation
    const schemaErrors = this.validateSchema(config);
    let enhancedErrors: string[] = [];
    let enhancedWarnings: string[] = [];

    // Always try enhanced validation if config is an object
    if (config && typeof config === 'object') {
      const cfg = config as RulesetConfig;
      const enhanced = this.performEnhancedValidation(cfg);
      enhancedErrors = enhanced.errors;
      enhancedWarnings = enhanced.warnings;
    }

    // Combine all errors and warnings
    const allErrors = [...schemaErrors, ...enhancedErrors];
    const allWarnings = enhancedWarnings;

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  /**
   * Find configuration file starting from given path
   */
  async findConfigFile(
    startPath: ConfigDirectoryPath,
    options: ConfigLoadOptions = {}
  ): Promise<ConfigFileResult | null> {
    return await findConfigFile(startPath as string, {
      ...DEFAULT_LOAD_OPTIONS,
      ...options,
    });
  }

  /**
   * Parse configuration file content with branded path
   */
  parseConfigFile(filePath: ConfigFilePath, content: string): RulesetConfig {
    const format = (filePath as string).endsWith('.toml') ? 'toml' : 'jsonc';
    return parseConfigContent(content, format, filePath as string);
  }

  /**
   * Merge multiple configurations with proper precedence
   */
  mergeConfigs(configs: readonly RulesetConfig[]): RulesetConfig {
    return mergeConfigs(...configs);
  }

  /**
   * Apply environment variable overrides
   */
  applyEnvOverrides(
    config: RulesetConfig,
    env: Readonly<Record<string, string>>,
    prefix = 'RULESETS'
  ): RulesetConfig {
    const { config: result } = applyEnvOverrides(config, env as Record<string, string>, prefix);
    return result;
  }
}

/**
 * Default configuration loader instance
 */
let defaultLoader: ConfigLoader | null = null;

/**
 * Get or create the default configuration loader
 */
export function getConfigLoader(logger?: Logger): ConfigLoader {
  if (!defaultLoader) {
    defaultLoader = new ConfigLoader(logger);
  }
  return defaultLoader;
}

/**
 * Convenience function to load configuration with type safety
 */
export function loadConfig(
  projectPath: string,
  options: ConfigLoadOptions = {},
  logger?: Logger
): Promise<ConfigLoadResult> {
  const loader = getConfigLoader(logger);
  // Filter out undefined values from process.env
  const filteredEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      filteredEnv[key] = value;
    }
  }

  return loader.loadConfig({ 
    projectPath: createConfigDirectoryPath(projectPath), 
    env: filteredEnv, 
    logger 
  }, options);
}

/**
 * Convenience function to validate configuration with strict typing
 */
export function validateConfig(
  config: unknown,
  logger?: Logger
): ConfigValidationResult {
  const loader = getConfigLoader(logger);
  return loader.validateConfig(config);
}
