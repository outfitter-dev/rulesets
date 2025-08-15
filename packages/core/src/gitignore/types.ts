/**
 * Types for GitignoreManager functionality
 * Provides TypeScript interfaces for automatic .gitignore management with override mechanisms
 */

/**
 * Configuration for gitignore management behavior
 */
export interface GitignoreConfig {
  /** Enable automatic .gitignore management */
  readonly enabled: boolean;
  /** Patterns to keep even if they would normally be ignored */
  readonly keep?: readonly string[];
  /** Additional patterns to always ignore */
  readonly ignore?: readonly string[];
  /** Options for managed block behavior */
  readonly options?: {
    /** Header comment text above managed block */
    readonly comment?: string;
    /** Whether to sort entries (default true) */
    readonly sort?: boolean;
  };
}

/**
 * Override configurations from various sources
 */
export interface GitignoreOverrides {
  /** Files to keep in git (from .rulesetkeep) */
  readonly keep: readonly string[];
  /** Additional files to ignore (from .rulesetignore) */
  readonly ignore: readonly string[];
  /** Patterns from configuration */
  readonly config: readonly string[];
}

/**
 * Result of gitignore operations
 */
export interface GitignoreResult {
  /** Whether the operation was successful */
  readonly success: boolean;
  /** Paths that were added to .gitignore */
  readonly added: readonly string[];
  /** Paths that were kept (not ignored) */
  readonly kept: readonly string[];
  /** Any warnings or messages */
  readonly messages: readonly string[];
}

/**
 * Main interface for gitignore management
 */
export interface GitignoreManager {
  /**
   * Update .gitignore with generated file paths
   * @param generatedPaths - Array of generated file paths to potentially ignore
   * @returns Promise resolving to operation result
   */
  updateGitignore(generatedPaths: readonly string[]): Promise<GitignoreResult>;

  /**
   * Read override files and configuration
   * @returns Promise resolving to override configurations
   */
  readOverrides(): Promise<GitignoreOverrides>;

  /**
   * Determine if a path should be ignored based on all rules
   * @param path - File path to check
   * @returns True if the path should be ignored
   */
  shouldIgnore(path: string): boolean;

  /**
   * Check if gitignore management is enabled
   * @returns True if enabled
   */
  isEnabled(): boolean;
}

/**
 * Internal state for gitignore content management
 */
export interface GitignoreState {
  /** Original .gitignore content */
  readonly original: string;
  /** Content before managed block */
  readonly beforeBlock: string;
  /** Content after managed block */
  readonly afterBlock: string;
  /** Paths currently in managed block */
  readonly managedPaths: readonly string[];
  /** Whether managed block exists */
  readonly hasExistingBlock: boolean;
}

/**
 * Configuration for managed gitignore blocks
 */
export interface ManagedBlockConfig {
  /** Start comment for managed block */
  readonly startComment: string;
  /** End comment for managed block */
  readonly endComment: string;
  /** Header text for the block */
  readonly headerText?: string;
}
