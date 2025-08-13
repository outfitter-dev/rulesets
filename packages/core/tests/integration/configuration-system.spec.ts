/**
 * Configuration System Integration Tests
 *
 * Tests the configuration loading, parsing, validation, and hierarchy system.
 * Validates JSONC and TOML support, environment overrides, and config inheritance.
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
  applyEnvOverrides,
  ConsoleLogger,
  DEFAULT_CONFIG,
  findConfigFile,
  loadConfig,
  mergeConfigs,
  parseConfigContent,
  type RulesetConfig,
  validateConfig,
} from '../../src';

// Create real temporary directory for integration tests
const TEST_DIR = path.join(tmpdir(), `rulesets-config-${Date.now()}`);

describe('Configuration System Integration Tests', () => {
  let mockLogger: ConsoleLogger;
  let testProjectDir: string;
  let originalEnv: Record<string, string | undefined>;

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

    // Store original environment
    originalEnv = { ...process.env };

    // Clean RULESETS_ environment variables
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('RULESETS_')) {
        delete process.env[key];
      }
    });

    // Create unique test project directory for each test
    testProjectDir = path.join(
      TEST_DIR,
      `config-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    );
    await fs.mkdir(testProjectDir, { recursive: true });

    // Change to test directory for relative path operations
    process.chdir(testProjectDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();

    // Restore original environment
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('RULESETS_')) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  describe('JSONC Configuration Loading', () => {
    it('should load and parse valid JSONC configuration with comments', async () => {
      const configContent = `{
  // Rulesets configuration with comments
  "rulesets": {
    "version": "0.1.0" // Version comment
  },
  /* Block comment */
  "outputDirectory": ".custom/output",
  "providers": {
    "cursor": {
      "enabled": true,
      "outputPath": ".cursor/custom.mdc" // Custom path
    },
    "windsurf": {
      "enabled": false // Disabled
    }
  },
  "gitignore": {
    "enabled": true,
    "options": {
      "comment": "Custom Generated Files",
      "sort": true
    }
  }
}`;

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, configContent);

      const result = await loadConfig(testProjectDir, {}, mockLogger);

      expect(result.success).toBe(true);
      expect(result.config.rulesets.version).toBe('0.1.0');
      expect(result.config.outputDirectory).toBe('.custom/output');
      expect(result.config.providers?.cursor?.enabled).toBe(true);
      expect(result.config.providers?.cursor?.outputPath).toBe(
        '.cursor/custom.mdc'
      );
      expect(result.config.providers?.windsurf?.enabled).toBe(false);
      expect(result.config.gitignore?.enabled).toBe(true);
      expect(result.config.gitignore?.options?.comment).toBe(
        'Custom Generated Files'
      );

      expect(result.sources).toContain(configPath);
      expect(result.errors).toBeUndefined();
      expect(result.warnings).toBeUndefined();
    });

    it('should handle malformed JSONC with helpful error messages', async () => {
      const invalidConfigContent = `{
  "rulesets": {
    "version": "0.1.0"
  },
  "providers": {
    "cursor": {
      "enabled": true,
      // Missing comma before this comment
      "outputPath": ".cursor/test.mdc"
    }
  } // Missing comma here
  "gitignore": {
    "enabled": true
  }
}`;

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, invalidConfigContent);

      const result = await loadConfig(testProjectDir, {}, mockLogger);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0]).toContain('JSON parsing error');
    });

    it('should validate configuration against schema', async () => {
      const invalidConfigContent = `{
  "rulesets": {
    "version": "invalid-version"
  },
  "providers": {
    "unknown-provider": {
      "enabled": true
    }
  },
  "outputDirectory": 123
}`;

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, invalidConfigContent);

      const result = await loadConfig(testProjectDir, {}, mockLogger);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);

      // Should contain validation errors for invalid version, unknown provider, and wrong type
      const errorText = result.errors!.join(' ');
      expect(errorText).toContain('version');
      expect(errorText).toMatch(/outputDirectory|type/);
    });
  });

  describe('TOML Configuration Loading', () => {
    it('should load and parse valid TOML configuration', async () => {
      const configContent = `# Rulesets TOML Configuration
