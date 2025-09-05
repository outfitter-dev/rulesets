import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  CompiledDoc,
  DestinationPlugin,
  JSONSchema7,
  Logger,
} from '../interfaces';

/**
 * Windsurf IDE destination plugin.
 * 
 * Generates rules for .windsurf/rules/ directory.
 * 
 * Character Limits:
 * - Individual files: 6,000 characters max
 * - Total (global + local): 12,000 characters max
 * 
 * Activation modes: Manual, Always On, Model Decision
 */
export class WindsurfPlugin implements DestinationPlugin {
  description = 'Rules for Windsurf IDE - supports .windsurf/rules/ directory with 6k char/file limit';
  
  // Character limits for Windsurf
  private readonly MAX_FILE_CHARS = 6000;
  private readonly MAX_TOTAL_CHARS = 12000;
  
  get name(): string {
    return 'windsurf';
  }

  configSchema(): JSONSchema7 {
    return {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description: 'Path where the compiled rules file should be written (.windsurf/rules/)',
        },
        format: {
          type: 'string',
          enum: ['markdown', 'xml'],
          default: 'markdown',
          description: 'Output format for Windsurf rules',
        },
        activationMode: {
          type: 'string',
          enum: ['manual', 'always', 'model-decision'],
          default: 'always',
          description: 'How the rule should be activated in Windsurf'
        },
        splitLargeFiles: {
          type: 'boolean',
          default: true,
          description: 'Automatically split content exceeding 6k chars into multiple files'
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

    // Determine the output path with local type-narrowing
    type WindsurfConfig = {
      outputPath?: string;
      format?: 'markdown' | 'xml' | string;
    };
    const cfg = config as WindsurfConfig;
    const outputPath =
      typeof cfg.outputPath === 'string' && cfg.outputPath.trim() !== ''
        ? cfg.outputPath
        : destPath;
    let resolvedPath = path.resolve(outputPath);

    // Check if destPath is a directory and append default filename
    try {
      const stats = await fs.stat(resolvedPath);
      if (stats.isDirectory()) {
        resolvedPath = path.join(resolvedPath, 'rules.md');
        logger.debug(`Directory detected, using filename: ${resolvedPath}`);
      }
    } catch {
      // File/directory doesn't exist yet - check if path looks like a directory
      if (outputPath.endsWith('/') || outputPath.endsWith(path.sep)) {
        resolvedPath = path.join(resolvedPath, 'rules.md');
        logger.debug(
          `Directory path detected, using filename: ${resolvedPath}`
        );
      }
    }

    logger.info(`Writing Windsurf rules to: ${resolvedPath}`);

    // Ensure directory exists
    const dir = path.dirname(resolvedPath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      logger.error(`Failed to create directory: ${dir}`, error);
      throw error;
    }

    // Check content length and warn if exceeding limits
    const content = compiled.output.content;
    const contentLength = content.length;
    
    if (contentLength > this.MAX_FILE_CHARS) {
      logger.warn(`Content exceeds Windsurf's 6,000 character limit (${contentLength} chars)`);
      
      const splitLargeFiles = cfg.splitLargeFiles !== false;
      if (splitLargeFiles) {
        // Split content into multiple files
        const chunks = this.splitContent(content, this.MAX_FILE_CHARS);
        for (let i = 0; i < chunks.length; i++) {
          const chunkPath = resolvedPath.replace(/\.md$/, `-part${i + 1}.md`);
          try {
            await fs.writeFile(chunkPath, chunks[i], { encoding: 'utf8' });
            logger.info(`Wrote part ${i + 1}/${chunks.length} to: ${chunkPath}`);
          } catch (error) {
            logger.error(`Failed to write chunk ${i + 1} to: ${chunkPath}`, error);
            throw error;
          }
        }
        logger.info(`Split large content into ${chunks.length} files due to Windsurf's character limit`);
        return;
      } else {
        // Truncate with warning
        const truncated = content.substring(0, this.MAX_FILE_CHARS);
        logger.warn(`Truncating content to 6,000 characters as per Windsurf limits`);
        await fs.writeFile(resolvedPath, truncated, { encoding: 'utf8' });
        logger.info(`Wrote truncated Windsurf rules to: ${resolvedPath}`);
        return;
      }
    }
    
    // Write normal content
    try {
      await fs.writeFile(resolvedPath, content, {
        encoding: 'utf8',
      });
      logger.info(`Successfully wrote Windsurf rules to: ${resolvedPath} (${contentLength} chars)`);

      // Log additional context for debugging
      logger.debug(`Destination: ${compiled.context.destinationId}`);
      logger.debug(`Config: ${JSON.stringify(config)}`);
      logger.debug(
        `Format: ${typeof cfg.format === 'string' ? cfg.format : 'markdown'}`
      );
    } catch (error) {
      logger.error(`Failed to write file: ${resolvedPath}`, error);
      throw error;
    }
  }
  
  /**
   * Split content into chunks that respect Windsurf's character limit.
   * Tries to split at natural boundaries (paragraphs, sentences).
   */
  private splitContent(content: string, maxChars: number): string[] {
    const chunks: string[] = [];
    let remaining = content;
    
    while (remaining.length > 0) {
      if (remaining.length <= maxChars) {
        chunks.push(remaining);
        break;
      }
      
      // Try to find a natural break point
      let splitPoint = maxChars;
      
      // Look for paragraph break
      const paragraphBreak = remaining.lastIndexOf('\n\n', maxChars);
      if (paragraphBreak > maxChars * 0.5) {
        splitPoint = paragraphBreak;
      } else {
        // Look for line break
        const lineBreak = remaining.lastIndexOf('\n', maxChars);
        if (lineBreak > maxChars * 0.7) {
          splitPoint = lineBreak;
        } else {
          // Look for sentence end
          const sentenceEnd = remaining.lastIndexOf('. ', maxChars);
          if (sentenceEnd > maxChars * 0.8) {
            splitPoint = sentenceEnd + 1;
          }
        }
      }
      
      chunks.push(remaining.substring(0, splitPoint).trim());
      remaining = remaining.substring(splitPoint).trim();
    }
    
    return chunks;
  }
}
