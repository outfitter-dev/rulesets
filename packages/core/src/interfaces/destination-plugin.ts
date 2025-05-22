// TLDR: Defines the DestinationPlugin interface for Mixdown. Contract for plugins that write compiled rules to specific destinations (mixd-v0)
import type { JSONSchema7 } from 'json-schema';
import type { CompiledDoc } from './compiled-doc';
import type { Logger } from './logger';

export type { JSONSchema7 }; // Re-export for convenience

export interface DestinationPlugin {
  /**
   * Canonical ID for the destination plugin.
   * Should be unique, kebab-case. e.g., "cursor", "windsurf".
   * TLDR: Returns the canonical name of the plugin (mixd-v0)
   */
  get name(): string;

  /**
   * Returns a JSON schema describing the configuration options specific to this plugin.
   * This schema is used for validating plugin configuration.
   * TLDR: Provides a JSON schema for the plugin's configuration (mixd-v0)
   */
  configSchema(): JSONSchema7;

  /**
   * Writes the compiled document to the destination.
   * This method is responsible for handling file I/O and any final transformations
   * specific to the destination's format or requirements.
   * TLDR: Writes the compiled document to the target destination (mixd-v0)
   *
   * @param ctx - The context object for the write operation.
   * @param ctx.compiled - The compiled document to write.
   * @param ctx.destPath - The target file path or directory for the output.
   *                       Plugins should resolve this path appropriately.
   * @param ctx.config - The validated plugin-specific configuration.
   * @param ctx.logger - A logger instance for outputting messages.
   * @returns A promise that resolves when the write operation is complete.
   */
  write(ctx: {
    compiled: CompiledDoc;
    destPath: string;
    config: Record<string, any>; // Validated via schema from configSchema()
    logger: Logger;
  }): Promise<void>;
}