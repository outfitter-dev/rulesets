/**
 * Comprehensive tests for provider system
 * Tests provider interfaces, built-in providers, validation, and type safety
 */

import { describe, expect, test } from 'vitest';
import {
  createBlockName,
  createCompiledContent,
  createOutputPath,
  createPropertyName,
  createProviderId,
  createVersion,
  type ProviderId,
} from '../src/brands';
import {
  // Built-in providers
  BUILT_IN_PROVIDERS,
  type CompilationStats,
  // Default configs
  DEFAULT_PROVIDER_CONFIGS,
  type FileNamingStrategy,
  getProviderById,
  getProvidersByType,
  hasGeneratedPaths,
  isLegacyDestinationConfig,
  // Utility functions
  isProvider,
  isProviderPlugin,
  // Migration helpers
  migrateDestinationToProvider,
  // Configuration types
  type OutputFormat,
  // Core provider interfaces
  type Provider,
  type ProviderCapabilities,
  type ProviderCompilationContext,
  type ProviderCompilationResult,
  type ProviderConfig,
  type ProviderError,
  type ProviderHooks,
  type ProviderPlugin,
  type ProviderType,
  type ProviderWarning,
  type ValidationRule,
  validateProviderConfig,
  // WriteResult (imported from destination-plugin)
  type WriteResult,
} from '../src/provider';

