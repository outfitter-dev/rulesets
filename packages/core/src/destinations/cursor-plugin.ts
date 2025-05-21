// TLDR: Stub implementation of the Cursor destination plugin (mixd-v0)
// TODO (mixd-v0.1): Implement full Cursor-specific formatting

import fs from 'fs/promises';
import path from 'path';
import { DestinationPlugin, JSONSchema7 } from '../interfaces/destination-plugin';
import { CompiledDoc } from '../interfaces/compiled-doc';
import { Logger } from '../interfaces/logger';

/**
 * A plugin for the Cursor destination
 * TLDR: Stub implementation that writes compiled content to the Cursor destination (mixd-v0)
 */
export class CursorPlugin implements DestinationPlugin {
  // TLDR: Returns the canonical name of the plugin (mixd-v0)
  get name(): string {
    return 'cursor';
  }

  // TLDR: Returns a JSON schema for validating Cursor plugin configuration (mixd-v0)
  configSchema(): JSONSchema7 {
    return {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description: 'The path where the compiled rules should be written',
        },
      },
      required: ['outputPath'],
    };
  }

  /**
   * Write the compiled document to the Cursor destination
   * TLDR: Writes the compiled document to the specified destination path (mixd-v0)
   * 
   * @param ctx - The context object for the write operation
   * @returns A promise that resolves when the write operation is complete
   */
  async write(ctx: {
    compiled: CompiledDoc;
    destPath: string;
    config: Record<string, any>;
    logger: Logger;
  }): Promise<void> {
    const { compiled, destPath, config, logger } = ctx;
    
    try {
      // Ensure the output directory exists
      const outputDir = path.dirname(destPath);
      await fs.mkdir(outputDir, { recursive: true });
      
      // For v0, we're just writing the raw content
      await fs.writeFile(destPath, compiled.output.content, 'utf8');
      
      logger.info(`[Cursor] Successfully wrote compiled rules to ${destPath}`);
    } catch (error) {
      logger.error(`[Cursor] Failed to write compiled rules: ${(error as Error).message}`);
      throw error;
    }
  }
}