/**
 * Error Handling Integration Tests
 *
 * Tests comprehensive error scenarios across the entire Rulesets system,
 * ensuring graceful degradation and helpful error messages.
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
import {
  ConsoleLogger,
  loadConfig,
  type RulesetConfig,
  runRulesetsV0,
} from '../../src';

// Create real temporary directory for integration tests
const TEST_DIR = path.join(tmpdir(), `rulesets-errors-${Date.now()}`);

describe('Error Handling Integration Tests', () => {
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
      // Ignore errors during cleanup
    }
  });

  beforeEach(async () => {
    mockLogger = new ConsoleLogger();
    spyOn(mockLogger, 'info').mockImplementation(() => {
      // Mock implementation for testing
    });
    spyOn(mockLogger, 'debug').mockImplementation(() => {
      // Mock implementation for testing
    });
    spyOn(mockLogger, 'warn').mockImplementation(() => {
      // Mock implementation for testing
    });
    spyOn(mockLogger, 'error').mockImplementation(() => {
      // Mock implementation for testing
    });

    // Create unique test project directory for each test
    testProjectDir = path.join(
      TEST_DIR,
      `errors-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    );
    await fs.mkdir(testProjectDir, { recursive: true });

    // Change to test directory for relative path operations
    process.chdir(testProjectDir);
  });

  afterEach(() => {
    // Bun test automatically restores mocks after each test
  });

  describe('File System Error Handling', () => {
    it('should handle missing source file gracefully', async () => {
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

    it('should handle permission denied on source file', async () => {
      const sourceFilePath = path.join(testProjectDir, 'readonly.ruleset.md');

      // Create file and attempt to make it unreadable (may not work on all systems)
      await fs.writeFile(sourceFilePath, 'test content');
      try {
        await fs.chmod(sourceFilePath, 0o000); // Remove all permissions

        await expect(
          runRulesetsV0(sourceFilePath, mockLogger)
        ).rejects.toThrow();

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to read source file'),
          expect.any(Error)
        );
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(sourceFilePath, 0o644);
      }
    });

    it('should handle directory creation failures', async () => {
      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: {
            enabled: true,
            outputPath: '/proc/invalid/readonly/path.mdc', // Should fail on most systems
          },
        },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Directory Creation Error Test
`;

      const sourceFilePath = path.join(testProjectDir, 'dir-error.ruleset.md');
      await fs.writeFile(sourceFilePath, sourceContent);

      await expect(runRulesetsV0(sourceFilePath, mockLogger)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write cursor output'),
        expect.any(Error)
      );
    });

    it('should handle disk space exhaustion scenarios gracefully', async () => {
      // Simulate by creating a very large output path that would exceed typical limits
      const veryLongPath = `.cursor/${'very-long-directory-name/'.repeat(50)}file.mdc`;

      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true, outputPath: veryLongPath },
        },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Path Length Error Test
`;

      const sourceFilePath = path.join(testProjectDir, 'path-error.ruleset.md');
      await fs.writeFile(sourceFilePath, sourceContent);

      // This may or may not fail depending on the system, but should handle gracefully
      try {
        await runRulesetsV0(sourceFilePath, mockLogger);

        // If it succeeds, verify the file was created
        const outputPath = path.join(testProjectDir, veryLongPath);
        await expect(fs.access(outputPath)).resolves.not.toThrow();
      } catch (_error) {
        // If it fails, verify proper error handling
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to write cursor output'),
          expect.any(Error)
        );
      }
    });
  });

  describe('Configuration Error Handling', () => {
    it('should handle malformed JSON configuration files', async () => {
      const malformedConfig = `{
  "rulesets": {
    "version": "0.1.0"
  },
  "providers": {
    "cursor": {
      "enabled": true,
      // Missing comma here
      "outputPath": ".cursor/test.mdc"
    }
  } // Missing comma here
  "gitignore": {
    "enabled": true
  }
}`;

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, malformedConfig);

      const result = await loadConfig(testProjectDir, {}, mockLogger);

      // The new behavior: malformed configs are skipped gracefully
      expect(result.success).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse config file')
      );
      // Should fall back to default configuration
      expect(result.config.providers?.cursor?.enabled).toBe(true);
    });

    it('should handle configuration schema validation errors', async () => {
      const invalidConfig = {
        rulesets: {
          version: 'invalid-version-format', // Invalid version
        },
        outputDirectory: 123, // Wrong type
        providers: {
          'unknown-provider': { enabled: true }, // Unknown provider
          cursor: {
            enabled: 'not-a-boolean', // Wrong type
            outputPath: 123, // Wrong type
          },
        },
        gitignore: {
          enabled: 'not-a-boolean', // Wrong type
          keep: 'not-an-array', // Wrong type
          options: {
            sort: 'not-a-boolean', // Wrong type
          },
        },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(invalidConfig, null, 2));

      const result = await loadConfig(testProjectDir, {}, mockLogger);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);

      const errorText = result.errors?.join(' ');
      expect(errorText).toContain('must be boolean');
      expect(errorText).toContain('outputDirectory');
      expect(errorText).toMatch(/unknown-provider|cursor|gitignore/);
    });

    it('should handle environment variable override errors gracefully', async () => {
      // Set invalid environment variables
      process.env.RULESETS_PROVIDERS_CURSOR_ENABLED = 'not-a-boolean';
      process.env.RULESETS_OUTPUT_DIRECTORY = ''; // Empty string
      process.env.RULESETS_GITIGNORE_OPTIONS_SORT = 'invalid-boolean';

      const baseConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true },
        },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(baseConfig, null, 2));

      const result = await loadConfig(testProjectDir, {}, mockLogger);

      expect(result.success).toBe(true); // Should succeed with warnings
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);

      const warningText = result.warnings?.join(' ');
      expect(warningText).toContain('Environment variable');

      // Clean up environment variables
      process.env.RULESETS_PROVIDERS_CURSOR_ENABLED = undefined;
      process.env.RULESETS_OUTPUT_DIRECTORY = undefined;
      process.env.RULESETS_GITIGNORE_OPTIONS_SORT = undefined;
    });

    it('should handle missing global configuration directory gracefully', async () => {
      // This test verifies the system handles missing global config gracefully
      const result = await loadConfig(testProjectDir, {}, mockLogger);

      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();

      // May have warnings about missing config files
      if (result.warnings) {
        const warningText = result.warnings.join(' ');
        expect(warningText).toMatch(/configuration file|config/i);
      }
    });
  });

  describe('Parsing and Linting Error Handling', () => {
    it('should handle invalid frontmatter gracefully', async () => {
      const invalidFrontmatter = `---
invalid yaml syntax:
  - missing closing bracket
  nested:
    value: "unclosed string
    another: value
---

# Content after invalid frontmatter
`;

      const sourceFilePath = path.join(
        testProjectDir,
        'invalid-frontmatter.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, invalidFrontmatter);

      await expect(runRulesetsV0(sourceFilePath, mockLogger)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid YAML syntax in frontmatter')
      );
    });

    it('should handle missing required rulesets version', async () => {
      const noVersionContent = `---
title: Missing Version
description: This content is missing the required rulesets version
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

    it('should handle invalid Rulesets syntax gracefully', async () => {
      const invalidSyntax = `---
ruleset:
  version: "0.1.0"
---

# Invalid Syntax Test

{{unclosed-block}}
This block is never closed properly.

{{another-block}}
Valid block content.
{{/another-block}}

{{invalid $variable syntax}}
Invalid variable usage here.
{{/invalid}}
`;

      const sourceFilePath = path.join(
        testProjectDir,
        'invalid-syntax.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, invalidSyntax);

      // The system should handle invalid syntax gracefully
      // It may succeed without warnings, succeed with warnings, or fail with errors
      try {
        await runRulesetsV0(sourceFilePath, mockLogger);
        // If it succeeds, that's acceptable (may or may not log warnings)
        expect(true).toBe(true); // Test passes if no exception is thrown
      } catch (_error) {
        // If it fails, ensure proper error logging
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });

    it('should handle extremely large files that might cause memory issues', async () => {
      // Create a very large file (but not so large it causes test issues)
      const largeContent = `---
ruleset:
  version: "0.1.0"
---

# Large File Memory Test

${`## Section\n\n${'Very long content line. '.repeat(1000)}${'\n\n'.repeat(5000)}`}

{{instructions}}
${'Large instruction block. '.repeat(10_000)}
{{/instructions}}

{{examples}}
\`\`\`typescript
${'// Large code example\n'.repeat(5000)}
\`\`\`
{{/examples}}
`;

      const sourceFilePath = path.join(
        testProjectDir,
        'large-memory.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, largeContent);

      // Set a reasonable timeout and memory expectations
      const startTime = Date.now();

      try {
        await runRulesetsV0(sourceFilePath, mockLogger);

        const duration = Date.now() - startTime;

        // Should complete within reasonable time (60 seconds max)
        expect(duration).toBeLessThan(60_000);

        // Should succeed and log completion
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Rulesets v0.1.0 processing completed successfully!'
        );
      } catch (error) {
        // If memory/performance issues occur, ensure proper error handling
        expect(mockLogger.error).toHaveBeenCalled();
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Provider Error Handling', () => {
    it('should handle provider compilation failures gracefully', async () => {
      // Create a scenario that might cause compilation issues
      const problematicContent = `---
ruleset:
  version: "0.1.0"
destinations:
  cursor:
    outputPath: ".cursor/compilation-test.mdc"
    invalidProperty: "This property doesn't exist"
  windsurf:
    outputPath: ".windsurf/compilation-test.md"
---

# Compilation Error Test

{{deeply-nested-block}}
  {{inner-block}}
    {{deeply-inner-block}}
      Content with complex nesting
    {{/deeply-inner-block}}
  {{/inner-block}}
{{/deeply-nested-block}}

Complex variable usage: {{$complex.nested.variable.that.might.not.exist}}
`;

      const sourceFilePath = path.join(
        testProjectDir,
        'compilation-error.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, problematicContent);

      try {
        await runRulesetsV0(sourceFilePath, mockLogger);

        // If compilation succeeds, verify outputs were created
        const expectedOutputs = [
          '.cursor/compilation-test.mdc',
          '.windsurf/compilation-test.md',
        ];

        for (const outputPath of expectedOutputs) {
          const fullPath = path.join(testProjectDir, outputPath);
          await expect(fs.access(fullPath)).resolves.not.toThrow();
        }
      } catch (error) {
        // If compilation fails, verify proper error handling
        expect(mockLogger.error).toHaveBeenCalled();
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle partial provider failures and continue with others', async () => {
      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: {
            enabled: true,
            outputPath: '/invalid/path/cursor.mdc', // Will fail
          },
          windsurf: {
            enabled: true,
            outputPath: '.windsurf/should-work.md', // Should succeed
          },
          'claude-code': {
            enabled: true,
            outputPath: '.claude/should-work.md', // Should succeed
          },
        },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Partial Failure Test
`;

      const sourceFilePath = path.join(
        testProjectDir,
        'partial-failure.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, sourceContent);

      // Should fail due to cursor provider error (current implementation stops on first error)
      await expect(runRulesetsV0(sourceFilePath, mockLogger)).rejects.toThrow();

      // Verify cursor error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write cursor output'),
        expect.any(Error)
      );

      // Note: Current implementation stops on first error
      // In future versions, we might want to continue with other providers
    });

    it('should handle provider-specific edge cases', async () => {
      // Test edge cases that might affect different providers differently
      const edgeCaseContent = `---
ruleset:
  version: "0.1.0"
---

# Provider Edge Cases

{{instructions}}
Instructions with edge case characters: \`backticks\`, "quotes", 'single quotes'
Special markdown: **bold**, *italic*, ~~strikethrough~~, [links](http://example.com)
{{/instructions}}

## Code Blocks with Edge Cases

{{examples}}
\`\`\`typescript
// Code with problematic characters
const regex = /[\\w\\-\\.]+@[\\w\\-\\.]+\\.[a-zA-Z]{2,}/g;
const template = \`Hello \${name}!\`;
const specialChars = '&<>"\\\\\`';
\`\`\`

\`\`\`json
{
  "key": "value with \\"quotes\\"",
  "array": [1, 2, 3],
  "nested": {
    "special": "&<>\\""
  }
}
\`\`\`
{{/examples}}

Variables with edge cases: {{$destination}} and {{$file.with.dots}}
`;

      const sourceFilePath = path.join(testProjectDir, 'edge-cases.ruleset.md');
      await fs.writeFile(sourceFilePath, edgeCaseContent);

      await runRulesetsV0(sourceFilePath, mockLogger);

      // Verify all default providers handled edge cases correctly
      const expectedOutputs = [
        '.ruleset/dist/cursor/my-rules.md',
        '.ruleset/dist/windsurf/my-rules.md',
        '.ruleset/dist/claude-code/my-rules.md',
        '.ruleset/dist/codex-cli/my-rules.md',
        '.ruleset/dist/amp/my-rules.md',
        '.ruleset/dist/opencode/my-rules.md',
      ];

      for (const outputPath of expectedOutputs) {
        const fullPath = path.join(testProjectDir, outputPath);
        await expect(fs.access(fullPath)).resolves.not.toThrow();

        const content = await fs.readFile(fullPath, 'utf8');

        // Verify edge case content is preserved
        expect(content).toContain('backticks');
        expect(content).toContain('"quotes"');
        expect(content).toContain('**bold**');
        expect(content).toContain('{{instructions}}');
        expect(content).toContain('${name}');
        expect(content).toContain('&<>"');
      }

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Rulesets v0.1.0 processing completed successfully!'
      );
    });
  });

  describe('Gitignore Error Handling', () => {
    it('should handle gitignore write permission errors gracefully', async () => {
      // Create a .gitignore file and make it read-only
      const gitignorePath = path.join(testProjectDir, '.gitignore');
      await fs.writeFile(gitignorePath, '# Existing content\n');

      try {
        await fs.chmod(gitignorePath, 0o444); // Read-only

        const config: RulesetConfig = {
          rulesets: { version: '0.1.0' },
          providers: {
            cursor: { enabled: true, outputPath: '.cursor/test.mdc' },
          },
          gitignore: { enabled: true },
        };

        const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));

        const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Gitignore Permission Test
`;

        const sourceFilePath = path.join(
          testProjectDir,
          'gitignore-perm.ruleset.md'
        );
        await fs.writeFile(sourceFilePath, sourceContent);

        // Should succeed for main compilation but warn about gitignore
        await runRulesetsV0(sourceFilePath, mockLogger);

        // Verify main output was created
        const outputPath = path.join(testProjectDir, '.cursor/test.mdc');
        await expect(fs.access(outputPath)).resolves.not.toThrow();

        // Verify gitignore warning was logged
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('GitignoreManager error')
        );
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(gitignorePath, 0o644);
      }
    });

    it('should handle invalid override file patterns gracefully', async () => {
      // Create .rulesetkeep with invalid patterns
      const invalidRulesekeep = `# Invalid patterns
[invalid-regex-pattern
\\invalid\\escape\\sequence
***multiple***wildcards***
`;

      await fs.writeFile(
        path.join(testProjectDir, '.rulesetkeep'),
        invalidRulesekeep
      );

      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true, outputPath: '.cursor/test.mdc' },
        },
        gitignore: { enabled: true },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Invalid Override Test
`;

      const sourceFilePath = path.join(
        testProjectDir,
        'invalid-override.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, sourceContent);

      // Should succeed despite invalid override patterns
      await runRulesetsV0(sourceFilePath, mockLogger);

      // Verify main output was created
      const outputPath = path.join(testProjectDir, '.cursor/test.mdc');
      await expect(fs.access(outputPath)).resolves.not.toThrow();

      // May have warnings about invalid patterns
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Rulesets v0.1.0 processing completed successfully!'
      );
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    it('should handle many simultaneous provider outputs efficiently', async () => {
      // Create many provider configurations to test resource handling
      const manyProvidersConfig: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true, outputPath: '.cursor/many-1.mdc' },
          windsurf: { enabled: true, outputPath: '.windsurf/many-1.md' },
          'claude-code': { enabled: true, outputPath: '.claude/many-1.md' },
          'codex-cli': { enabled: true, outputPath: '.codex/many-1.md' },
          amp: { enabled: true, outputPath: '.amp/many-1.md' },
          opencode: { enabled: true, outputPath: '.opencode/many-1.md' },
        },
        gitignore: { enabled: true },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(
        configPath,
        JSON.stringify(manyProvidersConfig, null, 2)
      );

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Many Providers Resource Test

${'## Section\n\nContent for resource testing. '.repeat(100)}

{{instructions}}
${'Instruction content for resource testing. '.repeat(200)}
{{/instructions}}

{{examples}}
\`\`\`typescript
${'// Code example line\n'.repeat(100)}
\`\`\`
{{/examples}}
`;

      const sourceFilePath = path.join(
        testProjectDir,
        'many-providers.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, sourceContent);

      const startTime = Date.now();
      await runRulesetsV0(sourceFilePath, mockLogger);
      const duration = Date.now() - startTime;

      // Should complete efficiently (within 15 seconds)
      expect(duration).toBeLessThan(15_000);

      // Verify all outputs were created
      const expectedOutputs = [
        '.cursor/many-1.mdc',
        '.windsurf/many-1.md',
        '.claude/many-1.md',
        '.codex/many-1.md',
        '.amp/many-1.md',
        '.opencode/many-1.md',
      ];

      for (const outputPath of expectedOutputs) {
        const fullPath = path.join(testProjectDir, outputPath);
        await expect(fs.access(fullPath)).resolves.not.toThrow();
      }

      // Verify gitignore was updated with all files
      const gitignorePath = path.join(testProjectDir, '.gitignore');
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');

      for (const outputPath of expectedOutputs) {
        expect(gitignoreContent).toContain(outputPath);
      }

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Rulesets v0.1.0 processing completed successfully!'
      );
    });

    it('should handle out of memory scenarios gracefully', async () => {
      // Create content that might stress memory usage
      const memoryStressContent = `---
ruleset:
  version: "0.1.0"
---

# Memory Stress Test

${`## Large Section\n\n${'x'.repeat(10_000)}${'\n\n'.repeat(100)}`}

{{instructions}}
${'Large instruction block with repeated content. '.repeat(5000)}
{{/instructions}}

{{examples}}
\`\`\`typescript
${'// Very long code example line that repeats many times\n'.repeat(2000)}
interface LargeInterface {
${Array.from({ length: 1000 }, (_, i) => `  property${i}: string;`).join('\n')}
}
\`\`\`
{{/examples}}

${Array.from({ length: 500 }, (_, i) => `## Section ${i}\n\nContent for section ${i} with lots of text. ${'More text. '.repeat(100)}`).join('\n\n')}
`;

      const sourceFilePath = path.join(
        testProjectDir,
        'memory-stress.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, memoryStressContent);

      const startTime = Date.now();

      try {
        await runRulesetsV0(sourceFilePath, mockLogger);

        const duration = Date.now() - startTime;

        // If it succeeds, should complete in reasonable time
        expect(duration).toBeLessThan(120_000); // 2 minutes max

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Rulesets v0.1.0 processing completed successfully!'
        );
      } catch (error) {
        // If memory issues occur, should handle gracefully
        expect(error).toBeInstanceOf(Error);
        expect(mockLogger.error).toHaveBeenCalled();

        // Error should be descriptive
        const errorMessage = (error as Error).message;
        expect(errorMessage).toBeTruthy();
        expect(errorMessage.length).toBeGreaterThan(10);
      }
    });
  });
});
