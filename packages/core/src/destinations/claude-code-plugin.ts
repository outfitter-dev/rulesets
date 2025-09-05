import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { CompiledDoc, DestinationPlugin, Logger, JSONSchema7 } from '../interfaces';

/**
 * Claude Code destination plugin.
 * 
 * Supports:
 * - CLAUDE.md files (project or global)
 * - Slash commands (.claude/commands/*.md)
 * - Frontmatter for slash command configuration
 * 
 * Slash command features:
 * - Arguments and interpolation ($ARGUMENTS, $1, $2, etc.)
 * - Bash command integration (! prefix)
 * - File references (@ prefix)
 * - Extended thinking keywords
 */
export class ClaudeCodePlugin implements DestinationPlugin {
  id = 'claude-code';
  description = 'Rules for Claude Code CLI - supports CLAUDE.md and slash commands with frontmatter';

  get name(): string {
    return 'Claude Code';
  }

  configSchema(): JSONSchema7 {
    return {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description: 'Output file path (CLAUDE.md or .claude/commands/*.md)'
        },
        type: {
          type: 'string',
          enum: ['rules', 'command'],
          default: 'rules',
          description: 'Type of Claude Code file (rules or slash command)'
        },
        global: {
          type: 'boolean',
          description: 'Write to global ~/.claude/CLAUDE.md or ~/.claude/commands/'
        },
        commandName: {
          type: 'string',
          description: 'Name for the slash command (without .md extension)'
        },
        commandConfig: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description: 'Command description'
            },
            argumentHint: {
              type: 'string',
              description: 'Hint for command arguments'
            },
            allowedTools: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of allowed tools for this command'
            },
            model: {
              type: 'string',
              description: 'Model to use for this command'
            }
          },
          description: 'Frontmatter configuration for slash commands'
        },
        scope: {
          type: 'string',
          enum: ['project', 'user'],
          default: 'project',
          description: 'Scope for slash commands (project-specific or user-wide)'
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
    const { compiled, destPath, config, logger } = options;

    try {
      const type = config.type as string | undefined;
      const isGlobal = config.global === true;
      const scope = (config.scope as string) || 'project';
      const commandName = config.commandName as string | undefined;
      
      let actualPath: string;
      let content = compiled.output.content;
      
      // Determine the output path based on type and configuration
      if (type === 'command' || destPath.includes('.claude/commands/')) {
        // Slash command - goes in .claude/commands/
        const cmdName = commandName || path.basename(destPath, path.extname(destPath));
        
        let commandDir: string;
        if (isGlobal || scope === 'user') {
          // User-scoped commands: ~/.claude/commands/
          commandDir = path.join(process.env.HOME || '', '.claude/commands');
        } else {
          // Project-scoped commands: .claude/commands/
          commandDir = '.claude/commands';
        }
        
        actualPath = path.join(commandDir, `${cmdName}.md`);
        
        // Add frontmatter for slash commands if provided
        if (config.commandConfig) {
          const frontmatter = this.generateCommandFrontmatter(config.commandConfig);
          content = frontmatter + content;
        }
        
        logger.info(`Writing Claude Code slash command: /${cmdName} (${scope} scope)`);
      } else if (isGlobal) {
        // Global CLAUDE.md
        actualPath = path.join(process.env.HOME || '', '.claude/CLAUDE.md');
        logger.info('Writing global Claude Code rules');
      } else {
        // Project-specific CLAUDE.md
        actualPath = destPath.includes('CLAUDE.md')
          ? destPath
          : 'CLAUDE.md';
        logger.info('Writing project Claude Code rules');
      }

      // Ensure the destination directory exists
      const destDir = path.dirname(actualPath);
      await fs.mkdir(destDir, { recursive: true });
      
      await fs.writeFile(actualPath, content, 'utf-8');
      
      logger.info(`Successfully wrote to: ${path.resolve(actualPath)}`);
    } catch (error) {
      logger.error(`Failed to write Claude Code rules to: ${destPath}`, error);
      throw error;
    }
  }
  
  /**
   * Generate frontmatter for slash commands.
   * Supports: allowed-tools, argument-hint, description, model
   */
  private generateCommandFrontmatter(config: any): string {
    const parts: string[] = ['---'];
    
    if (config.description) {
      parts.push(`description: "${config.description}"`);
    }
    
    if (config.argumentHint) {
      parts.push(`argument-hint: "${config.argumentHint}"`);
    }
    
    if (config.allowedTools && Array.isArray(config.allowedTools)) {
      parts.push(`allowed-tools: [${config.allowedTools.map((t: string) => `"${t}"`).join(', ')}]`);
    }
    
    if (config.model) {
      parts.push(`model: "${config.model}"`);
    }
    
    parts.push('---', '', '');
    return parts.join('\n');
  }
}