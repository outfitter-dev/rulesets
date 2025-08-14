// TLDR: Defines the DestinationPlugin interface for Rulesets (mixd-v0)
// TLDR: v0.1.0 Basic plugin contract for writing compiled rules to destinations
import type { JSONSchema7 } from 'json-schema';
import type { CompiledDoc } from './compiled-doc';
import type { Logger } from './logger';

export type { JSONSchema7 }; // Re-export for convenience

/**
 * Result of a write operation, including generated file paths for gitignore management
 */
export interface WriteResult {
  /** File paths that were generated during the write operation */
  readonly generatedPaths: readonly string[];
  /** Additional metadata about the write operation */
  readonly metadata: Record<string, unknown>;
}

/**
 * Enhanced destination plugin interface with optional write result support
 * Maintains backward compatibility while enabling gitignore management
 */
export interface DestinationPlugin {
  /**
   * Canonical ID for the destination plugin.
   * Should be unique, kebab-case. e.g., "cursor", "windsurf".
   * // TLDR: Returns the canonical name of the plugin (mixd-v0)
   * // TLDR: v0.1.0 Used for plugin registration and identification
   */
  get name(): string;

  /**
   * Returns a JSON schema describing the configuration options specific to this plugin.
   * This schema is used for validating plugin configuration.
   * // TLDR: Provides a JSON schema for the plugin's configuration (mixd-v0)
   * // TLDR: v0.1.0 Enables validation of destination-specific settings
   */
  configSchema(): JSONSchema7;

  /**
   * Writes the compiled document to the destination.
   * This method is responsible for handling file I/O and any final transformations
   * specific to the destination's format or requirements.
   * // TLDR: Writes the compiled document to the target destination (mixd-v0)
   * // TLDR: v0.1.0 Basic file writing without destination-specific transformations
   * // TODO(v0.2.0): Added optional WriteResult return for gitignore management
   *
   * @param ctx - The context object for the write operation.
   * @param ctx.compiled - The compiled document to write.
   * @param ctx.destPath - The target file path or directory for the output.
   *                       Plugins should resolve this path appropriately.
   * @param ctx.config - The validated plugin-specific configuration.
   * @param ctx.logger - A logger instance for outputting messages.
   * @returns A promise that resolves when the write operation is complete.
   *          Can optionally return WriteResult with generated file paths.
   */
  write(ctx: {
    compiled: CompiledDoc;
    destPath: string;
    config: Record<string, unknown>; // Validated via schema from configSchema()
    logger: Logger;
  }): Promise<undefined | WriteResult>;
}

/**
 * Type guard to check if a write result contains generated paths
 * Supports both the new WriteResult and legacy void returns
 */
export function hasGeneratedPaths(result: unknown): result is WriteResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'generatedPaths' in result &&
    Array.isArray((result as any).generatedPaths)
  );
}
