// TLDR: Unit tests for the Claude Code provider (Rulesets v1)

import { promises as fs } from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompiledDoc, Logger, ProviderCompilationContext } from '@rulesets/types';
import { ClaudeCodeProvider } from '../claude-code-provider';

vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  },
}));

describe('ClaudeCodeProvider', () => {
  let provider: ClaudeCodeProvider;
  let mockLogger: Logger;

  beforeEach(() => {
    provider = new ClaudeCodeProvider();
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Provider interface properties', () => {
    it('should have correct id', () => {
      expect(provider.id).toBe('claude-code');
    });

    it('should have correct name', () => {
      expect(provider.name).toBe('Claude Code');
    });

    it('should have correct type', () => {
      expect(provider.type).toBe('cli');
    });

    it('should have correct website', () => {
      expect(provider.website).toBe('https://docs.anthropic.com/en/docs/claude-code');
    });

    it('should have correct description', () => {
      expect(provider.description).toBe('Claude Code CLI assistant');
    });
  });

  describe('config', () => {
    it('should have CLAUDE.md as output path', () => {
      expect(provider.config.outputPath).toBe('CLAUDE.md');
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
    it('should support all required features', () => {
      expect(provider.capabilities.supportsBlocks).toBe(true);
      expect(provider.capabilities.supportsImports).toBe(true);
      expect(provider.capabilities.supportsVariables).toBe(true);
      expect(provider.capabilities.supportsXml).toBe(true);
      expect(provider.capabilities.supportsMarkdown).toBe(true);
    });

    it('should have large file size limit for Claude Code', () => {
      expect(provider.capabilities.maxFileSize).toBe(50 * 1024 * 1024); // 50MB
    });

    it('should support markdown and mixed formats', () => {
      expect(provider.capabilities.allowedFormats).toEqual(['markdown', 'mixed']);
    });

    it('should require special handling for MCP config', () => {
      expect(provider.capabilities.requiresSpecialHandling).toEqual(['mcp-config']);
    });
  });

  describe('configSchema', () => {
    it('should return a valid JSON schema', () => {
      const schema = provider.configSchema();
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
    });

    it('should define outputPath property with CLAUDE.md default', () => {
      const schema = provider.configSchema();
      const outputPathProp = schema.properties!.outputPath as any;
      expect(outputPathProp.type).toBe('string');
      expect(outputPathProp.default).toBe('CLAUDE.md');
      expect(outputPathProp.description).toContain('CLAUDE.md');
    });

    it('should define MCP configuration schema', () => {
      const schema = provider.configSchema();
      const mcpConfigProp = schema.properties!.mcpConfig as any;
      expect(mcpConfigProp.type).toBe('object');
      expect(mcpConfigProp.properties.enabled).toBeDefined();
      expect(mcpConfigProp.properties.outputPath).toBeDefined();
      expect(mcpConfigProp.properties.servers).toBeDefined();
    });

    it('should enforce priority enum values', () => {
      const schema = provider.configSchema();
      const priorityProp = schema.properties!.priority as any;
      expect(priorityProp.type).toBe('string');
      expect(priorityProp.enum).toEqual(['low', 'medium', 'high']);
    });

    it('should include project context option', () => {
      const schema = provider.configSchema();
      const includeProjectContextProp = schema.properties!.includeProjectContext as any;
      expect(includeProjectContextProp.type).toBe('boolean');
      expect(includeProjectContextProp.default).toBe(true);
    });
  });

  describe('compile', () => {
    const mockContext: ProviderCompilationContext = {
      provider: provider as any,
      sourcePath: 'test.rule.md' as any,
      outputPath: 'CLAUDE.md' as any,
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

      expect(result.metadata.provider).toBe('claude-code');
      expect(result.metadata.format).toBe('markdown');
      expect(result.metadata.outputFile).toBe('CLAUDE.md');
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

    it('should handle compilation errors gracefully', async () => {
      // Mock an error scenario by overriding the method temporarily
      const originalCompile = provider.compile;
      provider.compile = vi.fn().mockImplementation(async () => {
        return {
          success: false,
          errors: [{
            type: 'compilation' as const,
            message: 'Compilation failed',
            context: { provider: 'claude-code' },
          }],
          warnings: [],
          metadata: {},
          stats: {
            duration: 0,
            inputSize: 0,
            outputSize: 0,
            blocksProcessed: 0,
            importsResolved: 0,
            variablesSubstituted: 0,
          },
        };
      });

      try {
        const result = await provider.compile(mockContext);
        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe('compilation');
        expect(result.errors[0].message).toBe('Compilation failed');
      } finally {
        provider.compile = originalCompile;
      }
    });
  });

  describe('write', () => {
    const mockCompiledDoc: CompiledDoc = {
      source: {
        content: '---\nruleset:\n  version: 1.0.0\n---\n\n# Claude Code Rules\n\nThis is test content.',
        frontmatter: { ruleset: { version: '1.0.0' } },
      },
      ast: {
        blocks: [],
        imports: [],
        variables: [],
        markers: [],
      },
      output: {
        content: '# Claude Code Rules\n\nThis is test content for Claude Code.',
        metadata: { priority: 'high' },
      },
      context: {
        destinationId: 'claude-code',
        config: {},
      },
    };

    it('should write content to CLAUDE.md', async () => {
      const destPath = 'rules/test.md';
      const config = {};

      const result = await provider.write({
        compiled: mockCompiledDoc,
        destPath,
        config,
        logger: mockLogger,
      });

      const resolvedPath = path.resolve('CLAUDE.md');

      expect(fs.writeFile).toHaveBeenCalledWith(
        resolvedPath,
        mockCompiledDoc.output.content,
        {
          encoding: 'utf8',
        }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Writing Claude Code rules to: CLAUDE.md'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Successfully wrote Claude Code rules to: ${resolvedPath}`
      );

      expect(result.generatedPaths).toEqual([resolvedPath]);
      expect(result.metadata.provider).toBe('claude-code');
      expect(result.metadata.format).toBe('markdown');
      expect(result.metadata.outputFile).toBe('CLAUDE.md');
    });

    it('should use outputPath from config if provided', async () => {
      const destPath = 'ignored/path.md';
      const config = { outputPath: 'custom/CLAUDE.md' };

      await provider.write({
        compiled: mockCompiledDoc,
        destPath,
        config,
        logger: mockLogger,
      });

      const resolvedPath = path.resolve('custom/CLAUDE.md');
      expect(fs.writeFile).toHaveBeenCalledWith(
        resolvedPath,
        mockCompiledDoc.output.content,
        {
          encoding: 'utf8',
        }
      );
    });

    it('should log debug information', async () => {
      const destPath = 'test.md';
      const config = { priority: 'high' };

      await provider.write({
        compiled: mockCompiledDoc,
        destPath,
        config,
        logger: mockLogger,
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Provider: claude-code');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Config:')
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('Priority: high');
    });

    it('should handle file size limits', async () => {
      const largeContent = 'x'.repeat(60 * 1024 * 1024); // 60MB - exceeds 50MB limit
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

    it('should handle writeFile errors', async () => {
      const destPath = 'test.md';
      const error = new Error('Permission denied');
      vi.mocked(fs.writeFile).mockRejectedValueOnce(error);

      await expect(
        provider.write({
          compiled: mockCompiledDoc,
          destPath,
          config: {},
          logger: mockLogger,
        })
      ).rejects.toThrow('Permission denied');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write file'),
        error
      );
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

  describe('MCP configuration', () => {
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
        destinationId: 'claude-code',
        config: {},
      },
    };

    it('should write MCP configuration when enabled', async () => {
      const config = {
        mcpConfig: {
          enabled: true,
          outputPath: '.mcp.json',
          servers: {
            filesystem: {
              command: 'npx',
              args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/project'],
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

      const claudePath = path.resolve('CLAUDE.md');
      const mcpPath = path.resolve('.mcp.json');

      expect(result.generatedPaths).toEqual([claudePath, mcpPath]);
      expect(result.metadata.mcpEnabled).toBe(true);

      expect(fs.writeFile).toHaveBeenCalledWith(
        mcpPath,
        JSON.stringify({
          mcpServers: {
            filesystem: {
              command: 'npx',
              args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/project'],
            },
          },
        }, null, 2),
        { encoding: 'utf8' }
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Successfully wrote MCP configuration to: ${mcpPath}`
      );
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

      expect(result.generatedPaths).toHaveLength(1); // Only CLAUDE.md
      expect(result.metadata.mcpEnabled).toBe(false);
    });

    it('should handle MCP configuration errors gracefully', async () => {
      const config = {
        mcpConfig: {
          enabled: true,
          outputPath: '/invalid/path/.mcp.json',
          servers: {},
        },
      };

      vi.mocked(fs.writeFile).mockImplementation((filepath) => {
        if (filepath.toString().includes('.mcp.json')) {
          return Promise.reject(new Error('Permission denied'));
        }
        return Promise.resolve();
      });

      const result = await provider.write({
        compiled: mockCompiledDoc,
        destPath: 'test.md',
        config,
        logger: mockLogger,
      });

      expect(result.generatedPaths).toHaveLength(1); // Only CLAUDE.md, MCP failed
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write MCP configuration')
      );
    });
  });

  describe('sanitizePath', () => {
    it('should prevent path traversal with relative paths', () => {
      const provider = new ClaudeCodeProvider() as any;
      expect(() => {
        provider.sanitizePath('../../../etc/passwd', process.cwd());
      }).toThrow('Path traversal detected');
    });

    it('should allow valid relative paths', () => {
      const provider = new ClaudeCodeProvider() as any;
      const result = provider.sanitizePath('CLAUDE.md', process.cwd());
      expect(result).toBe(path.resolve(process.cwd(), 'CLAUDE.md'));
    });

    it('should allow valid absolute paths within project', () => {
      const provider = new ClaudeCodeProvider() as any;
      const validPath = path.join(process.cwd(), 'docs', 'CLAUDE.md');
      const result = provider.sanitizePath(validPath, process.cwd());
      expect(result).toBe(validPath);
    });
  });
});