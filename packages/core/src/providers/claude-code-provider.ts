// Provider implementation for Claude Code CLI
// Implements the new Provider interface with branded types and modern architecture

import { promises as fs } from 'node:fs';
import { dirname, isAbsolute, join, normalize, resolve, sep } from 'node:path';
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

export class ClaudeCodeProvider implements Provider, DestinationPlugin {
  readonly id: ProviderId = createProviderId('claude-code');
  readonly version: Version = createVersion('1.0.0');
  readonly description = 'Claude Code CLI assistant';
  readonly website = 'https://docs.anthropic.com/en/docs/claude-code';
  readonly type = 'cli' as const;

  readonly config: ProviderConfig = {
    outputPath: createOutputPath('CLAUDE.md'),
    format: 'markdown',
    fileNaming: 'preserve', // Fixed filename - always CLAUDE.md
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
    supportsXml: true, // Claude Code supports XML tags in markdown
    supportsMarkdown: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB - Claude Code can handle large context
    allowedFormats: ['markdown', 'mixed'],
    requiresSpecialHandling: ['mcp-config'], // Future MCP configuration support
  };

  /**
   * Provides configuration schema for Claude Code provider
   * Validates provider-specific settings like outputPath and MCP configuration
   */
  configSchema(): JSONSchema7 {
    return {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description:
            'Path where the compiled rules file should be written (typically CLAUDE.md)',
          default: 'CLAUDE.md',
        },
        mcpConfig: {
          type: 'object',
          description: 'Model Context Protocol server configuration',
          properties: {
            enabled: {
              type: 'boolean',
              default: false,
              description: 'Enable MCP configuration generation',
            },
            outputPath: {
              type: 'string',
              default: '.mcp.json',
              description: 'Path for MCP configuration file',
            },
            servers: {
              type: 'object',
              description: 'MCP server configurations',
              additionalProperties: {
                type: 'object',
                properties: {
                  command: { type: 'string' },
                  args: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  env: {
                    type: 'object',
                    additionalProperties: { type: 'string' },
                  },
                },
                required: ['command'],
              },
            },
          },
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
   * Compiles content for Claude Code provider
   * New Provider interface method for modern compilation pipeline
   */
  compile(_context: ProviderCompilationContext): ProviderCompilationResult {
    const startTime = Date.now();
    const errors: ProviderError[] = [];
    const warnings: ProviderWarning[] = [];

    try {
      // For v1, we pass through content without transformation
      // Claude Code expects pure Markdown with optional XML blocks
      // TODO: Add Claude Code-specific formatting and transformations in v2
      // - Process XML blocks for instruction sections
      // - Handle MCP configuration integration
      // - Add Claude-specific metadata headers
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
          outputFile: 'CLAUDE.md',
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
   * Writes compiled document to project root as CLAUDE.md
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

    logger.info('Writing Claude Code rules to: CLAUDE.md');

    // Claude Code always uses CLAUDE.md as filename - ignore destPath for naming
    const outputPath =
      (typeof config.outputPath === 'string' ? config.outputPath : undefined) ||
      'CLAUDE.md';

    // Security: Validate and sanitize the path to prevent directory traversal
    const resolvedPath = this.sanitizePath(outputPath, process.cwd());

    // Ensure the resolved path ends with CLAUDE.md for security
    if (!resolvedPath.endsWith('CLAUDE.md')) {
      logger.warn(
        `Output path ${resolvedPath} should end with CLAUDE.md. Adjusting...`
      );
      const dir = dirname(resolvedPath);
      const adjustedPath = join(dir, 'CLAUDE.md');
      const sanitizedPath = this.sanitizePath(adjustedPath, process.cwd());
      logger.info(`Adjusted output path to: ${sanitizedPath}`);
    }

    // Security: Check file size before writing
    const content = compiled.output.content;
    if (content.length > (this.capabilities.maxFileSize || 50 * 1024 * 1024)) {
      throw new Error(
        `File too large: ${content.length} bytes (max ${this.capabilities.maxFileSize} bytes)`
      );
    }

    const generatedPaths: string[] = [];

    // Write the main CLAUDE.md file
    try {
      await fs.writeFile(resolvedPath, content, {
        encoding: 'utf8',
      });
      logger.info(`Successfully wrote Claude Code rules to: ${resolvedPath}`);
      generatedPaths.push(resolvedPath);

      // Log additional context for debugging
      logger.debug(`Provider: ${this.id}`);
      logger.debug(`Config: ${JSON.stringify(config)}`);
      if (compiled.output.metadata?.priority) {
        logger.debug(`Priority: ${compiled.output.metadata.priority}`);
      }

      // Handle MCP configuration if enabled
      if (config.mcpConfig && typeof config.mcpConfig === 'object') {
        const mcpConfig = config.mcpConfig as {
          enabled?: boolean;
          servers?: unknown;
        };
        if (mcpConfig.enabled && mcpConfig.servers) {
          const mcpPath = await this.writeMcpConfig(mcpConfig, logger);
          if (mcpPath) {
            generatedPaths.push(mcpPath);
          }
        }
      }

      // Return write result with generated file paths for gitignore management
      return {
        generatedPaths,
        metadata: {
          provider: this.id,
          format: this.config.format,
          size: content.length,
          outputFile: 'CLAUDE.md',
          mcpEnabled: !!(config.mcpConfig as { enabled?: boolean })?.enabled,
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
    return 'Claude Code'; // Display name for Provider interface
  }

  /**
   * Writes MCP configuration file if enabled
   * Future enhancement for Model Context Protocol integration
   */
  private async writeMcpConfig(
    mcpConfig: {
      enabled?: boolean;
      outputPath?: string;
      servers?: Record<
        string,
        {
          command?: string;
          args?: string[];
          env?: Record<string, string>;
        }
      >;
    },
    logger: Logger
  ): Promise<string | null> {
    try {
      const mcpPath = mcpConfig.outputPath || '.mcp.json';
      const resolvedMcpPath = this.sanitizePath(mcpPath, process.cwd());

      const mcpContent = {
        mcpServers: mcpConfig.servers || {},
      };

      await fs.writeFile(resolvedMcpPath, JSON.stringify(mcpContent, null, 2), {
        encoding: 'utf8',
      });

      logger.info(
        `Successfully wrote MCP configuration to: ${resolvedMcpPath}`
      );
      return resolvedMcpPath;
    } catch (error) {
      logger.warn(`Failed to write MCP configuration: ${error}`);
      return null;
    }
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
