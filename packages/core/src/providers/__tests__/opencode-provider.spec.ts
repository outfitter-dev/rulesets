import type { CompiledDoc, Logger } from '@rulesets/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenCodeProvider } from '../opencode-provider';

// Mock fs promises
const mockWriteFile = vi.fn().mockResolvedValue(undefined);
const mockMkdir = vi.fn().mockResolvedValue(undefined);

vi.mock('node:fs', () => ({
  promises: {
    writeFile: mockWriteFile,
    mkdir: mockMkdir,
  },
}));

// Mock os module
const mockHomedir = vi.fn().mockReturnValue('/home/user');
vi.mock('node:os', () => ({
  homedir: mockHomedir,
}));

describe('OpenCodeProvider', () => {
  let provider: OpenCodeProvider;
  let mockLogger: Logger;
  let mockCompiledDoc: CompiledDoc;

  beforeEach(() => {
    provider = new OpenCodeProvider();
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    mockCompiledDoc = {
      content: '# Test Rules\n\nSome content',
      metadata: {
        sourcePath: 'test.rule.md',
        provider: 'opencode',
        timestamp: new Date().toISOString(),
      },
    };

    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('configSchema', () => {
    it('should return a valid JSON schema', () => {
      const schema = provider.configSchema();
      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('outputPath');
      expect(schema.properties?.outputPath).toEqual({
        type: 'string',
        description: 'Path where the compiled rules file should be written',
      });
    });
  });

  describe('write', () => {
    it('should write the compiled document to the specified path', async () => {
      const destPath = '/test/output/rules.md';
      const config = {};

      const result = await provider.write({
        compiled: mockCompiledDoc,
        destPath,
        config,
        logger: mockLogger,
      });

      expect(mockMkdir).toHaveBeenCalledWith('/test/output', {
        recursive: true,
      });
      expect(mockWriteFile).toHaveBeenCalledWith(
        destPath,
        mockCompiledDoc.content,
        'utf-8'
      );
      expect(result).toEqual({
        generatedPaths: [destPath],
        metadata: { provider: 'opencode' },
      });
    });

    it('should handle MCP configuration when enabled', async () => {
      const destPath = '/test/output/rules.md';
      const config = {
        mcpConfig: {
          enabled: true,
          servers: {
            'test-server': {
              command: 'node',
              args: ['server.js'],
              env: { NODE_ENV: 'test' },
            },
          },
        },
      };

      const result = await provider.write({
        compiled: mockCompiledDoc,
        destPath,
        config,
        logger: mockLogger,
      });

      // Check MCP files were written
      const mcpCalls = mockWriteFile.mock.calls.filter(
        (call: [string, string]) => call[0].includes('opencode.json')
      );
      expect(mcpCalls.length).toBe(2); // Local and global config

      // Check generated paths includes MCP files
      expect(result?.generatedPaths).toContain('opencode.json');
      expect(result?.generatedPaths).toContain(
        '/home/user/.config/opencode/opencode.json'
      );
    });

    it('should use custom outputPath for MCP config when provided', async () => {
      const destPath = '/test/output/rules.md';
      const customMcpPath = '/custom/path/mcp.json';
      const config = {
        mcpConfig: {
          enabled: true,
          outputPath: customMcpPath,
          servers: {
            'test-server': {
              command: 'node',
              args: ['server.js'],
            },
          },
        },
      };

      const result = await provider.write({
        compiled: mockCompiledDoc,
        destPath,
        config,
        logger: mockLogger,
      });

      // Should write to custom path
      const mcpCalls = mockWriteFile.mock.calls.filter(
        (call: [string, string]) => call[0] === customMcpPath
      );
      expect(mcpCalls.length).toBe(1);

      // Should still write global config
      const globalCalls = mockWriteFile.mock.calls.filter(
        (call: [string, string]) => call[0].includes('.config/opencode')
      );
      expect(globalCalls.length).toBe(1);

      expect(result?.generatedPaths).toContain(customMcpPath);
    });

    it('should handle write errors gracefully', async () => {
      const destPath = '/test/output/rules.md';
      const config = {};
      const error = new Error('Write failed');

      mockWriteFile.mockRejectedValueOnce(error);

      await expect(
        provider.write({
          compiled: mockCompiledDoc,
          destPath,
          config,
          logger: mockLogger,
        })
      ).rejects.toThrow('Write failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to write file:',
        error
      );
    });

    it('should create necessary directories with recursive option', async () => {
      const destPath = '/deep/nested/path/rules.md';
      const config = {};

      await provider.write({
        compiled: mockCompiledDoc,
        destPath,
        config,
        logger: mockLogger,
      });

      expect(mockMkdir).toHaveBeenCalledWith('/deep/nested/path', {
        recursive: true,
      });
    });

    it('should not write MCP config when disabled', async () => {
      const destPath = '/test/output/rules.md';
      const config = {
        mcpConfig: {
          enabled: false,
          servers: {
            'test-server': {
              command: 'node',
              args: ['server.js'],
            },
          },
        },
      };

      const result = await provider.write({
        compiled: mockCompiledDoc,
        destPath,
        config,
        logger: mockLogger,
      });

      // Should only write the main rules file
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      expect(mockWriteFile).toHaveBeenCalledWith(
        destPath,
        mockCompiledDoc.content,
        'utf-8'
      );

      // Generated paths should only contain the main file
      expect(result?.generatedPaths).toEqual([destPath]);
    });

    it('should handle MCP config without servers', async () => {
      const destPath = '/test/output/rules.md';
      const config = {
        mcpConfig: {
          enabled: true,
        },
      };

      const _result = await provider.write({
        compiled: mockCompiledDoc,
        destPath,
        config,
        logger: mockLogger,
      });

      // Should still write MCP files with empty servers
      const mcpCalls = mockWriteFile.mock.calls.filter(
        (call: [string, string]) => call[0].includes('opencode.json')
      );
      expect(mcpCalls.length).toBe(2);

      // Check the content of MCP config
      const localMcpCall = mcpCalls.find((call) => call[0] === 'opencode.json');
      if (localMcpCall) {
        const content = JSON.parse(localMcpCall[1]);
        expect(content).toHaveProperty('mcpServers');
        expect(content.mcpServers).toEqual({});
      }
    });
  });

  describe('Provider interface', () => {
    it('should have correct provider properties', () => {
      expect(provider.id).toBeDefined();
      expect(provider.name).toBe('OpenCode');
      expect(provider.version).toBeDefined();
      expect(provider.type).toBe('cli');
      expect(provider.description).toBeDefined();
    });

    it('should have valid capabilities', () => {
      const { capabilities } = provider;
      expect(capabilities.supportsBlocks).toBe(true);
      expect(capabilities.supportsImports).toBe(true);
      expect(capabilities.supportsVariables).toBe(true);
      expect(capabilities.supportsXml).toBe(false);
      expect(capabilities.supportsMarkdown).toBe(true);
      expect(capabilities.allowedFormats).toContain('markdown');
    });

    it('should have valid config', () => {
      const { config } = provider;
      expect(config.format).toBe('markdown');
      expect(config.outputPath).toBeDefined();
    });
  });
});
