/**

- @fileoverview ConfigurationService implementation
-
- Provides configuration loading, validation, and management with support
- for JSON and JSONC formats. Includes comprehensive validation and
- type-safe configuration access.
 */

import {
  CommonSuggestions,
  createRecoverySuggestion,
  ErrorCodes,
  SandboxError,
} from '@/domain/errors';
import type { IFileSystemService } from '@/domain/interfaces/filesystem-service';
import type {
  CompiledContent,
  ConfigurationKey,
  ProviderType,
  SafeFilePath,
  SourceContent,
} from '@/shared/types/brands';
import {
  createCompiledContent,
  createProviderType,
} from '@/shared/types/brands';
import { Err, Ok, type Result } from '@/shared/types/result';

/**

- Configuration schema interface
 */
export interface RulesetConfiguration {
  /**Version of the Rulesets compiler*/
  compilerVersion: string;

  /** List of enabled providers */
  providers: readonly string[];

  /** Output directory for compiled rules */
  outputDirectory: string;

  /** Whether to validate input files */
  validateInput?: boolean;

  /** Debug mode enabled */
  debugMode?: boolean;

  /** Compilation timeout in milliseconds */
  timeout?: number;

  /** Advanced configuration options */
  advanced?: {
    debugMode?: boolean;
    timeout?: number;
    generateSourceMaps?: boolean;
    minifyOutput?: boolean;
  };

  /** Additional custom configuration */
  [key: string]: unknown;
}

/**

- Configuration error for configuration-specific operations
 */
class ConfigurationError extends SandboxError {
  constructor(
    code: string,
    message: string,
    context: Record<string, unknown> = {},
    cause?: Error
  ) {
    super(
      code,
      message,
      'configuration',
      'error',
      context,
      [
        CommonSuggestions.checkConfiguration,
        CommonSuggestions.validateInput,
        CommonSuggestions.checkDocumentation,
      ],
      cause
    );
  }
}

/**

- Configuration service for loading and managing Rulesets configuration
 */
export class ConfigurationService {
  private currentConfiguration: RulesetConfiguration | null = null;
  private readonly fileSystem: IFileSystemService<
    SourceContent | CompiledContent

  >;

  constructor(fileSystem: IFileSystemService<SourceContent | CompiledContent>) {
    this.fileSystem = fileSystem;
  }

  /**

- Loads configuration from a JSON or JSONC file
   */
  async loadConfiguration(
    configPath: SafeFilePath
  ): Promise<Result<RulesetConfiguration, SandboxError>> {
    try {
      // Check if file exists
      const existsResult = await this.fileSystem.exists(configPath);
      if (!existsResult.success) {
        return existsResult;
      }

      if (!existsResult.value) {
        return Err(
          new ConfigurationError(
            ErrorCodes.CONFIG_NOT_FOUND,
            `Configuration file not found: ${configPath}`,
            { configPath }
          )
        );
      }

      // Read file content
      const contentResult = await this.fileSystem.readFile(configPath);
      if (!contentResult.success) {
        return Err(
          new ConfigurationError(
            ErrorCodes.CONFIG_LOAD_FAILED,
            `Failed to read configuration file: ${contentResult.error.message}`,
            { configPath },
            contentResult.error
          )
        );
      }

      // Parse JSON/JSONC content
      const parseResult = this.parseConfiguration(contentResult.value);
      if (!parseResult.success) {
        return parseResult;
      }

      // Validate configuration
      const validationResult = this.validateConfiguration(parseResult.value);
      if (!validationResult.success) {
        return validationResult;
      }

      // Store configuration
      this.currentConfiguration = parseResult.value;

      return Ok(parseResult.value);
    } catch (error) {
      return Err(
        new ConfigurationError(
          ErrorCodes.CONFIG_LOAD_FAILED,
          `Unexpected error loading configuration: ${(error as Error).message}`,
          { configPath },
          error as Error
        )
      );
    }
  }

  /**

- Parses JSON/JSONC content with comment support
   */
  private parseConfiguration(
    content: string
  ): Result<RulesetConfiguration, SandboxError> {
    try {
      // Simple JSONC parser - remove comments and parse
      const jsonContent = content
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
        .replace(/\/\/.*$/gm, ''); // Remove // comments

      const parsed = JSON.parse(jsonContent);

      if (typeof parsed !== 'object' || parsed === null) {
        return Err(
          new ConfigurationError(
            ErrorCodes.CONFIG_INVALID,
            'Configuration must be a JSON object',
            { contentType: typeof parsed }
          )
        );
      }

      return Ok(parsed as RulesetConfiguration);
    } catch (error) {
      return Err(
        new ConfigurationError(
          ErrorCodes.CONFIG_INVALID,
          `Failed to parse configuration: ${(error as Error).message}`,
          {},
          error as Error
        )
      );
    }
  }

