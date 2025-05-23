// TLDR: Stub implementation of the Windsurf destination plugin (mixd-v0)
// TODO (mixd-v0.1): Implement full Windsurf-specific formatting

import fs from 'fs/promises';
import path from 'path';
import { DestinationPlugin, JSONSchema7 } from '../interfaces/destination-plugin';
import { CompiledDoc } from '../interfaces/compiled-doc';
import { Logger } from '../interfaces/logger';

/**
 * A plugin for the Windsurf destination
 * TLDR: Stub implementation that writes compiled content to the Windsurf destination (mixd-v0)
 */
export class WindsurfPlugin implements DestinationPlugin {
  // TLDR: Returns the canonical name of the plugin (mixd-v0)
  get name(): string {
    return 'windsurf';
  }

  // TLDR: Returns a JSON schema for validating Windsurf plugin configuration (mixd-v0)
  configSchema(): JSONSchema7 {
    return {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description: 'The path where the compiled rules should be written',
        },
        trigger: {
          type: 'string',
          enum: ['always_on', 'glob', 'model_decision', 'manual'],
          description: 'The activation trigger type for this rule',
        },
      },
      required: ['outputPath'],
    };
  }

  /**
   * Write the compiled document to the Windsurf destination
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
      
      logger.info(`[Windsurf] Successfully wrote compiled rules to ${destPath}`);
    } catch (error) {
      logger.error(`[Windsurf] Failed to write compiled rules: ${(error as Error).message}`);
      throw error;
    }
  }
}