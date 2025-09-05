import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { CompiledDoc, DestinationPlugin, Logger, JSONSchema7 } from '../interfaces';

/**
 * GitHub Copilot destination plugin.
 * 
 * Primary format: .github/copilot-instructions.md
 * Extended format: .github/instructions/*.instructions.md (with YAML frontmatter)
 * 
 * Also supports: AGENTS.md, CLAUDE.md, GEMINI.md
 * 
 * Features:
 * - Repository-level configuration
 * - YAML frontmatter for file/directory scoping
 * - Code review integration (GA August 2025)
 * - Support across VSCode, JetBrains, Xcode, Eclipse, and GitHub.com
 */
export class GitHubCopilotPlugin implements DestinationPlugin {
  id = 'github-copilot';
  description = 'Rules for GitHub Copilot - supports .github/copilot-instructions.md and .github/instructions/*.instructions.md';

  get name(): string {
    return 'GitHub Copilot';
  }

  configSchema(): JSONSchema7 {
    return {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description: 'Output path (.github/copilot-instructions.md or .github/instructions/*.instructions.md)'
        },
        useExtended: {
          type: 'boolean',
          default: false,
          description: 'Use extended format in .github/instructions/ directory'
        },
        scopePaths: {
          type: 'array',
          items: { type: 'string' },
          description: 'File/directory paths this instruction applies to (extended format only)'
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

    const useExtended = (options.config as any).useExtended === true;
    const scopePaths = (options.config as any).scopePaths as string[] | undefined;
    
    try {
      let actualPath: string;
      let content = compiled.output.content;
      
      if (useExtended) {
        // Extended format: .github/instructions/*.instructions.md
        const fileName = path.basename(destPath, path.extname(destPath));
        actualPath = destPath.includes('.github/instructions/')
          ? destPath
          : `.github/instructions/${fileName}.instructions.md`;
          
        // Add YAML frontmatter if scope paths are provided
        if (scopePaths && scopePaths.length > 0) {
          const frontmatter = [
            '---',
            `paths:`,
            ...scopePaths.map(p => `  - "${p}"`),
            '---',
            '',
          ].join('\n');
          content = frontmatter + content;
        }
      } else {
        // Default to .github/copilot-instructions.md
        actualPath = destPath.includes('.github/')
          ? destPath
          : '.github/copilot-instructions.md';
      }

      // Ensure the destination directory exists
      const destDir = path.dirname(actualPath);
      await fs.mkdir(destDir, { recursive: true });
      
      await fs.writeFile(actualPath, content, 'utf-8');
      
      logger.info(`Writing GitHub Copilot instructions to: ${actualPath}`);
      logger.info(`Successfully wrote GitHub Copilot instructions to: ${path.resolve(actualPath)}`);
    } catch (error) {
      logger.error(`Failed to write GitHub Copilot instructions to: ${destPath}`, error);
      throw error;
    }
  }
}