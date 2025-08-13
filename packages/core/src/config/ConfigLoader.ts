/**
 * ConfigLoader: Main configuration loading and validation system
 * Implements hierarchical discovery, validation, and environment overrides
 */

import Ajv from 'ajv';
import type { Logger } from '@rulesets/types';
import type {
  ConfigLoader as IConfigLoader,
  ConfigContext,
  ConfigLoadOptions,
  ConfigLoadResult,
  ConfigFileResult,
  RulesetConfig,
} from './types';
import { DEFAULT_CONFIG, DEFAULT_LOAD_OPTIONS } from './types';
import { rulesetConfigSchema, rulesetConfigSchemaEnhanced, ValidationMessages } from './schema';
import {
  findConfigFile,
  parseConfigContent,
  mergeConfigs,
  applyEnvOverrides,
  getGlobalConfigDir,
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
    
    // Global configuration (only load if global config directory exists)
    try {
      const globalConfigDir = getGlobalConfigDir();
      const globalConfig = await findConfigFile(globalConfigDir, { ...opts, searchParents: false });
      if (globalConfig) {
        sources.push(globalConfig);
        const parsedConfig = await this.parseConfigFile(globalConfig.filePath, globalConfig.content);
        configs.push(parsedConfig);
        logger?.debug(`Loaded global config from: ${globalConfig.filePath}`);
      }
    } catch (error) {
      // Global config is optional, don't warn unless debug logging
      logger?.debug(`No global configuration found: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Project configuration (with parent directory search)
    const projectConfig = await findConfigFile(projectPath, opts);
    if (projectConfig) {
      sources.push(projectConfig);
      const parsedConfig = await this.parseConfigFile(projectConfig.filePath, projectConfig.content);
      configs.push(parsedConfig);
      logger?.debug(`Loaded project config from: ${projectConfig.filePath}`);
    } else {
      logger?.debug('No project configuration file found');
    }
    
    // Step 2: Merge configurations
    const mergedConfig = mergeConfigs(...configs);
    
    // Step 3: Apply environment overrides
    // Filter out undefined values from env to match Record<string, string>
    const filteredEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined) {
        filteredEnv[key] = value;
      }
    }
    
    const { config: finalConfig, applied: envOverrides } = applyEnvOverrides(
      mergedConfig,
      filteredEnv,
      opts.envPrefix
    );
    
    if (Object.keys(envOverrides).length > 0) {
      logger?.debug(`Applied environment overrides: ${Object.keys(envOverrides).join(', ')}`);
    }
    
    // Step 4: Validate configuration
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (opts.validate) {
      try {
        const validation = await this.validateConfig(finalConfig);
        errors.push(...validation.errors);
        warnings.push(...validation.warnings);
      } catch (error) {
        errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Step 5: Log validation results
    if (errors.length > 0) {
      for (const error of errors) {
        logger?.error(`Config validation error: ${error}`);
      }
    }
    
    if (warnings.length > 0) {
      for (const warning of warnings) {
        logger?.warn(`Config validation warning: ${warning}`);
      }
    }
    
    logger?.info(`Configuration loaded successfully from ${sources.length} source(s)`);
    
    return {
      config: finalConfig,
      sources,
      envOverrides,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate configuration against JSON schema
   */
  async validateConfig(config: unknown): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic structure validation
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
    
    // Enhanced validation with warnings
    if (isValid && config && typeof config === 'object') {
      const cfg = config as RulesetConfig;
      
      // Check for unknown providers
      if (cfg.providers) {
        const knownProviders = ['cursor', 'claude-code', 'windsurf', 'roo-code', 'cline', 'codex-cli', 'codex-agent'];
        for (const providerId of Object.keys(cfg.providers)) {
          if (!knownProviders.includes(providerId)) {
            warnings.push(`Unknown provider '${providerId}'. ${ValidationMessages.UNKNOWN_PROVIDER}`);
          }
        }
      }
      
      // Check for empty default providers
      if (cfg.defaultProviders && cfg.defaultProviders.length === 0) {
        warnings.push(ValidationMessages.EMPTY_DEFAULT_PROVIDERS);
      }
      
      // Check for invalid output paths
      if (cfg.providers) {
        for (const [providerId, providerConfig] of Object.entries(cfg.providers)) {
          if (providerConfig.outputPath === '') {
            errors.push(`Provider '${providerId}': ${ValidationMessages.INVALID_OUTPUT_PATH}`);
          }
        }
      }
      
      // Check output directory
      if (cfg.outputDirectory === '') {
        errors.push(ValidationMessages.INVALID_OUTPUT_PATH);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Find configuration file starting from given path
   */
  async findConfigFile(
    startPath: string,
    options: ConfigLoadOptions = {}
  ): Promise<ConfigFileResult | null> {
    return findConfigFile(startPath, { ...DEFAULT_LOAD_OPTIONS, ...options });
  }

  /**
   * Parse configuration file content
   */
  async parseConfigFile(filePath: string, content: string): Promise<RulesetConfig> {
    const format = filePath.endsWith('.toml') ? 'toml' : 'jsonc';
    return parseConfigContent(content, format, filePath);
  }

  /**
   * Merge multiple configurations with proper precedence
   */
  mergeConfigs(configs: RulesetConfig[]): RulesetConfig {
    return mergeConfigs(...configs);
  }

  /**
   * Apply environment variable overrides
   */
  applyEnvOverrides(
    config: RulesetConfig,
    env: Record<string, string>,
    prefix: string = 'RULESETS'
  ): RulesetConfig {
    const { config: result } = applyEnvOverrides(config, env, prefix);
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
 * Convenience function to load configuration
 */
export async function loadConfig(
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
  
  return loader.loadConfig(
    { projectPath, env: filteredEnv, logger },
    options
  );
}

/**
 * Convenience function to validate configuration
 */
export async function validateConfig(
  config: unknown,
  logger?: Logger
): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const loader = getConfigLoader(logger);
  return loader.validateConfig(config);
}