  /**

- Validates configuration against schema
   */
  validateConfiguration(
    config: unknown
  ): Result<RulesetConfiguration, SandboxError> {
    if (typeof config !== 'object' || config === null) {
      return Err(
        new ConfigurationError(
          ErrorCodes.VALIDATION_FAILED,
          'Configuration must be an object',
          { configType: typeof config }
        )
      );
    }

    const cfg = config as Record<string, unknown>;

    // Validate required fields
    if (typeof cfg.compilerVersion !== 'string') {
      return Err(
        new ConfigurationError(
          ErrorCodes.VALIDATION_FAILED,
          'Configuration must include compilerVersion as string',
          {
            field: 'compilerVersion',
            actualType: typeof cfg.compilerVersion,
            expectedType: 'string',
          }
        )
      );
    }

    if (!Array.isArray(cfg.providers)) {
      return Err(
        new ConfigurationError(
          ErrorCodes.VALIDATION_FAILED,
          'Configuration must include providers as array',
          {
            field: 'providers',
            actualType: typeof cfg.providers,
            expectedType: 'array',
          }
        )
      );
    }

    if (typeof cfg.outputDirectory !== 'string') {
      return Err(
        new ConfigurationError(
          ErrorCodes.VALIDATION_FAILED,
          'Configuration must include outputDirectory as string',
          {
            field: 'outputDirectory',
            actualType: typeof cfg.outputDirectory,
            expectedType: 'string',
          }
        )
      );
    }

    // Validate provider types
    const validProviders = [
      'cursor',
      'claude-code',
      'windsurf',
      'cline',
      'roo-code',
    ];
    for (const provider of cfg.providers) {
      if (typeof provider !== 'string' || !validProviders.includes(provider)) {
        return Err(
          new ConfigurationError(
            ErrorCodes.VALIDATION_FAILED,
            `Invalid provider type: ${provider}`,
            {
              invalidProvider: provider,
              validProviders,
            }
          )
        );
      }
    }

    // Validate optional fields
    if (
      cfg.validateInput !== undefined &&
      typeof cfg.validateInput !== 'boolean'
    ) {
      return Err(
        new ConfigurationError(
          ErrorCodes.VALIDATION_FAILED,
          'validateInput must be boolean if specified',
          {
            field: 'validateInput',
            actualType: typeof cfg.validateInput,
            expectedType: 'boolean',
          }
        )
      );
    }

    if (cfg.debugMode !== undefined && typeof cfg.debugMode !== 'boolean') {
      return Err(
        new ConfigurationError(
          ErrorCodes.VALIDATION_FAILED,
          'debugMode must be boolean if specified',
          {
            field: 'debugMode',
            actualType: typeof cfg.debugMode,
            expectedType: 'boolean',
          }
        )
      );
    }

    if (cfg.timeout !== undefined && typeof cfg.timeout !== 'number') {
      return Err(
        new ConfigurationError(
          ErrorCodes.VALIDATION_FAILED,
          'timeout must be number if specified',
          {
            field: 'timeout',
            actualType: typeof cfg.timeout,
            expectedType: 'number',
          }
        )
      );
    }

    return Ok(config as RulesetConfiguration);
  }

  /**

- Gets a configuration value by key (supports dot notation)
   */
  get(key: ConfigurationKey): Result<unknown, SandboxError> {
    if (!this.currentConfiguration) {
      return Err(
        new ConfigurationError(
          ErrorCodes.CONFIG_NOT_FOUND,
          'No configuration loaded. Call loadConfiguration() first.',
          { key }
        )
      );
    }

    try {
      const keyPath = key.split('.');
      let current: unknown = this.currentConfiguration;

      for (const segment of keyPath) {
        if (typeof current !== 'object' || current === null) {
          return Err(
            new ConfigurationError(
              ErrorCodes.CONFIG_NOT_FOUND,
              `Configuration key not found: ${key}`,
              { key, failedAt: segment }
            )
          );
        }

        current = (current as Record<string, unknown>)[segment];

        if (current === undefined) {
          return Err(
            new ConfigurationError(
              ErrorCodes.CONFIG_NOT_FOUND,
              `Configuration key not found: ${key}`,
              { key, failedAt: segment }
            )
          );
        }
      }

      return Ok(current);
    } catch (error) {
      return Err(
        new ConfigurationError(
          ErrorCodes.CONFIG_LOAD_FAILED,
          `Failed to get configuration value: ${(error as Error).message}`,
          { key },
          error as Error
        )
      );
    }
  }

