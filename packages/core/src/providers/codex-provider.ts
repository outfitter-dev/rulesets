// Provider implementation for OpenAI Codex CLI
// Implements the Provider interface with branded types and modern architecture

import { promises as fs } from 'node:fs';
<<<<<<< HEAD
import { dirname, isAbsolute, join, normalize, resolve, sep } from 'node:path';
=======
import * as path from 'node:path';
>>>>>>> 76de235 (fix: optimize CI/CD workflow and add bun.lock)
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

export class CodexProvider implements Provider, DestinationPlugin {
  readonly id: ProviderId = createProviderId('codex-cli');
  readonly version: Version = createVersion('1.0.0');
  readonly description = 'OpenAI Codex CLI assistant';
  readonly website = 'https://github.com/openai/codex';
  readonly type = 'cli' as const;

  readonly config: ProviderConfig = {
    outputPath: createOutputPath('AGENTS.md'),
    format: 'markdown',
    fileNaming: 'preserve', // Fixed filename - always AGENTS.md
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
    supportsXml: false, // Codex CLI expects pure Markdown
    supportsMarkdown: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB - reasonable limit for CLI context
    allowedFormats: ['markdown'],
    requiresSpecialHandling: ['codex-home', 'mcp-config'], // Support CODEX_HOME and MCP TOML
  };

  /**
   * Provides configuration schema for Codex provider
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
        codexHome: {
          type: 'string',
          description: 'Custom CODEX_HOME directory for configuration location',
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
              default: '.codex/config.toml',
              description: 'Path for MCP TOML configuration file',
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
        layeredInstructions: {
          type: 'boolean',
          default: true,
          description: 'Enable layered instructions approach for Codex CLI',
        },
      },
      additionalProperties: true,
    };
  }

  /**
   * Compiles content for Codex provider
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
      // Codex CLI expects pure Markdown with clear section headings
      // TODO: Add Codex-specific formatting and transformations in v2
      // - Process content for layered instructions approach
      // - Handle command policy sections
      // - Add Codex-specific metadata headers
      // - Integrate with MCP TOML configuration
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

    logger.info('Writing Codex rules to: AGENTS.md');

    // Codex always uses AGENTS.md as filename - ignore destPath for naming
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
      const dir = dirname(resolvedPath);
      const adjustedPath = join(dir, 'AGENTS.md');
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
      logger.info(`Successfully wrote Codex rules to: ${resolvedPath}`);
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
        if (mcpConfig.enabled && mcpConfig.servers) {
          const mcpPath = await this.writeMcpTomlConfig(
            mcpConfig,
            config,
            logger
          );
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
          outputFile: 'AGENTS.md',
          mcpEnabled: !!(config.mcpConfig as any)?.enabled,
          codexHome: config.codexHome || process.env.CODEX_HOME,
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
    return 'OpenAI Codex CLI'; // Display name for Provider interface
  }

  /**
   * Writes MCP configuration file in TOML format if enabled
   * Supports both default .codex/config.toml and custom CODEX_HOME location
   */
  private async writeMcpTomlConfig(
    mcpConfig: any,
    globalConfig: Record<string, unknown>,
    logger: Logger
  ): Promise<string | null> {
    try {
      // Determine MCP config path with CODEX_HOME support
      let mcpPath = mcpConfig.outputPath || '.codex/config.toml';

      // Support CODEX_HOME environment variable or config override
      const codexHome =
        (globalConfig.codexHome as string) || process.env.CODEX_HOME;
      if (codexHome && !isAbsolute(mcpPath)) {
        mcpPath = join(codexHome, 'config.toml');
      }

      const resolvedMcpPath = this.sanitizePath(mcpPath, process.cwd());

      // Ensure the directory exists
      const mcpDir = dirname(resolvedMcpPath);
      await fs.mkdir(mcpDir, { recursive: true });

      // Generate TOML content for MCP configuration
      const tomlContent = this.generateMcpToml(mcpConfig.servers || {});

      await fs.writeFile(resolvedMcpPath, tomlContent, { encoding: 'utf8' });

      logger.info(
        `Successfully wrote MCP TOML configuration to: ${resolvedMcpPath}`
      );
      return resolvedMcpPath;
    } catch (error) {
      logger.warn(`Failed to write MCP configuration: ${error}`);
      return null;
    }
  }

  /**
   * Generates TOML content for MCP server configuration
   * Based on the expected format for Codex CLI's .codex/config.toml
   */
  private generateMcpToml(servers: Record<string, any>): string {
    const lines: string[] = [];

    lines.push('[mcp]');
    lines.push('enabled = true');
    lines.push('');

    for (const [serverName, serverConfig] of Object.entries(servers)) {
      lines.push(`[mcp.servers.${serverName}]`);
      lines.push(`command = "${serverConfig.command}"`);

      if (serverConfig.args && Array.isArray(serverConfig.args)) {
        const argsString = serverConfig.args
          .map((arg: string) => `"${arg}"`)
          .join(', ');
        lines.push(`args = [${argsString}]`);
      }

      if (serverConfig.env && typeof serverConfig.env === 'object') {
        lines.push(`[mcp.servers.${serverName}.env]`);
        for (const [envKey, envValue] of Object.entries(serverConfig.env)) {
          lines.push(`${envKey} = "${envValue}"`);
        }
      }

      lines.push('');
    }

    return lines.join('\n');
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
