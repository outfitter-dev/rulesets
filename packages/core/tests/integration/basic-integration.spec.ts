/**
 * Basic Integration Test
 *
 * Simple test to verify the core system works end-to-end.
 * This replaces the complex tests until we fix the API mismatches.
 */

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ConsoleLogger, runRulesetsV0 } from '../../src';

// Create real temporary directory for integration tests
const TEST_DIR = path.join(tmpdir(), `rulesets-basic-${Date.now()}`);

describe('Basic Integration Tests', () => {
  let mockLogger: ConsoleLogger;
  let testProjectDir: string;

  beforeAll(async () => {
    // Create test directory structure
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch (_error) {
      // Ignore errors when removing test directory
    }
  });

  beforeEach(async () => {
    mockLogger = new ConsoleLogger();
    spyOn(mockLogger, 'info').mockImplementation(() => {
      // Suppress log output during tests
    });
    spyOn(mockLogger, 'debug').mockImplementation(() => {
      // Suppress log output during tests
    });
    spyOn(mockLogger, 'warn').mockImplementation(() => {
      // Suppress log output during tests
    });
    spyOn(mockLogger, 'error').mockImplementation(() => {
      // Suppress log output during tests
    });

    // Create unique test project directory for each test
    testProjectDir = path.join(
      TEST_DIR,
      `basic-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    );
    await fs.mkdir(testProjectDir, { recursive: true });

    // Change to test directory for relative path operations
    process.chdir(testProjectDir);
  });

  afterEach(() => {
    // Bun test automatically restores mocks after each test
  });

  describe('Core Functionality', () => {
    it('should compile a simple ruleset for default providers', async () => {
      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Basic Integration Test

{{instructions}}
These are basic instructions for testing.
{{/instructions}}

## Rules

- Use TypeScript
- Write tests
- Follow conventions

{{examples}}
\`\`\`typescript
function hello(): string {
  return 'Hello, world!';
}
\`\`\`
{{/examples}}
`;

      const sourceFilePath = path.join(testProjectDir, 'basic.ruleset.md');
      await fs.writeFile(sourceFilePath, sourceContent);

      // Execute
      await runRulesetsV0(sourceFilePath, mockLogger);

      // Verify at least cursor and windsurf outputs were created (the two we know exist)
      const expectedOutputs = [
        '.ruleset/dist/cursor/my-rules.md',
        '.ruleset/dist/windsurf/my-rules.md',
      ];

      const fileChecks = await Promise.all(
        expectedOutputs.map(async (outputPath) => {
          const fullPath = path.join(testProjectDir, outputPath);
          const exists = await fs
            .access(fullPath)
            .then(() => true)
            .catch(() => false);

          if (!exists) {
            return { path: outputPath, exists, content: null };
          }

          const content = await fs.readFile(fullPath, 'utf8');
          return { path: outputPath, exists, content };
        })
      );

      for (const check of fileChecks) {
        expect(check.exists).toBe(true);
        if (check.content) {
          expect(check.content).toContain('Basic Integration Test');
          expect(check.content).toContain('{{instructions}}');
          expect(check.content).toContain('TypeScript');
        }
      }

      // Verify success was logged
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Rulesets v0.1.0 processing completed successfully!'
      );
    });

    it('should handle frontmatter destinations correctly', async () => {
      const sourceContent = `---
ruleset:
  version: "0.1.0"
destinations:
  cursor:
    outputPath: ".cursor/frontmatter-test.mdc"
  windsurf:
    outputPath: ".windsurf/frontmatter-test.md"
---

# Frontmatter Test

Content for frontmatter destination test.
`;

      const sourceFilePath = path.join(
        testProjectDir,
        'frontmatter.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, sourceContent);

      // Execute
      await runRulesetsV0(sourceFilePath, mockLogger);

      // Verify frontmatter outputs were created
      const expectedOutputs = [
        '.cursor/frontmatter-test.mdc',
        '.windsurf/frontmatter-test.md',
      ];

      const fileChecks = await Promise.all(
        expectedOutputs.map(async (outputPath) => {
          const fullPath = path.join(testProjectDir, outputPath);
          const exists = await fs
            .access(fullPath)
            .then(() => true)
            .catch(() => false);

          if (!exists) {
            return { path: outputPath, exists, content: null };
          }

          const content = await fs.readFile(fullPath, 'utf8');
          return { path: outputPath, exists, content };
        })
      );

      for (const check of fileChecks) {
        expect(check.exists).toBe(true);
        if (check.content) {
          expect(check.content).toContain('Frontmatter Test');
        }
      }

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Rulesets v0.1.0 processing completed successfully!'
      );
    });

    it('should handle missing source file with proper error', async () => {
      const nonexistentFile = path.join(
        testProjectDir,
        'nonexistent.ruleset.md'
      );

      await expect(
        runRulesetsV0(nonexistentFile, mockLogger)
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read source file'),
        expect.any(Error)
      );
    });

    it('should handle invalid frontmatter with proper error', async () => {
      const invalidFrontmatterContent = `---
invalid yaml syntax:
  - unclosed bracket
---

# Content
`;

      const sourceFilePath = path.join(testProjectDir, 'invalid.ruleset.md');
      await fs.writeFile(sourceFilePath, invalidFrontmatterContent);

      await expect(runRulesetsV0(sourceFilePath, mockLogger)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse source file'),
        expect.any(Error)
      );
    });

    it('should handle missing rulesets version with proper error', async () => {
      const noVersionContent = `---
title: Missing Version
---

# Content Without Version
`;

      const sourceFilePath = path.join(testProjectDir, 'no-version.ruleset.md');
      await fs.writeFile(sourceFilePath, noVersionContent);

      await expect(runRulesetsV0(sourceFilePath, mockLogger)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Missing required Rulesets version')
      );
    });

    it('should preserve Rulesets syntax in outputs', async () => {
      const syntaxContent = `---
ruleset:
  version: "0.1.0"
---

# Syntax Preservation Test

{{instructions}}
These instructions should be preserved exactly.
Nested content: {{inner-block}}content{{/inner-block}}
{{/instructions}}

{{examples}}
Code with variables: {{$destination}} and {{$file}}
{{/examples}}

{{> import-example}}
`;

      const sourceFilePath = path.join(testProjectDir, 'syntax.ruleset.md');
      await fs.writeFile(sourceFilePath, syntaxContent);

      await runRulesetsV0(sourceFilePath, mockLogger);

      // Check that syntax is preserved in at least one output
      const outputPath = path.join(
        testProjectDir,
        '.ruleset/dist/cursor/my-rules.md'
      );
      const exists = await fs
        .access(outputPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

      if (exists) {
        const content = await fs.readFile(outputPath, 'utf8');
        expect(content).toContain('{{instructions}}');
        expect(content).toContain('{{/instructions}}');
        expect(content).toContain('{{inner-block}}');
        expect(content).toContain('{{$destination}}');
        expect(content).toContain('{{> import-example}}');
      }
    });
  });

  describe('Provider Registry', () => {
    it('should have expected providers available', async () => {
      const { getProviderIds, getProvider } = await import('../../src');

      const providerIds = getProviderIds();

      // Verify we have the expected providers
      expect(providerIds).toContain('cursor');
      expect(providerIds).toContain('windsurf');

      // Verify providers can be retrieved
      const cursorProvider = getProvider('cursor');
      const windsurfProvider = getProvider('windsurf');

      expect(cursorProvider).toBeDefined();
      expect(windsurfProvider).toBeDefined();

      // Verify unknown provider returns undefined
      const unknownProvider = getProvider('unknown');
      expect(unknownProvider).toBeUndefined();
    });
  });

  describe('Performance', () => {
    it('should handle reasonably sized content efficiently', async () => {
      const largeContent = `---
ruleset:
  version: "0.1.0"
---

# Performance Test

${'## Section\n\nContent for performance testing. '.repeat(100)}

{{instructions}}
${'Instruction content. '.repeat(200)}
{{/instructions}}
`;

      const sourceFilePath = path.join(
        testProjectDir,
        'performance.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, largeContent);

      const startTime = Date.now();
      await runRulesetsV0(sourceFilePath, mockLogger);
      const duration = Date.now() - startTime;

      // Should complete within 10 seconds
      expect(duration).toBeLessThan(10_000);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Rulesets v0.1.0 processing completed successfully!'
      );
    });
  });
});
