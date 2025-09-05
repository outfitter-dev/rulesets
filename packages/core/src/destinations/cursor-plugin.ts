import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  CompiledDoc,
  DestinationPlugin,
  JSONSchema7,
  Logger,
} from '../interfaces';

/**
 * Cursor IDE destination plugin.
 * 
 * Supports both legacy and new formats:
 * - Legacy: .cursorrules (deprecated but still supported)
 * - New: .cursor/rules/*.mdc (recommended, with path scoping)
 * 
 * Note: New rules currently only active in Agent mode.
 * Migration to new format is recommended but not required.
 */
export class CursorPlugin implements DestinationPlugin {
  description = 'Rules for Cursor IDE - supports both .cursorrules and .cursor/rules/ formats';
  
  get name(): string {
    return 'cursor';
  }

  configSchema(): JSONSchema7 {
    return {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description: 'Path where the compiled rules file should be written (.cursorrules or .cursor/rules/*.mdc)',
        },
        format: {
          type: 'string',
          enum: ['legacy', 'new'],
          default: 'new',
          description: 'Use legacy (.cursorrules) or new (.cursor/rules/) format'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Priority level for the rules',
        },
        globs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Path patterns for scoped rules (new format only)'
        },
        alwaysApply: {
          type: 'boolean',
          description: 'Always include this rule (new format only)'
        }
      },
      additionalProperties: true,
    };
  }

  async write(ctx: {
    compiled: CompiledDoc;
    destPath: string;
    config: Record<string, unknown>;
    logger: Logger;
  }): Promise<void> {
    const { compiled, destPath, config, logger } = ctx;

    logger.info(`Writing Cursor rules to: ${destPath}`);

    // Determine the format and output path
    const format = (config as { format?: string })?.format || 'new';
    const rawOutputPath = (config as { outputPath?: unknown })?.outputPath;
    
    let outputPath: string;
    if (typeof rawOutputPath === 'string' && rawOutputPath.trim().length > 0) {
      outputPath = rawOutputPath;
    } else if (format === 'legacy') {
      outputPath = '.cursorrules';
    } else {
      // New format: use .cursor/rules/ directory
      const fileName = path.basename(destPath, path.extname(destPath));
      outputPath = `.cursor/rules/${fileName}.mdc`;
    }
    
    const resolvedPath = path.isAbsolute(outputPath)
      ? outputPath
      : path.resolve(outputPath);

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
      await fs.writeFile(resolvedPath, compiled.output.content, {
        encoding: 'utf8',
      });
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
