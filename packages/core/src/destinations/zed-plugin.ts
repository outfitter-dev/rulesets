import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { CompiledDoc, DestinationPlugin, Logger, JSONSchema7 } from '../interfaces';

/**
 * Zed editor destination plugin.
 * 
 * Generates .rules files for Zed's AI assistant.
 * Uses the Rules Library (replaced Prompt Library).
 * 
 * Limitations:
 * - Currently no granularity (everything in one .rules file)
 * - Rules don't get automatically picked up from library
 * - No @-mentions support yet
 * - Slash commands supported in text threads
 * 
 * Also supports fallback formats like AGENTS.md, CLAUDE.md.
 */
export class ZedPlugin implements DestinationPlugin {
  id = 'zed';
  description = 'Rules for Zed AI assistant - .rules file in project root (single file only)';

  get name(): string {
    return 'Zed Editor';
  }

  configSchema(): JSONSchema7 {
    return {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description: 'Output file path (defaults to .rules in project root)'
        },
        format: {
          type: 'string',
          enum: ['rules', 'agents-md', 'claude-md'],
          default: 'rules',
          description: 'Output format (.rules recommended, AGENTS.md/CLAUDE.md as fallback)'
        },
        useLibrary: {
          type: 'boolean',
          default: false,
          description: 'Add to Rules Library (requires manual selection in Zed)'
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
      // Default to .rules extension if not specified
      const actualPath = destPath.endsWith('.rules') || 
                         destPath.includes('AGENTS.md') || 
                         destPath.includes('CLAUDE.md')
        ? destPath
        : destPath.replace(/\.[^.]+$/, '.rules');

      // Ensure the destination directory exists
      const destDir = path.dirname(actualPath);
      await fs.mkdir(destDir, { recursive: true });

      // Write content (no XML tags for Zed)
      const content = compiled.output.content;
      
      await fs.writeFile(actualPath, content, 'utf-8');
      
      logger.info(`Writing Zed rules to: ${actualPath}`);
      logger.info(`Successfully wrote Zed rules to: ${path.resolve(actualPath)}`);
    } catch (error) {
      logger.error(`Failed to write Zed rules to: ${destPath}`, error);
      throw error;
    }
  }
}