// TLDR: Unit tests for the Codex provider (Rulesets v1)

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';
import { dirname, join, resolve } from 'node:path';
import type {
  CompiledDoc,
  Logger,
  ProviderCompilationContext,
} from '@rulesets/types';
import { CodexProvider } from '../codex-provider';

// Mock fs and Bun API using Bun's mock API
const mockWriteFile = mock().mockResolvedValue(undefined);
const mockMkdir = mock().mockResolvedValue(undefined);
const mockBunWrite = mock().mockResolvedValue(10);

// Mock node:fs for Bun test compatibility
mock.module('node:fs', () => ({
  promises: {
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
  },
}));

// Type for provider with private methods exposed
type CodexProviderWithPrivates = CodexProvider & {
  sanitizePath(filePath: string, basePath: string): string;
  generateMcpToml(servers: Record<string, unknown>): string;
};

describe('CodexProvider', () => {
  let provider: CodexProvider;
  let mockLogger: Logger;

  beforeEach(() => {
    provider = new CodexProvider();
    mockLogger = {
      debug: mock(),
      info: mock(),
      warn: mock(),
      error: mock(),
    };
    // Clear mock call counts
    mockWriteFile.mockClear();
    mockMkdir.mockClear();
    mockBunWrite.mockClear();

    // Set up mock return values
    mockBunWrite.mockResolvedValue(10);

    // Mock Bun.write using spyOn
    spyOn(Bun, 'write').mockImplementation(mockBunWrite);
  });

  afterEach(() => {
    // Bun automatically restores mocks
  });

  describe('Provider interface properties', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('codex-cli');
    });

    it('should have correct name', () => {
      expect(provider.name).toBe('OpenAI Codex CLI');
    });

    it('should have correct type', () => {
      expect(provider.type).toBe('cli');
    });

    it('should have correct website', () => {
      expect(provider.website).toBe('https://github.com/openai/codex');
    });

    it('should have correct description', () => {
      expect(provider.description).toBe('OpenAI Codex CLI assistant');
    });
  });

  describe('config', () => {
    it('should have AGENTS.md as output path', () => {
      expect(provider.config.outputPath).toBe('AGENTS.md');
    });

    it('should use markdown format', () => {
      expect(provider.config.format).toBe('markdown');
    });

    it('should use preserve file naming strategy for fixed filename', () => {
      expect(provider.config.fileNaming).toBe('preserve');
    });

    it('should have appropriate features enabled', () => {
      expect(provider.config.features).toEqual({
        autoFormat: true,
        syntaxHighlighting: true,
        codeCompletion: true,
        errorReporting: true,
      });
    });
  });

  describe('capabilities', () => {
    it('should support required features except XML', () => {
      expect(provider.capabilities.supportsBlocks).toBe(true);
      expect(provider.capabilities.supportsImports).toBe(true);
      expect(provider.capabilities.supportsVariables).toBe(true);
      expect(provider.capabilities.supportsXml).toBe(false); // Codex expects pure Markdown
      expect(provider.capabilities.supportsMarkdown).toBe(true);
    });

    it('should have reasonable file size limit for CLI', () => {
      expect(provider.capabilities.maxFileSize).toBe(10 * 1024 * 1024); // 10MB
    });

    it('should support only markdown format', () => {
      expect(provider.capabilities.allowedFormats).toEqual(['markdown']);
    });

    it('should require special handling for Codex features', () => {
      expect(provider.capabilities.requiresSpecialHandling).toEqual([
        'codex-home',
        'mcp-config',
      ]);
    });
  });

  describe('configSchema', () => {
    it('should return a valid JSON schema', () => {
      const schema = provider.configSchema();
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
    });

    it('should define outputPath property with AGENTS.md default', () => {
      const schema = provider.configSchema();
      const outputPathProp = schema.properties?.outputPath as {
        type: string;
        default: string;
        description: string;
      };
      expect(outputPathProp.type).toBe('string');
      expect(outputPathProp.default).toBe('AGENTS.md');
      expect(outputPathProp.description).toContain('AGENTS.md');
    });

    it('should define codexHome property for CODEX_HOME support', () => {
      const schema = provider.configSchema();
      const codexHomeProp = schema.properties?.codexHome as {
        type: string;
        description: string;
      };
      expect(codexHomeProp.type).toBe('string');
      expect(codexHomeProp.description).toContain('CODEX_HOME');
    });

    it('should define MCP configuration schema for TOML output', () => {
      const schema = provider.configSchema();
      const mcpConfigProp = schema.properties?.mcpConfig as {
        type: string;
        properties: {
          enabled: unknown;
          outputPath: {
            default: string;
          };
          servers: unknown;
        };
      };
      expect(mcpConfigProp.type).toBe('object');
      expect(mcpConfigProp.properties.enabled).toBeDefined();
      expect(mcpConfigProp.properties.outputPath).toBeDefined();
      expect(mcpConfigProp.properties.outputPath.default).toBe(
        '.codex/config.toml'
      );
      expect(mcpConfigProp.properties.servers).toBeDefined();
    });

    it('should enforce priority enum values', () => {
      const schema = provider.configSchema();
      const priorityProp = schema.properties?.priority as {
        type: string;
        enum: string[];
      };
      expect(priorityProp.type).toBe('string');
      expect(priorityProp.enum).toEqual(['low', 'medium', 'high']);
    });

    it('should include layered instructions option', () => {
      const schema = provider.configSchema();
      const layeredInstructionsProp = schema.properties
        ?.layeredInstructions as {
        type: string;
        default: boolean;
      };
      expect(layeredInstructionsProp.type).toBe('boolean');
      expect(layeredInstructionsProp.default).toBe(true);
    });

    it('should include project context option', () => {
      const schema = provider.configSchema();
      const includeProjectContextProp = schema.properties
        ?.includeProjectContext as {
        type: string;
        default: boolean;
      };
      expect(includeProjectContextProp.type).toBe('boolean');
      expect(includeProjectContextProp.default).toBe(true);
    });
  });

  describe('compile', () => {
    const mockContext: ProviderCompilationContext = {
      provider,
      sourcePath: 'test.rule.md',
      outputPath: 'AGENTS.md',
      variables: {},
      metadata: {},
    };

    it('should compile successfully with placeholder content', async () => {
      const result = await provider.compile(mockContext);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should include provider metadata in compilation result', async () => {
      const result = await provider.compile(mockContext);

      expect(result.metadata.provider).toBe('codex-cli');
      expect(result.metadata.format).toBe('markdown');
      expect(result.metadata.outputFile).toBe('AGENTS.md');
    });

    it('should include compilation stats', async () => {
      const result = await provider.compile(mockContext);

      expect(result.stats).toBeDefined();
      expect(result.stats.duration).toBeGreaterThanOrEqual(0);
      expect(result.stats.inputSize).toBe(0); // Placeholder for v1
      expect(result.stats.outputSize).toBeGreaterThan(0);
      expect(result.stats.blocksProcessed).toBe(0); // Placeholder for v1
      expect(result.stats.importsResolved).toBe(0); // Placeholder for v1
      expect(result.stats.variablesSubstituted).toBe(0); // Placeholder for v1
    });
  });

  describe('write', () => {
    const mockCompiledDoc: CompiledDoc = {
      source: {
        content:
          '---\nruleset:\n  version: 1.0.0\n---\n\n# Codex Rules\n\nThis is test content.',
        frontmatter: { ruleset: { version: '1.0.0' } },
      },
      ast: {
        blocks: [],
        imports: [],
        variables: [],
        markers: [],
      },
      output: {
        content: '# Codex Rules\n\nThis is test content for Codex CLI.',
        metadata: { priority: 'high' },
      },
      context: {
        destinationId: 'codex-cli',
        config: {},
      },
    };

    it('should write content to AGENTS.md', async () => {
      const destPath = 'rules/test.md';
      const config = {};

      const result = await provider.write({
        compiled: mockCompiledDoc,
        destPath,
        config,
        logger: mockLogger,
      });

      const resolvedPath = resolve('AGENTS.md');

      expect(mockBunWrite).toHaveBeenCalledWith(
        resolvedPath,
        mockCompiledDoc.output.content
      );

      expect(result.generatedPaths).toEqual([resolvedPath]);
      expect(result.metadata.provider).toBe('codex-cli');
      expect(result.metadata.format).toBe('markdown');
      expect(result.metadata.outputFile).toBe('AGENTS.md');
    });

    it('should use outputPath from config if provided', async () => {
      const destPath = 'ignored/path.md';
      const config = { outputPath: 'custom/AGENTS.md' };

      await provider.write({
        compiled: mockCompiledDoc,
        destPath,
        config,
        logger: mockLogger,
      });

      const resolvedPath = resolve('custom/AGENTS.md');
      expect(mockBunWrite).toHaveBeenCalledWith(
        resolvedPath,
        mockCompiledDoc.output.content
      );
    });

    it('should handle CODEX_HOME environment variable', async () => {
      const originalCodexHome = process.env.CODEX_HOME;
      process.env.CODEX_HOME = '/custom/codex/home';

      try {
        const result = await provider.write({
          compiled: mockCompiledDoc,
          destPath: 'test.md',
          config: {},
          logger: mockLogger,
        });

        expect(result.metadata.codexHome).toBe('/custom/codex/home');
      } finally {
        if (originalCodexHome !== undefined) {
          process.env.CODEX_HOME = originalCodexHome;
        } else {
          process.env.CODEX_HOME = undefined;
        }
      }
    });

    it('should handle file size limits', async () => {
      const largeContent = 'x'.repeat(15 * 1024 * 1024); // 15MB - exceeds 10MB limit
      const largeCompiledDoc = {
        ...mockCompiledDoc,
        output: {
          content: largeContent,
          metadata: {},
        },
      };

      await expect(
        provider.write({
          compiled: largeCompiledDoc,
          destPath: 'test.md',
          config: {},
          logger: mockLogger,
        })
      ).rejects.toThrow('File too large');
    });

    it('should prevent directory traversal attacks', async () => {
      const maliciousPath = '../../../etc/passwd';
      const config = { outputPath: maliciousPath };

      await expect(
        provider.write({
          compiled: mockCompiledDoc,
          destPath: 'test.md',
          config,
          logger: mockLogger,
        })
      ).rejects.toThrow('Path traversal detected');
    });
  });

  describe('MCP TOML configuration', () => {
    const mockCompiledDoc: CompiledDoc = {
      source: {
        content: '# Test',
        frontmatter: {},
      },
      ast: {
        blocks: [],
        imports: [],
        variables: [],
        markers: [],
      },
      output: {
        content: '# Test content',
        metadata: {},
      },
      context: {
        destinationId: 'codex-cli',
        config: {},
      },
    };

    it('should write MCP TOML configuration when enabled', async () => {
      const config = {
        mcpConfig: {
          enabled: true,
          outputPath: '.codex/config.toml',
          servers: {
            filesystem: {
              command: 'npx',
              args: [
                '-y',
                '@modelcontextprotocol/server-filesystem',
                '/path/to/project',
              ],
            },
            database: {
              command: 'mcp-db-server',
              args: ['--db', 'postgres://localhost:5432/mydb'],
              env: {
                DB_PASSWORD: 'secret',
              },
            },
          },
        },
      };

      const result = await provider.write({
        compiled: mockCompiledDoc,
        destPath: 'test.md',
        config,
        logger: mockLogger,
      });

      const agentsPath = resolve('AGENTS.md');
      const mcpPath = resolve('.codex/config.toml');

      expect(result.generatedPaths).toEqual([agentsPath, mcpPath]);
      expect(result.metadata.mcpEnabled).toBe(true);

      // Verify directory creation
      expect(mockMkdir).toHaveBeenCalledWith(dirname(mcpPath), {
        recursive: true,
      });

      // Verify TOML content structure
      const writeFileCalls = mockBunWrite.mock.calls;
      const tomlCall = writeFileCalls.find((call) =>
        call[0].toString().includes('config.toml')
      );
      expect(tomlCall).toBeDefined();

      const tomlContent = tomlCall?.[1] as string;
      expect(tomlContent).toContain('[mcp]');
      expect(tomlContent).toContain('enabled = true');
      expect(tomlContent).toContain('[mcp.servers.filesystem]');
      expect(tomlContent).toContain('command = "npx"');
      expect(tomlContent).toContain(
        'args = ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]'
      );
      expect(tomlContent).toContain('[mcp.servers.database]');
      expect(tomlContent).toContain('[mcp.servers.database.env]');
      expect(tomlContent).toContain('DB_PASSWORD = "secret"');
    });

    it('should not write MCP configuration when disabled', async () => {
      const config = {
        mcpConfig: {
          enabled: false,
          servers: {},
        },
      };

      const result = await provider.write({
        compiled: mockCompiledDoc,
        destPath: 'test.md',
        config,
        logger: mockLogger,
      });

      expect(result.generatedPaths).toHaveLength(1); // Only AGENTS.md
      expect(result.metadata.mcpEnabled).toBe(false);
    });
  });

  describe('sanitizePath', () => {
    it('should prevent path traversal with relative paths', () => {
      const localProvider = new CodexProvider() as CodexProviderWithPrivates;
      expect(() => {
        localProvider.sanitizePath('../../../etc/passwd', process.cwd());
      }).toThrow('Path traversal detected');
    });

    it('should allow valid relative paths', () => {
      const localProvider = new CodexProvider() as CodexProviderWithPrivates;
      const result = localProvider.sanitizePath('AGENTS.md', process.cwd());
      expect(result).toBe(resolve(process.cwd(), 'AGENTS.md'));
    });

    it('should allow valid absolute paths within project', () => {
      const localProvider = new CodexProvider() as CodexProviderWithPrivates;
      const validPath = join(process.cwd(), 'docs', 'AGENTS.md');
      const result = localProvider.sanitizePath(validPath, process.cwd());
      expect(result).toBe(validPath);
    });
  });

  describe('generateMcpToml', () => {
    it('should generate valid TOML with complex server configuration', () => {
      const localProvider = new CodexProvider() as CodexProviderWithPrivates;

      const servers = {
        filesystem: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', '/project'],
          env: {
            NODE_ENV: 'production',
            LOG_LEVEL: 'info',
          },
        },
        database: {
          command: 'db-server',
          args: ['--port', '3306'],
        },
        simple: {
          command: 'simple-cmd',
        },
      };

      const toml = localProvider.generateMcpToml(servers);

      // Check basic structure
      expect(toml).toContain('[mcp]');
      expect(toml).toContain('enabled = true');

      // Check filesystem server
      expect(toml).toContain('[mcp.servers.filesystem]');
      expect(toml).toContain('command = "npx"');
      expect(toml).toContain(
        'args = ["-y", "@modelcontextprotocol/server-filesystem", "/project"]'
      );
      expect(toml).toContain('[mcp.servers.filesystem.env]');
      expect(toml).toContain('NODE_ENV = "production"');
      expect(toml).toContain('LOG_LEVEL = "info"');

      // Check database server
      expect(toml).toContain('[mcp.servers.database]');
      expect(toml).toContain('command = "db-server"');
      expect(toml).toContain('args = ["--port", "3306"]');

      // Check simple server
      expect(toml).toContain('[mcp.servers.simple]');
      expect(toml).toContain('command = "simple-cmd"');
    });

    it('should handle empty servers configuration', () => {
      const localProvider = new CodexProvider() as CodexProviderWithPrivates;
      const toml = localProvider.generateMcpToml({});

      expect(toml).toContain('[mcp]');
      expect(toml).toContain('enabled = true');
      expect(toml).not.toContain('[mcp.servers.');
    });
  });
});
