/**

- @fileoverview Configuration types for the Rulesets Sandbox application
-
- Provides comprehensive, type-safe configuration interfaces with validation,
- environment-specific settings, and runtime configuration management.
 */

import type {
  ConfigurationKey,
  LogLevel,
  ProviderType,
  SafeDirectoryPath,
  SafeFilePath,
  SemanticVersion,
} from './brands';

/**

- Environment types for different deployment contexts
 */
export type Environment = 'development' | 'staging' | 'production' | 'test';

/**

- Log output formats
 */
export type LogFormat = 'json' | 'text' | 'structured';

/**

- Log output destinations
 */
export type LogDestination = 'console' | 'file' | 'syslog' | 'network';

/**

- Logging configuration
 */
export interface LoggingConfig {
  /**Global log level*/
  readonly level: LogLevel;

  /** Log output format */
  readonly format: LogFormat;

  /** Log destinations */
  readonly destinations: readonly LogDestination[];

  /** Log file path (if file destination is used) */
  readonly filePath?: SafeFilePath;

  /** Maximum log file size in bytes */
  readonly maxFileSizeBytes?: number;

  /** Number of log files to retain */
  readonly maxFiles?: number;

  /** Whether to include stack traces in error logs */
  readonly includeStackTrace: boolean;

  /** Whether to log performance metrics */
  readonly includeMetrics: boolean;

  /** Custom log fields to include */
  readonly customFields: Record<string, unknown>;

  /** Log levels for specific components */
  readonly componentLevels: Record<string, LogLevel>;
}

/**

- Security configuration settings
 */
export interface SecurityConfig {
  /**Whether to enable path traversal protection*/
  readonly enablePathTraversalProtection: boolean;

  /** Whether to validate file extensions */
  readonly validateFileExtensions: boolean;

  /** Allowed file extensions for source files */
  readonly allowedSourceExtensions: readonly string[];

  /** Allowed file extensions for output files */
  readonly allowedOutputExtensions: readonly string[];

  /** Maximum file size for uploads/reads in bytes */
  readonly maxFileSizeBytes: number;

  /** Maximum number of files to process in batch */
  readonly maxBatchSize: number;

  /** Whether to scan for malicious content */
  readonly enableMalwareScanning: boolean;

  /** Patterns to detect potentially malicious content */
  readonly maliciousPatterns: readonly string[];

  /** Whether to create backups before overwriting files */
  readonly enableBackups: boolean;

  /** Directory for storing backups */
  readonly backupDirectory?: SafeDirectoryPath;

  /** Maximum age of backups in milliseconds */
  readonly maxBackupAgeMs: number;
}

/**

- Performance tuning configuration
 */
export interface PerformanceConfig {
  /**Maximum number of concurrent compilations*/
  readonly maxConcurrentCompilations: number;

  /** Default timeout for compilation operations in milliseconds */
  readonly defaultTimeoutMs: number;

  /** Maximum timeout allowed for any operation */
  readonly maxTimeoutMs: number;

  /** Whether to enable caching */
  readonly enableCaching: boolean;

  /** Cache directory */
  readonly cacheDirectory?: SafeDirectoryPath;

  /** Maximum cache size in bytes */
  readonly maxCacheSizeBytes: number;

  /** Cache expiry time in milliseconds */
  readonly cacheExpiryMs: number;

  /** Whether to enable file watching for auto-recompilation */
  readonly enableFileWatching: boolean;

  /** Debounce delay for file change events in milliseconds */
  readonly fileWatchDebounceMs: number;

  /** Memory limit for compilation processes in bytes */
  readonly memoryLimitBytes: number;

  /** Whether to enable garbage collection optimizations */
  readonly enableGCOptimizations: boolean;
}

/**

- Provider-specific configuration
 */
export interface ProviderConfig {
  /**Provider type identifier*/
  readonly type: ProviderType;

  /** Whether this provider is enabled */
  readonly enabled: boolean;

