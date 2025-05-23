// TLDR: Tests for the Cursor destination plugin (mixd-v0)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import { CursorPlugin } from '../cursor-plugin';
import { CompiledDoc } from '../../interfaces/compiled-doc';
import { Logger } from '../../interfaces/logger';

// Mock fs.mkdir and fs.writeFile
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

describe('CursorPlugin', () => {
  let plugin: CursorPlugin;
  let mockLogger: Logger;
  let mockCompiled: CompiledDoc;

  beforeEach(() => {
    plugin = new CursorPlugin();
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    mockCompiled = {
      source: {
        content: '# Original Source',
        frontmatter: { mixdown: 'v0' },
      },
      ast: {
        stems: [],
        imports: [],
        variables: [],
        markers: [],
      },
      output: {
        content: '# Compiled Content for Cursor',
        metadata: { outputPath: '.cursor/rules/test.mdc' },
      },
      context: {
        destinationId: 'cursor',
        config: {},
      },
    };

    // Reset mock call history
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should have the correct name', () => {
    expect(plugin.name).toBe('cursor');
  });

  it('should define a configSchema', () => {
    const schema = plugin.configSchema();
    expect(schema).toBeDefined();
    expect(schema.type).toBe('object');
    expect(schema.properties).toHaveProperty('outputPath');
    expect(schema.required).toContain('outputPath');
  });

  it('should write content to the specified path', async () => {
    const destPath = '.cursor/rules/test.mdc';
    const config = { outputPath: destPath };

    await plugin.write({ compiled: mockCompiled, destPath, config, logger: mockLogger });

    // Check directory creation
    expect(fs.mkdir).toHaveBeenCalledWith('.cursor/rules', { recursive: true });
    
    // Check file writing
    expect(fs.writeFile).toHaveBeenCalledWith(
      destPath,
      mockCompiled.output.content,
      'utf8'
    );
    
    // Check logging
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining(`to ${destPath}`));
  });

  it('should handle write errors properly', async () => {
    const error = new Error('Write failed');
    (fs.writeFile as any).mockRejectedValueOnce(error);

    const destPath = '.cursor/rules/test.mdc';
    const config = { outputPath: destPath };

    await expect(
      plugin.write({ compiled: mockCompiled, destPath, config, logger: mockLogger })
    ).rejects.toThrow(error);

    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to write'));
  });
});