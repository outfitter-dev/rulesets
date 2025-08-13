/**
 * Integration tests for the complete configuration system
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../ConfigLoader';
import type { RulesetConfig } from '../types';

describe('Configuration System Integration', () => {
  let tempDir: string;
  let projectDir: string;
  let subProjectDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(
      join(tmpdir(), 'rulesets-config-integration-test-')
    );
    projectDir = join(tempDir, 'project');
    subProjectDir = join(projectDir, 'subproject');

    await fs.mkdir(projectDir);
    await fs.mkdir(subProjectDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('JSONC Configuration Files', () => {
    it('should load and merge JSONC configuration with comments', async () => {
      const rootConfig = `{
        // Global settings
        "strict": true,
        "defaultProviders": ["cursor", "claude-code"],
        
        // Provider configurations
        "providers": {
          "cursor": {
            "enabled": true,
            "outputPath": ".cursor/rules/",
            "options": {
              "alwaysApply": false
            }
          },
          "claude-code": {
            "enabled": true,
            "outputPath": "CLAUDE.md"
          }
        },
        
        // Gitignore management
        "gitignore": {
          "enabled": true,
          "keep": ["important.md"],
          "ignore": ["*.backup", "*.tmp"],
          "options": {
            "comment": "Rulesets Generated Files",
            "sort": true
          }
        },
        
        "outputDirectory": ".ruleset/dist"
      }`;

      await fs.writeFile(join(tempDir, 'ruleset.config.jsonc'), rootConfig);

      const projectConfig = `{
        // Override for this project
        "strict": false,
        "providers": {
          "windsurf": {
            "enabled": true,
            "outputPath": ".windsurf/rules/"
          }
        }
      }`;

      await fs.writeFile(
        join(projectDir, 'ruleset.config.jsonc'),
        projectConfig
      );

      const result = await loadConfig(subProjectDir);

      // Should find both configs
      expect(result.sources).toHaveLength(2);

      // Project config should override root config
      expect(result.config.strict).toBe(false);

      // Should merge providers
      expect(result.config.providers?.cursor?.enabled).toBe(true);
      expect(result.config.providers?.['claude-code']?.enabled).toBe(true);
      expect(result.config.providers?.windsurf?.enabled).toBe(true);

      // Should inherit other settings
      expect(result.config.defaultProviders).toEqual(['cursor', 'claude-code']);
      expect(result.config.gitignore?.enabled).toBe(true);
      expect(result.config.gitignore?.keep).toEqual(['important.md']);
    });
  });

  describe('TOML Configuration Files', () => {
    it('should load and merge TOML configuration', async () => {
      const rootConfig = `
      # Global Rulesets configuration
      strict = true
      defaultProviders = ["cursor", "claude-code"]
      outputDirectory = ".ruleset/dist"
      
      [gitignore]
      enabled = true
      keep = ["docs/important.md"]
      ignore = ["*.backup"]
      
      [gitignore.options]
      comment = "Rulesets Generated Files"
      sort = true
      
      [providers.cursor]
      enabled = true
      outputPath = ".cursor/rules/"
      
      [providers.cursor.options]
      alwaysApply = false
      
      [providers."claude-code"]
      enabled = true
      outputPath = "CLAUDE.md"
      `;

      await fs.writeFile(join(tempDir, 'ruleset.config.toml'), rootConfig);

      const projectConfig = `
      # Project-specific overrides
      strict = false
      
      [providers.windsurf]
      enabled = true
      outputPath = ".windsurf/rules/"
      
      [providers.windsurf.options]
      format = "markdown"
      `;

      await fs.writeFile(
        join(projectDir, 'ruleset.config.toml'),
        projectConfig
      );

      const result = await loadConfig(subProjectDir);

      expect(result.sources).toHaveLength(2);
      expect(result.config.strict).toBe(false);
      expect(result.config.providers?.cursor?.enabled).toBe(true);
      expect(result.config.providers?.windsurf?.enabled).toBe(true);
      expect(result.config.providers?.windsurf?.options?.format).toBe(
        'markdown'
      );
    });
  });

  describe('Mixed Format Configuration', () => {
    it('should handle mixed JSONC and TOML configurations', async () => {
      // Root config in TOML
      const rootConfig = `
      strict = true
      defaultProviders = ["cursor"]
      
      [providers.cursor]
      enabled = true
      `;

      await fs.writeFile(join(tempDir, 'ruleset.config.toml'), rootConfig);

      // Project config in JSONC (should take precedence due to file name order)
      const projectConfig = `{
        "strict": false,
        "providers": {
          "claude-code": {
            "enabled": true
          }
        }
      }`;

      await fs.writeFile(
        join(projectDir, 'ruleset.config.jsonc'),
        projectConfig
      );

      const result = await loadConfig(subProjectDir);

      expect(result.sources).toHaveLength(2);
      expect(result.config.strict).toBe(false);
      expect(result.config.providers?.cursor?.enabled).toBe(true);
      expect(result.config.providers?.['claude-code']?.enabled).toBe(true);
    });
  });

  describe('Environment Variable Overrides', () => {
    it('should apply environment variable overrides', async () => {
      const config = `{
        "strict": false,
        "providers": {
          "cursor": {
            "enabled": false,
            "outputPath": ".cursor/rules/"
          }
        }
      }`;

      await fs.writeFile(join(projectDir, 'ruleset.config.jsonc'), config);

      const env = {
        RULESETS_STRICT: 'true',
        RULESETS_PROVIDERS_CURSOR_ENABLED: 'true',
        RULESETS_PROVIDERS_WINDSURF_ENABLED: 'true',
        RULESETS_OUTPUT_DIRECTORY: '/custom/output',
        RULESETS_GITIGNORE_ENABLED: 'false',
        OTHER_VAR: 'ignored',
      };

      const result = await loadConfig(projectDir, {}, undefined);
      const mockResult = await loadConfig(projectDir, {}, undefined);

      // Manually apply env overrides for testing
      const { config: finalConfig } = result.config;

      // Test that our env override parsing works
      const loader = (await import('../ConfigLoader')).getConfigLoader();
      const overriddenConfig = loader.applyEnvOverrides(result.config, env);

      expect(overriddenConfig.strict).toBe(true);
      expect(overriddenConfig.providers?.cursor?.enabled).toBe(true);
      expect(overriddenConfig.providers?.windsurf?.enabled).toBe(true);
      expect(overriddenConfig.outputDirectory).toBe('/custom/output');
      expect(overriddenConfig.gitignore?.enabled).toBe(false);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate configuration and report errors', async () => {
      const invalidConfig = `{
        "strict": "not-a-boolean",
        "providers": {
          "cursor": {
            "enabled": "not-a-boolean",
            "outputPath": ""
          }
        },
        "defaultProviders": []
      }`;

      await fs.writeFile(
        join(projectDir, 'ruleset.config.jsonc'),
        invalidConfig
      );

      const result = await loadConfig(projectDir);

      expect(result.errors).toBeTruthy();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.warnings).toBeTruthy();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });

    it('should warn about unknown providers', async () => {
      const config = `{
        "providers": {
          "unknown-provider": {
            "enabled": true
          },
          "another-unknown": {
            "enabled": true
          }
        }
      }`;

      await fs.writeFile(join(projectDir, 'ruleset.config.jsonc'), config);

      const result = await loadConfig(projectDir);

      expect(result.warnings).toBeTruthy();
      expect(result.warnings!.some((w) => w.includes('unknown-provider'))).toBe(
        true
      );
      expect(result.warnings!.some((w) => w.includes('another-unknown'))).toBe(
        true
      );
    });
  });

  describe('Real-world Configuration Scenarios', () => {
    it('should handle typical development team configuration', async () => {
      // Team-wide configuration
      const teamConfig = `{
        // Team defaults
        "strict": true,
        "defaultProviders": ["cursor", "claude-code"],
        
        "providers": {
          "cursor": {
            "enabled": true,
            "outputPath": ".cursor/rules/"
          },
          "claude-code": {
            "enabled": true,
            "outputPath": "CLAUDE.md"
          }
        },
        
        "gitignore": {
          "enabled": true,
          "keep": ["docs/manual-rules.md"],
          "ignore": ["*.backup", "*.tmp"]
        }
      }`;

      await fs.writeFile(join(tempDir, 'ruleset.config.jsonc'), teamConfig);

      // Project-specific overrides
      const projectConfig = `{
        // Enable windsurf for this project
        "providers": {
          "windsurf": {
            "enabled": true,
            "outputPath": ".windsurf/rules/"
          }
        },
        
        "gitignore": {
          "keep": ["project-specific.md"]
        }
      }`;

      await fs.writeFile(
        join(projectDir, 'ruleset.config.jsonc'),
        projectConfig
      );

      const result = await loadConfig(subProjectDir);

      // Should have team defaults
      expect(result.config.strict).toBe(true);
      expect(result.config.defaultProviders).toEqual(['cursor', 'claude-code']);

      // Should enable all providers
      expect(result.config.providers?.cursor?.enabled).toBe(true);
      expect(result.config.providers?.['claude-code']?.enabled).toBe(true);
      expect(result.config.providers?.windsurf?.enabled).toBe(true);

      // Should merge gitignore keep arrays
      expect(result.config.gitignore?.keep).toEqual([
        'docs/manual-rules.md',
        'project-specific.md',
      ]);
      expect(result.config.gitignore?.ignore).toEqual(['*.backup', '*.tmp']);
    });
  });
});
