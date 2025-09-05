import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { CompiledDoc, DestinationPlugin, Logger, JSONSchema7 } from '../interfaces';

/**
 * Cline VSCode extension destination plugin.
 * 
 * Generates .clinerules files or .clinerules/ directory structure.
 * 
 * Features:
 * - Version-controlled rules as code
 * - AI-editable instructions
 * - Multiple file organization support
 * 
 * Note: Cline deprecated the old Custom Instructions text box (June 2025)
 * in favor of this file-based system.
 */
export class ClinePlugin implements DestinationPlugin {
  id = 'cline';
  description = 'Rules for Cline VSCode extension - supports .clinerules file or .clinerules/ directory';

  get name(): string {
    return 'Cline';
  }

  configSchema(): JSONSchema7 {
    return {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description: 'Output path (.clinerules file or .clinerules/ directory)'
        },
        useDirectory: {
          type: 'boolean',
          default: false,
          description: 'Use .clinerules/ directory for multiple rule files'
        },
        useAgentsDir: {
          type: 'boolean',
          description: 'Use .agents/rules/ directory instead of .ruleset/'
        }
      },
      additionalProperties: false
    };
  }

  async write(options: {
    compiled: CompiledDoc;
    destPath: string;
    config: Record<string, unknown>;
    logger: Logger;
  }): Promise<void> {
    const { compiled, destPath, logger } = options;

    try {
      // Ensure the destination directory exists
      const destDir = path.dirname(destPath);
      await fs.mkdir(destDir, { recursive: true });

      // Write content (no XML tags for Cline)
      const content = compiled.output.content;
      
      await fs.writeFile(destPath, content, 'utf-8');
      
      logger.info(`Writing Cline rules to: ${destPath}`);
      logger.info(`Successfully wrote Cline rules to: ${path.resolve(destPath)}`);
    } catch (error) {
      logger.error(`Failed to write Cline rules to: ${destPath}`, error);
      throw error;
    }
  }
}