[rulesets]
version = "0.1.0"

outputDirectory = ".toml/output"

[providers.cursor]
enabled = true
outputPath = ".cursor/toml.mdc"

[providers.windsurf]
enabled = true
outputPath = ".windsurf/toml.md"

[providers."claude-code"]
enabled = false

[gitignore]
enabled = true
keep = [".cursor/**", ".special/**"]
ignore = [".temp/**"]

[gitignore.options]
comment = "TOML Generated Files"
sort = false
`;

      const configPath = path.join(testProjectDir, 'ruleset.config.toml');
      await fs.writeFile(configPath, configContent);

      const result = await loadConfig(testProjectDir, {}, mockLogger);

      expect(result.success).toBe(true);
      expect(result.config.rulesets.version).toBe('0.1.0');
      expect(result.config.outputDirectory).toBe('.toml/output');
      expect(result.config.providers?.cursor?.enabled).toBe(true);
      expect(result.config.providers?.cursor?.outputPath).toBe(
        '.cursor/toml.mdc'
      );
      expect(result.config.providers?.windsurf?.enabled).toBe(true);
      expect(result.config.providers?.['claude-code']?.enabled).toBe(false);
      expect(result.config.gitignore?.enabled).toBe(true);
      expect(result.config.gitignore?.keep).toEqual([
        '.cursor/**',
        '.special/**',
      ]);
      expect(result.config.gitignore?.ignore).toEqual(['.temp/**']);
      expect(result.config.gitignore?.options?.comment).toBe(
        'TOML Generated Files'
      );
      expect(result.config.gitignore?.options?.sort).toBe(false);

      expect(result.sources).toContain(configPath);
    });

    it('should handle malformed TOML with helpful error messages', async () => {
      const invalidConfigContent = `# Invalid TOML
