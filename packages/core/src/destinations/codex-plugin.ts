import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { CompiledDoc, DestinationPlugin, Logger, JSONSchema7 } from '../interfaces';

/**
 * OpenAI Codex CLI destination plugin.
 * Uses AGENTS.md as the primary format (following OpenAI's standard).
 */
export class CodexPlugin implements DestinationPlugin {
  id = 'codex';
  description = 'Rules for OpenAI Codex CLI - uses AGENTS.md format';

  get name(): string {
    return 'OpenAI Codex';
  }

  configSchema(): JSONSchema7 {
    return {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description: 'Output file path for Codex rules (defaults to AGENTS.md)'
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
      // Codex uses AGENTS.md as standard
      const actualPath = destPath.includes('AGENTS.md') 
        ? destPath 
        : 'AGENTS.md';

      // Ensure the destination directory exists
      const destDir = path.dirname(actualPath);
      await fs.mkdir(destDir, { recursive: true });

      // Write content (no XML tags for Codex)
      const content = compiled.output.content;
      
      await fs.writeFile(actualPath, content, 'utf-8');
      
      logger.info(`Writing Codex rules to: ${actualPath}`);
      logger.info(`Successfully wrote Codex rules to: ${path.resolve(actualPath)}`);
    } catch (error) {
      logger.error(`Failed to write Codex rules to: ${destPath}`, error);
      throw error;
    }
  }
}