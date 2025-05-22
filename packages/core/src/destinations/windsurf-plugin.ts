// TLDR: Stub implementation of Windsurf destination plugin (mixd-v0)
import { promises as fs } from 'fs';
import path from 'path';
import type { DestinationPlugin, CompiledDoc, Logger, JSONSchema7 } from '../interfaces';

export class WindsurfPlugin implements DestinationPlugin {
  // TLDR: Returns the canonical name for Windsurf destination (mixd-v0)
  get name(): string {
    return 'windsurf';
  }

  // TLDR: Provides configuration schema for Windsurf plugin (mixd-v0)
  configSchema(): JSONSchema7 {
    return {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description: 'Path where the compiled rules file should be written',
        },
        format: {
          type: 'string',
          enum: ['markdown', 'xml'],
          default: 'markdown',
          description: 'Output format for Windsurf rules',
        },
      },
      additionalProperties: true,
    };
  }

  // TLDR: Writes compiled document to Windsurf rules directory (mixd-v0)
  // TODO (mixd-v0.1): Add Windsurf-specific formatting and transformations
  async write(ctx: {
    compiled: CompiledDoc;
    destPath: string;
    config: Record<string, any>;
    logger: Logger;
  }): Promise<void> {
    const { compiled, destPath, config, logger } = ctx;

    logger.info(`Writing Windsurf rules to: ${destPath}`);

    // Determine the output path
    const outputPath = config.outputPath || destPath;
    const resolvedPath = path.resolve(outputPath);

    // Ensure directory exists
    const dir = path.dirname(resolvedPath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      logger.error(`Failed to create directory: ${dir}`, error);
      throw error;
    }

    // For v0, write the raw content
    try {
      await fs.writeFile(resolvedPath, compiled.output.content, 'utf-8');
      logger.info(`Successfully wrote Windsurf rules to: ${resolvedPath}`);
      
      // Log additional context for debugging
      logger.debug(`Destination: ${compiled.context.destinationId}`);
      logger.debug(`Config: ${JSON.stringify(config)}`);
      logger.debug(`Format: ${config.format || 'markdown'}`);
    } catch (error) {
      logger.error(`Failed to write file: ${resolvedPath}`, error);
      throw error;
    }
  }
}