  /**

- Sets a configuration value by key (supports dot notation)
   */
  set(key: ConfigurationKey, value: unknown): Result<void, SandboxError> {
    if (!this.currentConfiguration) {
      return Err(
        new ConfigurationError(
          ErrorCodes.CONFIG_NOT_FOUND,
          'No configuration loaded. Call loadConfiguration() first.',
          { key }
        )
      );
    }

    try {
      const keyPath = key.split('.');
      let current: Record<string, unknown> = this
        .currentConfiguration as Record<string, unknown>;

      // Navigate to parent object
      for (let i = 0; i < keyPath.length - 1; i++) {
        const segment = keyPath[i]!;

        if (!(segment in current)) {
          current[segment] = {};
        }

        if (typeof current[segment] !== 'object' || current[segment] === null) {
          current[segment] = {};
        }

        current = current[segment] as Record<string, unknown>;
      }

      // Set the final value
      const finalKey = keyPath[keyPath.length - 1]!;
      current[finalKey] = value;

      return Ok(undefined);
    } catch (error) {
      return Err(
        new ConfigurationError(
          ErrorCodes.CONFIG_LOAD_FAILED,
          `Failed to set configuration value: ${(error as Error).message}`,
          { key, value },
          error as Error
        )
      );
    }
  }

  /**

- Saves the current configuration to a file
   */
  async saveConfiguration(
    configPath: SafeFilePath
  ): Promise<Result<void, SandboxError>> {
    if (!this.currentConfiguration) {
      return Err(
        new ConfigurationError(
          ErrorCodes.CONFIG_NOT_FOUND,
          'No configuration loaded. Call loadConfiguration() first.',
          { configPath }
        )
      );
    }

    try {
      const configJson = JSON.stringify(this.currentConfiguration, null, 2);
      const writeResult = await this.fileSystem.writeFile(
        configPath,
        createCompiledContent(configJson),
        { createParents: true }
      );

      if (!writeResult.success) {
        return Err(
          new ConfigurationError(
            ErrorCodes.CONFIG_LOAD_FAILED,
            `Failed to save configuration: ${writeResult.error.message}`,
            { configPath },
            writeResult.error
          )
        );
      }

      return Ok(undefined);
    } catch (error) {
      return Err(
        new ConfigurationError(
          ErrorCodes.CONFIG_LOAD_FAILED,
          `Unexpected error saving configuration: ${(error as Error).message}`,
          { configPath },
          error as Error
        )
      );
    }
  }

  /**

- Returns the default configuration
   */
  getDefaultConfiguration(): Result<RulesetConfiguration, SandboxError> {
    const defaultConfig: RulesetConfiguration = {
      compilerVersion: '0.1.0',
      providers: ['cursor', 'claude-code'],
      outputDirectory: '.ruleset/dist',
      validateInput: true,
      debugMode: false,
      timeout: 30_000,
      advanced: {
        debugMode: false,
        timeout: 30_000,
        generateSourceMaps: true,
        minifyOutput: false,
      },
    };

    // Validate the default configuration
    const validationResult = this.validateConfiguration(defaultConfig);
    if (!validationResult.success) {
      return Err(
        new ConfigurationError(
          ErrorCodes.INTERNAL_ERROR,
          'Default configuration is invalid',
          { defaultConfig },
          validationResult.error
        )
      );
    }

    return Ok(defaultConfig);
  }

  /**

- Gets the currently loaded configuration
   */
  getCurrentConfiguration(): Result<RulesetConfiguration, SandboxError> {
    if (!this.currentConfiguration) {
      return Err(
        new ConfigurationError(
          ErrorCodes.CONFIG_NOT_FOUND,
          'No configuration loaded. Call loadConfiguration() first.'
        )
      );
    }

    return Ok({ ...this.currentConfiguration });
  }

  /**

- Resets configuration to default values
   */
  resetToDefault(): Result<void, SandboxError> {
    const defaultResult = this.getDefaultConfiguration();
    if (!defaultResult.success) {
      return defaultResult;
    }

    this.currentConfiguration = defaultResult.value;
    return Ok(undefined);
  }

  /**

- Merges configuration with another configuration object
   */
  mergeConfiguration(
    partialConfig: Partial<RulesetConfiguration>
  ): Result<void, SandboxError> {
    if (!this.currentConfiguration) {
      return Err(
        new ConfigurationError(
          ErrorCodes.CONFIG_NOT_FOUND,
          'No configuration loaded. Call loadConfiguration() first.'
        )
      );
    }

    try {
      const mergedConfig = {
        ...this.currentConfiguration,
        ...partialConfig,
      };

      const validationResult = this.validateConfiguration(mergedConfig);
      if (!validationResult.success) {
        return validationResult;
      }

      this.currentConfiguration = mergedConfig;
      return Ok(undefined);
    } catch (error) {
      return Err(
        new ConfigurationError(
          ErrorCodes.CONFIG_LOAD_FAILED,
          `Failed to merge configuration: ${(error as Error).message}`,
          { partialConfig },
          error as Error
        )
      );
    }
  }
}
