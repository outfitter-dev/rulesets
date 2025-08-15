// TLDR: Unit tests for the Cursor provider (Rulesets v0)

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
import { CursorProvider } from '../cursor-provider';

// Create mocks for file operations
const mockMkdir = mock();
const mockBunWrite = mock();

// Mock node:fs module
mock.module('node:fs', () => ({
  promises: {
    mkdir: mockMkdir,
  },
}));

describe('CursorProvider', () => {
  let provider: CursorProvider;
  let mockLogger: Logger;

  beforeEach(() => {
    provider = new CursorProvider();
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

  describe('id', () => {
    it('should return "cursor"', () => {
      expect(provider.id).toBe('cursor');
    });
  });

  describe('name', () => {
    it('should return "Cursor"', () => {
      expect(provider.name).toBe('Cursor');
    });
  });

  describe('type', () => {
    it('should return "ide"', () => {
      expect(provider.type).toBe('ide');
    });
  });

  describe('configSchema', () => {
    it('should return a valid JSON schema', () => {
      const schema = provider.configSchema();
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.properties?.outputPath).toBeDefined();
      expect(schema.properties?.priority).toBeDefined();
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
        metadata: { priority: 'high' },
      },
      metadata: {
        compiledAt: new Date().toISOString(),
        compiler: 'test',
        version: '1.0.0',
      },
    };

    it('should write content to the specified path', async () => {
      const destPath = '.cursor/rules/test.mdc';
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
        `Writing Cursor rules to: ${destPath}`
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Successfully wrote Cursor rules to: ${resolvedPath}`
      );

      // Check return value
      expect(result.generatedPaths).toEqual([resolvedPath]);
      expect(result.metadata.provider).toBe('cursor');
    });

    it('should use outputPath from config if provided', async () => {
      const destPath = '.cursor/rules/default.mdc';
      const config = { outputPath: '.cursor/rules/custom.mdc' };

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

    it('should log debug information', async () => {
      const destPath = '.cursor/rules/test.mdc';
      const config = { priority: 'high' };

      await provider.write({
        compiled: mockCompiledDoc,
        destPath,
        config,
        logger: mockLogger,
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Provider: cursor');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Config:')
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('Priority: high');
    });

    it('should handle mkdir errors', async () => {
      const destPath = '.cursor/rules/test.mdc';
      const error = new Error('Permission denied');

      // Mock mkdir to reject
      mockMkdir.mockRejectedValueOnce(error);

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
      const destPath = '.cursor/rules/test.mdc';
      const error = new Error('Disk full');

      // Mock Bun.write to reject
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
