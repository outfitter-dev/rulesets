// TLDR: Main entry point for Rulesets - clean, simple, Handlebars-powered
// TLDR: Exports for configuration, providers, orchestration, and utilities

// Main orchestration
export { runRulesets } from './orchestration';
export type { RulesetsOptions } from './orchestration';

// Alias for v0 compatibility (mixd-v0)
export { runRulesets as runRulesetsV0 } from './orchestration';

// Re-export from compiler
export { compile } from '@rulesets/compiler';
export type { HandlebarsRulesetCompiler, PartialResolver } from '@rulesets/compiler';

// Re-export from linter  
export type { LinterConfig, LintResult } from '@rulesets/linter';
export { lint } from '@rulesets/linter';

// Re-export from parser
export { parse } from '@rulesets/parser';

// Re-export from types
export type { CompiledDoc, Logger, ParsedDoc } from '@rulesets/types';

// Configuration system
export type {
  ConfigContext,
  ConfigFileResult,
  ConfigLoader as IConfigLoader,
  ConfigLoadOptions,
  ConfigLoadResult,
  ProviderConfig,
  RulesetConfig,
} from './config';

export {
  applyEnvOverrides,
  CONFIG_FILE_NAMES,
  ConfigLoader,
  DEFAULT_CONFIG,
  DEFAULT_LOAD_OPTIONS,
  findConfigFile,
  getConfigLoader,
  KNOWN_PROVIDERS,
  loadConfig,
  mergeConfigs,
  parseConfigContent,
  validateConfig,
} from './config';

// Gitignore management
export type {
  GitignoreConfig,
  GitignoreOverrides,
  GitignoreResult,
  ManagedBlockConfig,
} from './gitignore';

export {
  createGitignoreManager,
  GitignoreManager,
  matchesAnyPattern,
  normalizeGitignorePath,
  parseOverrideFile,
} from './gitignore';

// Logger
export { ConsoleLogger } from './logger';

// Provider system
export {
  AmpProvider,
  ClaudeCodeProvider,
  CodexProvider,  
  CursorProvider,
  claudeCodePlugin as ClaudeCodePlugin,
  cursorPlugin as CursorPlugin,
  destinations,
  getAllProviders,
  getProvider,
  getProviderIds,
  OpenCodeProvider,
  providers,
  WindsurfProvider,
  windsurfPlugin as WindsurfPlugin,
} from './providers';