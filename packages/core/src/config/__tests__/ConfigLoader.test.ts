/**
 * Tests for ConfigLoader class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ConfigLoader, getConfigLoader, loadConfig, validateConfig } from '../ConfigLoader';
import type { RulesetConfig } from '../types';

describe('ConfigLoader', () => {
  let tempDir: string;
  let loader: ConfigLoader;
  
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'rulesets-config-loader-test-'));
    loader = new ConfigLoader();
  });
  
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('parseConfigFile', () => {
    it('should parse JSONC config file', async () => {
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
      
      const result = await loader.parseConfigFile('test.jsonc', content);
      
      expect(result.strict).toBe(true);
      expect(result.providers?.cursor?.enabled).toBe(true);
      expect(result.providers?.cursor?.outputPath).toBe('.cursor/rules/');
    });
    
    it('should parse TOML config file', async () => {
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
      
      const result = await loader.parseConfigFile('test.toml', content);
      
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
    it('should validate valid configuration', async () => {
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
      
      const result = await loader.validateConfig(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
    
    it('should reject invalid configuration types', async () => {
      const config = {
        strict: 'not-a-boolean',
        providers: 'not-an-object',
      };
      
      const result = await loader.validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('should warn about unknown providers', async () => {
      const config: RulesetConfig = {
        providers: {
          'unknown-provider': { enabled: true },
        },
      };
      
      const result = await loader.validateConfig(config);
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        expect.stringContaining('Unknown provider \'unknown-provider\'')
      );
    });
    
    it('should reject empty output paths', async () => {
      const config: RulesetConfig = {
        providers: {
          cursor: { outputPath: '' },
        },
      };
      
      const result = await loader.validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('Output path cannot be empty')
      );
    });
    
    it('should warn about empty default providers', async () => {
      const config: RulesetConfig = {
        defaultProviders: [],
      };
      
      const result = await loader.validateConfig(config);
      
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
        'RULESETS_STRICT': 'true',
        'RULESETS_PROVIDERS_CURSOR_ENABLED': 'true',
        'RULESETS_OUTPUT_DIRECTORY': '/custom/path',
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
      
      await fs.writeFile(join(tempDir, 'ruleset.config.jsonc'), configContent);
      
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
      
      await fs.writeFile(join(tempDir, 'ruleset.config.jsonc'), configContent);
      
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
      
      await fs.writeFile(join(tempDir, 'ruleset.config.jsonc'), configContent);
      
      const result = await loader.loadConfig({
        projectPath: tempDir,
        env: {
          'RULESETS_STRICT': 'true',
          'RULESETS_PROVIDERS_CURSOR_ENABLED': 'true',
        },
      });
      
      expect(result.config.strict).toBe(true);
      expect(result.config.providers?.cursor?.enabled).toBe(true);
      expect(result.envOverrides['RULESETS_STRICT']).toBe(true);
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
      await fs.mkdir(subDir);
      
      const configContent = `{
        "strict": true
      }`;
      
      await fs.writeFile(join(tempDir, 'ruleset.config.jsonc'), configContent);
      
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
      await fs.writeFile(join(tempDir, 'ruleset.config.toml'), 'strict = true');
      
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
    tempDir = await fs.mkdtemp(join(tmpdir(), 'rulesets-config-convenience-test-'));
  });
  
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
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
      
      await fs.writeFile(join(tempDir, 'ruleset.config.jsonc'), configContent);
      
      const result = await loadConfig(tempDir);
      
      expect(result.config.strict).toBe(true);
    });
  });

  describe('validateConfig convenience function', () => {
    it('should validate configuration using default loader', async () => {
      const config: RulesetConfig = {
        strict: true,
        providers: {
          cursor: { enabled: true },
        },
      };
      
      const result = await validateConfig(config);
      
      expect(result.valid).toBe(true);
    });
  });
});