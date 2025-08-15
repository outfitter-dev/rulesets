import type { CompiledDoc, Logger } from '@rulesets/types';
import { createCompiledContent } from '@rulesets/types';
import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { OpenCodeProvider } from '../opencode-provider';

// Mock fs promises and Bun API
const mockWriteFile = mock().mockResolvedValue(undefined);
const mockMkdir = mock().mockResolvedValue(undefined);
const mockBunWrite = mock().mockResolvedValue(10);

// Mock node:fs for Bun test compatibility
mock.module('node:fs', () => ({
  promises: {
    writeFile: mockWriteFile,
    mkdir: mockMkdir,
  },
}));

// Mock os module
const mockHomedir = mock().mockReturnValue('/home/user');
mock.module('node:os', () => ({
  homedir: mockHomedir,
}));

describe('OpenCodeProvider', () => {
  let provider: OpenCodeProvider;
  let mockLogger: Logger;
  let mockCompiledDoc: CompiledDoc;

  beforeEach(async () => {
    provider = new OpenCodeProvider();
    mockLogger = {
      debug: mock(),
      info: mock(),
      warn: mock(),
      error: mock(),
    };
    mockCompiledDoc = {
      source: {
        content: '---\nruleset: v0\n---\n\n# Test Content',
        frontmatter: { ruleset: 'v0' },
        blocks: [],
        imports: [],
        variables: [],
        markers: [],
        errors: [],
        warnings: [],
      },
      output: {
        content: createCompiledContent('# Test Rules\n\nSome content'),
        format: 'markdown',
        metadata: {},
      },
      metadata: {
        compiledAt: new Date().toISOString(),
        compiler: 'test',
        version: '1.0.0',
      },
    };

    // Clear all mocks before each test
    mockWriteFile.mockClear();
    mockMkdir.mockClear();
    mockBunWrite.mockClear();
    mockHomedir.mockClear();
    
    // Set up mock return values
    mockBunWrite.mockResolvedValue(10);
    mockMkdir.mockResolvedValue(undefined);
    
    // Mock Bun.write using spyOn
    spyOn(Bun, 'write').mockImplementation(mockBunWrite);
    
    // Mock fs.promises.mkdir directly to handle dynamic imports
    const fs = await import('node:fs');
    spyOn(fs.promises, 'mkdir').mockImplementation(mockMkdir);
  });

  afterEach(() => {
    // Bun test handles mock clearing automatically;
  });

  describe('configSchema', () => {
    it('should return a valid JSON schema', () => {
      const schema = provider.configSchema();
      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('outputPath');
      expect(schema.properties?.outputPath).toEqual({
        type: 'string',
        default: 'AGENTS.md',
        description: 'Path where the compiled rules file should be written (typically AGENTS.md)',
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
      expect(mockBunWrite).toHaveBeenCalledWith(
        destPath,
        mockCompiledDoc.output.content
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
      const mcpCalls = mockBunWrite.mock.calls.filter(
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
      const mcpCalls = mockBunWrite.mock.calls.filter(
        (call: [string, string]) => call[0] === customMcpPath
      );
      expect(mcpCalls.length).toBe(1);

      // Should still write global config
      const globalCalls = mockBunWrite.mock.calls.filter(
        (call: [string, string]) => call[0].includes('.config/opencode')
      );
      expect(globalCalls.length).toBe(1);

      expect(result?.generatedPaths).toContain(customMcpPath);
    });

    it('should handle write errors gracefully', async () => {
      const destPath = '/test/output/rules.md';
      const config = {};
      const error = new Error('Write failed');

      mockBunWrite.mockRejectedValueOnce(error);

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
      expect(mockBunWrite).toHaveBeenCalledTimes(1);
      expect(mockBunWrite).toHaveBeenCalledWith(
        destPath,
        mockCompiledDoc.output.content
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
      const mcpCalls = mockBunWrite.mock.calls.filter(
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
      expect(provider.type).toBe('web');
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
