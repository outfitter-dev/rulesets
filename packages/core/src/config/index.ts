/**
 * Configuration system exports for Rulesets
 * Provides hierarchical configuration loading with JSONC and TOML support
 */

// Main classes and functions
export { ConfigLoader, getConfigLoader, loadConfig, validateConfig } from './ConfigLoader';

// Types and interfaces
export type {
  RulesetConfig,
  ProviderConfig,
  GitignoreConfig,
  ConfigContext,
  ConfigLoadOptions,
  ConfigLoadResult,
  ConfigFileResult,
  ConfigLoader as IConfigLoader,
} from './types';

// Constants and defaults
export {
  DEFAULT_CONFIG,
  CONFIG_FILE_NAMES,
  DEFAULT_LOAD_OPTIONS,
} from './types';

// Schema definitions
export {
  rulesetConfigSchema,
  rulesetConfigSchemaEnhanced,
  providerConfigSchema,
  gitignoreConfigSchema,
  KNOWN_PROVIDERS,
  ValidationMessages,
} from './schema';

// Utility functions
export {
  findConfigFile,
  getConfigFormat,
  parseConfigContent,
  mergeConfigs,
  applyEnvOverrides,
  parseEnvOverride,
  parseEnvValue,
  setDeepValue,
  getGlobalConfigDir,
  normalizePath,
  validateConfigFileName,
  fileExists,
} from './utils';