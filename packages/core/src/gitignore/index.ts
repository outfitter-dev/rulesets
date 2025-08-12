/**
 * GitignoreManager module exports
 * Provides automatic .gitignore management for Rulesets with override mechanisms
 */

export { GitignoreManager, createGitignoreManager } from './GitignoreManager';
export type {
  GitignoreManager as IGitignoreManager,
  GitignoreConfig,
  GitignoreOverrides,
  GitignoreResult,
  GitignoreState,
  ManagedBlockConfig,
} from './types';
export {
  DEFAULT_MANAGED_BLOCK_CONFIG,
  normalizeGitignorePath,
  matchesAnyPattern,
  matchesPattern,
  parseOverrideFile,
  parseGitignoreContent,
  generateManagedBlock,
  rebuildGitignoreContent,
  sortAndDedupePaths,
} from './utils';