import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import * as path from 'node:path';
import type { CompiledDoc, Logger } from '@rulesets/types';
import { OpenCodeProvider } from '../opencode-provider';

// Mock fs promises
const mockWriteFile = mock(() => Promise.resolve());
const mockMkdir = mock(() => Promise.resolve());

mock.module('fs', () => ({
  promises: {
    writeFile: mockWriteFile,
    mkdir: mockMkdir,
  },
}));

// Mock os module
const mockHomedir = mock(() => '/home/user');
mock.module('os', () => ({
  homedir: mockHomedir,
}));

describe('OpenCodeProvider', () => {
  let provider: OpenCodeProvider;
  let mockLogger: Logger;
  let mockCompiledDoc: CompiledDoc;

  beforeEach(() => {
    provider = new OpenCodeProvider();
    mockLogger = {
      debug: mock(() => {}),
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
    };
    mockCompiledDoc = {
      output: {
        content: 'Test content for OpenCode',
        metadata: {},
      },
    } as CompiledDoc;

    // Clear all mocks
    mockWriteFile.mockClear();
    mockMkdir.mockClear();
    mockHomedir.mockClear();
    (mockLogger.debug as any).mockClear();
    (mockLogger.info as any).mockClear();
    (mockLogger.warn as any).mockClear();
    (mockLogger.error as any).mockClear();
  });

  afterEach(() => {
    // Reset all mocks
    mockWriteFile.mockReset();
    mockMkdir.mockReset();
    mockHomedir.mockReset();
  });

  describe('Provider Configuration', () => {
    it('should have correct provider metadata', () => {
      expect(provider.id).toBe('opencode');
      expect(provider.name).toBe('OpenCode');
      expect(provider.description).toBe('OpenCode web agent/extension');
      expect(provider.website).toBe('https://opencode.dev');
      expect(provider.type).toBe('web');
      expect(provider.version).toBe('1.0.0');
    });

    it('should have correct configuration', () => {
      expect(provider.config.outputPath).toBe('AGENTS.md');
      expect(provider.config.format).toBe('markdown');
      expect(provider.config.fileNaming).toBe('preserve');
      expect(provider.config.features?.autoFormat).toBe(true);
      expect(provider.config.features?.syntaxHighlighting).toBe(true);
      expect(provider.config.features?.webIntegration).toBe(true);
    });

    it('should have correct capabilities', () => {
      expect(provider.capabilities.supportsBlocks).toBe(true);
      expect(provider.capabilities.supportsImports).toBe(true);
      expect(provider.capabilities.supportsVariables).toBe(true);
      expect(provider.capabilities.supportsXml).toBe(false);
      expect(provider.capabilities.supportsMarkdown).toBe(true);
      expect(provider.capabilities.maxFileSize).toBe(10 * 1024 * 1024);
      expect(provider.capabilities.allowedFormats).toEqual(['markdown']);
      expect(provider.capabilities.requiresSpecialHandling).toEqual([
        'opencode-config',
        'mcp-config',
      ]);
    });
  });

  describe('Configuration Schema', () => {
    it('should return a valid JSON schema', () => {
      const schema = provider.configSchema();

      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.properties?.outputPath).toBeDefined();
      expect(schema.properties?.mcpConfig).toBeDefined();
      expect(schema.properties?.priority).toBeDefined();
      expect(schema.properties?.includeProjectContext).toBeDefined();
      expect(schema.properties?.webOptimized).toBeDefined();
    });

    it('should have correct default values in schema', () => {
      const schema = provider.configSchema();
      const properties = schema.properties as any;

      expect(properties.outputPath.default).toBe('AGENTS.md');
      expect(properties.mcpConfig.properties.enabled.default).toBe(false);
      expect(properties.mcpConfig.properties.outputPath.default).toBe(
        'opencode.json'
      );
      expect(properties.mcpConfig.properties.globalConfig.default).toBe(false);
      expect(properties.includeProjectContext.default).toBe(true);
      expect(properties.webOptimized.default).toBe(true);
    });
  });

  describe('Compilation', () => {
    it('should successfully compile content', async () => {
      const mockContext = {
        provider,
        sourcePath: 'test.md' as any,
        outputPath: 'AGENTS.md' as any,
        variables: {},
        metadata: {},
      };

      const result = await provider.compile(mockContext);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.metadata.provider).toBe('opencode');
      expect(result.metadata.format).toBe('markdown');
      expect(result.metadata.outputFile).toBe('AGENTS.md');
      expect(result.stats).toBeDefined();
      expect(result.stats.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle compilation with correct metadata structure', async () => {
      const mockContext = {
        provider,
        sourcePath: 'test.md' as any,
        outputPath: 'AGENTS.md' as any,
        variables: { test: 'value' },
        metadata: { source: 'test' },
      };

      const result = await provider.compile(mockContext);

      expect(result.success).toBe(true);
      expect(result.metadata).toMatchObject({
        provider: 'opencode',
        format: 'markdown',
        outputFile: 'AGENTS.md',
      });
      expect(result.stats).toMatchObject({
        duration: expect.any(Number),
        inputSize: expect.any(Number),
        outputSize: expect.any(Number),
        blocksProcessed: expect.any(Number),
        importsResolved: expect.any(Number),
        variablesSubstituted: expect.any(Number),
      });
    });
  });

  describe('File Writing', () => {
    beforeEach(() => {
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);
    });

    it('should write AGENTS.md file correctly', async () => {
      const config = { outputPath: 'AGENTS.md' };
      const ctx = {
        compiled: mockCompiledDoc,
        destPath: '/test/path',
        config,
        logger: mockLogger,
      };

      const result = await provider.write(ctx);

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('AGENTS.md'),
        'Test content for OpenCode',
        { encoding: 'utf8' }
      );
      expect(result.generatedPaths).toHaveLength(1);
      expect(result.generatedPaths[0]).toMatch(/AGENTS\.md$/);
      expect(result.metadata.provider).toBe('opencode');
      expect(result.metadata.format).toBe('markdown');
      expect(result.metadata.outputFile).toBe('AGENTS.md');
    });

    it('should adjust path to AGENTS.md if different filename provided', async () => {
      const config = { outputPath: 'different-name.md' };
      const ctx = {
        compiled: mockCompiledDoc,
        destPath: '/test/path',
        config,
        logger: mockLogger,
      };

      await provider.write(ctx);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('should end with AGENTS.md')
      );
    });

    it('should reject file size exceeding maximum', async () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      const largeMockDoc = {
        output: {
          content: largeContent,
          metadata: {},
        },
      } as CompiledDoc;

      const config = { outputPath: 'AGENTS.md' };
      const ctx = {
        compiled: largeMockDoc,
        destPath: '/test/path',
        config,
        logger: mockLogger,
      };

      await expect(provider.write(ctx)).rejects.toThrow('File too large');
    });

    it('should handle file write errors', async () => {
      mockWriteFile.mockRejectedValue(new Error('Write failed'));

      const config = { outputPath: 'AGENTS.md' };
      const ctx = {
        compiled: mockCompiledDoc,
        destPath: '/test/path',
        config,
        logger: mockLogger,
      };

      await expect(provider.write(ctx)).rejects.toThrow('Write failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('MCP Configuration', () => {
    beforeEach(() => {
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);
    });

    it('should write local MCP configuration when enabled', async () => {
      const config = {
        outputPath: 'AGENTS.md',
        mcpConfig: {
          enabled: true,
          outputPath: 'opencode.json',
          mcpServers: {
            filesystem: {
              command: 'npx',
              args: [
                '-y',
                '@modelcontextprotocol/server-filesystem',
                '/path/to/project',
              ],
            },
          },
        },
      };

      const ctx = {
        compiled: mockCompiledDoc,
        destPath: '/test/path',
        config,
        logger: mockLogger,
      };

      const result = await provider.write(ctx);

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('opencode.json'),
        expect.stringContaining('"mcpServers"'),
        { encoding: 'utf8' }
      );
      expect(result.generatedPaths).toHaveLength(2); // AGENTS.md + opencode.json
      expect(result.metadata.mcpEnabled).toBe(true);
    });

    it('should write global MCP configuration when enabled', async () => {
      const config = {
        outputPath: 'AGENTS.md',
        mcpConfig: {
          enabled: true,
          globalConfig: true,
          mcpServers: {
            filesystem: {
              command: 'npx',
              args: ['-y', '@modelcontextprotocol/server-filesystem'],
            },
          },
        },
      };

      const ctx = {
        compiled: mockCompiledDoc,
        destPath: '/test/path',
        config,
        logger: mockLogger,
      };

      const result = await provider.write(ctx);

      // Should write both AGENTS.md and local MCP config at minimum
      expect(mockWriteFile).toHaveBeenCalled();
      expect(result.generatedPaths.length).toBeGreaterThanOrEqual(2);
      expect(result.metadata.mcpEnabled).toBe(true);

      // Check that MCP JSON content was written
      const mcpCalls = mockWriteFile.mock.calls.filter((call: any) =>
        call[1].includes('"mcpServers"')
      );
      expect(mcpCalls.length).toBeGreaterThan(0);
    });

    it('should generate valid JSON for MCP configuration', async () => {
      const mcpServers = {
        filesystem: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', '/path'],
          env: {
            PATH: '/usr/bin',
          },
        },
        test: {
          command: 'test-command',
        },
      };

      // Access the private method using bracket notation for testing
      const jsonContent = (provider as any).generateMcpJson(mcpServers);
      const parsed = JSON.parse(jsonContent);

      expect(parsed.mcpServers).toBeDefined();
      expect(parsed.mcpServers.filesystem).toEqual({
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/path'],
        env: {
          PATH: '/usr/bin',
        },
      });
      expect(parsed.mcpServers.test).toEqual({
        command: 'test-command',
      });
    });

    it('should handle MCP write errors gracefully', async () => {
      mockWriteFile
        .mockResolvedValueOnce(undefined) // AGENTS.md succeeds
        .mockRejectedValueOnce(new Error('MCP write failed')); // MCP fails

      const config = {
        outputPath: 'AGENTS.md',
        mcpConfig: {
          enabled: true,
          mcpServers: {
            test: { command: 'test' },
          },
        },
      };

      const ctx = {
        compiled: mockCompiledDoc,
        destPath: '/test/path',
        config,
        logger: mockLogger,
      };

      const result = await provider.write(ctx);

      expect(result.generatedPaths).toHaveLength(1); // Only AGENTS.md
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write MCP configuration')
      );
    });

    it('should not write MCP configuration when disabled', async () => {
      const config = {
        outputPath: 'AGENTS.md',
        mcpConfig: {
          enabled: false,
          mcpServers: {
            test: { command: 'test' },
          },
        },
      };

      const ctx = {
        compiled: mockCompiledDoc,
        destPath: '/test/path',
        config,
        logger: mockLogger,
      };

      const result = await provider.write(ctx);

      expect(result.generatedPaths).toHaveLength(1); // Only AGENTS.md
      expect(result.metadata.mcpEnabled).toBe(false);
    });
  });

  describe('Security', () => {
    it('should prevent directory traversal attacks', async () => {
      const config = { outputPath: '../../../etc/passwd' };
      const ctx = {
        compiled: mockCompiledDoc,
        destPath: '/test/path',
        config,
        logger: mockLogger,
      };

      await expect(provider.write(ctx)).rejects.toThrow(
        'Path traversal detected'
      );
    });

    it('should sanitize paths correctly', () => {
      // Access the private method using bracket notation for testing
      const sanitized = (provider as any).sanitizePath(
        './AGENTS.md',
        '/project'
      );
      expect(sanitized).toBe(path.resolve('/project/AGENTS.md'));
    });

    it('should allow absolute paths within base directory', () => {
      const baseDir = '/project';
      const userPath = '/project/subdir/AGENTS.md';

      // Access the private method using bracket notation for testing
      const sanitized = (provider as any).sanitizePath(userPath, baseDir);
      expect(sanitized).toBe('/project/subdir/AGENTS.md');
    });

    it('should reject absolute paths outside base directory', () => {
      const baseDir = '/project';
      const userPath = '/other/AGENTS.md';

      expect(() => {
        (provider as any).sanitizePath(userPath, baseDir);
      }).toThrow('Path traversal detected');
    });
  });

  describe('Integration', () => {
    it('should be compatible with Provider interface', () => {
      // Type checking - these should not cause TypeScript errors
      const providerId = provider.id;
      const providerName = provider.name;
      const providerVersion = provider.version;
      const providerType = provider.type;
      const providerConfig = provider.config;
      const providerCapabilities = provider.capabilities;

      expect(providerId).toBe('opencode');
      expect(providerName).toBe('OpenCode');
      expect(providerVersion).toBe('1.0.0');
      expect(providerType).toBe('web');
      expect(providerConfig).toBeDefined();
      expect(providerCapabilities).toBeDefined();
    });

    it('should be compatible with DestinationPlugin interface', () => {
      // Type checking - these should not cause TypeScript errors
      const pluginName = provider.name;
      const configSchema = provider.configSchema();

      expect(pluginName).toBe('OpenCode');
      expect(configSchema).toBeDefined();
      expect(typeof provider.write).toBe('function');
    });
  });
});
