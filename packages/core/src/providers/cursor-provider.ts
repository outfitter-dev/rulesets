// Provider implementation for Cursor IDE
// Implements the new Provider interface with branded types and modern architecture

import { dirname, isAbsolute, normalize, resolve, sep } from 'node:path';
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

export class CursorProvider implements Provider, DestinationPlugin {
  readonly id: ProviderId = createProviderId('cursor');
  readonly version: Version = createVersion('1.0.0');
  readonly description = 'Cursor IDE with AI assistant';
  readonly website = 'https://cursor.sh';
  readonly type = 'ide' as const;

  readonly config: ProviderConfig = {
    outputPath: createOutputPath('.cursor/rules'),
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
   * Provides configuration schema for Cursor provider
   * Validates provider-specific settings like outputPath and priority
   */
  configSchema(): JSONSchema7 {
    return {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description: 'Path where the compiled rules file should be written',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Priority level for the rules',
        },
      },
      additionalProperties: true,
    };
  }

  /**
   * Compiles content for Cursor provider
   * New Provider interface method for modern compilation pipeline
   */
  compile(_context: ProviderCompilationContext): ProviderCompilationResult {
    const startTime = Date.now();
    const errors: ProviderError[] = [];
    const warnings: ProviderWarning[] = [];

    try {
      // For v1, we pass through content without transformation
      // TODO: Add Cursor-specific formatting and transformations in v2
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
   * Writes compiled document to Cursor rules directory
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

    logger.info(`Writing Cursor rules to: ${destPath}`);

    // Determine the output path with security validation
    const outputPath =
      (typeof config.outputPath === 'string' ? config.outputPath : undefined) ||
      destPath;

    // Security: Validate and sanitize the path to prevent directory traversal
    const baseDir = typeof config.baseDir === 'string' ? config.baseDir : process.cwd();
    const resolvedPath = this.sanitizePath(outputPath, baseDir);

    // Ensure directory exists (Bun supports Node.js fs.mkdir)
    const dir = dirname(resolvedPath);
    try {
      await import('node:fs').then(fs => fs.promises.mkdir(dir, { recursive: true }));
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
      await Bun.write(resolvedPath, content);
      logger.info(`Successfully wrote Cursor rules to: ${resolvedPath}`);

      // Log additional context for debugging
      logger.debug(`Provider: ${this.id}`);
      logger.debug(`Config: ${JSON.stringify(config)}`);
      if (compiled.output.metadata?.priority) {
        logger.debug(`Priority: ${compiled.output.metadata.priority}`);
      }

      // Return write result with generated file path for gitignore management
      return {
        generatedPaths: [resolvedPath],
        metadata: {
          provider: this.id,
          format: this.config.format,
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
    return 'Cursor'; // Display name for Provider interface
  }

  /**
   * Security: Sanitize file paths to prevent directory traversal attacks
   */
  private sanitizePath(userPath: string, baseDir: string): string {
    // Resolve and normalize the path
    const resolved = isAbsolute(userPath)
      ? resolve(userPath)
      : resolve(baseDir, userPath);

    // Normalize to handle . and .. segments
    const normalized = normalize(resolved);

    // Ensure the resolved path is within the base directory or its subdirectories
    const baseDirResolved = resolve(baseDir);
    if (
      !normalized.startsWith(baseDirResolved + sep) &&
      normalized !== baseDirResolved
    ) {
      throw new Error(
        `Path traversal detected: ${userPath} resolves outside base directory`
      );
    }

    return normalized;
  }
}
