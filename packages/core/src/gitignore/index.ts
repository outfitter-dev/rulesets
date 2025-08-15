/**
 * GitignoreManager module exports
 * Provides automatic .gitignore management for Rulesets with override mechanisms
 */

export { createGitignoreManager, GitignoreManager } from './gitignore-manager';
export type {
  GitignoreConfig,
  GitignoreManager as IGitignoreManager,
  GitignoreOverrides,
  GitignoreResult,
  GitignoreState,
  ManagedBlockConfig,
} from './types';
export {
  DEFAULT_MANAGED_BLOCK_CONFIG,
  generateManagedBlock,
  matchesAnyPattern,
  matchesPattern,
  normalizeGitignorePath,
  parseGitignoreContent,
  parseOverrideFile,
  rebuildGitignoreContent,
  sortAndDedupePaths,
} from './utils';