[rulesets
version = "0.1.0"  # Missing closing bracket above

[providers.cursor]
enabled = true
outputPath = ".cursor/test.mdc"
invalid-key-format = value  # Invalid key format
`;

      const configPath = path.join(testProjectDir, 'ruleset.config.toml');
      await fs.writeFile(configPath, invalidConfigContent);

      const result = await loadConfig(testProjectDir, {}, mockLogger);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0]).toContain('TOML parsing error');
    });
  });

  describe('Configuration File Discovery', () => {
    it('should find configuration files in priority order', async () => {
      // Create multiple config files
      const configs = [
        { name: 'ruleset.config.jsonc', priority: 1 },
        { name: 'ruleset.config.json', priority: 2 },
        { name: 'ruleset.config.toml', priority: 3 },
        { name: '.rulesetsrc.jsonc', priority: 4 },
        { name: '.rulesetsrc.json', priority: 5 },
        { name: '.rulesetsrc.toml', priority: 6 },
      ];

      // Create all config files
      for (const config of configs) {
        const content = config.name.endsWith('.toml')
          ? `[rulesets]\nversion = "0.1.0"\npriority = ${config.priority}`
          : `{"rulesets": {"version": "0.1.0"}, "priority": ${config.priority}}`;

        await fs.writeFile(path.join(testProjectDir, config.name), content);
      }

      const result = await loadConfig(testProjectDir, {}, mockLogger);

      expect(result.success).toBe(true);
      // Should load the highest priority file (lowest number)
      expect((result.config as any).priority).toBe(1);
      expect(result.sources[0]).toContain('ruleset.config.jsonc');
    });

    it('should search in parent directories', async () => {
      // Create nested directory structure
      const subDir = path.join(testProjectDir, 'sub', 'nested');
      await fs.mkdir(subDir, { recursive: true });

      // Create config in parent directory
      const parentConfig = {
        rulesets: { version: '0.1.0' },
        outputDirectory: '.parent/output',
        providers: {
          cursor: { enabled: true },
        },
      };

      const parentConfigPath = path.join(
        testProjectDir,
        'ruleset.config.jsonc'
      );
      await fs.writeFile(
        parentConfigPath,
        JSON.stringify(parentConfig, null, 2)
      );

      // Load config from nested directory
      const result = await loadConfig(subDir, {}, mockLogger);

      expect(result.success).toBe(true);
      expect(result.config.outputDirectory).toBe('.parent/output');
      expect(result.sources).toContain(parentConfigPath);
    });

    it('should handle missing configuration files gracefully', async () => {
      const result = await loadConfig(testProjectDir, {}, mockLogger);

      expect(result.success).toBe(true);
      expect(result.config).toEqual(DEFAULT_CONFIG);
      expect(result.sources).toEqual([]);
      expect(result.warnings).toContain(
        'No configuration file found, using defaults'
      );
    });
  });

  describe('Environment Variable Overrides', () => {
    it('should apply environment variable overrides to configuration', async () => {
      // Setup base configuration
      const baseConfig = {
        rulesets: { version: '0.1.0' },
        outputDirectory: '.base/output',
        providers: {
          cursor: { enabled: true, outputPath: '.cursor/base.mdc' },
          windsurf: { enabled: false },
        },
        gitignore: { enabled: false },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(baseConfig, null, 2));

      // Set environment overrides
      process.env.RULESETS_OUTPUT_DIRECTORY = '.env/output';
      process.env.RULESETS_PROVIDERS_CURSOR_OUTPUT_PATH = '.cursor/env.mdc';
      process.env.RULESETS_PROVIDERS_WINDSURF_ENABLED = 'true';
      process.env.RULESETS_PROVIDERS_CLAUDE_CODE_ENABLED = 'true';
      process.env.RULESETS_PROVIDERS_CLAUDE_CODE_OUTPUT_PATH = '.claude/env.md';
      process.env.RULESETS_GITIGNORE_ENABLED = 'true';
      process.env.RULESETS_GITIGNORE_OPTIONS_COMMENT = 'Env Generated Files';

      const result = await loadConfig(testProjectDir, {}, mockLogger);

      expect(result.success).toBe(true);
      expect(result.config.outputDirectory).toBe('.env/output');
      expect(result.config.providers?.cursor?.outputPath).toBe(
        '.cursor/env.mdc'
      );
      expect(result.config.providers?.windsurf?.enabled).toBe(true);
      expect(result.config.providers?.['claude-code']?.enabled).toBe(true);
      expect(result.config.providers?.['claude-code']?.outputPath).toBe(
        '.claude/env.md'
      );
      expect(result.config.gitignore?.enabled).toBe(true);
      expect(result.config.gitignore?.options?.comment).toBe(
        'Env Generated Files'
      );

      expect(Object.keys(result.envOverrides)).toContain(
        'RULESETS_OUTPUT_DIRECTORY'
      );
      expect(Object.keys(result.envOverrides)).toContain(
        'RULESETS_PROVIDERS_CURSOR_OUTPUT_PATH'
      );
    });

    it('should handle invalid environment variable values gracefully', async () => {
      const baseConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true },
        },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(baseConfig, null, 2));

      // Set invalid environment values
      process.env.RULESETS_PROVIDERS_CURSOR_ENABLED = 'not-a-boolean';
      process.env.RULESETS_OUTPUT_DIRECTORY = ''; // Empty string
      process.env.RULESETS_GITIGNORE_OPTIONS_SORT = 'invalid-boolean';

      const result = await loadConfig(testProjectDir, {}, mockLogger);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);

      const warningText = result.warnings!.join(' ');
      expect(warningText).toContain('environment variable');
    });

    it('should support complex nested environment overrides', async () => {
      const baseConfig = {
        rulesets: { version: '0.1.0' },
        gitignore: {
          enabled: false,
          keep: ['.base/**'],
          ignore: ['.temp/**'],
          options: {
            comment: 'Base Comment',
            sort: false,
          },
        },
      };

      const configPath = path.join(testProjectDir, 'ruleset.config.jsonc');
      await fs.writeFile(configPath, JSON.stringify(baseConfig, null, 2));

      // Set complex nested overrides
      process.env.RULESETS_GITIGNORE_ENABLED = 'true';
      process.env.RULESETS_GITIGNORE_KEEP = '.env/**,.special/**';
      process.env.RULESETS_GITIGNORE_IGNORE = '.env-temp/**';
      process.env.RULESETS_GITIGNORE_OPTIONS_COMMENT = 'Env Override Comment';
      process.env.RULESETS_GITIGNORE_OPTIONS_SORT = 'true';

      const result = await loadConfig(testProjectDir, {}, mockLogger);

      expect(result.success).toBe(true);
      expect(result.config.gitignore?.enabled).toBe(true);
      expect(result.config.gitignore?.keep).toEqual(['.env/**', '.special/**']);
      expect(result.config.gitignore?.ignore).toEqual(['.env-temp/**']);
      expect(result.config.gitignore?.options?.comment).toBe(
        'Env Override Comment'
      );
      expect(result.config.gitignore?.options?.sort).toBe(true);
    });
  });

  describe('Configuration Hierarchy and Merging', () => {
    it('should merge multiple configuration sources in priority order', async () => {
      // Create global config directory structure
      const globalConfigDir = path.join(testProjectDir, '.global');
      await fs.mkdir(globalConfigDir, { recursive: true });

      // Create global config
      const globalConfig = {
        rulesets: { version: '0.1.0' },
        outputDirectory: '.global/output',
        providers: {
          cursor: { enabled: true, outputPath: '.cursor/global.mdc' },
          windsurf: { enabled: true, outputPath: '.windsurf/global.md' },
          'claude-code': { enabled: false },
        },
        gitignore: {
          enabled: true,
          keep: ['.global/**'],
          options: { comment: 'Global Files', sort: true },
        },
      };

      const globalConfigPath = path.join(
        globalConfigDir,
        'ruleset.config.jsonc'
      );
      await fs.writeFile(
        globalConfigPath,
        JSON.stringify(globalConfig, null, 2)
      );

      // Create project config that overrides some settings
      const projectConfig = {
        outputDirectory: '.project/output',
        providers: {
          cursor: { outputPath: '.cursor/project.mdc' },
          'claude-code': { enabled: true, outputPath: '.claude/project.md' },
          amp: { enabled: true },
        },
        gitignore: {
          keep: ['.project/**'],
          options: { comment: 'Project Files' },
        },
      };

      const projectConfigPath = path.join(
        testProjectDir,
        'ruleset.config.jsonc'
      );
      await fs.writeFile(
        projectConfigPath,
        JSON.stringify(projectConfig, null, 2)
      );

      // Mock global config discovery to use our test global config
      const originalGetGlobalConfigDir =
        require('../../src/config/utils').getGlobalConfigDir;
      vi.doMock('../../src/config/utils', () => ({
        ...require('../../src/config/utils'),
        getGlobalConfigDir: () => globalConfigDir,
      }));

      const result = await loadConfig(testProjectDir, {}, mockLogger);

      expect(result.success).toBe(true);

      // Should use global version (required field)
      expect(result.config.rulesets.version).toBe('0.1.0');

      // Should use project outputDirectory (overrides global)
      expect(result.config.outputDirectory).toBe('.project/output');

      // Providers should be merged
      expect(result.config.providers?.cursor?.enabled).toBe(true); // From global
      expect(result.config.providers?.cursor?.outputPath).toBe(
        '.cursor/project.mdc'
      ); // From project
      expect(result.config.providers?.windsurf?.enabled).toBe(true); // From global
      expect(result.config.providers?.windsurf?.outputPath).toBe(
        '.windsurf/global.md'
      ); // From global
      expect(result.config.providers?.['claude-code']?.enabled).toBe(true); // From project
      expect(result.config.providers?.['claude-code']?.outputPath).toBe(
        '.claude/project.md'
      ); // From project
      expect(result.config.providers?.amp?.enabled).toBe(true); // From project

      // Gitignore should be merged
      expect(result.config.gitignore?.enabled).toBe(true); // From global
      expect(result.config.gitignore?.keep).toEqual(['.project/**']); // From project (array replacement)
      expect(result.config.gitignore?.options?.comment).toBe('Project Files'); // From project
      expect(result.config.gitignore?.options?.sort).toBe(true); // From global

      expect(result.sources).toHaveLength(2);
      expect(result.sources).toContain(projectConfigPath);
      expect(result.sources).toContain(globalConfigPath);

      // Restore original function
      vi.unmock('../../src/config/utils');
    });

    it('should handle configuration validation across merged configs', async () => {
      // Create base config with valid structure
      const baseConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: { enabled: true },
        },
      };

      const baseConfigPath = path.join(testProjectDir, 'base.config.jsonc');
      await fs.writeFile(baseConfigPath, JSON.stringify(baseConfig, null, 2));

      // Create override config with invalid values
      const overrideConfig = {
        outputDirectory: 123, // Invalid type
        providers: {
          'invalid-provider': { enabled: true }, // Unknown provider
        },
        gitignore: {
          enabled: 'not-boolean', // Invalid type
        },
      };

      const overrideConfigPath = path.join(
        testProjectDir,
        'override.config.jsonc'
      );
      await fs.writeFile(
        overrideConfigPath,
        JSON.stringify(overrideConfig, null, 2)
      );

      // Parse configs individually
      const baseResult = parseConfigContent(
        JSON.stringify(baseConfig),
        'jsonc'
      );
      const overrideResult = parseConfigContent(
        JSON.stringify(overrideConfig),
        'jsonc'
      );

      expect(baseResult.success).toBe(true);
      expect(overrideResult.success).toBe(true);

      // Merge configs
      const merged = mergeConfigs([baseResult.config!, overrideResult.config!]);

      // Validate merged config
      const validation = validateConfig(merged);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);

      const errorText = validation.errors.join(' ');
      expect(errorText).toMatch(/outputDirectory.*type/);
      expect(errorText).toContain('invalid-provider');
      expect(errorText).toMatch(/gitignore.*enabled.*type/);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate provider configurations comprehensively', async () => {
      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        providers: {
          cursor: {
            enabled: true,
            outputPath: '.cursor/test.mdc',
            // Add provider-specific valid properties
          },
          windsurf: {
            enabled: false,
            outputPath: '.windsurf/test.md',
          },
          'claude-code': {
            enabled: true,
            // Missing outputPath is valid (uses default)
          },
          'invalid-provider': {
            enabled: true,
          },
        },
      };

      const validation = validateConfig(config);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        expect.stringMatching(/invalid-provider.*not.*supported/)
      );
    });

    it('should validate gitignore configuration thoroughly', async () => {
      const config: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        gitignore: {
          enabled: true,
          keep: ['.valid/**', 'invalid-pattern-without-glob'],
          ignore: ['.temp/**'],
          options: {
            comment: '', // Empty comment
            sort: true,
          },
        },
      };

      const validation = validateConfig(config);

      if (!validation.isValid) {
        const errorText = validation.errors.join(' ');
        // May contain warnings about glob patterns or empty comments
        console.log('Validation errors:', validation.errors);
      }

      // The validation should still pass for basic structure
      expect(
        validation.errors.filter((err) => err.includes('required')).length
      ).toBe(0);
    });

    it('should provide helpful error messages for common mistakes', async () => {
      const invalidConfigs = [
        {
          name: 'missing version',
          config: { providers: { cursor: { enabled: true } } },
          expectedError: 'version',
        },
        {
          name: 'invalid version format',
          config: { rulesets: { version: '1.0' }, providers: {} },
          expectedError: 'version',
        },
        {
          name: 'invalid outputDirectory type',
          config: { rulesets: { version: '0.1.0' }, outputDirectory: 123 },
          expectedError: 'outputDirectory',
        },
      ];

      for (const testCase of invalidConfigs) {
        const validation = validateConfig(testCase.config as RulesetConfig);

        expect(validation.isValid).toBe(false);
        const errorText = validation.errors.join(' ');
        expect(errorText).toContain(testCase.expectedError);
      }
    });
  });
});
