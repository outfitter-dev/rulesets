// TLDR: Unit tests for the Windsurf destination plugin (mixd-v0)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { WindsurfPlugin } from '../windsurf-plugin';
import type { CompiledDoc, Logger } from '../../interfaces';

vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  },
}));

describe('WindsurfPlugin', () => {
  let plugin: WindsurfPlugin;
  let mockLogger: Logger;

  beforeEach(() => {
    plugin = new WindsurfPlugin();
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
      expect(plugin.name).toBe('windsurf');
    });
  });

  describe('configSchema', () => {
    it('should return a valid JSON schema', () => {
      const schema = plugin.configSchema();
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.properties!.outputPath).toBeDefined();
      expect(schema.properties!.format).toBeDefined();
      
      const formatProp = schema.properties!.format as { enum: string[]; default: string };
      expect(formatProp.enum).toContain('markdown');
      expect(formatProp.enum).toContain('xml');
      expect(formatProp.default).toBe('markdown');
    });
  });

  describe('write', () => {
    const mockCompiledDoc: CompiledDoc = {
      source: {
        content: '---\nmixdown: v0\n---\n\n# Test Content',
        frontmatter: { mixdown: 'v0' },
      },
      ast: {
        stems: [],
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
        { encoding: 'utf8' },
      );
      expect(mockLogger.info).toHaveBeenCalledWith(`Writing Windsurf rules to: ${resolvedPath}`);
      expect(mockLogger.info).toHaveBeenCalledWith(`Successfully wrote Windsurf rules to: ${resolvedPath}`);
    });

    it('should use outputPath from config if provided', async () => {
      const destPath = '.windsurf/rules/default.md';
      const config = { outputPath: '.windsurf/rules/custom.md' };

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
        { encoding: 'utf8' },
      );
    });

    it('should log format information', async () => {
      const destPath = '.windsurf/rules/test.md';
      const config = { format: 'xml' };

      await plugin.write({
        compiled: mockCompiledDoc,
        destPath,
        config,
        logger: mockLogger,
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Destination: windsurf');
      expect(mockLogger.debug).toHaveBeenCalledWith(`Config: ${JSON.stringify(config)}`);
      expect(mockLogger.debug).toHaveBeenCalledWith('Format: xml');
    });

    it('should default to markdown format', async () => {
      const destPath = '.windsurf/rules/test.md';
      const config = {};

      await plugin.write({
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
        plugin.write({
          compiled: mockCompiledDoc,
          destPath,
          config: {},
          logger: mockLogger,
        }),
      ).rejects.toThrow('Permission denied');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create directory'),
        error,
      );
    });

    it('should handle writeFile errors', async () => {
      const destPath = '.windsurf/rules/test.md';
      const error = new Error('Disk full');
      vi.mocked(fs.writeFile).mockRejectedValueOnce(error);

      await expect(
        plugin.write({
          compiled: mockCompiledDoc,
          destPath,
          config: {},
          logger: mockLogger,
        }),
      ).rejects.toThrow('Disk full');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write file'),
        error,
      );
    });
  });
/* ------------------------------------------------------------------
     Additional edge-case coverage for WindsurfPlugin.write()
     Framework: Vitest
  ------------------------------------------------------------------ */
  describe('edge cases', () => {
    it('should ignore non-string outputPath values and fall back to destPath', async () => {
      const destPath = '.windsurf/rules/fallback.md';
      const config = { outputPath: 42 }; // invalid, not a string

      await plugin.write({
        compiled: mockCompiledDoc,
        destPath,
        config: config as unknown as Record<string, unknown>,
        logger: mockLogger,
      });

      const expectedPath = path.resolve(destPath);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expectedPath,
        mockCompiledDoc.output.content,
        { encoding: 'utf8' },
      );
    });

    it('should resolve relative destPath to an absolute path before writing', async () => {
      const destPath = 'relative/path/to/rules.md'; // intentionally relative

      await plugin.write({
        compiled: mockCompiledDoc,
        destPath,
        config: {},
        logger: mockLogger,
      });

      const resolved = path.resolve(destPath);
      expect(fs.writeFile).toHaveBeenCalledWith(
        resolved,
        mockCompiledDoc.output.content,
        { encoding: 'utf8' },
      );
    });

    it('should keep fs mocks isolated between sequential writes', async () => {
      const firstPath = '.windsurf/rules/first.md';
      await plugin.write({
        compiled: mockCompiledDoc,
        destPath: firstPath,
        config: {},
        logger: mockLogger,
      });

      // reset mock call history but NOT implementation
      vi.clearAllMocks();

      const secondPath = '.windsurf/rules/second.md';
      await plugin.write({
        compiled: mockCompiledDoc,
        destPath: secondPath,
        config: {},
        logger: mockLogger,
      });

      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.resolve(secondPath),
        mockCompiledDoc.output.content,
        { encoding: 'utf8' },
      );
    });
  });
});