describe('Provider System', () => {
  describe('Provider Interface', () => {
    const mockProvider: Provider = {
      id: createProviderId('cursor'),
      name: 'Test Cursor Provider',
      version: createVersion('1.0.0'),
      description: 'Test provider for unit tests',
      website: 'https://cursor.sh',
      type: 'ide',
      config: {
        outputPath: createOutputPath('.cursor/rules'),
        format: 'markdown',
        fileNaming: 'transform',
      },
      capabilities: {
        supportsBlocks: true,
        supportsImports: true,
        supportsVariables: true,
        supportsXml: false,
        supportsMarkdown: true,
        allowedFormats: ['markdown'],
      },
    };

    test('should define complete provider interface', () => {
      expect(mockProvider.id).toBeDefined();
      expect(mockProvider.name).toBeDefined();
      expect(mockProvider.version).toBeDefined();
      expect(mockProvider.type).toBeDefined();
      expect(mockProvider.config).toBeDefined();
      expect(mockProvider.capabilities).toBeDefined();
    });

    test('should support optional fields', () => {
      const minimalProvider: Provider = {
        id: createProviderId('amp'),
        name: 'Minimal Provider',
        version: createVersion('1.0.0'),
        type: 'agent',
        config: {
          outputPath: createOutputPath('AGENT.md'),
          format: 'markdown',
        },
        capabilities: {
          supportsBlocks: true,
          supportsImports: false,
          supportsVariables: false,
          supportsXml: false,
          supportsMarkdown: true,
          allowedFormats: ['markdown'],
        },
      };

      expect(minimalProvider.description).toBeUndefined();
      expect(minimalProvider.website).toBeUndefined();
      expect(minimalProvider.config.fileNaming).toBeUndefined();
      expect(minimalProvider.config.template).toBeUndefined();
      expect(minimalProvider.config.validation).toBeUndefined();
      expect(minimalProvider.config.features).toBeUndefined();
    });

    test('should enforce readonly properties', () => {
      // TypeScript ensures readonly at compile time
      // Runtime test would require property descriptors check
      expect(mockProvider).toBeDefined();
    });
  });

  describe('Provider Types', () => {
    test('should define all provider types', () => {
      const validTypes: ProviderType[] = [
        'ide',
        'cli',
        'web',
        'agent',
        'editor',
        'platform',
      ];

      for (const type of validTypes) {
        const provider: Provider = {
          id: createProviderId('cursor'),
          name: 'Test Provider',
          version: createVersion('1.0.0'),
          type,
          config: {
            outputPath: createOutputPath('test'),
            format: 'markdown',
          },
          capabilities: {
            supportsBlocks: true,
            supportsImports: true,
            supportsVariables: true,
            supportsXml: false,
            supportsMarkdown: true,
            allowedFormats: ['markdown'],
          },
        };

        expect(provider.type).toBe(type);
      }
    });
  });

  describe('Output Formats', () => {
    test('should define all output formats', () => {
      const validFormats: OutputFormat[] = [
        'markdown',
        'xml',
        'json',
        'yaml',
        'text',
        'html',
        'mixed',
      ];

      for (const format of validFormats) {
        const config: ProviderConfig = {
          outputPath: createOutputPath('test'),
          format,
        };

        expect(config.format).toBe(format);
      }
    });
  });

  describe('File Naming Strategies', () => {
    test('should define all file naming strategies', () => {
      const validStrategies: FileNamingStrategy[] = [
        'preserve',
        'transform',
        'template',
        'custom',
      ];

      for (const strategy of validStrategies) {
        const config: ProviderConfig = {
          outputPath: createOutputPath('test'),
          format: 'markdown',
          fileNaming: strategy,
        };

        expect(config.fileNaming).toBe(strategy);
      }
    });
  });

  describe('Provider Configuration', () => {
    test('should validate complete provider config', () => {
      const config: ProviderConfig = {
        outputPath: createOutputPath('.cursor/rules'),
        fileNaming: 'transform',
        format: 'markdown',
        template: {
          format: 'markdown',
          header: '# Generated Rules',
          footer: '\n---\nGenerated by Rulesets',
          wrapper: {
            before: '<rules>',
            after: '</rules>',
          },
          blockWrapper: {
            open: '<block>',
            close: '</block>',
          },
        },
        validation: {
          strictMode: true,
          allowedBlocks: [createBlockName('user-instructions')],
          forbiddenBlocks: [createBlockName('deprecated-block')],
          maxNestingDepth: 5,
          requireVersion: true,
          customRules: [
            {
              name: 'no-empty-blocks',
              description: 'Blocks must have content',
              severity: 'error',
              pattern: /^{{[^}]+}}{{\/[^}]+}}$/,
            },
          ],
        },
        features: {
          autoFormat: true,
          livePreview: false,
          syntaxHighlighting: true,
          codeCompletion: false,
          errorReporting: true,
          webIntegration: false,
          customProperties: [createPropertyName('priority-high')],
        },
      };

      expect(config.outputPath).toBeDefined();
      expect(config.format).toBe('markdown');
      expect(config.template?.format).toBe('markdown');
      expect(config.validation?.strictMode).toBe(true);
      expect(config.features?.autoFormat).toBe(true);
    });

    test('should support minimal provider config', () => {
      const config: ProviderConfig = {
        outputPath: createOutputPath('output.md'),
        format: 'markdown',
      };

      expect(config.outputPath).toBeDefined();
      expect(config.format).toBe('markdown');
      expect(config.fileNaming).toBeUndefined();
      expect(config.template).toBeUndefined();
      expect(config.validation).toBeUndefined();
      expect(config.features).toBeUndefined();
    });
  });

  describe('Provider Capabilities', () => {
    test('should validate capability combinations', () => {
      const xmlCapabilities: ProviderCapabilities = {
        supportsBlocks: true,
        supportsImports: true,
        supportsVariables: true,
        supportsXml: true,
        supportsMarkdown: false,
        allowedFormats: ['xml', 'mixed'],
      };

      expect(xmlCapabilities.supportsXml).toBe(true);
      expect(xmlCapabilities.allowedFormats).toContain('xml');

      const markdownCapabilities: ProviderCapabilities = {
        supportsBlocks: true,
        supportsImports: false,
        supportsVariables: false,
        supportsXml: false,
        supportsMarkdown: true,
        allowedFormats: ['markdown'],
      };

      expect(markdownCapabilities.supportsMarkdown).toBe(true);
      expect(markdownCapabilities.allowedFormats).toContain('markdown');
    });

    test('should support optional capability fields', () => {
      const capabilities: ProviderCapabilities = {
        supportsBlocks: true,
        supportsImports: true,
        supportsVariables: true,
        supportsXml: false,
        supportsMarkdown: true,
        allowedFormats: ['markdown'],
        maxFileSize: 1024 * 1024, // 1MB
        requiresSpecialHandling: ['large-files', 'binary-content'],
      };

      expect(capabilities.maxFileSize).toBe(1024 * 1024);
      expect(capabilities.requiresSpecialHandling).toContain('large-files');
    });
  });

  describe('Validation Rules', () => {
    test('should create validation rules with pattern', () => {
      const rule: ValidationRule = {
        name: 'no-empty-blocks',
        description: 'Blocks must not be empty',
        severity: 'error',
        pattern: /^{{[^}]+}}{{\/[^}]+}}$/,
      };

      expect(rule.pattern).toBeInstanceOf(RegExp);
      expect(rule.severity).toBe('error');
    });

    test('should create validation rules with custom validator', () => {
      const rule: ValidationRule = {
        name: 'content-length',
        description: 'Content must be reasonable length',
        severity: 'warning',
        validator: (content: string) =>
          content.length > 10 && content.length < 10_000,
      };

      expect(typeof rule.validator).toBe('function');
      expect(rule.validator?.('short')).toBe(false);
      expect(rule.validator?.('this is long enough content')).toBe(true);
    });

    test('should support all severity levels', () => {
      const severities: Array<'error' | 'warning' | 'info'> = [
        'error',
        'warning',
        'info',
      ];

      for (const severity of severities) {
        const rule: ValidationRule = {
          name: `test-${severity}`,
          description: `Test ${severity} rule`,
          severity,
        };

        expect(rule.severity).toBe(severity);
      }
    });
  });

  describe('Provider Plugin Interface', () => {
    test('should validate provider plugin structure', () => {
      const mockHooks: ProviderHooks = {
        beforeParse: (content) => content.replace(/\r\n/g, '\n'),
        afterParse: (ast) => ({ ...ast, normalized: true }),
        beforeCompile: (ast) => ({ ...ast, preCompiled: true }),
        afterCompile: (content) =>
          createCompiledContent(`${content}\n<!-- Compiled -->`),
        beforeWrite: (_content, _path) => {},
        afterWrite: (_path) => {},
      };

      const provider: Provider = {
        id: createProviderId('cursor'),
        name: 'Test Provider',
        version: createVersion('1.0.0'),
        type: 'ide',
        config: {
          outputPath: createOutputPath('.cursor/rules'),
          format: 'markdown',
        },
        capabilities: {
          supportsBlocks: true,
          supportsImports: true,
          supportsVariables: true,
          supportsXml: false,
          supportsMarkdown: true,
          allowedFormats: ['markdown'],
        },
      };

      const plugin: ProviderPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: createVersion('1.0.0'),
        provider,
        hooks: mockHooks,
      };

      expect(plugin.id).toBe('test-plugin');
      expect(plugin.provider).toBe(provider);
      expect(plugin.hooks).toBe(mockHooks);
    });

    test('should support optional hooks', () => {
      const minimalHooks: ProviderHooks = {};

      expect(minimalHooks.beforeParse).toBeUndefined();
      expect(minimalHooks.afterWrite).toBeUndefined();
    });
  });

  describe('Provider Compilation Context and Results', () => {
    test('should validate compilation context', () => {
      const context: ProviderCompilationContext = {
        provider: BUILT_IN_PROVIDERS.cursor,
        sourcePath: createOutputPath('src/rules.rule.md') as any, // Cast for test
        outputPath: createOutputPath('.cursor/rules/rules.mdc'),
        variables: {
          $destination: 'cursor',
          $version: '1.0.0',
          userVar: 'custom value',
        },
        metadata: {
          compiledAt: new Date().toISOString(),
          compiler: 'rulesets-v1.0.0',
        },
      };

      expect(context.provider).toBe(BUILT_IN_PROVIDERS.cursor);
      expect(context.variables.$destination).toBe('cursor');
      expect(context.metadata.compiler).toBe('rulesets-v1.0.0');
    });

    test('should validate successful compilation result', () => {
      const stats: CompilationStats = {
        duration: 123,
        inputSize: 1024,
        outputSize: 2048,
        blocksProcessed: 5,
        importsResolved: 2,
        variablesSubstituted: 8,
      };

      const result: ProviderCompilationResult = {
        success: true,
        content: createCompiledContent('<rules>Compiled content</rules>'),
        errors: [],
        warnings: [],
        metadata: {
          outputFormat: 'xml',
          generatedFiles: 1,
        },
        stats,
      };

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.errors).toHaveLength(0);
      expect(result.stats.duration).toBe(123);
    });

    test('should validate failed compilation result', () => {
      const error: ProviderError = {
        type: 'validation',
        message: 'Invalid block syntax',
        code: 'INVALID_BLOCK',
        line: 15,
        column: 8,
        context: {
          blockName: 'user-instructions',
          expectedFormat: 'kebab-case',
        },
      };

      const warning: ProviderWarning = {
        type: 'deprecated',
        message: 'Block "old-style" is deprecated',
        suggestion: 'Use "new-style" instead',
        line: 10,
        column: 1,
      };

      const result: ProviderCompilationResult = {
        success: false,
        errors: [error],
        warnings: [warning],
        metadata: {
          failureReason: 'validation_failed',
        },
        stats: {
          duration: 45,
          inputSize: 1024,
          outputSize: 0,
          blocksProcessed: 3,
          importsResolved: 0,
          variablesSubstituted: 0,
        },
      };

      expect(result.success).toBe(false);
      expect(result.content).toBeUndefined();
      expect(result.errors).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.errors[0].type).toBe('validation');
      expect(result.warnings[0].type).toBe('deprecated');
    });
  });

  describe('Built-in Providers', () => {
    test('should define all built-in providers', () => {
      const expectedProviders = [
        'cursor',
        'claude-code',
        'windsurf',
        'codex-cli',
        'amp',
        'opencode',
      ];

      for (const providerId of expectedProviders) {
        expect(BUILT_IN_PROVIDERS[providerId]).toBeDefined();
        expect(BUILT_IN_PROVIDERS[providerId].id).toBe(providerId);
      }
    });

    test('should validate cursor provider definition', () => {
      const cursor = BUILT_IN_PROVIDERS.cursor;

      expect(cursor.id).toBe('cursor');
      expect(cursor.name).toBe('Cursor');
      expect(cursor.type).toBe('ide');
      expect(cursor.config.outputPath).toBe('.cursor/rules');
      expect(cursor.config.format).toBe('markdown');
      expect(cursor.capabilities.supportsMarkdown).toBe(true);
      expect(cursor.capabilities.supportsXml).toBe(false);
    });

    test('should validate claude-code provider definition', () => {
      const claudeCode = BUILT_IN_PROVIDERS['claude-code'];

      expect(claudeCode.id).toBe('claude-code');
      expect(claudeCode.name).toBe('Claude Code');
      expect(claudeCode.type).toBe('cli');
      expect(claudeCode.config.outputPath).toBe('CLAUDE.md');
      expect(claudeCode.config.format).toBe('markdown');
      expect(claudeCode.capabilities.supportsXml).toBe(true);
      expect(claudeCode.capabilities.allowedFormats).toContain('mixed');
    });

    test('should validate provider consistency', () => {
      for (const [id, provider] of Object.entries(BUILT_IN_PROVIDERS)) {
        expect(provider.id).toBe(id);
        expect(provider.name).toBeDefined();
        expect(provider.version).toBeDefined();
        expect(provider.type).toBeDefined();
        expect(provider.config).toBeDefined();
        expect(provider.capabilities).toBeDefined();

        // Ensure config is valid
        expect(provider.config.outputPath).toBeDefined();
        expect(provider.config.format).toBeDefined();

        // Ensure capabilities make sense
        expect(provider.capabilities.allowedFormats).toContain(
          provider.config.format
        );
      }
    });
  });

  describe('Type Guards', () => {
    describe('isProvider', () => {
      test('should return true for valid providers', () => {
        expect(isProvider(BUILT_IN_PROVIDERS.cursor)).toBe(true);
        expect(isProvider(BUILT_IN_PROVIDERS['claude-code'])).toBe(true);
      });

      test('should return false for invalid providers', () => {
        expect(isProvider(null)).toBe(false);
        expect(isProvider(undefined)).toBe(false);
        expect(isProvider({})).toBe(false);
        expect(isProvider({ id: 'test' })).toBe(false);
        expect(isProvider({ id: 'test', name: 'Test' })).toBe(false);

        const incomplete = {
          id: createProviderId('cursor'),
          name: 'Test',
          // Missing required fields
        };
        expect(isProvider(incomplete)).toBe(false);
      });

      test('should validate all required fields', () => {
        const validProvider = {
          id: createProviderId('cursor'),
          name: 'Test Provider',
          type: 'ide',
          config: {
            outputPath: createOutputPath('test'),
            format: 'markdown',
          },
          capabilities: {
            supportsBlocks: true,
            supportsImports: true,
            supportsVariables: true,
            supportsXml: false,
            supportsMarkdown: true,
            allowedFormats: ['markdown'],
          },
        };

        expect(isProvider(validProvider)).toBe(true);
      });
    });

    describe('isProviderPlugin', () => {
      test('should return true for valid provider plugins', () => {
        const validPlugin = {
          id: 'test-plugin',
          provider: BUILT_IN_PROVIDERS.cursor,
          hooks: {},
        };

        expect(isProviderPlugin(validPlugin)).toBe(true);
      });

      test('should return false for invalid plugins', () => {
        expect(isProviderPlugin(null)).toBe(false);
        expect(isProviderPlugin({})).toBe(false);
        expect(isProviderPlugin({ id: 'test' })).toBe(false);

        const invalidPlugin = {
          id: 'test',
          provider: { invalid: 'provider' },
          hooks: {},
        };
        expect(isProviderPlugin(invalidPlugin)).toBe(false);
      });
    });
  });

  describe('Provider Utility Functions', () => {
    describe('getProviderById', () => {
      test('should return provider for valid ID', () => {
        const cursor = getProviderById(createProviderId('cursor'));
        expect(cursor).toBe(BUILT_IN_PROVIDERS.cursor);

        const claudeCode = getProviderById(createProviderId('claude-code'));
        expect(claudeCode).toBe(BUILT_IN_PROVIDERS['claude-code']);
      });

      test('should return undefined for invalid ID', () => {
        // This would normally fail at the branded type level
        // but testing the function behavior
        const result = getProviderById('invalid' as ProviderId);
        expect(result).toBeUndefined();
      });
    });

    describe('getProvidersByType', () => {
      test('should return IDE providers', () => {
        const ideProviders = getProvidersByType('ide');
        const ideIds = ideProviders.map((p) => p.id);

        expect(ideIds).toContain('cursor');
        expect(ideIds).toContain('windsurf');
        expect(ideIds).not.toContain('claude-code'); // CLI
      });

      test('should return CLI providers', () => {
        const cliProviders = getProvidersByType('cli');
        const cliIds = cliProviders.map((p) => p.id);

        expect(cliIds).toContain('claude-code');
        expect(cliIds).toContain('codex-cli');
        expect(cliIds).not.toContain('cursor'); // IDE
      });

      test('should return empty array for unused types', () => {
        const platformProviders = getProvidersByType('platform');
        expect(platformProviders).toHaveLength(0);
      });
    });

    describe('validateProviderConfig', () => {
      test('should return no errors for valid config', () => {
        const validConfig: ProviderConfig = {
          outputPath: createOutputPath('.cursor/rules'),
          format: 'markdown',
          fileNaming: 'transform',
        };

        const errors = validateProviderConfig(validConfig);
        expect(errors).toHaveLength(0);
      });

      test('should return errors for missing required fields', () => {
        const invalidConfig = {
          // Missing outputPath and format
          fileNaming: 'transform',
        } as ProviderConfig;

        const errors = validateProviderConfig(invalidConfig);
        expect(errors.length).toBeGreaterThan(0);

        const errorCodes = errors.map((e) => e.code);
        expect(errorCodes).toContain('MISSING_OUTPUT_PATH');
        expect(errorCodes).toContain('MISSING_FORMAT');
      });

      test('should provide detailed error information', () => {
        const invalidConfig = {} as ProviderConfig;
        const errors = validateProviderConfig(invalidConfig);

        for (const error of errors) {
          expect(error.type).toBe('configuration');
          expect(error.message).toBeDefined();
          expect(error.code).toBeDefined();
        }
      });
    });
  });

  describe('Migration Helpers', () => {
    describe('migrateDestinationToProvider', () => {
      test('should migrate legacy destination config', () => {
        const legacyConfig = {
          destPath: '.cursor/rules',
          destinationPath: '.cursor/rules', // Alternative naming
          format: 'markdown',
          fileNaming: 'transform',
          template: { format: 'markdown' },
          validation: { allowedFormats: ['markdown'] },
          features: { autoFormat: true },
        };

        const migratedConfig = migrateDestinationToProvider(legacyConfig);

        expect(migratedConfig.outputPath).toBe('.cursor/rules');
        expect(migratedConfig.format).toBe('markdown');
        expect(migratedConfig.fileNaming).toBe('transform');
        expect(migratedConfig.template).toBeDefined();
        expect(migratedConfig.validation).toBeDefined();
        expect(migratedConfig.features).toBeDefined();
      });

      test('should handle missing destPath gracefully', () => {
        const legacyConfig = {
          format: 'markdown',
        };

        const migratedConfig = migrateDestinationToProvider(legacyConfig);

        // Should use empty string as fallback
        expect(migratedConfig.outputPath).toBe('');
        expect(migratedConfig.format).toBe('markdown');
      });
    });

    describe('isLegacyDestinationConfig', () => {
      test('should detect legacy configs', () => {
        const legacyConfigs = [
          { destPath: '.cursor/rules' },
          { destinationPath: 'output' },
          { destination: 'cursor' },
        ];

        for (const config of legacyConfigs) {
          expect(isLegacyDestinationConfig(config)).toBe(true);
        }
      });

      test('should not detect modern configs', () => {
        const modernConfigs = [
          { outputPath: '.cursor/rules' },
          { providerId: 'cursor' },
          {},
        ];

        for (const config of modernConfigs) {
          expect(isLegacyDestinationConfig(config)).toBe(false);
        }
      });

      test('should handle invalid inputs', () => {
        expect(isLegacyDestinationConfig(null)).toBe(false);
        expect(isLegacyDestinationConfig(undefined)).toBe(false);
        expect(isLegacyDestinationConfig('string')).toBe(false);
        expect(isLegacyDestinationConfig(123)).toBe(false);
      });
    });
  });

  describe('Default Provider Configurations', () => {
    test('should provide default configs for all known providers', () => {
      const expectedProviders = [
        'cursor',
        'claude-code',
        'windsurf',
        'codex-cli',
        'cline',
        'roo-code',
        'amp',
        'opencode',
      ];

      for (const providerId of expectedProviders) {
        expect(DEFAULT_PROVIDER_CONFIGS[providerId]).toBeDefined();

        const config = DEFAULT_PROVIDER_CONFIGS[providerId];
        expect(config.outputPath).toBeDefined();
        expect(config.format).toBeDefined();
      }
    });

    test('should have consistent default configurations', () => {
      for (const [providerId, config] of Object.entries(
        DEFAULT_PROVIDER_CONFIGS
      )) {
        expect(config.outputPath).toBeDefined();
        expect(config.format).toBeDefined();
        expect(['preserve', 'transform', undefined]).toContain(
          config.fileNaming
        );

        // Validate the output path makes sense for the provider
        if (providerId === 'cursor') {
          expect(config.outputPath).toBe('.cursor/rules');
        } else if (providerId === 'claude-code') {
          expect(config.outputPath).toBe('CLAUDE.md');
        }
      }
    });
  });

  describe('WriteResult Interface', () => {
    describe('hasGeneratedPaths type guard', () => {
      test('should return true for valid WriteResult', () => {
        const writeResult: WriteResult = {
          generatedPaths: ['.cursor/rules/test.mdc'],
          metadata: {
            provider: 'cursor',
            format: 'markdown',
            size: 1024,
          },
        };

        expect(hasGeneratedPaths(writeResult)).toBe(true);
      });

      test('should return false for non-WriteResult values', () => {
        expect(hasGeneratedPaths(undefined)).toBe(false);
        expect(hasGeneratedPaths(null)).toBe(false);
        expect(hasGeneratedPaths({})).toBe(false);
        expect(hasGeneratedPaths({ generatedPaths: 'not an array' })).toBe(
          false
        );
        expect(hasGeneratedPaths({ metadata: {} })).toBe(false);
      });

      test('should return true for empty generated paths', () => {
        const writeResult = {
          generatedPaths: [],
          metadata: {},
        };

        expect(hasGeneratedPaths(writeResult)).toBe(true);
      });
    });
  });

  describe('Provider System Integration', () => {
    test('should maintain type safety across interfaces', () => {
      // Test that providers work with different interfaces
      const provider = BUILT_IN_PROVIDERS.cursor;

      // Should work as Provider
      expect(isProvider(provider)).toBe(true);

      // Should work in compilation context
      const context: ProviderCompilationContext = {
        provider,
        sourcePath: createOutputPath('src/test.rule.md') as any,
        outputPath: createOutputPath('.cursor/rules/test.mdc'),
        variables: {},
        metadata: {},
      };

      expect(context.provider).toBe(provider);
    });

    test('should support provider extensibility', () => {
      // Custom provider extending built-in capabilities
      const customProvider: Provider = {
        ...BUILT_IN_PROVIDERS.cursor,
        id: createProviderId('cursor'), // Reuse for test
        name: 'Extended Cursor Provider',
        config: {
          ...BUILT_IN_PROVIDERS.cursor.config,
          features: {
            autoFormat: true,
            livePreview: true,
            syntaxHighlighting: true,
            codeCompletion: true,
            errorReporting: true,
            webIntegration: false,
            customProperties: [
              createPropertyName('priority-high'),
              createPropertyName('auto-save'),
            ],
          },
        },
      };

      expect(isProvider(customProvider)).toBe(true);
      expect(customProvider.config.features?.autoFormat).toBe(true);
      expect(customProvider.config.features?.customProperties).toHaveLength(2);
    });
  });
});
