/**
 * GitignoreManager - Automatic .gitignore management for Rulesets
 * Handles automatic gitignore updates with override mechanisms and configuration support
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type {
  GitignoreConfig,
  GitignoreOverrides,
  GitignoreResult,
  GitignoreManager as IGitignoreManager,
  ManagedBlockConfig,
} from './types';
import {
  DEFAULT_MANAGED_BLOCK_CONFIG,
  matchesAnyPattern,
  normalizeGitignorePath,
  parseGitignoreContent,
  parseOverrideFile,
  rebuildGitignoreContent,
  sortAndDedupePaths,
} from './utils';

/**
 * Default configuration for GitignoreManager
 */
const DEFAULT_CONFIG: GitignoreConfig = {
  enabled: true,
  commentPrefix: 'Rulesets',
  alwaysIgnore: [],
  alwaysKeep: [],
};

/**
 * Main GitignoreManager implementation
 * Provides automatic .gitignore management with override mechanisms
 */
export class GitignoreManager implements IGitignoreManager {
  private readonly config: GitignoreConfig;
  private readonly managedBlockConfig: ManagedBlockConfig;
  private readonly basePath: string;
  private cachedOverrides: GitignoreOverrides | null = null;

  constructor(
    config: Partial<GitignoreConfig> = {},
    basePath: string = process.cwd()
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.basePath = path.resolve(basePath);

    // Create managed block config with custom prefix if provided
    this.managedBlockConfig = {
      ...DEFAULT_MANAGED_BLOCK_CONFIG,
      startComment: `# START ${this.config.commentPrefix || 'Rulesets'} Generated Files`,
      endComment: `# END ${this.config.commentPrefix || 'Rulesets'} Generated Files`,
    };
  }

  /**
   * Check if gitignore management is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Update .gitignore with generated file paths
   */
  async updateGitignore(
    generatedPaths: readonly string[]
  ): Promise<GitignoreResult> {
    if (!this.isEnabled()) {
      return {
        success: true,
        added: [],
        kept: [],
        messages: ['GitignoreManager is disabled'],
      };
    }

    try {
      // Read current overrides
      await this.readOverrides();

      // Normalize and filter paths
      const normalizedPaths = generatedPaths.map((p) =>
        normalizeGitignorePath(p, this.basePath)
      );
      const pathsToAdd: string[] = [];
      const pathsToKeep: string[] = [];

      for (const filePath of normalizedPaths) {
        if (this.shouldIgnore(filePath)) {
          pathsToAdd.push(filePath);
        } else {
          pathsToKeep.push(filePath);
        }
      }

      // Read current .gitignore
      const gitignorePath = path.join(this.basePath, '.gitignore');
      const currentContent = await this.readGitignoreFile(gitignorePath);

      // Parse current content
      const state = parseGitignoreContent(
        currentContent,
        this.managedBlockConfig
      );

      // Combine existing managed paths with new paths
      const allManagedPaths = sortAndDedupePaths([
        ...state.managedPaths,
        ...pathsToAdd,
      ]);

      // Generate new content
      const newContent = rebuildGitignoreContent(
        state,
        allManagedPaths,
        this.managedBlockConfig
      );

      // Write only if content changed
      if (newContent !== currentContent) {
        await fs.writeFile(gitignorePath, newContent, 'utf8');
      }

      const messages: string[] = [];
      if (pathsToKeep.length > 0) {
        messages.push(`Kept ${pathsToKeep.length} files due to override rules`);
      }
      if (pathsToAdd.length > 0) {
        messages.push(`Added ${pathsToAdd.length} files to .gitignore`);
      }

      return {
        success: true,
        added: pathsToAdd,
        kept: pathsToKeep,
        messages,
      };
    } catch (error) {
      return {
        success: false,
        added: [],
        kept: [],
        messages: [
          `Failed to update .gitignore: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      };
    }
  }

  /**
   * Read override files and configuration
   */
  async readOverrides(): Promise<GitignoreOverrides> {
    if (this.cachedOverrides) {
      return this.cachedOverrides;
    }

    const keep: string[] = [];
    const ignore: string[] = [];
    const config: string[] = [];

    try {
      // Read .rulesetkeep file
      const keepContent = await this.readOverrideFile('.rulesetkeep');
      if (keepContent) {
        keep.push(...parseOverrideFile(keepContent));
      }
    } catch {
      // File doesn't exist or can't be read - that's OK
    }

    try {
      // Read .rulesetignore file
      const ignoreContent = await this.readOverrideFile('.rulesetignore');
      if (ignoreContent) {
        ignore.push(...parseOverrideFile(ignoreContent));
      }
    } catch {
      // File doesn't exist or can't be read - that's OK
    }

    // Add configuration-based overrides
    if (this.config.alwaysKeep) {
      keep.push(
        ...this.config.alwaysKeep.map((p) =>
          normalizeGitignorePath(p, this.basePath)
        )
      );
    }
    if (this.config.alwaysIgnore) {
      config.push(
        ...this.config.alwaysIgnore.map((p) =>
          normalizeGitignorePath(p, this.basePath)
        )
      );
    }

    this.cachedOverrides = {
      keep: sortAndDedupePaths(keep),
      ignore: sortAndDedupePaths(ignore),
      config: sortAndDedupePaths(config),
    };

    return this.cachedOverrides;
  }

  /**
   * Determine if a path should be ignored based on all rules
   */
  shouldIgnore(filePath: string): boolean {
    if (!this.isEnabled()) {
      return false;
    }

    const normalizedPath = normalizeGitignorePath(filePath, this.basePath);

    // Get overrides (use cached if available)
    const overrides = this.cachedOverrides || {
      keep: [],
      ignore: [],
      config: [],
    };

    // Check if path should be kept (highest priority)
    if (matchesAnyPattern(normalizedPath, overrides.keep)) {
      return false;
    }

    // Check if path should be ignored by configuration or override files
    if (
      matchesAnyPattern(normalizedPath, overrides.ignore) ||
      matchesAnyPattern(normalizedPath, overrides.config)
    ) {
      return true;
    }

    // Default: ignore generated files (paths passed to updateGitignore are considered generated)
    return true;
  }

  /**
   * Clear cached overrides (useful for testing or when files change)
   */
  clearCache(): void {
    this.cachedOverrides = null;
  }

  /**
   * Read a .gitignore file, creating it if it doesn't exist
   */
  private async readGitignoreFile(gitignorePath: string): Promise<string> {
    try {
      return await fs.readFile(gitignorePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Create empty .gitignore if it doesn't exist
        await fs.writeFile(gitignorePath, '', 'utf8');
        return '';
      }
      throw error;
    }
  }

  /**
   * Read an override file (.rulesetkeep or .rulesetignore)
   */
  private async readOverrideFile(filename: string): Promise<string | null> {
    const filePath = path.join(this.basePath, filename);
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null; // File doesn't exist
      }
      throw error; // Other errors should be propagated
    }
  }
}

/**
 * Create a GitignoreManager instance with default configuration
 * @param config - Optional configuration overrides
 * @param basePath - Optional base path (defaults to process.cwd())
 * @returns GitignoreManager instance
 */
export function createGitignoreManager(
  config: Partial<GitignoreConfig> = {},
  basePath?: string
): GitignoreManager {
  return new GitignoreManager(config, basePath);
}
