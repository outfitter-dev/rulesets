/**
 * Configuration system types and interfaces for Rulesets
 * Supports both JSONC and TOML configuration formats with hierarchical discovery
 */

import type { Logger } from '@rulesets/types';

/**
 * Branded types for type safety
 */
type Brand<T, B> = T & { readonly __brand: B };

/**
 * Branded type for file paths to prevent confusion
 */
export type ConfigFilePath = Brand<string, 'ConfigFilePath'>;

/**
 * Branded type for directory paths
 */
export type ConfigDirectoryPath = Brand<string, 'ConfigDirectoryPath'>;

/**
 * Branded type for provider IDs to ensure they're valid
 */
export type ProviderID = Brand<string, 'ProviderID'>;

/**
 * Known provider IDs as const assertion for type safety
 */
export const KNOWN_PROVIDERS = [
  'cursor',
  'claude-code',
  'windsurf',
  'roo-code',
  'cline',
  'codex',
] as const;

/**
 * Union type of known provider IDs
 */
export type KnownProviderID = (typeof KNOWN_PROVIDERS)[number];

/**
 * Configuration result discriminated union for strict success/failure handling
 */
export type ConfigResult<T> =
  | {
      readonly success: true;
      readonly data: T;
      readonly errors?: never;
      readonly warnings?: string[];
    }
  | {
      readonly success: false;
      readonly data?: never;
      readonly errors: readonly string[];
      readonly warnings?: readonly string[];
    };

/**
 * Provider-specific configuration settings
 */
export interface ProviderConfig {
  /** Whether this provider is enabled */
  readonly enabled?: boolean;
  /** Output path for this provider (overrides default) */
  readonly outputPath?: string;
  /** Provider-specific options */
  readonly options?: Readonly<Record<string, unknown>>;
}

/**
 * Gitignore management configuration
 */
export interface GitignoreConfig {
  /** Whether gitignore management is enabled */
  readonly enabled?: boolean;
  /** Files to keep in gitignore despite being generated */
  readonly keep?: readonly string[];
  /** Additional patterns to always ignore */
  readonly ignore?: readonly string[];
  /** Gitignore management options */
  readonly options?: {
    /** Custom comment for managed block */
    readonly comment?: string;
    /** Whether to sort entries alphabetically */
    readonly sort?: boolean;
  };
}

/**
 * Parallel compilation configuration
 */
export interface ParallelCompilationConfig {
  /** Maximum number of concurrent provider compilations (default: unlimited) */
  readonly maxConcurrency?: number;
  /** Whether to continue compilation if one provider fails (default: false) */
  readonly continueOnError?: boolean;
  /** Enable detailed performance timing for parallel operations */
  readonly enableTiming?: boolean;
}

/**
 * Main Rulesets configuration interface with strict typing
 */
export interface RulesetConfig {
  /** Provider-specific settings with type-safe keys */
  readonly providers?: Readonly<Record<string, ProviderConfig>>;
  /** Gitignore management settings */
  readonly gitignore?: GitignoreConfig;
  /** Parallel compilation settings */
  readonly parallelCompilation?: ParallelCompilationConfig;
  /** Default providers to enable when none specified */
  readonly defaultProviders?: readonly string[];
  /** Strict mode - fail on warnings */
  readonly strict?: boolean;
  /** Output directory for compiled rules */
  readonly outputDirectory?: string;
  /** Global configuration options */
  readonly options?: Readonly<Record<string, unknown>>;
  /** Index signature for dynamic property access */
  readonly [key: string]: unknown;
}

/**
 * Type-safe provider configuration with strict known providers
 */
export interface TypeSafeRulesetConfig
  extends Omit<RulesetConfig, 'providers'> {
  /** Type-safe provider settings */
  readonly providers?: Readonly<
    Partial<Record<KnownProviderID, ProviderConfig>>
  >;
}

/**
 * Configuration loading context
 */
export interface ConfigContext {
  /** Project root path */
  readonly projectPath: ConfigDirectoryPath;
  /** Environment variables to consider */
  readonly env?: Readonly<Record<string, string>>;
  /** Logger instance */
  readonly logger?: Logger;
}

/**
 * Configuration loading options
 */
export interface ConfigLoadOptions {
  /** Search for config files in parent directories */
  readonly searchParents?: boolean;
  /** Maximum directory levels to search upward */
  readonly maxSearchDepth?: number;
  /** Environment variable prefix for overrides */
  readonly envPrefix?: string;
  /** Validate configuration against schema */
  readonly validate?: boolean;
}

/**
 * Configuration file discovery result with branded types
 */
export interface ConfigFileResult {
  /** Path to the configuration file */
  readonly filePath: ConfigFilePath;
  /** Configuration file format */
  readonly format: 'jsonc' | 'toml';
  /** Raw file content */
  readonly content: string;
  /** Directory where config was found */
  readonly directory: ConfigDirectoryPath;
}

