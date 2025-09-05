import type { JSONSchema7 } from 'json-schema';
import type { CompiledDoc } from './compiled-doc';
import type { Logger } from './logger';

export type { JSONSchema7 } from 'json-schema';

export type DestinationPlugin = {
  /**
   * Canonical ID for the destination plugin.
   * Should be unique, kebab-case. e.g., "cursor", "windsurf".
   *
   *
   */
  get name(): string;

  /**
   * Human-readable description of what this destination plugin does.
   * Used in CLI output and documentation.
   */
  description: string;

  /**
   * Returns a JSON schema describing the configuration options specific to this plugin.
   * This schema is used for validating plugin configuration.
   *
   *
   */
  configSchema(): JSONSchema7;

  /**
   * Writes the compiled document to the destination.
   * This method is responsible for handling file I/O and any final transformations
   * specific to the destination's format or requirements.
   *
   *
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
    config: Record<string, unknown>; // Validated via schema from configSchema()
    logger: Logger;
  }): Promise<void>;
};
