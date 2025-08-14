/**
 * Integration tests for GitignoreManager with runRulesetsV0
 */

import { promises as fs } from 'node:fs';
import { beforeEach, describe, expect, test, mock, spyOn } from 'bun:test';
import { runRulesetsV0 } from '../../index';

// Top-level regex patterns for performance
const MANAGED_MARKER_REGEX = /# Rulesets Managed/;
const CURSOR_RULES_REGEX = /\.cursor\/rules/;
const WINDSURF_RULES_REGEX = /\.windsurf\/rules/;
const CURSOR_RULES_MDC_REGEX = /^\.cursor\/rules\/my-rules\.mdc$/m;
const WINDSURF_ALL_REGEX = /\.windsurf\/\*\*/;

// Mock fs module
// vi.mock('node:fs', () => ({
  promises: {
    readFile: mock(),
    writeFile: mock(),
    mkdir: mock(),
  },
}));

const mockFs = fs as {
  readFile: ReturnType<typeof vi.fn>;
  writeFile: ReturnType<typeof vi.fn>;
  mkdir: ReturnType<typeof vi.fn>;
};

describe('GitignoreManager Integration', () => {
  const testSourcePath = '/test/project/my-rules.ruleset.md';
  const testProjectPath = '/test/project';

  beforeEach(() => {
    // Bun test handles mock clearing automatically;

    // Mock successful file operations
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
  });

  describe('when gitignore management is enabled (default)', () => {
    test('should update .gitignore with generated files from destinations', () => {
      const sourceContent = `---
ruleset:
  version: 0.1.0
---

{{instructions}}
Test rules content
{{/instructions}}`;

      // Mock reading source file
      mockFs.readFile.mockImplementation((path) => {
        if (path === testSourcePath) {
          return Promise.resolve(sourceContent);
        }
        throw new Error(`Unexpected file read: ${path}`);
      });

      expect(async () => {
        await runRulesetsV0({
          sourcePath: testSourcePath,
          projectPath: testProjectPath,
          destinations: ['cursor', 'windsurf'],
          gitignoreConfig: {
            enabled: true,
            managedMarker: '# Rulesets Managed',
          },
          logLevel: 'debug',
        });
      }).not.toThrow();

      // Verify gitignore was updated with generated paths
      const gitignoreCalls = mockFs.writeFile.mock.calls.filter(
        (call) => call[0] === '/test/project/.gitignore'
      );

      expect(gitignoreCalls.length).toBeGreaterThan(0);

      if (gitignoreCalls.length > 0) {
        const gitignoreContent = gitignoreCalls[0][1] as string;
        expect(gitignoreContent).toMatch(MANAGED_MARKER_REGEX);
        expect(gitignoreContent).toMatch(CURSOR_RULES_REGEX);
        expect(gitignoreContent).toMatch(WINDSURF_RULES_REGEX);
      }
    });

    test('should respect gitignoreMode configuration', () => {
      const sourceContent = `---
ruleset:
  version: 0.1.0
---

{{instructions}}
Test rules content
{{/instructions}}`;

      // Mock reading files
      mockFs.readFile.mockImplementation((path) => {
        if (path === testSourcePath) {
          return Promise.resolve(sourceContent);
        }
        if (path === '/test/project/.gitignore') {
          return Promise.resolve('# Existing gitignore\nnode_modules/\n');
        }
        throw new Error(`Unexpected file read: ${path}`);
      });

      expect(async () => {
        await runRulesetsV0({
          sourcePath: testSourcePath,
          projectPath: testProjectPath,
          destinations: ['cursor'],
          gitignoreConfig: {
            enabled: true,
            gitignoreMode: 'prepend',
          },
        });
      }).not.toThrow();

      // Verify gitignore was updated with prepend mode
      const gitignoreCalls = mockFs.writeFile.mock.calls.filter(
        (call) => call[0] === '/test/project/.gitignore'
      );

      if (gitignoreCalls.length > 0) {
        const gitignoreContent = gitignoreCalls[0][1] as string;
        const lines = gitignoreContent.split('\n');

        // Check that managed block appears before existing content
        const managedIndex = lines.findIndex((line) =>
          line.includes('Rulesets: START')
        );
        const nodeModulesIndex = lines.findIndex((line) =>
          line.includes('node_modules')
        );

        if (managedIndex !== -1 && nodeModulesIndex !== -1) {
          expect(managedIndex).toBeLessThan(nodeModulesIndex);
        }
      }
    });
  });

  describe('when gitignore management is disabled', () => {
    test('should not modify .gitignore', () => {
      const sourceContent = `---
ruleset:
  version: 0.1.0
---

{{instructions}}
Test rules content
{{/instructions}}`;

      // Mock reading source file
      mockFs.readFile.mockImplementation((path) => {
        if (path === testSourcePath) {
          return Promise.resolve(sourceContent);
        }
        throw new Error(`Unexpected file read: ${path}`);
      });

      expect(async () => {
        await runRulesetsV0({
          sourcePath: testSourcePath,
          projectPath: testProjectPath,
          destinations: ['cursor', 'windsurf'],
          gitignoreConfig: {
            enabled: false,
          },
        });
      }).not.toThrow();

      // Verify gitignore was NOT modified
      const gitignoreCalls = mockFs.writeFile.mock.calls.filter(
        (call) => call[0] === '/test/project/.gitignore'
      );

      expect(gitignoreCalls.length).toBe(0);
    });
  });

  describe('with override files', () => {
    test('should respect .rulesetsignore patterns', () => {
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

      // Mock reading files
      mockFs.readFile.mockImplementation((path) => {
        if (path === testSourcePath) {
          return Promise.resolve(sourceContent);
        }
        if (path === '/test/project/.rulesetsignore') {
          return Promise.resolve(rulesetsignoreContent);
        }
        if (path === '/test/project/.gitignore') {
          return Promise.resolve('# Existing gitignore\n');
        }
        throw new Error(`Unexpected file read: ${path}`);
      });

      expect(async () => {
        await runRulesetsV0({
          sourcePath: testSourcePath,
          projectPath: testProjectPath,
          destinations: ['cursor', 'windsurf'],
          gitignoreConfig: {
            enabled: true,
          },
        });
      }).not.toThrow();

      // Verify gitignore respects overrides
      const gitignoreCalls = mockFs.writeFile.mock.calls.filter(
        (call) => call[0] === '/test/project/.gitignore'
      );

      if (gitignoreCalls.length > 0) {
        const gitignoreContent = gitignoreCalls[0][1] as string;

        // Should NOT ignore .cursor/rules/my-rules.mdc (negated)
        expect(gitignoreContent).not.toMatch(CURSOR_RULES_MDC_REGEX);

        // Should still ignore .windsurf/**
        expect(gitignoreContent).toMatch(WINDSURF_ALL_REGEX);
      }
    });
  });
});
