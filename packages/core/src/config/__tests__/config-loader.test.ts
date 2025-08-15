/**
 * Tests for ConfigLoader class
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ConfigLoader,
  getConfigLoader,
  loadConfig,
  validateConfig,
} from '../config-loader';
import type { RulesetConfig } from '../types';

describe('ConfigLoader', () => {
  let tempDir: string;
  let loader: ConfigLoader;

  beforeEach(async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    tempDir = join(
      tmpdir(),
      `rulesets-config-loader-test-${timestamp}-${random}`
    );
    (await Bun.file(tempDir).exists()) ||
      (await Bun.spawn(['mkdir', '-p', tempDir]).exited);
    loader = new ConfigLoader();
  });

  afterEach(async () => {
    try {
      await Bun.spawn(['rm', '-rf', tempDir]).exited;
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('parseConfigFile', () => {
    it('should parse JSONC config file', () => {
      const content = `{
        // Comments are allowed
        "strict": true,
        "providers": {
          "cursor": {
            "enabled": true,
            "outputPath": ".cursor/rules/"
          }
        }
      }`;

      const result = loader.parseConfigFile('test.jsonc', content);

      expect(result.strict).toBe(true);
      expect(result.providers?.cursor?.enabled).toBe(true);
      expect(result.providers?.cursor?.outputPath).toBe('.cursor/rules/');
    });

    it('should parse TOML config file', () => {
      const content = `
      strict = true
      defaultProviders = ["cursor", "claude-code"]
      outputDirectory = ".ruleset/dist"
      
      [gitignore]
      enabled = true
      keep = ["important.md"]
      
      [providers.cursor]
      enabled = true
      outputPath = ".cursor/rules/"
      
      [providers.cursor.options]
      alwaysApply = false
      `;

      const result = loader.parseConfigFile('test.toml', content);

      expect(result.strict).toBe(true);
      expect(result.defaultProviders).toEqual(['cursor', 'claude-code']);
      expect(result.outputDirectory).toBe('.ruleset/dist');
      expect(result.gitignore?.enabled).toBe(true);
      expect(result.gitignore?.keep).toEqual(['important.md']);
      expect(result.providers?.cursor?.enabled).toBe(true);
      expect(result.providers?.cursor?.outputPath).toBe('.cursor/rules/');
      expect(result.providers?.cursor?.options?.alwaysApply).toBe(false);
    });
  });

  describe('validateConfig', () => {
    it('should validate valid configuration', () => {
      const config: RulesetConfig = {
        strict: true,
        providers: {
          cursor: { enabled: true },
          'claude-code': { enabled: false },
        },
        gitignore: {
          enabled: true,
          keep: ['file.md'],
        },
      };

      const result = loader.validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid configuration types', () => {
      const config = {
        strict: 'not-a-boolean',
        providers: 'not-an-object',
      };

      const result = loader.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about unknown providers', () => {
      const config: RulesetConfig = {
        providers: {
          'unknown-provider': { enabled: true },
        },
      };

      const result = loader.validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('unknown-provider')])
      );
    });

    it('should reject empty output paths', () => {
      const config: RulesetConfig = {
        providers: {
          cursor: { outputPath: '' },
        },
      };

      const result = loader.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('cannot be empty')])
      );
    });

    it('should warn about empty default providers', () => {
      const config: RulesetConfig = {
        defaultProviders: [],
      };

      const result = loader.validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Default providers array cannot be empty'
      );
    });
  });

  describe('mergeConfigs', () => {
    it('should merge configurations correctly', () => {
      const config1: RulesetConfig = {
        strict: false,
        providers: {
          cursor: { enabled: true },
        },
      };

      const config2: RulesetConfig = {
        strict: true,
        providers: {
          cursor: { outputPath: '.cursor/rules/' },
          'claude-code': { enabled: true },
        },
        gitignore: { enabled: true },
      };

      const result = loader.mergeConfigs([config1, config2]);

      expect(result.strict).toBe(true);
      expect(result.providers?.cursor?.enabled).toBe(true);
      expect(result.providers?.cursor?.outputPath).toBe('.cursor/rules/');
      expect(result.providers?.['claude-code']?.enabled).toBe(true);
      expect(result.gitignore?.enabled).toBe(true);
    });
  });

  describe('applyEnvOverrides', () => {
    it('should apply environment overrides', () => {
      const config: RulesetConfig = {
        strict: false,
        providers: {
          cursor: { enabled: false },
        },
      };

      const env = {
        RULESETS_STRICT: 'true',
        RULESETS_PROVIDERS_CURSOR_ENABLED: 'true',
        RULESETS_OUTPUT_DIRECTORY: '/custom/path',
      };

      const result = loader.applyEnvOverrides(config, env);

      expect(result.strict).toBe(true);
      expect(result.providers?.cursor?.enabled).toBe(true);
      expect(result.outputDirectory).toBe('/custom/path');
    });
  });

  describe('loadConfig', () => {
    it('should load configuration from project directory', async () => {
      // Create config file
      const configContent = `{
        "strict": true,
        "providers": {
          "cursor": {
            "enabled": true,
            "outputPath": ".cursor/rules/"
          }
        }
      }`;

      await Bun.write(join(tempDir, 'ruleset.config.jsonc'), configContent);

      const result = await loader.loadConfig({
        projectPath: tempDir,
        env: {},
      });

      expect(result.config.strict).toBe(true);
      expect(result.config.providers?.cursor?.enabled).toBe(true);
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].format).toBe('jsonc');
    });

    it('should merge with defaults', async () => {
      // Create minimal config file
      const configContent = `{
        "strict": false
      }`;

      await Bun.write(join(tempDir, 'ruleset.config.jsonc'), configContent);

      const result = await loader.loadConfig({
        projectPath: tempDir,
        env: {},
      });

      expect(result.config.strict).toBe(false);
      // Should have defaults
      expect(result.config.gitignore?.enabled).toBe(true);
      expect(result.config.defaultProviders).toEqual(['cursor', 'claude-code']);
    });

    it('should apply environment overrides', async () => {
      const configContent = `{
        "strict": false
      }`;

      await Bun.write(join(tempDir, 'ruleset.config.jsonc'), configContent);

      const result = await loader.loadConfig({
        projectPath: tempDir,
        env: {
          RULESETS_STRICT: 'true',
          RULESETS_PROVIDERS_CURSOR_ENABLED: 'true',
        },
      });

      expect(result.config.strict).toBe(true);
      expect(result.config.providers?.cursor?.enabled).toBe(true);
      expect(result.envOverrides.RULESETS_STRICT).toBe(true);
    });

    it('should work without config file', async () => {
      const result = await loader.loadConfig({
        projectPath: tempDir,
        env: {},
      });

      // Should use defaults
      expect(result.config.strict).toBe(true);
      expect(result.config.gitignore?.enabled).toBe(true);
      expect(result.sources).toHaveLength(0);
    });

    it('should search parent directories', async () => {
      const subDir = join(tempDir, 'subproject');
      await Bun.spawn(['mkdir', '-p', subDir]).exited;

      const configContent = `{
        "strict": true
      }`;

      await Bun.write(join(tempDir, 'ruleset.config.jsonc'), configContent);

      const result = await loader.loadConfig({
        projectPath: subDir,
        env: {},
      });

      expect(result.config.strict).toBe(true);
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].directory).toBe(tempDir);
    });
  });

  describe('findConfigFile', () => {
    it('should find config file in directory', async () => {
      await Bun.write(join(tempDir, 'ruleset.config.toml'), 'strict = true');

      const result = await loader.findConfigFile(tempDir);

      expect(result).toBeTruthy();
      expect(result?.format).toBe('toml');
      expect(result?.directory).toBe(tempDir);
    });

    it('should return null when no config found', async () => {
      const result = await loader.findConfigFile(tempDir);

      expect(result).toBeNull();
    });
  });
});

describe('Configuration convenience functions', () => {
  let tempDir: string;

  beforeEach(async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    tempDir = join(
      tmpdir(),
      `rulesets-config-convenience-test-${timestamp}-${random}`
    );
    (await Bun.file(tempDir).exists()) ||
      (await Bun.spawn(['mkdir', '-p', tempDir]).exited);
  });

  afterEach(async () => {
    try {
      await Bun.spawn(['rm', '-rf', tempDir]).exited;
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('getConfigLoader', () => {
    it('should return singleton instance', () => {
      const loader1 = getConfigLoader();
      const loader2 = getConfigLoader();

      expect(loader1).toBe(loader2);
    });
  });

  describe('loadConfig convenience function', () => {
    it('should load configuration using default loader', async () => {
      const configContent = `{
        "strict": true
      }`;

      await Bun.write(join(tempDir, 'ruleset.config.jsonc'), configContent);

      const result = await loadConfig(tempDir);

      expect(result.config.strict).toBe(true);
    });
  });

  describe('validateConfig convenience function', () => {
    it('should validate configuration using default loader', () => {
      const config: RulesetConfig = {
        strict: true,
        providers: {
          cursor: { enabled: true },
        },
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(true);
    });
  });
});
