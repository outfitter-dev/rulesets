// Provider implementation for OpenCode web agent
// Implements the Provider interface with branded types and modern architecture

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
import * as os from 'os';
import * as path from 'path';

export class OpenCodeProvider implements Provider, DestinationPlugin {
  readonly id: ProviderId = createProviderId('opencode');
  readonly version: Version = createVersion('1.0.0');
  readonly description = 'OpenCode web agent/extension';
  readonly website = 'https://opencode.dev';
  readonly type = 'web' as const;

  readonly config: ProviderConfig = {
    outputPath: createOutputPath('AGENTS.md'),
    format: 'markdown',
    fileNaming: 'preserve', // Fixed filename - always AGENTS.md (shared with Codex)
    features: {
      autoFormat: true,
      syntaxHighlighting: true,
      webIntegration: true,
    },
  };

  readonly capabilities: ProviderCapabilities = {
    supportsBlocks: true,
    supportsImports: true,
    supportsVariables: true,
    supportsXml: false, // OpenCode expects pure Markdown
    supportsMarkdown: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB - reasonable limit for web context
    allowedFormats: ['markdown'],
    requiresSpecialHandling: ['opencode-config', 'mcp-config'], // Support opencode.json and MCP configuration
  };

  /**
   * Provides configuration schema for OpenCode provider
   * Validates provider-specific settings like outputPath and MCP configuration
   */
  configSchema(): JSONSchema7 {
    return {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description:
            'Path where the compiled rules file should be written (typically AGENTS.md)',
          default: 'AGENTS.md',
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
              default: 'opencode.json',
              description: 'Path for MCP JSON configuration file',
            },
            globalConfig: {
              type: 'boolean',
              default: false,
              description:
                'Also write to global config at ~/.config/opencode/opencode.json',
            },
            mcpServers: {
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
        webOptimized: {
          type: 'boolean',
          default: true,
          description: 'Enable web-optimized formatting for OpenCode',
        },
      },
      additionalProperties: true,
    };
  }

  /**
   * Compiles content for OpenCode provider
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
      // OpenCode expects pure Markdown with clear section headings
      // TODO: Add OpenCode-specific formatting and transformations in v2
      // - Process content for web-optimized layout
      // - Handle interactive elements for web UI
      // - Add OpenCode-specific metadata headers
      // - Integrate with MCP JSON configuration
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
          outputFile: 'AGENTS.md',
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
   * Writes compiled document to project root as AGENTS.md
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

    logger.info('Writing OpenCode rules to: AGENTS.md');

    // OpenCode uses AGENTS.md as filename (shared with Codex) - ignore destPath for naming
    const outputPath =
      (typeof config.outputPath === 'string' ? config.outputPath : undefined) ||
      'AGENTS.md';

    // Security: Validate and sanitize the path to prevent directory traversal
    const resolvedPath = this.sanitizePath(outputPath, process.cwd());

    // Ensure the resolved path ends with AGENTS.md for security
    if (!resolvedPath.endsWith('AGENTS.md')) {
      logger.warn(
        `Output path ${resolvedPath} should end with AGENTS.md. Adjusting...`
      );
      const dir = path.dirname(resolvedPath);
      const adjustedPath = path.join(dir, 'AGENTS.md');
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

    const generatedPaths: string[] = [];

    // Write the main AGENTS.md file
    try {
      await fs.writeFile(resolvedPath, content, {
        encoding: 'utf8',
      });
      logger.info(`Successfully wrote OpenCode rules to: ${resolvedPath}`);
      generatedPaths.push(resolvedPath);

      // Log additional context for debugging
      logger.debug(`Provider: ${this.id}`);
      logger.debug(`Config: ${JSON.stringify(config)}`);
      if (compiled.output.metadata?.priority) {
        logger.debug(`Priority: ${compiled.output.metadata.priority}`);
      }

      // Handle MCP configuration if enabled
      if (config.mcpConfig && typeof config.mcpConfig === 'object') {
        const mcpConfig = config.mcpConfig as any;
        if (mcpConfig.enabled && mcpConfig.mcpServers) {
          const mcpPaths = await this.writeMcpJsonConfig(
            mcpConfig,
            config,
            logger
          );
          generatedPaths.push(...mcpPaths);
        }
      }

      // Return write result with generated file paths for gitignore management
      return {
        generatedPaths,
        metadata: {
          provider: this.id,
          format: this.config.format,
          size: content.length,
          outputFile: 'AGENTS.md',
          mcpEnabled: !!(config.mcpConfig as any)?.enabled,
          webOptimized: true,
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
    return 'OpenCode'; // Display name for Provider interface
  }

  /**
   * Writes MCP configuration files in JSON format if enabled
   * Supports both local opencode.json and global ~/.config/opencode/opencode.json
   */
  private async writeMcpJsonConfig(
    mcpConfig: any,
    _globalConfig: Record<string, unknown>,
    logger: Logger
  ): Promise<string[]> {
    const generatedPaths: string[] = [];

    try {
      // Generate JSON content for MCP configuration
      const jsonContent = this.generateMcpJson(mcpConfig.mcpServers || {});

      // Write local configuration file
      const localMcpPath = mcpConfig.outputPath || 'opencode.json';
      const resolvedLocalPath = this.sanitizePath(localMcpPath, process.cwd());

      // Ensure the directory exists
      const localDir = path.dirname(resolvedLocalPath);
      await fs.mkdir(localDir, { recursive: true });

      await fs.writeFile(resolvedLocalPath, jsonContent, { encoding: 'utf8' });

      logger.info(
        `Successfully wrote MCP JSON configuration to: ${resolvedLocalPath}`
      );
      generatedPaths.push(resolvedLocalPath);

      // Write global configuration if enabled
      if (mcpConfig.globalConfig) {
        try {
          const globalMcpPath = path.join(
            os.homedir(),
            '.config',
            'opencode',
            'opencode.json'
          );

          // Ensure the global directory exists
          const globalDir = path.dirname(globalMcpPath);
          await fs.mkdir(globalDir, { recursive: true });

          await fs.writeFile(globalMcpPath, jsonContent, { encoding: 'utf8' });

          logger.info(
            `Successfully wrote global MCP JSON configuration to: ${globalMcpPath}`
          );
          generatedPaths.push(globalMcpPath);
        } catch (error) {
          logger.warn(`Failed to write global MCP configuration: ${error}`);
        }
      }
    } catch (error) {
      logger.warn(`Failed to write MCP configuration: ${error}`);
    }

    return generatedPaths;
  }

  /**
   * Generates JSON content for MCP server configuration
   * Based on the expected format for OpenCode's opencode.json
   */
  private generateMcpJson(servers: Record<string, any>): string {
    const config = {
      mcpServers: {} as Record<string, any>,
    };

    for (const [serverName, serverConfig] of Object.entries(servers)) {
      config.mcpServers[serverName] = {
        command: serverConfig.command,
        ...(serverConfig.args && { args: serverConfig.args }),
        ...(serverConfig.env && { env: serverConfig.env }),
      };
    }

    return JSON.stringify(config, null, 2);
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
