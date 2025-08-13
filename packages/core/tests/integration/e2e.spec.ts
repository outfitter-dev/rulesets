// TLDR: End-to-end integration tests for Rulesets v0

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsoleLogger, runRulesetsV0 } from '../../src';

// Mock fs to avoid actual file I/O in tests
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  },
}));

describe('E2E Integration Tests', () => {
  let mockLogger: ConsoleLogger;

  beforeEach(() => {
    mockLogger = new ConsoleLogger();
    vi.spyOn(mockLogger, 'info').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'debug').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'warn').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'error').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('runRulesetsV0', () => {
    const sampleContent = `---
ruleset: { version: "0.1.0" }
title: Integration Test Rules
description: Testing the full pipeline
destinations:
  cursor:
    outputPath: ".cursor/rules/test.mdc"
    priority: high
  windsurf:
    outputPath: ".windsurf/rules/test.md"
    format: markdown
---

# Test Rules

This is a test document with {{blocks}} and {{$variables}} that should pass through.`;

    it('should complete the full pipeline successfully', async () => {
      // Mock file read
      vi.mocked(fs.readFile).mockResolvedValueOnce(sampleContent);

      // Run the pipeline
      await runRulesetsV0('./test.ruleset.md', mockLogger);

      // Verify file was read
      expect(fs.readFile).toHaveBeenCalledWith('./test.ruleset.md', 'utf8');

      // Verify directories were created
      expect(fs.mkdir).toHaveBeenCalledWith(
        path.dirname(path.resolve('.cursor/rules/test.mdc')),
        {
          recursive: true,
        }
      );
      expect(fs.mkdir).toHaveBeenCalledWith(
        path.dirname(path.resolve('.windsurf/rules/test.md')),
        {
          recursive: true,
        }
      );

      // Verify files were written with correct content
      const expectedContent =
        '# Test Rules\n\nThis is a test document with {{blocks}} and {{$variables}} that should pass through.';
      expect(fs.writeFile).toHaveBeenCalledTimes(2);
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.resolve('.cursor/rules/test.mdc'),
        expectedContent,
        { encoding: 'utf8' }
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.resolve('.windsurf/rules/test.md'),
        expectedContent,
        { encoding: 'utf8' }
      );

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Rulesets v0.1.0 processing completed successfully!'
      );
    });

    it('should handle missing frontmatter gracefully', async () => {
      const contentWithoutFrontmatter =
        '# Just Content\n\nNo frontmatter here.';
      vi.mocked(fs.readFile).mockResolvedValueOnce(contentWithoutFrontmatter);

      await runRulesetsV0('./test.ruleset.md', mockLogger);

      // Should still process for all destinations
      expect(fs.writeFile).toHaveBeenCalledTimes(2); // cursor and windsurf
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No frontmatter found')
      );
    });

    it('should fail on lint errors', async () => {
      const invalidContent = `---
title: Missing rulesets version
---

# Content`;
      vi.mocked(fs.readFile).mockResolvedValueOnce(invalidContent);

      await expect(
        runRulesetsV0('./test.ruleset.md', mockLogger)
      ).rejects.toThrow('Linting failed with errors');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Missing required Rulesets version declaration')
      );
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle file read errors', async () => {
      const error = new Error('File not found');
      vi.mocked(fs.readFile).mockRejectedValueOnce(error);

      await expect(
        runRulesetsV0('./nonexistent.ruleset.md', mockLogger)
      ).rejects.toThrow('File not found');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to read source file: ./nonexistent.ruleset.md',
        error
      );
    });

    it('should process only specified destinations', async () => {
      const contentWithOneDestination = `---
ruleset: { version: "0.1.0" }
title: Single Destination
destinations:
  cursor:
    outputPath: ".cursor/rules/single.mdc"
---

# Single Destination Content`;
      vi.mocked(fs.readFile).mockResolvedValueOnce(contentWithOneDestination);

      await runRulesetsV0('./test.ruleset.md', mockLogger);

      // Should only write to cursor, not windsurf
      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.resolve('.cursor/rules/single.mdc'),
        expect.any(String),
        { encoding: 'utf8' }
      );
    });

    it('should handle plugin write errors', async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce(sampleContent);
      const writeError = new Error('Permission denied');
      vi.mocked(fs.writeFile).mockRejectedValueOnce(writeError);

      await expect(
        runRulesetsV0('./test.ruleset.md', mockLogger)
      ).rejects.toThrow('Permission denied');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write cursor output'),
        writeError
      );
    });

    it('should preserve Rulesets markers in output', async () => {
      const contentWithMarkers = `---
ruleset: { version: "0.1.0" }
title: Markers Test
---

{{instructions}}
These are instructions that should be preserved.
{{/instructions}}

{{> common-rules}}

Variable: {{$myVar}}`;
      vi.mocked(fs.readFile).mockResolvedValueOnce(contentWithMarkers);

      await runRulesetsV0('./test.ruleset.md', mockLogger);

      const expectedOutput = `{{instructions}}
These are instructions that should be preserved.
{{/instructions}}

{{> common-rules}}

Variable: {{$myVar}}`;

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expectedOutput,
        {
          encoding: 'utf8',
        }
      );
    });

    it('should use default paths when not specified', async () => {
      const minimalContent = `---
ruleset: { version: "0.1.0" }
---

# Content`;
      vi.mocked(fs.readFile).mockResolvedValueOnce(minimalContent);

      await runRulesetsV0('./test.ruleset.md', mockLogger);

      // Should use default paths
      expect(fs.writeFile).toHaveBeenCalledTimes(2);
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.resolve('.ruleset/dist/cursor/my-rules.md'),
        expect.any(String),
        { encoding: 'utf8' }
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.resolve('.ruleset/dist/windsurf/my-rules.md'),
        expect.any(String),
        { encoding: 'utf8' }
      );
    });
  });
});
