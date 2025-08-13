// TLDR: Unit tests for the Windsurf provider

import type { CompiledDoc, Logger } from '@rulesets/types';
import { promises as fs } from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WindsurfProvider } from '../windsurf-provider';

vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  },
}));

describe('WindsurfProvider', () => {
  let provider: WindsurfProvider;
  let mockLogger: Logger;

  beforeEach(() => {
    provider = new WindsurfProvider();
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
    it('should return "windsurf"', () => {
      expect(provider.name).toBe('windsurf');
    });
  });

  describe('configSchema', () => {
    it('should return a valid JSON schema', () => {
      const schema = provider.configSchema();
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.properties!.outputPath).toBeDefined();
      expect(schema.properties!.format).toBeDefined();

      const formatProp = schema.properties!.format as {
        enum: string[];
        default: string;
      };
      expect(formatProp.enum).toContain('markdown');
      expect(formatProp.enum).toContain('xml');
      expect(formatProp.default).toBe('markdown');
    });
  });

  describe('write', () => {
    const mockCompiledDoc: CompiledDoc = {
      source: {
        content: '---\nruleset: v0\n---\n\n# Test Content',
        frontmatter: { ruleset: 'v0' },
      },
      ast: {
        blocks: [],
        imports: [],
        variables: [],
        markers: [],
      },
      output: {
        content: '# Test Content\n\nThis is test content.',
        metadata: {},
      },
      context: {
        destinationId: 'windsurf',
        config: {},
      },
    };

    it('should write content to the specified path', async () => {
      const destPath = '.windsurf/rules/test.md';
      const config = {};

      await provider.write({
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
        {
          encoding: 'utf8',
        }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Writing Windsurf rules to: ${resolvedPath}`
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Successfully wrote Windsurf rules to: ${resolvedPath}`
      );
    });

    it('should use outputPath from config if provided', async () => {
      const destPath = '.windsurf/rules/default.md';
      const config = { outputPath: '.windsurf/rules/custom.md' };

      await provider.write({
        compiled: mockCompiledDoc,
        destPath,
        config,
        logger: mockLogger,
      });

      const resolvedPath = path.resolve(config.outputPath);
      expect(fs.writeFile).toHaveBeenCalledWith(
        resolvedPath,
        mockCompiledDoc.output.content,
        {
          encoding: 'utf8',
        }
      );
    });

    it('should log format information', async () => {
      const destPath = '.windsurf/rules/test.md';
      const config = { format: 'xml' };

      await provider.write({
        compiled: mockCompiledDoc,
        destPath,
        config,
        logger: mockLogger,
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Destination: windsurf');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Config: ${JSON.stringify(config)}`
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('Format: xml');
    });

    it('should default to markdown format', async () => {
      const destPath = '.windsurf/rules/test.md';
      const config = {};

      await provider.write({
        compiled: mockCompiledDoc,
        destPath,
        config,
        logger: mockLogger,
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Format: markdown');
    });

    it('should handle mkdir errors', async () => {
      const destPath = '.windsurf/rules/test.md';
      const error = new Error('Permission denied');
      vi.mocked(fs.mkdir).mockRejectedValueOnce(error);

      await expect(
        provider.write({
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
      const destPath = '.windsurf/rules/test.md';
      const error = new Error('Disk full');
      vi.mocked(fs.writeFile).mockRejectedValueOnce(error);

      await expect(
        provider.write({
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
