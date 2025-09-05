import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { CompiledDoc, DestinationPlugin, Logger, JSONSchema7 } from '../interfaces';

/**
 * Roo Code (Codeium) destination plugin.
 * 
 * Generates rules in .roo/rules/ directory structure.
 * Also supports mode-specific rules in .roo/rules-{modeSlug}/ directories.
 * 
 * Features:
 * - Recursive file reading in alphabetical order
 * - Support for both workspace-wide and mode-specific rules
 * - Also supports AGENTS.md standard
 * 
 * Released: v3.11.9 (April 2025)
 */
export class RooCodePlugin implements DestinationPlugin {
  id = 'roo-code';
  description = 'Rules for Roo Code (Codeium) - uses .roo/rules/ directory with mode-specific support';

  get name(): string {
    return 'Roo Code';
  }

  configSchema(): JSONSchema7 {
    return {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description: 'Output path (.roo/rules/ or .roo/rules-{mode}/)'
        },
        mode: {
          type: 'string',
          description: 'Mode slug for mode-specific rules (e.g., "dev", "test")'
        },
        supportsAgentsMd: {
          type: 'boolean',
          default: true,
          description: 'Also generate AGENTS.md for Roo Code compatibility'
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

      // Write content (no XML tags for Roo Code)
      const content = compiled.output.content;
      
      await fs.writeFile(destPath, content, 'utf-8');
      
      logger.info(`Writing Roo Code rules to: ${destPath}`);
      logger.info(`Successfully wrote Roo Code rules to: ${path.resolve(destPath)}`);
    } catch (error) {
      logger.error(`Failed to write Roo Code rules to: ${destPath}`, error);
      throw error;
    }
  }
}