  /** Provider display name */
  readonly displayName: string;

  /** Output directory for this provider */
  readonly outputDirectory: SafeDirectoryPath;

  /** Output file naming pattern */
  readonly fileNamingPattern: string;

  /** Template to use for this provider */
  readonly template?: string;

  /** Custom variables for template processing */
  readonly templateVariables: Record<string, unknown>;

  /** Provider-specific options */
  readonly options: Record<string, unknown>;

  /** Whether to validate output for this provider */
  readonly validateOutput: boolean;

  /** Post-processing commands to run */
  readonly postProcessingCommands: readonly string[];
}

/**

- Compilation behavior configuration
 */
export interface CompilationConfig {
  /**Default source directory for rules files*/
  readonly sourceDirectory: SafeDirectoryPath;

  /** Default output directory for compiled rules */
  readonly outputDirectory: SafeDirectoryPath;

  /** File patterns to include in compilation */
  readonly includePatterns: readonly string[];

  /** File patterns to exclude from compilation */
  readonly excludePatterns: readonly string[];

  /** Whether to validate input files before compilation */
  readonly validateInput: boolean;

  /** Whether to generate source maps */
  readonly generateSourceMaps: boolean;

  /** Whether to minify output */
  readonly minifyOutput: boolean;

  /** Whether to include debug information */
  readonly includeDebugInfo: boolean;

  /** Whether to fail fast on first error */
  readonly failFast: boolean;

  /** Whether to continue on individual provider failures */
  readonly continueOnProviderFailure: boolean;

  /** Default template variables */
  readonly defaultTemplateVariables: Record<string, unknown>;

  /** Output formatting options */
  readonly outputFormatting: OutputFormattingConfig;
}

/**

- Output formatting configuration
 */
export interface OutputFormattingConfig {
  /**Line ending style*/
  readonly lineEnding: 'lf' | 'crlf' | 'cr';

  /** Indentation type */
  readonly indentationType: 'spaces' | 'tabs';

  /** Number of spaces per indent level */
  readonly indentationSize: number;

  /** Whether to trim trailing whitespace */
  readonly trimTrailingWhitespace: boolean;

  /** Whether to ensure file ends with newline */
  readonly insertFinalNewline: boolean;

  /** Maximum line length before wrapping */
  readonly maxLineLength?: number;

  /** Whether to sort object properties */
  readonly sortProperties: boolean;
}

/**

- Development-specific configuration
 */
export interface DevelopmentConfig {
  /**Whether development mode is enabled*/
  readonly enabled: boolean;

  /** Whether to enable hot reloading */
  readonly enableHotReload: boolean;

  /** Whether to enable verbose debugging */
  readonly enableVerboseDebugging: boolean;

  /** Whether to preserve temporary files for debugging */
  readonly preserveTempFiles: boolean;

  /** Directory for development artifacts */
  readonly artifactsDirectory: SafeDirectoryPath;

  /** Whether to enable performance profiling */
  readonly enableProfiling: boolean;

  /** Whether to mock external dependencies */
  readonly mockExternalDependencies: boolean;

  /** Development server configuration */
  readonly serverConfig?: DevelopmentServerConfig;
}

/**

- Development server configuration
 */
export interface DevelopmentServerConfig {
  /**Server port*/
  readonly port: number;

  /** Server host */
  readonly host: string;

  /** Whether to enable CORS */
  readonly enableCors: boolean;

  /** Whether to enable request logging */
  readonly enableRequestLogging: boolean;

  /** Static file serving directory */
  readonly staticDirectory?: SafeDirectoryPath;

  /** Whether to enable live reload */
  readonly enableLiveReload: boolean;
}

/**

- Root configuration interface for the sandbox application
 */
export interface SandboxConfig {
  /**Application metadata*/
  readonly app: {
    readonly name: string;
    readonly version: SemanticVersion;
    readonly environment: Environment;
    readonly instanceId: string;
  };

