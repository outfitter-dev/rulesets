// TLDR: Integration tests for end-to-end Mixdown v0 flow (mixd-v0)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { runMixdownV0 } from '../../src';
import { ConsoleLogger } from '../../src/interfaces/logger';

// Mock fs modules
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

describe('Mixdown v0 End-to-End', () => {
  const sampleContent = `---
mixdown: v0
title: Test Rule
description: A test rule for Mixdown v0
destinations:
  cursor:
    outputPath: ".cursor/rules/test-rule.mdc"
  windsurf:
    outputPath: ".windsurf/rules/test-rule.md"
    trigger: "always_on"
---

# Test Rule Content

This is a simple test rule for Mixdown v0.
`;

  beforeEach(() => {
    // Mock readFile to return our sample content
    (fs.readFile as any).mockResolvedValue(sampleContent);
    
    // Reset mock call history
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should process a source file to multiple destinations', async () => {
    const logger = new ConsoleLogger();
    // Spy on logger methods
    const infoSpy = vi.spyOn(logger, 'info');
    const errorSpy = vi.spyOn(logger, 'error');
    
    await runMixdownV0('test.mix.md', logger);
    
    // Verify file was read
    expect(fs.readFile).toHaveBeenCalledWith('test.mix.md', 'utf8');
    
    // Verify directories were created
    expect(fs.mkdir).toHaveBeenCalledWith(path.dirname('.mixdown/dist/.cursor/rules/test-rule.mdc'), { recursive: true });
    expect(fs.mkdir).toHaveBeenCalledWith(path.dirname('.mixdown/dist/.windsurf/rules/test-rule.md'), { recursive: true });
    
    // Verify files were written
    expect(fs.writeFile).toHaveBeenCalledTimes(2);
    expect(fs.writeFile).toHaveBeenCalledWith(
      '.mixdown/dist/.cursor/rules/test-rule.mdc',
      expect.stringContaining('# Test Rule Content'),
      'utf8'
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      '.mixdown/dist/.windsurf/rules/test-rule.md',
      expect.stringContaining('# Test Rule Content'),
      'utf8'
    );
    
    // Verify process completed successfully
    expect(infoSpy).toHaveBeenCalledWith('Mixdown v0 processing completed successfully');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should skip processing when there are linting errors', async () => {
    // Create content with missing required fields
    const invalidContent = `---
title: Invalid Rule
# Missing required mixdown key and destinations
---

Some content
`;
    (fs.readFile as any).mockResolvedValue(invalidContent);
    
    const logger = new ConsoleLogger();
    // Spy on logger methods
    const errorSpy = vi.spyOn(logger, 'error');
    
    await runMixdownV0('invalid.mix.md', logger);
    
    // Verify file was read
    expect(fs.readFile).toHaveBeenCalledWith('invalid.mix.md', 'utf8');
    
    // Verify the error was logged
    expect(errorSpy).toHaveBeenCalledWith('Linting errors found:');
    expect(errorSpy).toHaveBeenCalledWith('Processing stopped due to linting errors.');
    
    // Verify no files were written
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should respect custom output directory configuration', async () => {
    const logger = new ConsoleLogger();
    
    await runMixdownV0('test.mix.md', logger, {
      outputDir: 'custom/output/dir'
    });
    
    // Verify files were written to the custom output directory
    expect(fs.writeFile).toHaveBeenCalledWith(
      'custom/output/dir/.cursor/rules/test-rule.mdc',
      expect.any(String),
      'utf8'
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      'custom/output/dir/.windsurf/rules/test-rule.md',
      expect.any(String),
      'utf8'
    );
  });
});