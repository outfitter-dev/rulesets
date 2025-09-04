// TLDR: Unit tests for the Cursor destination plugin (Rulesets v0)

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompiledDoc, Logger } from '../../interfaces';
import { CursorPlugin } from '../cursor-plugin';

vi.mock('node:fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  },
}));

describe('CursorPlugin', () => {
  let plugin: CursorPlugin;
  let mockLogger: Logger;

  beforeEach(() => {
    plugin = new CursorPlugin();
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

  describe('name', () => {
    it('should return "cursor"', () => {
      expect(plugin.name).toBe('cursor');
    });
  });

  describe('configSchema', () => {
    it('should return a valid JSON schema', () => {
      const schema = plugin.configSchema();
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.properties?.outputPath).toBeDefined();
      expect(schema.properties?.priority).toBeDefined();
    });

    it('should enforce priority enum values', () => {
      const schema = plugin.configSchema();
      const priorityProp = schema.properties?.priority as {
        type: string;
        enum: string[];
      };
      expect(priorityProp.type).toBe('string');
      expect(priorityProp.enum).toEqual(['low', 'medium', 'high']);
    });
  });

  describe('write', () => {
    const mockCompiledDoc: CompiledDoc = {
      source: {
        content: '---\nrulesets: v0\n---\n\n# Test Content',
        frontmatter: { rulesets: 'v0' },
      },
      ast: {
        stems: [],
        imports: [],
        variables: [],
        markers: [],
      },
      output: {
        content: '# Test Content\n\nThis is test content.',
        metadata: { priority: 'high' },
      },
      context: {
        destinationId: 'cursor',
        config: {},
      },
    };

    it('should write content to the specified path', async () => {
      const destPath = '.cursor/rules/test.mdc';
      const config = {};

      await plugin.write({
        compiled: mockCompiledDoc,
        destPath,
        config,
        logger: mockLogger,
      });

      const resolvedPath = path.resolve(destPath);
      const dir = path.dirname(resolvedPath);

      expect(fs.mkdir).toHaveBeenCalledWith(dir, { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        resolvedPath,
        mockCompiledDoc.output.content,
        { encoding: 'utf8' }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Writing Cursor rules to: ${destPath}`
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Successfully wrote Cursor rules to: ${resolvedPath}`
      );
    });

    it('should use outputPath from config if provided', async () => {
      const destPath = '.cursor/rules/default.mdc';
      const config = { outputPath: '.cursor/rules/custom.mdc' };

      await plugin.write({
        compiled: mockCompiledDoc,
        destPath,
        config,
        logger: mockLogger,
      });

      const resolvedPath = path.resolve(config.outputPath);
      expect(fs.writeFile).toHaveBeenCalledWith(
        resolvedPath,
        mockCompiledDoc.output.content,
        { encoding: 'utf8' }
      );
    });

    it('should log debug information', async () => {
      const destPath = '.cursor/rules/test.mdc';
      const config = { priority: 'high' };

      await plugin.write({
        compiled: mockCompiledDoc,
        destPath,
        config,
        logger: mockLogger,
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Destination: cursor');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Config:')
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('Priority: high');
    });

    it('should handle mkdir errors', async () => {
      const destPath = '.cursor/rules/test.mdc';
      const error = new Error('Permission denied');
      vi.mocked(fs.mkdir).mockRejectedValueOnce(error);

      await expect(
        plugin.write({
          compiled: mockCompiledDoc,
          destPath,
          config: {},
          logger: mockLogger,
        })
      ).rejects.toThrow('Permission denied');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create directory'),
        error
      );
    });

    it('should handle writeFile errors', async () => {
      const destPath = '.cursor/rules/test.mdc';
      const error = new Error('Disk full');
      vi.mocked(fs.writeFile).mockRejectedValueOnce(error);

      await expect(
        plugin.write({
          compiled: mockCompiledDoc,
          destPath,
          config: {},
          logger: mockLogger,
        })
      ).rejects.toThrow('Disk full');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write file'),
        error
      );
    });
  });
});