  /** Logging configuration */
  readonly logging: LoggingConfig;

  /** Security configuration */
  readonly security: SecurityConfig;

  /** Performance configuration */
  readonly performance: PerformanceConfig;

  /** Compilation configuration */
  readonly compilation: CompilationConfig;

  /** Provider configurations */
  readonly providers: Record<string, ProviderConfig>;

  /** Development configuration */
  readonly development?: DevelopmentConfig;

  /** Custom configuration extensions */
  readonly extensions: Record<ConfigurationKey, unknown>;
}

/**

- Default configuration values for development environment
 */
export const DefaultDevelopmentConfig: SandboxConfig = {
  app: {
    name: 'rulesets-sandbox',
    version: '0.1.0' as SemanticVersion,
    environment: 'development',
    instanceId: 'dev-instance',
  },
  logging: {
    level: 'debug',
    format: 'text',
    destinations: ['console'],
    includeStackTrace: true,
    includeMetrics: true,
    customFields: {},
    componentLevels: {},
  },
  security: {
    enablePathTraversalProtection: true,
    validateFileExtensions: true,
    allowedSourceExtensions: ['.md', '.rule.md'],
    allowedOutputExtensions: ['.md', '.mdc', '.txt'],
    maxFileSizeBytes: 10_000_000, // 10MB
    maxBatchSize: 50,
    enableMalwareScanning: true,
    maliciousPatterns: ['<script', 'javascript:', 'eval(', 'Function('],
    enableBackups: true,
    maxBackupAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  performance: {
    maxConcurrentCompilations: 4,
    defaultTimeoutMs: 30_000,
    maxTimeoutMs: 300_000,
    enableCaching: true,
    maxCacheSizeBytes: 100_000_000, // 100MB
    cacheExpiryMs: 60 * 60 * 1000, // 1 hour
    enableFileWatching: true,
    fileWatchDebounceMs: 300,
    memoryLimitBytes: 512_000_000, // 512MB
    enableGCOptimizations: true,
  },
  compilation: {
    sourceDirectory: 'src/' as SafeDirectoryPath,
    outputDirectory: 'dist/' as SafeDirectoryPath,
    includePatterns: ['**/*.rule.md', '**/*.md'],
    excludePatterns: ['**/node_modules/**', '**/.*/**'],
    validateInput: true,
    generateSourceMaps: true,
    minifyOutput: false,
    includeDebugInfo: true,
    failFast: false,
    continueOnProviderFailure: true,
    defaultTemplateVariables: {},
    outputFormatting: {
      lineEnding: 'lf',
      indentationType: 'spaces',
      indentationSize: 2,
      trimTrailingWhitespace: true,
      insertFinalNewline: true,
      sortProperties: false,
    },
  },
  providers: {},
  development: {
    enabled: true,
    enableHotReload: true,
    enableVerboseDebugging: true,
    preserveTempFiles: true,
    artifactsDirectory: '.sandbox/' as SafeDirectoryPath,
    enableProfiling: false,
    mockExternalDependencies: false,
  },
  extensions: {},
} as const;

/**

- Default configuration values for production environment
 */
export const DefaultProductionConfig: SandboxConfig = {
  ...DefaultDevelopmentConfig,
  app: {
    ...DefaultDevelopmentConfig.app,
    environment: 'production',
  },
  logging: {
    ...DefaultDevelopmentConfig.logging,
    level: 'info',
    format: 'json',
    destinations: ['file'],
    includeStackTrace: false,
    includeMetrics: false,
  },
  security: {
    ...DefaultDevelopmentConfig.security,
    enableMalwareScanning: true,
    enableBackups: true,
  },
  performance: {
    ...DefaultDevelopmentConfig.performance,
    maxConcurrentCompilations: 8,
    enableFileWatching: false,
    enableGCOptimizations: true,
  },
  compilation: {
    ...DefaultDevelopmentConfig.compilation,
    generateSourceMaps: false,
    minifyOutput: true,
    includeDebugInfo: false,
    failFast: true,
  },
  development: {
    enabled: false,
    enableHotReload: false,
    enableVerboseDebugging: false,
    preserveTempFiles: false,
    artifactsDirectory: '.sandbox/' as SafeDirectoryPath,
    enableProfiling: false,
    mockExternalDependencies: false,
  },
} as const;

/**

- Utility functions for working with configuration
 */
export const ConfigurationUtils = {
  /**
  - Merges multiple configuration objects with deep merge
   */
  mergeConfigs: (
    ...configs: readonly Partial<SandboxConfig>[]
  ): Partial<SandboxConfig> => {
    const result: Partial<SandboxConfig> = {};

    for (const config of configs) {
      Object.assign(result, config);
    }

    return result;
  },

  /**

- Gets configuration for a specific environment
   */
  getEnvironmentConfig: (environment: Environment): SandboxConfig => {
    switch (environment) {
      case 'production':
        return DefaultProductionConfig;
      case 'development':
      case 'test':
      case 'staging':
      default:
        return DefaultDevelopmentConfig;
    }
  },

  /**

- Validates that required configuration properties are present
   */
  validateRequired: (config: Partial<SandboxConfig>): readonly string[] => {
    const missing: string[] = [];

    if (!config.app?.name) missing.push('app.name');
    if (!config.app?.version) missing.push('app.version');
    if (!config.app?.environment) missing.push('app.environment');
    if (!config.logging?.level) missing.push('logging.level');
    if (!config.compilation?.sourceDirectory)
      missing.push('compilation.sourceDirectory');
    if (!config.compilation?.outputDirectory)
      missing.push('compilation.outputDirectory');

    return missing;
  },

  /**

- Gets the effective configuration value for a nested key
   */
  getConfigValue: <T>(
    config: SandboxConfig,
    keyPath: string,
    defaultValue: T
  ): T => {
    const keys = keyPath.split('.');
    let current: unknown = config;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return defaultValue;
      }
    }

    return current as T;
  },

  /**

- Checks if a provider is enabled in the configuration
   */
  isProviderEnabled: (
    config: SandboxConfig,
    providerType: ProviderType
  ): boolean => {
    const providerConfig = config.providers[providerType];
    return providerConfig?.enabled ?? false;
  },

  /**

- Gets enabled providers from configuration
   */
  getEnabledProviders: (config: SandboxConfig): readonly ProviderConfig[] => {
    return Object.values(config.providers).filter(
      (provider) => provider.enabled
    );
  },

  /**

- Applies environment-specific overrides to configuration
   */
  applyEnvironmentOverrides: (
    config: SandboxConfig,
    overrides: Record<Environment, Partial<SandboxConfig>>
  ): SandboxConfig => {
    const envOverrides = overrides[config.app.environment];
    return envOverrides ? { ...config, ...envOverrides } : config;
  },
} as const;

/**

- Type guards for configuration validation
 */
export const ConfigurationGuards = {
  /**
  - Validates that a configuration object has all required properties
   */
  isValidSandboxConfig: (config: unknown): config is SandboxConfig => {
    if (!config || typeof config !== 'object') return false;

    const c = config as Partial<SandboxConfig>;
    return !!(
      c.app?.name &&
      c.app?.version &&
      c.app?.environment &&
      c.logging?.level &&
      c.compilation?.sourceDirectory &&
      c.compilation?.outputDirectory
    );
  },

  /**

- Validates a provider configuration
   */
  isValidProviderConfig: (config: unknown): config is ProviderConfig => {
    if (!config || typeof config !== 'object') return false;

    const c = config as Partial<ProviderConfig>;
    return !!(
      c.type &&
      typeof c.enabled === 'boolean' &&
      c.displayName &&
      c.outputDirectory &&
      c.fileNamingPattern
    );
  },
} as const;
