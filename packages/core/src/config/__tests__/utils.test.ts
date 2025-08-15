/**
 * Tests for configuration utilities
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RulesetConfig } from '../types';
import {
  applyEnvOverrides,
  fileExists,
  findConfigFile,
  getConfigFormat,
  mergeConfigs,
  parseConfigContent,
  parseEnvOverride,
  parseEnvValue,
  setDeepValue,
} from '../utils';

// Regex constants at top level for performance
const FAILED_TO_PARSE_JSONC_REGEX = /Failed to parse JSONC/;
const FAILED_TO_PARSE_TOML_REGEX = /Failed to parse TOML/;

describe('Configuration Utilities', () => {
  let tempDir: string;

  beforeEach(async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    tempDir = join(tmpdir(), `rulesets-config-test-${timestamp}-${random}`);
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

  describe('fileExists', () => {
    it('should return true for existing files', async () => {
      const testFile = join(tempDir, 'test.txt');
      await Bun.write(testFile, 'test content');

      expect(await fileExists(testFile)).toBe(true);
    });

    it('should return false for non-existing files', async () => {
      const testFile = join(tempDir, 'nonexistent.txt');

      expect(await fileExists(testFile)).toBe(false);
    });
  });

  describe('getConfigFormat', () => {
    it('should return toml for .toml files', () => {
      expect(getConfigFormat('ruleset.config.toml')).toBe('toml');
    });

    it('should return jsonc for .json files', () => {
      expect(getConfigFormat('ruleset.config.json')).toBe('jsonc');
    });

    it('should return jsonc for .jsonc files', () => {
      expect(getConfigFormat('ruleset.config.jsonc')).toBe('jsonc');
    });
  });

  describe('parseConfigContent', () => {
    it('should parse valid JSONC content', () => {
      const content = `{
        // This is a comment
        "strict": true,
        "providers": {
          "cursor": {
            "enabled": true
          }
        }
      }`;

      const result = parseConfigContent(content, 'jsonc', 'test.jsonc');

      expect(result.strict).toBe(true);
      expect(result.providers?.cursor?.enabled).toBe(true);
    });

    it('should parse valid TOML content', () => {
      const content = `
      strict = true
      defaultProviders = ["cursor", "claude-code"]
      
      [providers.cursor]
      enabled = true
      outputPath = ".cursor/rules/"
      `;

      const result = parseConfigContent(content, 'toml', 'test.toml');

      expect(result.strict).toBe(true);
      expect(result.defaultProviders).toEqual(['cursor', 'claude-code']);
      expect(result.providers?.cursor?.enabled).toBe(true);
    });

    it('should throw on invalid JSONC', () => {
      const content = '{ invalid json }';

      expect(() => {
        parseConfigContent(content, 'jsonc', 'test.jsonc');
      }).toThrow(FAILED_TO_PARSE_JSONC_REGEX);
    });

    it('should throw on invalid TOML', () => {
      const content = '[invalid toml';

      expect(() => {
        parseConfigContent(content, 'toml', 'test.toml');
      }).toThrow(FAILED_TO_PARSE_TOML_REGEX);
    });
  });

  describe('findConfigFile', () => {
    it('should find config file in current directory', async () => {
      const configPath = join(tempDir, 'ruleset.config.jsonc');
      await Bun.write(configPath, '{"strict": true}');

      const result = await findConfigFile(tempDir);

      expect(result).toBeTruthy();
      expect(result?.filePath).toBe(configPath);
      expect(result?.format).toBe('jsonc');
    });

    it('should find config file in parent directory', async () => {
      const subDir = join(tempDir, 'subdir');
      await fs.mkdir(subDir);

      const configPath = join(tempDir, 'ruleset.config.toml');
      await Bun.write(configPath, 'strict = true');

      const result = await findConfigFile(subDir);

      expect(result).toBeTruthy();
      expect(result?.filePath).toBe(configPath);
      expect(result?.format).toBe('toml');
    });

    it('should respect file precedence order', async () => {
      // Create multiple config files
      await Bun.write(join(tempDir, 'ruleset.config.toml'), 'strict = false');
      await Bun.write(
        join(tempDir, 'ruleset.config.jsonc'),
        '{"strict": true}'
      );

      const result = await findConfigFile(tempDir);

      // Should pick .jsonc over .toml based on precedence
      expect(result?.format).toBe('jsonc');
      expect(result?.filePath).toBe(join(tempDir, 'ruleset.config.jsonc'));
    });

    it('should return null when no config found', async () => {
      const result = await findConfigFile(tempDir);
      expect(result).toBeNull();
    });

    it('should respect maxSearchDepth option', async () => {
      const deepDir = join(tempDir, 'a', 'b', 'c');
      await fs.mkdir(deepDir, { recursive: true });

      const configPath = join(tempDir, 'ruleset.config.jsonc');
      await Bun.write(configPath, '{"strict": true}');

      const result = await findConfigFile(deepDir, { maxSearchDepth: 1 });
      expect(result).toBeNull();
    });
  });

  describe('mergeConfigs', () => {
    it('should merge simple configs', () => {
      const config1: RulesetConfig = { strict: true };
      const config2: RulesetConfig = { outputDirectory: '.dist' };

      const result = mergeConfigs(config1, config2);

      expect(result.strict).toBe(true);
      expect(result.outputDirectory).toBe('.dist');
    });

    it('should override values in later configs', () => {
      const config1: RulesetConfig = { strict: false };
      const config2: RulesetConfig = { strict: true };

      const result = mergeConfigs(config1, config2);

      expect(result.strict).toBe(true);
    });

    it('should deep merge providers', () => {
      const config1: RulesetConfig = {
        providers: {
          cursor: { enabled: true },
          'claude-code': { enabled: false },
        },
      };
      const config2: RulesetConfig = {
        providers: {
          cursor: { outputPath: '.cursor/rules/' },
          windsurf: { enabled: true },
        },
      };

      const result = mergeConfigs(config1, config2);

      expect(result.providers?.cursor?.enabled).toBe(true);
      expect(result.providers?.cursor?.outputPath).toBe('.cursor/rules/');
      expect(result.providers?.['claude-code']?.enabled).toBe(false);
      expect(result.providers?.windsurf?.enabled).toBe(true);
    });

    it('should merge gitignore arrays correctly', () => {
      const config1: RulesetConfig = {
        gitignore: { keep: ['file1.md'], ignore: ['*.tmp'] },
      };
      const config2: RulesetConfig = {
        gitignore: { keep: ['file2.md'], ignore: ['*.log'] },
      };

      const result = mergeConfigs(config1, config2);

      expect(result.gitignore?.keep).toEqual(['file1.md', 'file2.md']);
      expect(result.gitignore?.ignore).toEqual(['*.tmp', '*.log']);
    });
  });

  describe('parseEnvValue', () => {
    it('should parse boolean values', () => {
      expect(parseEnvValue('true')).toBe(true);
      expect(parseEnvValue('false')).toBe(false);
    });

    it('should parse numeric values', () => {
      expect(parseEnvValue('42')).toBe(42);
      expect(parseEnvValue('-123')).toBe(-123);
      expect(parseEnvValue('3.14')).toBe(3.14);
      expect(parseEnvValue('-2.5')).toBe(-2.5);
    });

    it('should parse JSON values', () => {
      expect(parseEnvValue('["a", "b"]')).toEqual(['a', 'b']);
      expect(parseEnvValue('{"key": "value"}')).toEqual({ key: 'value' });
    });

    it('should return string for other values', () => {
      expect(parseEnvValue('hello')).toBe('hello');
      expect(parseEnvValue('path/to/file')).toBe('path/to/file');
    });
  });

  describe('parseEnvOverride', () => {
    it('should parse provider overrides', () => {
      const result = parseEnvOverride(
        'RULESETS_PROVIDERS_CURSOR_ENABLED',
        'true'
      );

      expect(result).toEqual({
        path: ['providers', 'cursor', 'enabled'],
        value: true,
      });
    });

    it('should parse output path overrides', () => {
      const result = parseEnvOverride(
        'RULESETS_PROVIDERS_CLAUDE_CODE_OUTPUT_PATH',
        '/custom/path'
      );

      expect(result).toEqual({
        path: ['providers', 'claude-code', 'outputPath'],
        value: '/custom/path',
      });
    });

    it('should parse global overrides', () => {
      const result = parseEnvOverride('RULESETS_STRICT', 'false');

      expect(result).toEqual({
        path: ['strict'],
        value: false,
      });
    });

    it('should parse output directory override', () => {
      const result = parseEnvOverride(
        'RULESETS_OUTPUT_DIRECTORY',
        '/custom/dist'
      );

      expect(result).toEqual({
        path: ['outputDirectory'],
        value: '/custom/dist',
      });
    });

    it('should return null for non-matching keys', () => {
      expect(parseEnvOverride('OTHER_VAR', 'value')).toBeNull();
    });
  });

  describe('setDeepValue', () => {
    it('should set deep values in objects', () => {
      const obj = {};

      setDeepValue(obj, ['providers', 'cursor', 'enabled'], true);

      expect((obj as Record<string, unknown>).providers).toBeDefined();
      expect(
        ((obj as Record<string, unknown>).providers as Record<string, unknown>)
          .cursor
      ).toBeDefined();
      expect(
        (
          (
            (obj as Record<string, unknown>).providers as Record<
              string,
              unknown
            >
          ).cursor as Record<string, unknown>
        ).enabled
      ).toBe(true);
    });

    it('should overwrite existing values', () => {
      const obj = { providers: { cursor: { enabled: false } } };

      setDeepValue(obj, ['providers', 'cursor', 'enabled'], true);

      expect(obj.providers.cursor.enabled).toBe(true);
    });
  });

  describe('applyEnvOverrides', () => {
    it('should apply environment overrides', () => {
      const config: RulesetConfig = { strict: false };
      const env = {
        RULESETS_STRICT: 'true',
        RULESETS_PROVIDERS_CURSOR_ENABLED: 'true',
        OTHER_VAR: 'ignored',
      };

      const { config: result, applied } = applyEnvOverrides(config, env);

      expect(result.strict).toBe(true);
      expect((result as Record<string, unknown>).providers).toBeDefined();
      expect(
        (
          (result as Record<string, unknown>).providers as Record<
            string,
            unknown
          >
        ).cursor
      ).toBeDefined();
      expect(
        (
          (
            (result as Record<string, unknown>).providers as Record<
              string,
              unknown
            >
          ).cursor as Record<string, unknown>
        ).enabled
      ).toBe(true);
      expect(applied.RULESETS_STRICT).toBe(true);
      expect(applied.RULESETS_PROVIDERS_CURSOR_ENABLED).toBe(true);
      expect(applied.OTHER_VAR).toBeUndefined();
    });
  });
});
