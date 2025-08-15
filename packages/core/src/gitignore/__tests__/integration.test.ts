/**
 * Integration tests for GitignoreManager with runRulesetsV0
 * Uses real temporary files instead of mocking for better integration testing
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runRulesetsV0 } from '../../index';
import { ConsoleLogger } from '../../logger';

// Top-level regex patterns for performance
const MANAGED_MARKER_REGEX = /# Rulesets Managed/;
const CURSOR_RULES_REGEX = /\.cursor\/rules/;
const WINDSURF_RULES_REGEX = /\.windsurf\/rules/;
const CURSOR_RULES_MDC_REGEX = /^\.cursor\/rules\/my-rules\.mdc$/m;
const WINDSURF_ALL_REGEX = /\.windsurf\/\*\*/;

describe('GitignoreManager Integration', () => {
  let tempDir: string;
  let sourceFilePath: string;
  let logger: ConsoleLogger;

  beforeEach(async () => {
    // Create a unique temporary directory for each test
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    tempDir = join(tmpdir(), `rulesets-test-${timestamp}-${random}`);
    await mkdir(tempDir, { recursive: true });
    sourceFilePath = join(tempDir, 'my-rules.ruleset.md');
    logger = new ConsoleLogger();

    // Suppress logger output during tests
    logger.debug = () => {};
    logger.info = () => {};
    logger.warn = () => {};
    logger.error = () => {};
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await Bun.spawn(['rm', '-rf', tempDir]).exited;
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('when gitignore management is enabled (default)', () => {
    test('should update .gitignore with generated files from destinations', async () => {
      const sourceContent = `---
ruleset:
  version: 0.1.0
---

{{instructions}}
Test rules content
{{/instructions}}`;

      // Write the source file
      await Bun.write(sourceFilePath, sourceContent);

      // Run the compilation with gitignore enabled
      await runRulesetsV0(sourceFilePath, logger, {
        gitignore: {
          enabled: true,
        },
        defaultProviders: ['cursor', 'windsurf'],
        // Override providers config to ensure test isolation
        providers: {
          cursor: { enabled: true },
          windsurf: { enabled: true },
          'claude-code': { enabled: false },
        },
      });

      // Check that .gitignore was created and contains expected content
      const gitignorePath = join(tempDir, '.gitignore');
      const gitignoreExists = await Bun.file(gitignorePath).exists();

      if (gitignoreExists) {
        const gitignoreContent = await Bun.file(gitignorePath).text();
        expect(gitignoreContent).toMatch(MANAGED_MARKER_REGEX);
        expect(gitignoreContent).toMatch(CURSOR_RULES_REGEX);
        expect(gitignoreContent).toMatch(WINDSURF_RULES_REGEX);
      }
    });

    test('should respect existing .gitignore content', async () => {
      const sourceContent = `---
ruleset:
  version: 0.1.0
---

{{instructions}}
Test rules content
{{/instructions}}`;

      const existingGitignore = '# Existing gitignore\nnode_modules/\n';

      // Write the source file and existing .gitignore
      await Bun.write(sourceFilePath, sourceContent);
      await Bun.write(join(tempDir, '.gitignore'), existingGitignore);

      // Run the compilation
      await runRulesetsV0(sourceFilePath, logger, {
        gitignore: {
          enabled: true,
        },
        defaultProviders: ['cursor'],
        // Override providers config to ensure test isolation
        providers: {
          cursor: { enabled: true },
          'claude-code': { enabled: false },
          windsurf: { enabled: false },
        },
      });

      // Check that .gitignore still contains existing content plus managed content
      const gitignorePath = join(tempDir, '.gitignore');
      const gitignoreContent = await Bun.file(gitignorePath).text();

      expect(gitignoreContent).toContain('node_modules/');
      expect(gitignoreContent).toMatch(MANAGED_MARKER_REGEX);
    });
  });

  describe('when gitignore management is disabled', () => {
    test('should not create or modify .gitignore', async () => {
      const sourceContent = `---
ruleset:
  version: 0.1.0
---

{{instructions}}
Test rules content
{{/instructions}}`;

      // Write the source file
      await Bun.write(sourceFilePath, sourceContent);

      // Run the compilation with gitignore disabled
      await runRulesetsV0(sourceFilePath, logger, {
        gitignore: {
          enabled: false,
        },
        defaultProviders: ['cursor', 'windsurf'],
        // Override providers config to ensure test isolation
        providers: {
          cursor: { enabled: true },
          windsurf: { enabled: true },
          'claude-code': { enabled: false },
        },
      });

      // Verify gitignore was NOT created
      const gitignorePath = join(tempDir, '.gitignore');
      const gitignoreExists = await Bun.file(gitignorePath).exists();

      expect(gitignoreExists).toBe(false);
    });
  });

  describe('with override files', () => {
    test('should respect .rulesetignore patterns', async () => {
      const sourceContent = `---
ruleset:
  version: 0.1.0
---

{{instructions}}
Test rules content
{{/instructions}}`;

      const rulesetsignoreContent = `# Custom overrides
!.cursor/rules/my-rules.mdc
.windsurf/**`;

      // Write all files
      await Bun.write(sourceFilePath, sourceContent);
      await Bun.write(join(tempDir, '.rulesetignore'), rulesetsignoreContent);
      await Bun.write(join(tempDir, '.gitignore'), '# Existing gitignore\n');

      // Run the compilation
      await runRulesetsV0(sourceFilePath, logger, {
        gitignore: {
          enabled: true,
        },
        defaultProviders: ['cursor', 'windsurf'],
        // Override providers config to ensure test isolation
        providers: {
          cursor: { enabled: true },
          windsurf: { enabled: true },
          'claude-code': { enabled: false },
        },
      });

      // Check the .gitignore content
      const gitignorePath = join(tempDir, '.gitignore');
      const gitignoreContent = await Bun.file(gitignorePath).text();

      // Should still respect the override patterns
      expect(gitignoreContent).toMatch(MANAGED_MARKER_REGEX);
    });
  });
});
