// TLDR: Tests for the Windsurf destination plugin (mixd-v0)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import { WindsurfPlugin } from '../windsurf-plugin';
import { CompiledDoc } from '../../interfaces/compiled-doc';
import { Logger } from '../../interfaces/logger';

// Mock fs.mkdir and fs.writeFile
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

describe('WindsurfPlugin', () => {
  let plugin: WindsurfPlugin;
  let mockLogger: Logger;
  let mockCompiled: CompiledDoc;

  beforeEach(() => {
    plugin = new WindsurfPlugin();
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
        content: '# Compiled Content for Windsurf',
        metadata: { 
          outputPath: '.windsurf/rules/test.md',
          trigger: 'always_on',
        },
      },
      context: {
        destinationId: 'windsurf',
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
    expect(plugin.name).toBe('windsurf');
  });

  it('should define a configSchema', () => {
    const schema = plugin.configSchema();
    expect(schema).toBeDefined();
    expect(schema.type).toBe('object');
    expect(schema.properties).toHaveProperty('outputPath');
    expect(schema.properties).toHaveProperty('trigger');
    expect(schema.required).toContain('outputPath');
    
    // Check the enum values for trigger
    const triggerEnum = schema.properties?.trigger?.enum as string[];
    expect(triggerEnum).toContain('always_on');
    expect(triggerEnum).toContain('glob');
    expect(triggerEnum).toContain('model_decision');
    expect(triggerEnum).toContain('manual');
  });

  it('should write content to the specified path', async () => {
    const destPath = '.windsurf/rules/test.md';
    const config = { 
      outputPath: destPath,
      trigger: 'always_on'
    };

    await plugin.write({ compiled: mockCompiled, destPath, config, logger: mockLogger });

    // Check directory creation
    expect(fs.mkdir).toHaveBeenCalledWith('.windsurf/rules', { recursive: true });
    
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

    const destPath = '.windsurf/rules/test.md';
    const config = { outputPath: destPath };

    await expect(
      plugin.write({ compiled: mockCompiled, destPath, config, logger: mockLogger })
    ).rejects.toThrow(error);

    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to write'));
  });
});