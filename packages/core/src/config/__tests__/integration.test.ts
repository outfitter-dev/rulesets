/**
 * Integration tests for the complete configuration system
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../config-loader';

describe('Configuration System Integration', () => {
  let tempDir: string;
  let projectDir: string;
  let subProjectDir: string;

  beforeEach(async () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    tempDir = join(
      tmpdir(),
      `rulesets-config-integration-test-${timestamp}-${random}`
    );
    projectDir = join(tempDir, 'project');
    subProjectDir = join(projectDir, 'subproject');

    await Bun.spawn(['mkdir', '-p', subProjectDir]).exited;
  });

  afterEach(async () => {
    try {
      await Bun.spawn(['rm', '-rf', tempDir]).exited;
    } catch (error) {
      // Ignore cleanup errors
    }
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

      await Bun.write(join(tempDir, 'ruleset.config.jsonc'), rootConfig);

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

      await Bun.write(join(projectDir, 'ruleset.config.jsonc'), projectConfig);

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

      await Bun.write(join(tempDir, 'ruleset.config.toml'), rootConfig);

      const projectConfig = `
      # Project-specific overrides
      strict = false
      
      [providers.windsurf]
      enabled = true
      outputPath = ".windsurf/rules/"
      
      [providers.windsurf.options]
      format = "markdown"
      `;

      await Bun.write(join(projectDir, 'ruleset.config.toml'), projectConfig);

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

      await Bun.write(join(tempDir, 'ruleset.config.toml'), rootConfig);

      // Project config in JSONC (should take precedence due to file name order)
      const projectConfig = `{
        "strict": false,
        "providers": {
          "claude-code": {
            "enabled": true
          }
        }
      }`;

      await Bun.write(join(projectDir, 'ruleset.config.jsonc'), projectConfig);

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

      await Bun.write(join(projectDir, 'ruleset.config.jsonc'), config);

      const env = {
        RULESETS_STRICT: 'true',
        RULESETS_PROVIDERS_CURSOR_ENABLED: 'true',
        RULESETS_PROVIDERS_WINDSURF_ENABLED: 'true',
        RULESETS_OUTPUT_DIRECTORY: '/custom/output',
        RULESETS_GITIGNORE_ENABLED: 'false',
        OTHER_VAR: 'ignored',
      };

      const result = await loadConfig(projectDir, {}, undefined);
      const _mockResult = await loadConfig(projectDir, {}, undefined);

      // Manually apply env overrides for testing

      // Test that our env override parsing works
      const loader = (await import('../config-loader')).getConfigLoader();
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

      await Bun.write(join(projectDir, 'ruleset.config.jsonc'), invalidConfig);

      const result = await loadConfig(projectDir);

      expect(result.errors).toBeTruthy();
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.warnings).toBeTruthy();
      expect(result.warnings?.length).toBeGreaterThan(0);
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

      await Bun.write(join(projectDir, 'ruleset.config.jsonc'), config);

      const result = await loadConfig(projectDir);

      expect(result.warnings).toBeTruthy();
      expect(result.warnings?.some((w) => w.includes('unknown-provider'))).toBe(
        true
      );
      expect(result.warnings?.some((w) => w.includes('another-unknown'))).toBe(
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

      await Bun.write(join(tempDir, 'ruleset.config.jsonc'), teamConfig);

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

      await Bun.write(join(projectDir, 'ruleset.config.jsonc'), projectConfig);

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
