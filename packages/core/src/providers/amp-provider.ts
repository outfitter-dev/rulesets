// Provider implementation for Amp AI assistant
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

export class AmpProvider implements Provider, DestinationPlugin {
  readonly id: ProviderId = createProviderId('amp');
  readonly version: Version = createVersion('1.0.0');
  readonly description = 'Amp AI assistant';
  readonly website = 'https://amp.dev';
  readonly type = 'agent' as const;

  readonly config: ProviderConfig = {
    outputPath: createOutputPath('AGENT.md'),
    format: 'markdown',
    fileNaming: 'preserve', // Always uses AGENT.md filename
    features: {
      autoFormat: true,
      syntaxHighlighting: true,
    },
  };

  readonly capabilities: ProviderCapabilities = {
    supportsBlocks: true,
    supportsImports: true,
    supportsVariables: true,
    supportsXml: false, // Amp expects simple Markdown
    supportsMarkdown: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFormats: ['markdown'],
    requiresSpecialHandling: [],
  };

  /**
   * Provides configuration schema for Amp provider
   * Validates provider-specific settings like outputPath
   */
  configSchema(): JSONSchema7 {
    return {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description:
            'Path where the compiled rules file should be written (typically AGENT.md)',
          default: 'AGENT.md',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Priority level for the rules',
        },
        includeProjectContext: {
          type: 'boolean',
          default: true,
          description: 'Include project-specific context in compiled rules',
        },
      },
      additionalProperties: true,
    };
  }

  /**
   * Compiles content for Amp provider
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
      // Amp expects clean Markdown without complex formatting
      // TODO: Add Amp-specific formatting and transformations in v2
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
          outputFile: 'AGENT.md',
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
   * Writes compiled document to project root as AGENT.md
   * Legacy DestinationPlugin interface method for backwards compatibility
   * Returns WriteResult with generated file paths for gitignore management
   */
  async write(ctx: {
    compiled: CompiledDoc;
    destPath: string;
    config: Record<string, unknown>;
    logger: Logger;
  }): Promise<WriteResult> {
    const { compiled, config, logger } = ctx;

    logger.info('Writing Amp rules to: AGENT.md');

    // Amp always uses AGENT.md as filename - ignore destPath for naming
    const outputPath =
      (typeof config.outputPath === 'string' ? config.outputPath : undefined) ||
      'AGENT.md';

    // Security: Validate and sanitize the path to prevent directory traversal
    const resolvedPath = this.sanitizePath(outputPath, process.cwd());

    // Ensure the resolved path ends with AGENT.md for security and consistency
    if (!resolvedPath.endsWith('AGENT.md')) {
      logger.warn(
        `Output path ${resolvedPath} should end with AGENT.md. Adjusting...`
      );
      const dir = path.dirname(resolvedPath);
      const adjustedPath = path.join(dir, 'AGENT.md');
      const sanitizedPath = this.sanitizePath(adjustedPath, process.cwd());
      logger.info(`Adjusted output path to: ${sanitizedPath}`);
    }

    // Security: Check file size before writing
    const content = compiled.output.content;
    if (content.length > (this.capabilities.maxFileSize || 10 * 1024 * 1024)) {
      throw new Error(
        `File too large: ${content.length} bytes (max ${this.capabilities.maxFileSize} bytes)`
      );
    }

    // Write the AGENT.md file
    try {
      await fs.writeFile(resolvedPath, content, {
        encoding: 'utf8',
      });
      logger.info(`Successfully wrote Amp rules to: ${resolvedPath}`);

      // Log additional context for debugging
      logger.debug(`Provider: ${this.id}`);
      logger.debug(`Config: ${JSON.stringify(config)}`);
      if (compiled.output.metadata?.priority) {
        logger.debug(`Priority: ${compiled.output.metadata.priority}`);
      }

      // Return write result with generated file paths for gitignore management
      return {
        generatedPaths: [resolvedPath],
        metadata: {
          provider: this.id,
          format: this.config.format,
          size: content.length,
          outputFile: 'AGENT.md',
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
    return 'Amp'; // Display name for Provider interface
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
