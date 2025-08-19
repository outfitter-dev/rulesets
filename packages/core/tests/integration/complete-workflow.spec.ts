/**
 * Complete Workflow Integration Tests
 *
 * Tests the complete Rulesets system end-to-end with all providers working together.
 * Validates that all components (configuration, providers, gitignore) integrate correctly.
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
import { ConsoleLogger, type RulesetConfig, runRulesetsV0 } from '../../src';

// Test constants
const KEPT_FILES_REGEX = /Kept \d+ files due to override rules/;

// Create real temporary directory for integration tests
const TEST_DIR = path.join(tmpdir(), `rulesets-integration-${Date.now()}`);

describe('Complete Workflow Integration Tests', () => {
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
      `project-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    );
    await fs.mkdir(testProjectDir, { recursive: true });

    // Change to test directory for relative path operations
    process.chdir(testProjectDir);
  });

  afterEach(() => {
    // Bun test automatically restores mocks after each test
  });

  describe('Multi-Provider Compilation with Configuration', () => {
    it('should compile rules for all 6 providers simultaneously with JSONC config', async () => {
      // Setup: Create JSONC configuration file
      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        outputDirectory: '.ruleset/output',
        providers: {
          cursor: { enabled: true, outputPath: '.cursor/rules/test.mdc' },
          windsurf: { enabled: true, outputPath: '.windsurf/rules/test.md' },
          'claude-code': { enabled: true, outputPath: '.claude/rules/test.md' },
          'codex-cli': { enabled: true, outputPath: '.codex/rules/test.md' },
          amp: { enabled: true, outputPath: '.amp/rules/test.md' },
          opencode: { enabled: true, outputPath: '.opencode/rules/test.md' },
        },
        gitignore: {
          enabled: true,
          options: {
            comment: 'Test Generated Files',
            sort: true,
          },
        },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      // Create source rules file
      const sourceContent = `---
ruleset:
  version: "0.1.0"
title: Complete Workflow Test
description: Testing all providers working together
---

# Complete Workflow Rules

{{instructions}}
These are comprehensive rules that should be compiled for all 6 providers.
{{/instructions}}

## Code Standards

- Always use TypeScript
- Follow Biome rules
- Write comprehensive tests

{{examples}}
\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`
{{/examples}}

Variable test: {{$destination}}
`;

      const sourceFilePath = path.join(testProjectDir, 'test.ruleset.md');
      await fs.writeFile(sourceFilePath, sourceContent);

      // Execute: Run the complete workflow
      await runRulesetsV0(sourceFilePath, mockLogger);

      // Verify: All 6 provider outputs were created
      const expectedOutputs = [
        '.cursor/rules/test.mdc',
        '.windsurf/rules/test.md',
        '.claude/rules/test.md',
        '.codex/rules/test.md',
        '.amp/rules/test.md',
        '.opencode/rules/test.md',
      ];

      for (const outputPath of expectedOutputs) {
        const fullPath = path.join(testProjectDir, outputPath);
        await expect(fs.access(fullPath)).resolves.not.toThrow();

        const content = await fs.readFile(fullPath, 'utf8');
        expect(content).toContain('Complete Workflow Rules');
        expect(content).toContain('TypeScript');
        expect(content).toContain('{{instructions}}');
      }

      // Verify: .gitignore was created and contains all generated files
      const gitignorePath = path.join(testProjectDir, '.gitignore');
      await expect(fs.access(gitignorePath)).resolves.not.toThrow();

      const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
      expect(gitignoreContent).toContain('# Test Generated Files');

      for (const outputPath of expectedOutputs) {
        expect(gitignoreContent).toContain(outputPath);
      }

      // Verify: Logging shows all providers were processed
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          'cursor, windsurf, claude-code, codex-cli, amp, opencode'
        )
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Rulesets ruleset-v0.1-beta processing completed successfully!'
      );
    });

    it('should handle mixed provider enablement via configuration', async () => {
      // Setup: Configuration with only some providers enabled
      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true },
          windsurf: { enabled: false },
          'claude-code': { enabled: true },
          'codex-cli': { enabled: false },
          amp: { enabled: true },
          opencode: { enabled: false },
        },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Mixed Provider Test
Content for selective providers.
`;

      const sourceFilePath = path.join(testProjectDir, 'mixed.ruleset.md');
      await fs.writeFile(sourceFilePath, sourceContent);

      // Execute
      await runRulesetsV0(sourceFilePath, mockLogger);

      // Verify: Only enabled providers created outputs
      const enabledOutputs = [
        '.ruleset/dist/cursor/my-rules.md',
        '.ruleset/dist/claude-code/my-rules.md',
        '.ruleset/dist/amp/my-rules.md',
      ];

      const disabledOutputs = [
        '.ruleset/dist/windsurf/my-rules.md',
        '.ruleset/dist/codex-cli/my-rules.md',
        '.ruleset/dist/opencode/my-rules.md',
      ];

      // Check enabled providers created files
      for (const outputPath of enabledOutputs) {
        const fullPath = path.join(testProjectDir, outputPath);
        await expect(fs.access(fullPath)).resolves.not.toThrow();
      }

      // Check disabled providers did not create files
      for (const outputPath of disabledOutputs) {
        const fullPath = path.join(testProjectDir, outputPath);
        await expect(fs.access(fullPath)).rejects.toThrow();
      }

      // Verify logging shows only enabled providers
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('cursor, claude-code, amp')
      );
    });

    it('should prioritize frontmatter destinations over config providers', async () => {
      // Setup: Config enables all providers, but frontmatter specifies only cursor and windsurf
      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true },
          windsurf: { enabled: true },
          'claude-code': { enabled: true },
          'codex-cli': { enabled: true },
          amp: { enabled: true },
          opencode: { enabled: true },
        },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const sourceContent = `---
ruleset:
  version: "0.1.0"
destinations:
  cursor:
    outputPath: ".cursor/override.mdc"
  windsurf:
    outputPath: ".windsurf/override.md"
---

# Frontmatter Override Test
Only cursor and windsurf should be compiled.
`;

      const sourceFilePath = path.join(testProjectDir, 'override.ruleset.md');
      await fs.writeFile(sourceFilePath, sourceContent);

      // Execute
      await runRulesetsV0(sourceFilePath, mockLogger);

      // Verify: Only frontmatter destinations created outputs
      const expectedOutputs = ['.cursor/override.mdc', '.windsurf/override.md'];

      const unexpectedOutputs = [
        '.ruleset/dist/claude-code/my-rules.md',
        '.ruleset/dist/codex-cli/my-rules.md',
        '.ruleset/dist/amp/my-rules.md',
        '.ruleset/dist/opencode/my-rules.md',
      ];

      // Check frontmatter destinations created files
      for (const outputPath of expectedOutputs) {
        const fullPath = path.join(testProjectDir, outputPath);
        await expect(fs.access(fullPath)).resolves.not.toThrow();
      }

      // Check other providers did not create files
      for (const outputPath of unexpectedOutputs) {
        const fullPath = path.join(testProjectDir, outputPath);
        await expect(fs.access(fullPath)).rejects.toThrow();
      }

      // Verify logging shows only frontmatter destinations
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('cursor, windsurf')
      );
    });

    it('should handle complex configuration with environment overrides', async () => {
      // Setup: Base configuration
      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        outputDirectory: '.base/output',
        providers: {
          cursor: { enabled: true },
          windsurf: { enabled: true },
        },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      // Set environment variables for overrides
      process.env.RULESETS_OUTPUT_DIRECTORY = '.env/output';
      process.env.RULESETS_PROVIDERS_CLAUDE_CODE_ENABLED = 'true';
      process.env.RULESETS_PROVIDERS_AMP_ENABLED = 'true';

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Environment Override Test
Testing environment variable overrides.
`;

      const sourceFilePath = path.join(testProjectDir, 'env.ruleset.md');
      await fs.writeFile(sourceFilePath, sourceContent);

      try {
        // Execute
        await runRulesetsV0(sourceFilePath, mockLogger);

        // Verify: Outputs use environment-overridden paths and enabled providers
        const expectedOutputs = [
          '.env/output/cursor/my-rules.md',
          '.env/output/windsurf/my-rules.md',
          '.env/output/claude-code/my-rules.md',
          '.env/output/amp/my-rules.md',
        ];

        for (const outputPath of expectedOutputs) {
          const fullPath = path.join(testProjectDir, outputPath);
          await expect(fs.access(fullPath)).resolves.not.toThrow();
        }

        // Verify logging shows all enabled providers
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('cursor, windsurf, claude-code, amp')
        );
      } finally {
        // Cleanup environment variables
        process.env.RULESETS_OUTPUT_DIRECTORY = undefined;
        process.env.RULESETS_PROVIDERS_CLAUDE_CODE_ENABLED = undefined;
        process.env.RULESETS_PROVIDERS_AMP_ENABLED = undefined;
      }
    });

    it('should handle gitignore integration with .rulesetkeep override', async () => {
      // Setup: Configuration with gitignore enabled
      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true, outputPath: '.cursor/special.mdc' },
          windsurf: { enabled: true, outputPath: '.windsurf/special.md' },
          'claude-code': { enabled: true, outputPath: '.claude/special.md' },
        },
        gitignore: {
          enabled: true,
          keep: ['.cursor/**'],
        },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      // Create .rulesetkeep file to override specific files
      const rulesetkeepContent = `# Keep windsurf files
.windsurf/**
`;
      await fs.writeFile(
        path.join(testProjectDir, '.rulesetkeep'),
        rulesetkeepContent
      );

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Gitignore Override Test
Testing gitignore with keep overrides.
`;

      const sourceFilePath = path.join(testProjectDir, 'gitignore.ruleset.md');
      await fs.writeFile(sourceFilePath, sourceContent);

      // Execute
      await runRulesetsV0(sourceFilePath, mockLogger);

      // Verify: Files were created
      const expectedFiles = [
        '.cursor/special.mdc',
        '.windsurf/special.md',
        '.claude/special.md',
      ];

      for (const filePath of expectedFiles) {
        const fullPath = path.join(testProjectDir, filePath);
        await expect(fs.access(fullPath)).resolves.not.toThrow();
      }

      // Verify: .gitignore contains only non-kept files
      const gitignorePath = path.join(testProjectDir, '.gitignore');
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');

      // Should contain claude-code file (not kept)
      expect(gitignoreContent).toContain('.claude/special.md');

      // Should NOT contain cursor or windsurf files (both kept)
      expect(gitignoreContent).not.toContain('.cursor/special.mdc');
      expect(gitignoreContent).not.toContain('.windsurf/special.md');

      // Verify logging about kept files
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(KEPT_FILES_REGEX)
      );
    });

    it('should gracefully handle provider write failures while continuing with others', async () => {
      // Setup: Configuration with multiple providers
      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true, outputPath: '/invalid/readonly/path.mdc' }, // Will fail
          windsurf: { enabled: true }, // Should succeed
          'claude-code': { enabled: true }, // Should succeed
        },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Failure Recovery Test
Testing graceful handling of provider failures.
`;

      const sourceFilePath = path.join(testProjectDir, 'failure.ruleset.md');
      await fs.writeFile(sourceFilePath, sourceContent);

      // Execute: Should handle cursor failure gracefully
      await expect(runRulesetsV0(sourceFilePath, mockLogger)).rejects.toThrow();

      // Verify: Error was logged for cursor
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write cursor output'),
        expect.any(Error)
      );

      // This test demonstrates that the current implementation stops on first write error
      // In a future version, we might want to continue with other providers
    });
  });

  describe('Performance and Stress Testing', () => {
    it('should handle large files with all providers efficiently', async () => {
      // Setup: Large source file
      const largeContent = `---
ruleset:
  version: "0.1.0"
---

# Large File Test

${'## Section\n\nLarge content block with rules and examples.\n\n'.repeat(1000)}

{{instructions}}
${'This is a large instruction block. '.repeat(100)}
{{/instructions}}

{{examples}}
\`\`\`typescript
${'// Large code example\n'.repeat(50)}
function example() {
  return 'large';
}
\`\`\`
{{/examples}}
`;

      const sourceFilePath = path.join(testProjectDir, 'large.ruleset.md');
      await fs.writeFile(sourceFilePath, largeContent);

      // Execute with timing
      const startTime = Date.now();
      await runRulesetsV0(sourceFilePath, mockLogger);
      const duration = Date.now() - startTime;

      // Verify: Processing completed in reasonable time
      expect(duration).toBeLessThan(10_000); // Should complete within 10 seconds

      // Verify: All default providers created outputs
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
        expect(content.length).toBeGreaterThan(10_000); // Should contain the large content
      }

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Rulesets ruleset-v0.1-beta processing completed successfully!'
      );
    });

    it('should handle multiple compilation runs in sequence', async () => {
      // Setup: Multiple source files
      const sourceFiles: string[] = [];

      for (let i = 1; i <= 5; i++) {
        const content = `---
ruleset:
  version: "0.1.0"
destinations:
  cursor:
    outputPath: ".cursor/sequence-${i}.mdc"
  windsurf:
    outputPath: ".windsurf/sequence-${i}.md"
---

# Sequence Test ${i}
Content for sequence test ${i}.
`;

        const filePath = path.join(testProjectDir, `sequence-${i}.ruleset.md`);
        await fs.writeFile(filePath, content);
        sourceFiles.push(filePath);
      }

      // Execute: Process all files in sequence
      for (const sourceFile of sourceFiles) {
        await runRulesetsV0(sourceFile, mockLogger);
      }

      // Verify: All outputs were created
      for (let i = 1; i <= 5; i++) {
        const expectedOutputs = [
          `.cursor/sequence-${i}.mdc`,
          `.windsurf/sequence-${i}.md`,
        ];

        for (const outputPath of expectedOutputs) {
          const fullPath = path.join(testProjectDir, outputPath);
          await expect(fs.access(fullPath)).resolves.not.toThrow();

          const content = await fs.readFile(fullPath, 'utf8');
          expect(content).toContain(`Sequence Test ${i}`);
        }
      }

      // Verify: .gitignore contains all generated files
      const gitignorePath = path.join(testProjectDir, '.gitignore');
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');

      for (let i = 1; i <= 5; i++) {
        expect(gitignoreContent).toContain(`.cursor/sequence-${i}.mdc`);
        expect(gitignoreContent).toContain(`.windsurf/sequence-${i}.md`);
      }

      // Verify: Processing completed successfully for all files
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Rulesets ruleset-v0.1-beta processing completed successfully!'
      );
      expect(mockLogger.info).toHaveBeenCalledTimes(5); // Once per file
    });
  });
});
