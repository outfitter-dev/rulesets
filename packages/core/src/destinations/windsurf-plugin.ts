// :M: tldr: Windsurf destination plugin implementation
// :M: v0.1.0: Stub implementation that writes raw content to .windsurf/rules/

import type {
  CompiledDoc,
  DestinationPlugin,
  JSONSchema7,
  Logger,
} from '@rulesets/types';
import { promises as fs } from 'fs';
import * as path from 'path';

export class WindsurfPlugin implements DestinationPlugin {
  // :M: tldr: Returns the canonical name for Windsurf destination
  // :M: v0.1.0: Static identifier for plugin registration
  get name(): string {
    return 'windsurf';
  }

  // :M: tldr: Provides configuration schema for Windsurf plugin
  // :M: v0.1.0: Basic schema with outputPath and format options
  configSchema(): JSONSchema7 {
    return {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description: 'Path where the compiled rules file should be written',
        },
        format: {
          type: 'string',
          enum: ['markdown', 'xml'],
          default: 'markdown',
          description: 'Output format for Windsurf rules',
        },
      },
      additionalProperties: true,
    };
  }

  // :M: tldr: Writes compiled document to Windsurf rules directory
  // :M: v0.1.0: Basic file writing with security validation
  // :M: todo(v0.2.0): Add Windsurf-specific formatting and transformations
  async write(ctx: {
    compiled: CompiledDoc;
    destPath: string;
    config: Record<string, unknown>;
    logger: Logger;
  }): Promise<void> {
    const { compiled, destPath, config, logger } = ctx;

    // Determine the output path with security validation
    const outputPath =
      (typeof config.outputPath === 'string' ? config.outputPath : undefined) ||
      destPath;

    // Security: Validate and sanitize the path to prevent directory traversal
    const resolvedPath = this.sanitizePath(outputPath, process.cwd());

    logger.info(`Writing Windsurf rules to: ${resolvedPath}`);

    // Ensure directory exists
    const dir = path.dirname(resolvedPath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      logger.error(`Failed to create directory: ${dir}`, error);
      throw error;
    }

    // Security: Check file size before writing
    const content = compiled.output.content;
    if (content.length > 10 * 1024 * 1024) {
      // 10MB limit
      throw new Error(`File too large: ${content.length} bytes (max 10MB)`);
    }

    // For v0, write the raw content
    try {
      await fs.writeFile(resolvedPath, content, {
        encoding: 'utf8',
      });
      logger.info(`Successfully wrote Windsurf rules to: ${resolvedPath}`);

      // Log additional context for debugging
      logger.debug(`Destination: ${compiled.context.destinationId}`);
      logger.debug(`Config: ${JSON.stringify(config)}`);
      logger.debug(`Format: ${config.format || 'markdown'}`);
    } catch (error) {
      logger.error(`Failed to write file: ${resolvedPath}`, error);
      throw error;
    }
  }

  // Security: Sanitize file paths to prevent directory traversal attacks
  private sanitizePath(userPath: string, baseDir: string): string {
    // Resolve and normalize the path
    const resolved = path.isAbsolute(userPath)
      ? path.resolve(userPath)
      : path.resolve(baseDir, userPath);

    // Normalize to handle . and .. segments
    const normalized = path.normalize(resolved);

    // Ensure the resolved path is within the base directory or its subdirectories
    const baseDirResolved = path.resolve(baseDir);
    if (
      !normalized.startsWith(baseDirResolved + path.sep) &&
      normalized !== baseDirResolved
    ) {
      throw new Error(
        `Path traversal detected: ${userPath} resolves outside base directory`
      );
    }

    return normalized;
  }
}
