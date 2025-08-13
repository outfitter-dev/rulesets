/**
 * Configuration system types and interfaces for Rulesets
 * Supports both JSONC and TOML configuration formats with hierarchical discovery
 */

import type { Logger } from '@rulesets/types';

/**
 * Provider-specific configuration settings
 */
export interface ProviderConfig {
  /** Whether this provider is enabled */
  enabled?: boolean;
  /** Output path for this provider (overrides default) */
  outputPath?: string;
  /** Provider-specific options */
  options?: Record<string, unknown>;
}

/**
 * Gitignore management configuration
 */
export interface GitignoreConfig {
  /** Whether gitignore management is enabled */
  enabled?: boolean;
  /** Files to keep in gitignore despite being generated */
  keep?: string[];
  /** Additional patterns to always ignore */
  ignore?: string[];
  /** Gitignore management options */
  options?: {
    /** Custom comment for managed block */
    comment?: string;
    /** Whether to sort entries alphabetically */
    sort?: boolean;
  };
}

/**
 * Main Rulesets configuration interface
 */
export interface RulesetConfig {
  /** Provider-specific settings */
  providers?: Record<string, ProviderConfig>;
  /** Gitignore management settings */
  gitignore?: GitignoreConfig;
  /** Default providers to enable when none specified */
  defaultProviders?: string[];
  /** Strict mode - fail on warnings */
  strict?: boolean;
  /** Output directory for compiled rules */
  outputDirectory?: string;
  /** Global configuration options */
  options?: Record<string, unknown>;
  /** Index signature for dynamic property access */
  [key: string]: unknown;
}

/**
 * Configuration loading context
 */
export interface ConfigContext {
  /** Project root path */
  projectPath: string;
  /** Environment variables to consider */
  env?: Record<string, string>;
  /** Logger instance */
  logger?: Logger;
}

/**
 * Configuration loading options
 */
export interface ConfigLoadOptions {
  /** Search for config files in parent directories */
  searchParents?: boolean;
  /** Maximum directory levels to search upward */
  maxSearchDepth?: number;
  /** Environment variable prefix for overrides */
  envPrefix?: string;
  /** Validate configuration against schema */
  validate?: boolean;
}

/**
 * Configuration file discovery result
 */
export interface ConfigFileResult {
  /** Path to the configuration file */
  filePath: string;
  /** Configuration file format */
  format: 'jsonc' | 'toml';
  /** Raw file content */
  content: string;
  /** Directory where config was found */
  directory: string;
}

/**
 * Configuration loading result
 */
export interface ConfigLoadResult {
  /** Final merged configuration */
  config: RulesetConfig;
  /** Configuration files that were loaded */
  sources: ConfigFileResult[];
  /** Environment overrides applied */
  envOverrides: Record<string, unknown>;
  /** Validation errors (if any) */
  errors?: string[];
  /** Validation warnings (if any) */
  warnings?: string[];
}

/**
 * Configuration loader interface
 */
export interface ConfigLoader {
  /**
   * Load configuration from project path with hierarchical discovery
   */
  loadConfig(context: ConfigContext, options?: ConfigLoadOptions): Promise<ConfigLoadResult>;
  
  /**
   * Validate configuration against schema
   */
  validateConfig(config: unknown): Promise<{ valid: boolean; errors: string[]; warnings: string[] }>;
  
  /**
   * Find configuration file starting from given path
   */
  findConfigFile(startPath: string, options?: ConfigLoadOptions): Promise<ConfigFileResult | null>;
  
  /**
   * Parse configuration file content
   */
  parseConfigFile(filePath: string, content: string): Promise<RulesetConfig>;
  
  /**
   * Merge multiple configurations with proper precedence
   */
  mergeConfigs(configs: RulesetConfig[]): RulesetConfig;
  
  /**
   * Apply environment variable overrides
   */
  applyEnvOverrides(config: RulesetConfig, env: Record<string, string>, prefix?: string): RulesetConfig;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Required<Omit<RulesetConfig, 'providers' | 'options'>> & {
  providers: Record<string, ProviderConfig>;
  options: Record<string, unknown>;
} = {
  providers: {},
  gitignore: {
    enabled: true,
    keep: [],
    ignore: [],
    options: {
      comment: 'Rulesets Generated Files',
      sort: true,
    },
  },
  defaultProviders: ['cursor', 'claude-code'],
  strict: true,
  outputDirectory: '.ruleset/dist',
  options: {},
} as const;

/**
 * Configuration file names in order of precedence (highest first)
 */
export const CONFIG_FILE_NAMES = [
  'ruleset.config.jsonc',
  'ruleset.config.json',
  'ruleset.config.toml',
  '.rulesetrc.jsonc',
  '.rulesetrc.json',
  '.rulesetrc.toml',
] as const;

/**
 * Default configuration loading options
 */
export const DEFAULT_LOAD_OPTIONS: Required<ConfigLoadOptions> = {
  searchParents: true,
  maxSearchDepth: 10,
  envPrefix: 'RULESETS',
  validate: true,
} as const;