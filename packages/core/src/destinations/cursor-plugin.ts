// :M: tldr: Cursor destination plugin implementation
// :M: v0.1.0: Stub implementation that writes raw content to .cursor/rules/
import { promises as fs } from 'fs';
import path from 'path';
import type { DestinationPlugin, CompiledDoc, Logger, JSONSchema7 } from '../interfaces';

export class CursorPlugin implements DestinationPlugin {
  // :M: tldr: Returns the canonical name for Cursor destination
  // :M: v0.1.0: Static identifier for plugin registration
  get name(): string {
    return 'cursor';
  }

  // :M: tldr: Provides configuration schema for Cursor plugin
  // :M: v0.1.0: Basic schema with outputPath and priority options
  configSchema(): JSONSchema7 {
    return {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description: 'Path where the compiled rules file should be written',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Priority level for the rules',
        },
      },
      additionalProperties: true,
    };
  }

  // :M: tldr: Writes compiled document to Cursor rules directory
  // :M: v0.1.0: Basic file writing without Cursor-specific transformations
  // :M: todo(v0.2.0): Add Cursor-specific formatting and transformations
  async write(ctx: {
    compiled: CompiledDoc;
    destPath: string;
    config: Record<string, any>;
    logger: Logger;
  }): Promise<void> {
    const { compiled, destPath, config, logger } = ctx;

    logger.info(`Writing Cursor rules to: ${destPath}`);

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
      logger.info(`Successfully wrote Cursor rules to: ${resolvedPath}`);
      
      // Log additional context for debugging
      logger.debug(`Destination: ${compiled.context.destinationId}`);
      logger.debug(`Config: ${JSON.stringify(config)}`);
      if (compiled.output.metadata?.priority) {
        logger.debug(`Priority: ${compiled.output.metadata.priority}`);
      }
    } catch (error) {
      logger.error(`Failed to write file: ${resolvedPath}`, error);
      throw error;
    }
  }
}