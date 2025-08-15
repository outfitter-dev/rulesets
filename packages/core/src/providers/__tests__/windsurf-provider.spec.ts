// TLDR: Unit tests for the Windsurf provider

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';
import path from 'node:path';
import type { CompiledDoc, Logger } from '@rulesets/types';
import { createCompiledContent } from '@rulesets/types';
import { WindsurfProvider } from '../windsurf-provider';

// Create mocks for file operations
const mockMkdir = mock();
const mockBunWrite = mock();

// Mock node:fs module
const mockFsModule = {
  promises: {
    mkdir: mockMkdir,
  },
};

describe('WindsurfProvider', () => {
  let provider: WindsurfProvider;
  let mockLogger: Logger;

  beforeEach(() => {
    provider = new WindsurfProvider();
    mockLogger = {
      debug: mock(),
      info: mock(),
      warn: mock(),
      error: mock(),
    };

    // Clear mock call history
    mockMkdir.mockClear();
    mockBunWrite.mockClear();

    // Set up mocks
    mockMkdir.mockResolvedValue(undefined);
    mockBunWrite.mockResolvedValue(10); // Mock successful write

    // Mock Bun.write using spyOn
    spyOn(Bun, 'write').mockImplementation(mockBunWrite);
  });

  afterEach(() => {
    // Bun test automatically restores spies after each test
  });

  describe('name', () => {
    it('should return "Windsurf"', () => {
      expect(provider.name).toBe('Windsurf');
    });
  });

  describe('configSchema', () => {
    it('should return a valid JSON schema', () => {
      const schema = provider.configSchema();
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.properties?.outputPath).toBeDefined();
      expect(schema.properties?.format).toBeDefined();

      const formatProp = schema.properties?.format as {
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
        blocks: [],
        imports: [],
        variables: [],
        markers: [],
        errors: [],
        warnings: [],
      },
      output: {
        content: createCompiledContent(
          '# Test Content\n\nThis is test content.'
        ),
        format: 'markdown',
        metadata: {},
      },
      metadata: {
        compiledAt: new Date().toISOString(),
        compiler: 'test',
        version: '1.0.0',
      },
    };

    it('should write content to the specified path', async () => {
      const destPath = '.windsurf/rules/test.md';
      const config = {};

      const result = await provider.write({
        compiled: mockCompiledDoc,
        destPath,
        config,
        logger: mockLogger,
      });

      const resolvedPath = path.resolve(destPath);

      expect(mockBunWrite).toHaveBeenCalledWith(
        resolvedPath,
        mockCompiledDoc.output.content
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Writing Windsurf rules to: ${resolvedPath}`
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Successfully wrote Windsurf rules to: ${resolvedPath}`
      );

      // Check return value
      expect(result.generatedPaths).toEqual([resolvedPath]);
      expect(result.metadata.provider).toBe('windsurf');
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
      expect(mockBunWrite).toHaveBeenCalledWith(
        resolvedPath,
        mockCompiledDoc.output.content
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

      expect(mockLogger.debug).toHaveBeenCalledWith('Provider: windsurf');
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

    it('should handle writeFile errors', async () => {
      const destPath = '.windsurf/rules/test.md';
      const error = new Error('Disk full');
      mockBunWrite.mockRejectedValueOnce(error);

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
