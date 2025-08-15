/**
 * Configuration system exports for Rulesets
 * Provides hierarchical configuration loading with JSONC and TOML support
 */

// Main classes and functions
export {
  ConfigLoader,
  getConfigLoader,
  loadConfig,
  validateConfig,
} from './config-loader';
// Schema definitions
export {
  gitignoreConfigSchema,
  KNOWN_PROVIDERS,
  providerConfigSchema,
  rulesetConfigSchema,
  rulesetConfigSchemaEnhanced,
  ValidationMessages,
} from './schema';
// Types and interfaces
export type {
  ConfigContext,
  ConfigFileResult,
  ConfigLoader as IConfigLoader,
  ConfigLoadOptions,
  ConfigLoadResult,
  GitignoreConfig,
  ProviderConfig,
  RulesetConfig,
} from './types';
// Constants and defaults
export {
  CONFIG_FILE_NAMES,
  DEFAULT_CONFIG,
  DEFAULT_LOAD_OPTIONS,
} from './types';

// Utility functions
export {
  applyEnvOverrides,
  fileExists,
  findConfigFile,
  getConfigFormat,
  getGlobalConfigDir,
  mergeConfigs,
  normalizePath,
  parseConfigContent,
  parseEnvOverride,
  parseEnvValue,
  setDeepValue,
  validateConfigFileName,
} from './utils';
