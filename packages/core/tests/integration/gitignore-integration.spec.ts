/**
 * Gitignore Integration Tests
 *
 * Tests the comprehensive gitignore management system including automatic updates,
 * override files (.rulesetkeep, .rulesetignore), and configuration-driven behavior.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  ConsoleLogger,
  createGitignoreManager,
  type GitignoreConfig,
  matchesAnyPattern,
  normalizeGitignorePath,
  parseOverrideFile,
  type RulesetConfig,
  runRulesetsV0,
} from '../../src';

// Create real temporary directory for integration tests
const TEST_DIR = path.join(tmpdir(), `rulesets-gitignore-${Date.now()}`);

describe('Gitignore Integration Tests', () => {
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
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Failed to cleanup test directory:', error);
    }
  });

  beforeEach(async () => {
    mockLogger = new ConsoleLogger();
    vi.spyOn(mockLogger, 'info').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'debug').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'warn').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'error').mockImplementation(() => {});

    // Create unique test project directory for each test
    testProjectDir = path.join(
      TEST_DIR,
      `gitignore-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    );
    await fs.mkdir(testProjectDir, { recursive: true });

    // Change to test directory for relative path operations
    process.chdir(testProjectDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Automatic Gitignore Updates', () => {
    it('should create .gitignore file when it does not exist', async () => {
      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true, outputPath: '.cursor/test.mdc' },
          windsurf: { enabled: true, outputPath: '.windsurf/test.md' },
          'claude-code': { enabled: true, outputPath: '.claude/test.md' },
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

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Gitignore Creation Test
Testing automatic .gitignore creation.
`;

      const sourceFilePath = path.join(testProjectDir, 'test.ruleset.md');
      await fs.writeFile(sourceFilePath, sourceContent);

      // Verify .gitignore doesn't exist initially
      const gitignorePath = path.join(testProjectDir, '.gitignore');
      await expect(fs.access(gitignorePath)).rejects.toThrow();

      // Execute
      await runRulesetsV0(sourceFilePath, mockLogger);

      // Verify .gitignore was created
      await expect(fs.access(gitignorePath)).resolves.not.toThrow();

      const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
      expect(gitignoreContent).toContain('# Test Generated Files');
      expect(gitignoreContent).toContain('.cursor/test.mdc');
      expect(gitignoreContent).toContain('.windsurf/test.md');
      expect(gitignoreContent).toContain('.claude/test.md');

      // Verify files are sorted (when sort is enabled)
      const lines = gitignoreContent
        .split('\n')
        .filter((line) => line.startsWith('.'));
      const sortedLines = [...lines].sort();
      expect(lines).toEqual(sortedLines);
    });

    it('should update existing .gitignore file with new entries', async () => {
      // Create existing .gitignore with some content
      const existingGitignore = `# Existing content
node_modules/
*.log
.env

# User additions
.custom/
`;

      const gitignorePath = path.join(testProjectDir, '.gitignore');
      await fs.writeFile(gitignorePath, existingGitignore);

      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true, outputPath: '.cursor/new.mdc' },
          amp: { enabled: true, outputPath: '.amp/new.md' },
        },
        gitignore: {
          enabled: true,
          options: {
            comment: 'Rulesets Generated Files',
            sort: false, // Don't sort to preserve existing order
          },
        },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Gitignore Update Test
`;

      const sourceFilePath = path.join(testProjectDir, 'update.ruleset.md');
      await fs.writeFile(sourceFilePath, sourceContent);

      // Execute
      await runRulesetsV0(sourceFilePath, mockLogger);

      // Verify .gitignore was updated
      const updatedGitignoreContent = await fs.readFile(gitignorePath, 'utf8');

      // Should contain original content
      expect(updatedGitignoreContent).toContain('# Existing content');
      expect(updatedGitignoreContent).toContain('node_modules/');
      expect(updatedGitignoreContent).toContain('.custom/');

      // Should contain new Rulesets section
      expect(updatedGitignoreContent).toContain('# Rulesets Generated Files');
      expect(updatedGitignoreContent).toContain('.cursor/new.mdc');
      expect(updatedGitignoreContent).toContain('.amp/new.md');

      // Should not duplicate existing entries
      const lines = updatedGitignoreContent.split('\n');
      const nodeModulesCount = lines.filter(
        (line) => line.trim() === 'node_modules/'
      ).length;
      expect(nodeModulesCount).toBe(1);
    });

    it('should handle duplicate entries correctly across multiple runs', async () => {
      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true, outputPath: '.cursor/same.mdc' },
          windsurf: { enabled: true, outputPath: '.windsurf/same.md' },
        },
        gitignore: { enabled: true },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Duplicate Test
`;

      const sourceFilePath = path.join(testProjectDir, 'duplicate.ruleset.md');
      await fs.writeFile(sourceFilePath, sourceContent);

      // Run first time
      await runRulesetsV0(sourceFilePath, mockLogger);

      const gitignorePath = path.join(testProjectDir, '.gitignore');
      const firstRunContent = await fs.readFile(gitignorePath, 'utf8');

      // Run second time with same files
      await runRulesetsV0(sourceFilePath, mockLogger);

      const secondRunContent = await fs.readFile(gitignorePath, 'utf8');

      // Content should be identical (no duplicates)
      expect(secondRunContent).toBe(firstRunContent);

      // Count occurrences of each file
      const cursorCount = secondRunContent.split('.cursor/same.mdc').length - 1;
      const windsurfCount =
        secondRunContent.split('.windsurf/same.md').length - 1;
      expect(cursorCount).toBe(1);
      expect(windsurfCount).toBe(1);
    });

    it('should respect gitignore.enabled = false configuration', async () => {
      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true, outputPath: '.cursor/disabled.mdc' },
        },
        gitignore: {
          enabled: false, // Explicitly disabled
        },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Disabled Gitignore Test
`;

      const sourceFilePath = path.join(testProjectDir, 'disabled.ruleset.md');
      await fs.writeFile(sourceFilePath, sourceContent);

      // Execute
      await runRulesetsV0(sourceFilePath, mockLogger);

      // Verify .gitignore was not created
      const gitignorePath = path.join(testProjectDir, '.gitignore');
      await expect(fs.access(gitignorePath)).rejects.toThrow();

      // Verify logging indicates gitignore is disabled
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Gitignore management is disabled by configuration'
      );
    });
  });

  describe('Override Files Integration', () => {
    it('should respect .rulesetkeep file to prevent files from being added to .gitignore', async () => {
      // Create .rulesetkeep file
      const rulesetkeepContent = `# Keep these files tracked in git
.cursor/**
*.special.md
/specific/path.txt
`;

      await fs.writeFile(
        path.join(testProjectDir, '.rulesetkeep'),
        rulesetkeepContent
      );

      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true, outputPath: '.cursor/keep.mdc' },
          windsurf: { enabled: true, outputPath: '.windsurf/ignore.md' },
          'claude-code': {
            enabled: true,
            outputPath: '.claude/keep.special.md',
          },
          amp: { enabled: true, outputPath: 'specific/path.txt' },
        },
        gitignore: { enabled: true },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Rulesekeep Test
`;

      const sourceFilePath = path.join(
        testProjectDir,
        'rulesetkeep.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, sourceContent);

      // Execute
      await runRulesetsV0(sourceFilePath, mockLogger);

      // Verify .gitignore was created
      const gitignorePath = path.join(testProjectDir, '.gitignore');
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');

      // Should contain only non-kept files
      expect(gitignoreContent).toContain('.windsurf/ignore.md');

      // Should NOT contain kept files
      expect(gitignoreContent).not.toContain('.cursor/keep.mdc');
      expect(gitignoreContent).not.toContain('.claude/keep.special.md');
      expect(gitignoreContent).not.toContain('specific/path.txt');

      // Verify logging about kept files
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/Kept \d+ files due to override rules/)
      );
    });

    it('should respect .rulesetignore file to force files into .gitignore', async () => {
      // Create .rulesetignore file
      const rulesetignoreContent = `# Force these patterns into .gitignore
.temp/**
*.backup
/force/this/path.txt
`;

      await fs.writeFile(
        path.join(testProjectDir, '.rulesetignore'),
        rulesetignoreContent
      );

      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true, outputPath: '.cursor/normal.mdc' },
        },
        gitignore: { enabled: true },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Rulesetignore Test
`;

      const sourceFilePath = path.join(
        testProjectDir,
        'rulesetignore.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, sourceContent);

      // Execute
      await runRulesetsV0(sourceFilePath, mockLogger);

      // Verify .gitignore contains both generated files and forced patterns
      const gitignorePath = path.join(testProjectDir, '.gitignore');
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');

      // Should contain generated files
      expect(gitignoreContent).toContain('.cursor/normal.mdc');

      // Should contain forced patterns from .rulesetignore
      expect(gitignoreContent).toContain('.temp/**');
      expect(gitignoreContent).toContain('*.backup');
      expect(gitignoreContent).toContain('/force/this/path.txt');
    });

    it('should handle complex override scenarios with both .rulesetkeep and .rulesetignore', async () => {
      // Create both override files
      const rulesetkeepContent = `# Keep these tracked
.cursor/**
*.important
`;

      const rulesetignoreContent = `# Force these ignored  
.build/**
*.temp
`;

      await fs.writeFile(
        path.join(testProjectDir, '.rulesetkeep'),
        rulesetkeepContent
      );
      await fs.writeFile(
        path.join(testProjectDir, '.rulesetignore'),
        rulesetignoreContent
      );

      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true, outputPath: '.cursor/kept.mdc' },
          windsurf: { enabled: true, outputPath: '.windsurf/ignored.md' },
          'claude-code': {
            enabled: true,
            outputPath: '.claude/kept.important',
          },
          amp: { enabled: true, outputPath: '.amp/ignored.md' },
        },
        gitignore: { enabled: true },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Complex Override Test
`;

      const sourceFilePath = path.join(testProjectDir, 'complex.ruleset.md');
      await fs.writeFile(sourceFilePath, sourceContent);

      // Execute
      await runRulesetsV0(sourceFilePath, mockLogger);

      // Verify .gitignore behavior
      const gitignorePath = path.join(testProjectDir, '.gitignore');
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');

      // Generated files: kept via .rulesetkeep
      expect(gitignoreContent).not.toContain('.cursor/kept.mdc');
      expect(gitignoreContent).not.toContain('.claude/kept.important');

      // Generated files: not kept, should be in .gitignore
      expect(gitignoreContent).toContain('.windsurf/ignored.md');
      expect(gitignoreContent).toContain('.amp/ignored.md');

      // Forced patterns from .rulesetignore
      expect(gitignoreContent).toContain('.build/**');
      expect(gitignoreContent).toContain('*.temp');
    });
  });

  describe('Configuration-driven Gitignore Management', () => {
    it('should respect gitignore.keep configuration patterns', async () => {
      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true, outputPath: '.cursor/test.mdc' },
          windsurf: { enabled: true, outputPath: '.windsurf/test.md' },
          'claude-code': { enabled: true, outputPath: '.claude/test.md' },
          amp: { enabled: true, outputPath: '.amp/test.md' },
        },
        gitignore: {
          enabled: true,
          keep: ['.cursor/**', '*.special'],
          options: {
            comment: 'Config-driven Gitignore',
          },
        },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Config Keep Test
`;

      const sourceFilePath = path.join(testProjectDir, 'configkeep.ruleset.md');
      await fs.writeFile(sourceFilePath, sourceContent);

      // Execute
      await runRulesetsV0(sourceFilePath, mockLogger);

      // Verify .gitignore respects keep patterns
      const gitignorePath = path.join(testProjectDir, '.gitignore');
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');

      // Should NOT contain files matching keep patterns
      expect(gitignoreContent).not.toContain('.cursor/test.mdc');

      // Should contain files not matching keep patterns
      expect(gitignoreContent).toContain('.windsurf/test.md');
      expect(gitignoreContent).toContain('.claude/test.md');
      expect(gitignoreContent).toContain('.amp/test.md');

      expect(gitignoreContent).toContain('# Config-driven Gitignore');
    });

    it('should add gitignore.ignore configuration patterns to .gitignore', async () => {
      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true, outputPath: '.cursor/test.mdc' },
        },
        gitignore: {
          enabled: true,
          ignore: ['.temp/**', '*.backup', '/specific/ignore.txt'],
          options: {
            comment: 'Config-driven Patterns',
            sort: true,
          },
        },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Config Ignore Test
`;

      const sourceFilePath = path.join(
        testProjectDir,
        'configignore.ruleset.md'
      );
      await fs.writeFile(sourceFilePath, sourceContent);

      // Execute
      await runRulesetsV0(sourceFilePath, mockLogger);

      // Verify .gitignore contains both generated files and config patterns
      const gitignorePath = path.join(testProjectDir, '.gitignore');
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');

      // Should contain generated files
      expect(gitignoreContent).toContain('.cursor/test.mdc');

      // Should contain config ignore patterns
      expect(gitignoreContent).toContain('.temp/**');
      expect(gitignoreContent).toContain('*.backup');
      expect(gitignoreContent).toContain('/specific/ignore.txt');

      expect(gitignoreContent).toContain('# Config-driven Patterns');

      // Verify sorting when enabled
      const lines = gitignoreContent
        .split('\n')
        .filter((line) => line.trim() && !line.startsWith('#'));
      const sortedLines = [...lines].sort();
      expect(lines).toEqual(sortedLines);
    });

    it('should handle complex gitignore options configuration', async () => {
      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true, outputPath: '.cursor/complex.mdc' },
          windsurf: { enabled: true, outputPath: '.windsurf/complex.md' },
        },
        gitignore: {
          enabled: true,
          keep: ['.cursor/**'],
          ignore: ['.custom/**', '*.ignore'],
          options: {
            comment: 'Complex Gitignore Configuration',
            sort: false, // Preserve order
          },
        },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      // Create existing .gitignore with some content
      const existingGitignore = `# Existing user content
node_modules/
.env
`;

      const gitignorePath = path.join(testProjectDir, '.gitignore');
      await fs.writeFile(gitignorePath, existingGitignore);

      const sourceContent = `---
ruleset:
  version: "0.1.0"
---

# Complex Options Test
`;

      const sourceFilePath = path.join(testProjectDir, 'complex.ruleset.md');
      await fs.writeFile(sourceFilePath, sourceContent);

      // Execute
      await runRulesetsV0(sourceFilePath, mockLogger);

      // Verify complex behavior
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');

      // Should preserve existing content
      expect(gitignoreContent).toContain('# Existing user content');
      expect(gitignoreContent).toContain('node_modules/');

      // Should have Rulesets section with custom comment
      expect(gitignoreContent).toContain('# Complex Gitignore Configuration');

      // Should contain non-kept generated files
      expect(gitignoreContent).toContain('.windsurf/complex.md');

      // Should NOT contain kept files
      expect(gitignoreContent).not.toContain('.cursor/complex.mdc');

      // Should contain config ignore patterns
      expect(gitignoreContent).toContain('.custom/**');
      expect(gitignoreContent).toContain('*.ignore');

      // Verify order preservation (no sorting)
      const rulesetsSection = gitignoreContent.split(
        '# Complex Gitignore Configuration'
      )[1];
      const rulesetLines = rulesetsSection
        .split('\n')
        .filter((line) => line.trim() && !line.startsWith('#'));

      // Order should be: config ignore patterns first, then generated files
      const firstConfigPattern = rulesetLines.findIndex((line) =>
        line.includes('.custom/**')
      );
      const firstGeneratedFile = rulesetLines.findIndex((line) =>
        line.includes('.windsurf/complex.md')
      );
      expect(firstConfigPattern).toBeLessThan(firstGeneratedFile);
    });
  });

  describe('Gitignore Utility Functions', () => {
    it('should normalize gitignore paths correctly', () => {
      const testCases = [
        { input: '.cursor/test.mdc', expected: '.cursor/test.mdc' },
        { input: './windsurf/test.md', expected: 'windsurf/test.md' },
        { input: '/absolute/path.txt', expected: '/absolute/path.txt' },
        { input: 'relative/path.txt', expected: 'relative/path.txt' },
        { input: './.hidden/file', expected: '.hidden/file' },
      ];

      for (const testCase of testCases) {
        const result = normalizeGitignorePath(testCase.input);
        expect(result).toBe(testCase.expected);
      }
    });

    it('should match patterns correctly', () => {
      const patterns = ['.cursor/**', '*.md', '/specific/path.txt'];

      const testCases = [
        { path: '.cursor/test.mdc', shouldMatch: true },
        { path: '.cursor/nested/file.txt', shouldMatch: true },
        { path: '.windsurf/test.md', shouldMatch: true },
        { path: 'specific/path.txt', shouldMatch: false }, // Absolute pattern
        { path: '/specific/path.txt', shouldMatch: true },
        { path: '.amp/test.txt', shouldMatch: false },
      ];

      for (const testCase of testCases) {
        const result = matchesAnyPattern(testCase.path, patterns);
        expect(result).toBe(testCase.shouldMatch);
      }
    });

    it('should parse override files correctly', async () => {
      const overrideContent = `# Comment line
.cursor/**
*.special

# Another comment
.windsurf/specific.md

# Empty lines and comments should be ignored

.claude/**
`;

      const overrideFilePath = path.join(testProjectDir, '.test-override');
      await fs.writeFile(overrideFilePath, overrideContent);

      const result = parseOverrideFile(overrideFilePath);

      expect(result.success).toBe(true);
      expect(result.patterns).toEqual([
        '.cursor/**',
        '*.special',
        '.windsurf/specific.md',
        '.claude/**',
      ]);
      expect(result.errors).toEqual([]);
    });

    it('should handle missing override files gracefully', () => {
      const result = parseOverrideFile('/nonexistent/override/file');

      expect(result.success).toBe(true);
      expect(result.patterns).toEqual([]);
      expect(result.errors).toEqual([]);
    });
  });

  describe('GitignoreManager Direct Testing', () => {
    it('should create GitignoreManager with configuration', () => {
      const gitignoreConfig: GitignoreConfig = {
        enabled: true,
        keep: ['.cursor/**'],
        ignore: ['.temp/**'],
        options: {
          comment: 'Test Manager',
          sort: true,
        },
      };

      const manager = createGitignoreManager(gitignoreConfig);

      expect(manager).toBeDefined();
      // GitignoreManager should be properly configured
      // Additional detailed testing would require exposing internal state
    });

    it('should handle gitignore updates through GitignoreManager directly', async () => {
      const gitignoreConfig: GitignoreConfig = {
        enabled: true,
        options: {
          comment: 'Direct Manager Test',
        },
      };

      const manager = createGitignoreManager(gitignoreConfig);
      const filesToAdd = ['.cursor/direct.mdc', '.windsurf/direct.md'];

      const result = await manager.updateGitignore(filesToAdd);

      expect(result.success).toBe(true);
      expect(result.added).toEqual(filesToAdd);
      expect(result.kept).toEqual([]);

      // Verify .gitignore was created
      const gitignorePath = path.join(testProjectDir, '.gitignore');
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');

      expect(gitignoreContent).toContain('# Direct Manager Test');
      expect(gitignoreContent).toContain('.cursor/direct.mdc');
      expect(gitignoreContent).toContain('.windsurf/direct.md');
    });
  });
});
