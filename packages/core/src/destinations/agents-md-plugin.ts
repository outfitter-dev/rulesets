import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { CompiledDoc, DestinationPlugin, Logger, JSONSchema7 } from '../interfaces';

/**
 * AGENTS.md destination plugin.
 * Generates AGENTS.md files - the universal standard for AI agent instructions.
 * 
 * Adopted by 20,000+ GitHub projects as of August 2025.
 * Compatible with 15+ AI coding assistants including:
 * - OpenAI Codex CLI
 * - Claude Code
 * - Cursor
 * - Windsurf
 * - Cline
 * - Roo Code
 * - GitHub Copilot
 * - Zed Editor
 * 
 * Repository: github.com/openai/agents.md
 */
export class AgentsMdPlugin implements DestinationPlugin {
  id = 'agents-md';
  description = 'Universal AI agent instructions standard (20k+ projects) - compatible with OpenAI Codex, Claude Code, Cursor, Windsurf, Cline, Roo Code, and more';

  get name(): string {
    return 'AGENTS.md';
  }

  configSchema(): JSONSchema7 {
    return {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description: 'Output file path for AGENTS.md'
        },
        useAgentsDir: {
          type: 'boolean',
          description: 'Use .agents/rules/ directory instead of .ruleset/'
        },
        globs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Glob patterns for file placement'
        }
      },
      additionalProperties: false
    };
  }

  /**
   * Writes an AGENTS.md file to the specified location.
   * Supports glob-based placement for monorepo configurations.
   */
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

      // Write the compiled content directly (no XML tags for AGENTS.md)
      const content = compiled.output.content;
      
      await fs.writeFile(destPath, content, 'utf-8');
      
      logger.info(`Writing AGENTS.md to: ${destPath}`);
      logger.info(`Successfully wrote AGENTS.md to: ${path.resolve(destPath)}`);
    } catch (error) {
      logger.error(`Failed to write AGENTS.md to: ${destPath}`, error);
      throw error;
    }
  }
}