/**
 * Configuration loading result with strict type safety
 */
export interface ConfigLoadResult {
  /** Whether the configuration loading succeeded */
  readonly success: boolean;
  /** Final merged configuration */
  readonly config: RulesetConfig;
  /** Configuration files that were loaded */
  readonly sources: readonly ConfigFileResult[];
  /** Environment overrides applied */
  readonly envOverrides: Readonly<Record<string, unknown>>;
  /** Validation errors (if any) */
  readonly errors?: readonly string[];
  /** Validation warnings (if any) */
  readonly warnings?: readonly string[];
}

/**
 * Type-safe configuration loading result using discriminated union
 */
export type SafeConfigLoadResult = ConfigResult<{
  readonly config: RulesetConfig;
  readonly sources: readonly ConfigFileResult[];
  readonly envOverrides: Readonly<Record<string, unknown>>;
}>;

/**
 * Configuration loader interface with strict typing
 */
export interface ConfigLoader {
  /**
   * Load configuration from project path with hierarchical discovery
   */
  loadConfig(
    context: ConfigContext,
    options?: ConfigLoadOptions
  ): Promise<ConfigLoadResult>;

  /**
   * Validate configuration against schema with strict return type
   */
  validateConfig(config: unknown): ConfigValidationResult;

  /**
   * Find configuration file starting from given path
   */
  findConfigFile(
    startPath: ConfigDirectoryPath,
    options?: ConfigLoadOptions
  ): Promise<ConfigFileResult | null>;

  /**
   * Parse configuration file content with branded path
   */
  parseConfigFile(filePath: ConfigFilePath, content: string): RulesetConfig;

  /**
   * Merge multiple configurations with proper precedence
   */
  mergeConfigs(configs: readonly RulesetConfig[]): RulesetConfig;

  /**
   * Apply environment variable overrides
   */
  applyEnvOverrides(
    config: RulesetConfig,
    env: Readonly<Record<string, string>>,
    prefix?: string
  ): RulesetConfig;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Required<
  Omit<RulesetConfig, 'providers' | 'options'>
> & {
  providers: Record<string, ProviderConfig>;
  options: Record<string, unknown>;
} = {
  providers: {
    cursor: {
      enabled: true,
      outputPath: '.cursor/rules/',
    },
    'claude-code': {
      enabled: true,
      outputPath: 'CLAUDE.md',
    },
    windsurf: {
      enabled: false,
      outputPath: '.windsurf/rules/',
    },
  },
  gitignore: {
    enabled: true,
    keep: [],
    ignore: [],
    options: {
      comment: 'Rulesets Generated Files',
      sort: true,
    },
  },
  parallelCompilation: {},
  defaultProviders: ['cursor', 'claude-code'],
  strict: false,
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

/**
 * Type guards and helper functions for branded types
 */
export const createConfigFilePath = (path: string): ConfigFilePath =>
  path as ConfigFilePath;
export const createConfigDirectoryPath = (path: string): ConfigDirectoryPath =>
  path as ConfigDirectoryPath;
export const createProviderID = (id: string): ProviderID => id as ProviderID;

/**
 * Type guard for known provider IDs
 */
export const isKnownProviderID = (id: string): id is KnownProviderID => {
  return KNOWN_PROVIDERS.includes(id as KnownProviderID);
};

/**
 * Type guard for configuration success result
 */
export const isConfigSuccess = <T>(
  result: ConfigResult<T>
): result is {
  readonly success: true;
  readonly data: T;
  readonly warnings?: string[];
} => {
  return result.success === true;
};

/**
 * Type guard for configuration failure result
 */
export const isConfigFailure = <T>(
  result: ConfigResult<T>
): result is {
  readonly success: false;
  readonly errors: readonly string[];
  readonly warnings?: readonly string[];
} => {
  return result.success === false;
};

/**
 * Assert that a provider ID is known at compile time
 */
export const assertKnownProvider = (
  id: string
): asserts id is KnownProviderID => {
  if (!isKnownProviderID(id)) {
    throw new TypeError(
      `Unknown provider ID: ${id}. Known providers: ${KNOWN_PROVIDERS.join(', ')}`
    );
  }
};

/**
 * Create a type-safe configuration result
 */
export const createConfigResult = {
  success: <T>(data: T, warnings?: string[]): ConfigResult<T> => ({
    success: true as const,
    data,
    warnings,
  }),
  failure: <T>(
    errors: readonly string[],
    warnings?: readonly string[]
  ): ConfigResult<T> => ({
    success: false as const,
    errors,
    warnings,
  }),
} as const;

/**
 * Type-safe configuration validation
 */
export interface ConfigValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Assertion for non-null configuration access
 */
export const assertConfigExists = <T>(
  config: T | undefined,
  context: string
): asserts config is T => {
  if (config === undefined) {
    throw new TypeError(
      `Configuration assertion failed: ${context} is undefined`
    );
  }
};
