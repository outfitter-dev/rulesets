// Provider implementation for Windsurf IDE
// Implements the new Provider interface with branded types and modern architecture

import type {
  CompilationStats,
  CompiledDoc,
  DestinationPlugin,
  JSONSchema7,
  Logger,
  Provider,
  ProviderCapabilities,
  ProviderCompilationContext,
  ProviderCompilationResult,
  ProviderConfig,
  ProviderError,
  ProviderId,
  ProviderWarning,
  Version,
  WriteResult,
} from '@rulesets/types';
import {
  createCompiledContent,
  createOutputPath,
  createProviderId,
  createVersion,
} from '@rulesets/types';
import { promises as fs } from 'fs';
import * as path from 'path';

export class WindsurfProvider implements Provider, DestinationPlugin {
  readonly id: ProviderId = createProviderId('windsurf');
  readonly version: Version = createVersion('1.0.0');
  readonly description = 'Windsurf AI-powered IDE';
  readonly website = 'https://codeium.com/windsurf';
  readonly type = 'ide' as const;

  readonly config: ProviderConfig = {
    outputPath: createOutputPath('.windsurf/rules'),
    format: 'markdown',
    fileNaming: 'transform',
    features: {
      autoFormat: true,
      syntaxHighlighting: true,
      codeCompletion: true,
      errorReporting: true,
    },
  };

  readonly capabilities: ProviderCapabilities = {
    supportsBlocks: true,
    supportsImports: true,
    supportsVariables: true,
    supportsXml: false,
    supportsMarkdown: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFormats: ['markdown'],
    requiresSpecialHandling: [],
  };

  /**
   * Provides configuration schema for Windsurf provider
   * Validates provider-specific settings like outputPath and format
   */
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

  /**
   * Compiles content for Windsurf provider
   * New Provider interface method for modern compilation pipeline
   */
  async compile(
    _context: ProviderCompilationContext
  ): Promise<ProviderCompilationResult> {
    const startTime = Date.now();
    const errors: ProviderError[] = [];
    const warnings: ProviderWarning[] = [];

    try {
      // For v1, we pass through content without transformation
      // TODO: Add Windsurf-specific formatting and transformations in v2
      const content = createCompiledContent('compiled content placeholder');

      const stats: CompilationStats = {
        duration: Date.now() - startTime,
        inputSize: 0, // Would get from context
        outputSize: content.length,
        blocksProcessed: 0,
        importsResolved: 0,
        variablesSubstituted: 0,
      };

      return {
        success: true,
        content,
        errors,
        warnings,
        metadata: {
          provider: this.id,
          format: this.config.format,
        },
        stats,
      };
    } catch (error) {
      errors.push({
        type: 'compilation',
        message:
          error instanceof Error ? error.message : 'Unknown compilation error',
        context: { provider: this.id },
      });

      return {
        success: false,
        errors,
        warnings,
        metadata: {},
        stats: {
          duration: Date.now() - startTime,
          inputSize: 0,
          outputSize: 0,
          blocksProcessed: 0,
          importsResolved: 0,
          variablesSubstituted: 0,
        },
      };
    }
  }

  /**
   * Writes compiled document to Windsurf rules directory
   * Legacy DestinationPlugin interface method for backwards compatibility
   * Returns WriteResult with generated file paths for gitignore management
   */
  async write(ctx: {
    compiled: CompiledDoc;
    destPath: string;
    config: Record<string, unknown>;
    logger: Logger;
  }): Promise<WriteResult> {
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
    if (content.length > (this.capabilities.maxFileSize || 10 * 1024 * 1024)) {
      throw new Error(
        `File too large: ${content.length} bytes (max ${this.capabilities.maxFileSize} bytes)`
      );
    }

    // Write the content
    try {
      await fs.writeFile(resolvedPath, content, {
        encoding: 'utf8',
      });
      logger.info(`Successfully wrote Windsurf rules to: ${resolvedPath}`);

      // Log additional context for debugging
      logger.debug(`Provider: ${this.id}`);
      logger.debug(`Config: ${JSON.stringify(config)}`);
      logger.debug(`Format: ${config.format || 'markdown'}`);

      // Return write result with generated file path for gitignore management
      return {
        generatedPaths: [resolvedPath],
        metadata: {
          provider: this.id,
          format: config.format || this.config.format,
          size: content.length,
        },
      };
    } catch (error) {
      logger.error(`Failed to write file: ${resolvedPath}`, error);
      throw error;
    }
  }

  /**
   * Name property for both Provider and DestinationPlugin interfaces
   * For Provider: Returns display name
   * For DestinationPlugin: Returns the ID for compatibility
   */
  get name(): string {
    return 'Windsurf'; // Display name for Provider interface
  }

  /**
   * Security: Sanitize file paths to prevent directory traversal attacks
   */
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
