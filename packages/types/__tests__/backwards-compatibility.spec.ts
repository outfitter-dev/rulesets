/**
 * Comprehensive backwards compatibility tests
 * Ensures legacy APIs continue working while deprecated warnings are shown
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Test both legacy and modern imports to ensure compatibility
import {
  createDestinationId,
  createDestPath,
  createOutputPath,
  createProviderId,
  // Legacy branded type aliases (should still work)
  type DestinationId,
  type DestPath,
  isDestinationId,
  isDestPath,
  isOutputPath,
  isProviderId,
  type OutputPath,
  // Modern branded types (for comparison)
  type ProviderId,
} from '../src/brands';
import {
  hasGeneratedPaths,
  // Legacy destination plugin interface
  type WriteResult,
} from '../src/destination-plugin';
// Also test imports from the main index to ensure re-exports work
import type {
  // Should re-export everything needed for backwards compatibility
  CompiledDoc,
  Logger,
} from '../src/index';
import {
  type DestinationCapabilities,
  type DestinationConfig,
  isLegacyDestinationConfig,
  // Migration utilities
  migrateDestinationToProvider,
  type ProviderCapabilities,
  // Modern provider interfaces (for comparison)
  type ProviderConfig,
} from '../src/provider';

describe('Backwards Compatibility', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      // Mock implementation for testing
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Legacy Branded Types', () => {
    describe('Type Aliases', () => {
      test('should provide working type aliases', () => {
        // These types should be assignable to each other
        const providerId: ProviderId = createProviderId('cursor');
        const destinationId: DestinationId = providerId;

        const outputPath: OutputPath = createOutputPath('.cursor/rules');
        const destPath: DestPath = outputPath;

        expect(destinationId).toBe(providerId);
        expect(destPath).toBe(outputPath);
      });

      test('should maintain type safety', () => {
        // TypeScript should still enforce type safety
        // (This is mainly tested at compile time, but we can verify behavior)
        const destinationId = createDestinationId('cursor');
        const destPath = createDestPath('.cursor/rules');

        expect(typeof destinationId).toBe('string');
        expect(typeof destPath).toBe('string');
        expect(destinationId).toBe('cursor');
        expect(destPath).toBe('.cursor/rules');
      });
    });

    describe('Deprecated Creation Functions', () => {
      test('createDestinationId should work like createProviderId', () => {
        const modernId = createProviderId('cursor');
        const legacyId = createDestinationId('cursor');

        expect(modernId).toBe(legacyId);
        expect(typeof modernId).toBe(typeof legacyId);
      });

      test('createDestinationId should emit deprecation warning in development', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        consoleSpy.mockClear(); // Clear any previous calls

        createDestinationId('cursor');

        expect(consoleSpy).toHaveBeenCalledWith(
          'createDestinationId is deprecated. Use createProviderId instead.'
        );

        process.env.NODE_ENV = originalEnv;
      });

      test('createDestinationId should not warn in production', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        consoleSpy.mockClear(); // Clear any previous calls

        createDestinationId('cursor');

        expect(consoleSpy).not.toHaveBeenCalled();

        process.env.NODE_ENV = originalEnv;
      });

      test('createDestPath should work like createOutputPath', () => {
        const modernPath = createOutputPath('.cursor/rules');
        const legacyPath = createDestPath('.cursor/rules');

        expect(modernPath).toBe(legacyPath);
        expect(typeof modernPath).toBe(typeof legacyPath);
      });

      test('createDestPath should emit deprecation warning in development', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        consoleSpy.mockClear(); // Clear any previous calls

        createDestPath('.cursor/rules');

        expect(consoleSpy).toHaveBeenCalledWith(
          'createDestPath is deprecated. Use createOutputPath instead.'
        );

        process.env.NODE_ENV = originalEnv;
      });

      test('should handle validation errors consistently', () => {
        // Both should fail the same way for invalid inputs
        expect(() => createProviderId('invalid')).toThrow();
        expect(() => createDestinationId('invalid')).toThrow();

        expect(() => createOutputPath('../traversal')).toThrow();
        expect(() => createDestPath('../traversal')).toThrow();
      });
    });

    describe('Type Guard Aliases', () => {
      test('isDestinationId should work like isProviderId', () => {
        expect(isDestinationId('cursor')).toBe(true);
        expect(isProviderId('cursor')).toBe(true);
        expect(isDestinationId('cursor')).toBe(isProviderId('cursor'));

        expect(isDestinationId('invalid')).toBe(false);
        expect(isProviderId('invalid')).toBe(false);
        expect(isDestinationId('invalid')).toBe(isProviderId('invalid'));
      });

      test('isDestPath should work like isOutputPath', () => {
        expect(isDestPath('.cursor/rules')).toBe(true);
        expect(isOutputPath('.cursor/rules')).toBe(true);
        expect(isDestPath('.cursor/rules')).toBe(isOutputPath('.cursor/rules'));

        expect(isDestPath('../invalid')).toBe(false);
        expect(isOutputPath('../invalid')).toBe(false);
        expect(isDestPath('../invalid')).toBe(isOutputPath('../invalid'));
      });

      test('should handle edge cases consistently', () => {
        const testCases = [null, undefined, '', 123, {}, []];

        for (const testCase of testCases) {
          expect(isDestinationId(testCase)).toBe(isProviderId(testCase));
          expect(isDestPath(testCase)).toBe(isOutputPath(testCase));
        }
      });
    });
  });

  describe('Legacy Provider Interfaces', () => {
    describe('Type Compatibility', () => {
      test('DestinationPlugin should be assignable to ProviderPlugin', () => {
        // Test that the type alias works correctly
        // (This is mainly a compile-time test, but we can verify the interface exists)
        const config: DestinationConfig = {
          outputPath: createOutputPath('.cursor/rules'),
          format: 'markdown',
        };

        const providerConfig: ProviderConfig = config;
        expect(providerConfig).toBe(config);
      });

      test('DestinationCapabilities should be assignable to ProviderCapabilities', () => {
        const capabilities: DestinationCapabilities = {
          supportsBlocks: true,
          supportsImports: true,
          supportsVariables: true,
          supportsXml: false,
          supportsMarkdown: true,
          allowedFormats: ['markdown'],
        };

        const providerCapabilities: ProviderCapabilities = capabilities;
        expect(providerCapabilities).toBe(capabilities);
      });
    });

    describe('Migration Utilities Compatibility', () => {
      test('migrateDestinationToProvider should handle legacy field names', () => {
        const legacyConfig = {
          destPath: '.cursor/rules',
          destinationPath: '.windsurf/rules', // Alternative naming
          format: 'markdown',
        };

        const migrated = migrateDestinationToProvider(legacyConfig);

        expect(migrated.outputPath).toBe('.cursor/rules'); // Uses destPath first
        expect(migrated.format).toBe('markdown');
      });

      test('isLegacyDestinationConfig should detect all legacy patterns', () => {
        const legacyConfigs = [
          { destPath: '.cursor/rules' },
          { destinationPath: '.windsurf/rules' },
          { destination: 'cursor' },
        ];

        for (const config of legacyConfigs) {
          expect(isLegacyDestinationConfig(config)).toBe(true);
        }
      });
    });
  });

  describe('Destination Plugin Interface', () => {
    describe('WriteResult Interface', () => {
      test('should support legacy write result format', () => {
        const writeResult: WriteResult = {
          generatedPaths: ['.cursor/rules/test.mdc'],
          metadata: {
            provider: 'cursor',
            format: 'markdown',
            size: 1024,
          },
        };

        expect(hasGeneratedPaths(writeResult)).toBe(true);
        expect(writeResult.generatedPaths).toContain('.cursor/rules/test.mdc');
      });

      test('should handle void returns from legacy plugins', () => {
        // Legacy plugins might return void
        expect(hasGeneratedPaths(undefined)).toBe(false);
        expect(hasGeneratedPaths(null)).toBe(false);
      });

      test('should validate write result structure', () => {
        const validResult = {
          generatedPaths: ['file1.md', 'file2.md'],
          metadata: { key: 'value' },
        };

        const invalidResults = [
          { generatedPaths: 'not an array' },
          { metadata: 'not an object' },
          { generatedPaths: null },
          {},
        ];

        expect(hasGeneratedPaths(validResult)).toBe(true);

        for (const invalid of invalidResults) {
          expect(hasGeneratedPaths(invalid)).toBe(false);
        }
      });
    });

    describe('Plugin Interface Compatibility', () => {
      test('should support both legacy and modern plugin interfaces', () => {
        // Mock destination plugin (legacy style)
        const legacyPlugin = {
          get name() {
            return 'cursor';
          },
          configSchema() {
            return {
              type: 'object',
              properties: {
                outputPath: { type: 'string' },
              },
            };
          },
          async write(ctx: { destPath: string }): Promise<WriteResult> {
            return {
              generatedPaths: [ctx.destPath],
              metadata: { provider: 'cursor' },
            };
          },
        };

        expect(legacyPlugin.name).toBe('cursor');
        expect(typeof legacyPlugin.configSchema).toBe('function');
        expect(typeof legacyPlugin.write).toBe('function');
      });
    });
  });

  describe('Index Re-exports', () => {
    test('should re-export core types for backwards compatibility', () => {
      // Test that core types are available from main index
      expect(typeof CompiledDoc).toBe('undefined'); // This is a type, not a value

      // These should be type imports that work
      const mockCompiledDoc: CompiledDoc = {
        source: {
          content: 'test',
          frontmatter: {},
          blocks: [],
          imports: [],
          variables: [],
          markers: [],
          errors: [],
          warnings: [],
        },
        output: {
          content: 'compiled test',
          format: 'markdown',
          metadata: {},
        },
        metadata: {
          compiledAt: new Date().toISOString(),
          compiler: 'test',
          version: '1.0.0',
        },
      };

      expect(mockCompiledDoc).toBeDefined();
      expect(mockCompiledDoc.source.content).toBe('test');
      expect(mockCompiledDoc.output.content).toBe('compiled test');
    });

    test('should provide logger interface', () => {
      // Mock logger implementation
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      expect(typeof mockLogger.debug).toBe('function');
      expect(typeof mockLogger.info).toBe('function');
      expect(typeof mockLogger.warn).toBe('function');
      expect(typeof mockLogger.error).toBe('function');
    });
  });

  describe('Cross-Version Compatibility', () => {
    test('should maintain data format compatibility', () => {
      // Test that data created with legacy APIs works with modern APIs
      const legacyId = createDestinationId('cursor');
      const modernId = createProviderId('cursor');

      // Should be interchangeable
      expect(legacyId).toBe(modernId);
      expect(isProviderId(legacyId)).toBe(true);
      expect(isDestinationId(modernId)).toBe(true);
    });

    test('should handle mixed legacy/modern configurations', () => {
      const mixedConfig = {
        // Legacy fields
        destPath: '.cursor/rules',
        destinationId: 'cursor',

        // Modern fields
        outputPath: '.windsurf/rules',
        providerId: 'windsurf',

        // Common fields
        format: 'markdown',
      };

      // Should detect as legacy due to presence of legacy fields
      expect(isLegacyDestinationConfig(mixedConfig)).toBe(true);

      // Migration should handle the mix appropriately
      const migrated = migrateDestinationToProvider(mixedConfig);
      expect(migrated.outputPath).toBe('.cursor/rules'); // Legacy takes precedence
    });

    test('should support gradual migration scenarios', () => {
      // Simulate a codebase gradually migrating from legacy to modern
      const configurations = [
        // Fully legacy
        { destPath: '.cursor/rules', destinationId: 'cursor' },

        // Partially migrated
        { outputPath: '.windsurf/rules', destinationId: 'windsurf' },

        // Fully modern
        { outputPath: '.claude/rules', providerId: 'claude-code' },
      ];

      const migrationResults = configurations.map((config) => ({
        isLegacy: isLegacyDestinationConfig(config),
        config,
      }));

      expect(migrationResults[0].isLegacy).toBe(true);
      expect(migrationResults[1].isLegacy).toBe(true); // Still has destinationId
      expect(migrationResults[2].isLegacy).toBe(false);
    });
  });

  describe('Runtime Behavior Consistency', () => {
    test('should maintain consistent validation behavior', () => {
      // Test that validation errors are the same for legacy and modern APIs
      const invalidValues = ['', 'invalid-provider', null, undefined, 123];

      for (const value of invalidValues) {
        let legacyError: Error | null = null;
        let modernError: Error | null = null;

        try {
          createDestinationId(value as any);
        } catch (e) {
          legacyError = e as Error;
        }

        try {
          createProviderId(value as any);
        } catch (e) {
          modernError = e as Error;
        }

        // Both should fail (or both should succeed)
        expect(!!legacyError).toBe(!!modernError);

        if (legacyError && modernError) {
          expect(legacyError.constructor).toBe(modernError.constructor);
          expect(legacyError.message).toBe(modernError.message);
        }
      }
    });

    test('should maintain consistent serialization behavior', () => {
      const legacyId = createDestinationId('cursor');
      const modernId = createProviderId('cursor');

      const legacySerialized = JSON.stringify({ id: legacyId });
      const modernSerialized = JSON.stringify({ id: modernId });

      expect(legacySerialized).toBe(modernSerialized);

      const legacyParsed = JSON.parse(legacySerialized);
      const modernParsed = JSON.parse(modernSerialized);

      expect(legacyParsed.id).toBe(modernParsed.id);
    });

    test('should handle environment-specific behavior consistently', () => {
      const environments = ['development', 'test', 'production'];

      for (const env of environments) {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = env;

        consoleSpy.mockClear();

        const legacyId = createDestinationId('cursor');
        const modernId = createProviderId('cursor');

        // Should work the same regardless of environment
        expect(legacyId).toBe(modernId);

        // Only development should show warnings
        if (env === 'development') {
          expect(consoleSpy).toHaveBeenCalled();
        } else {
          expect(consoleSpy).not.toHaveBeenCalled();
        }

        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Performance Consistency', () => {
    test('legacy APIs should not significantly impact performance', () => {
      const iterations = 1000;

      // Benchmark modern API
      const modernStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        createProviderId('cursor');
        createOutputPath('.cursor/rules');
      }
      const modernTime = performance.now() - modernStart;

      // Benchmark legacy API
      const legacyStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        createDestinationId('cursor');
        createDestPath('.cursor/rules');
      }
      const legacyTime = performance.now() - legacyStart;

      // Legacy should not be more than 2x slower (accounting for warning overhead)
      expect(legacyTime).toBeLessThan(modernTime * 2);
    });

    test('type guards should have consistent performance', () => {
      const iterations = 1000;
      const testValue = 'cursor';

      const modernStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        isProviderId(testValue);
        isOutputPath('.cursor/rules');
      }
      const modernTime = performance.now() - modernStart;

      const legacyStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        isDestinationId(testValue);
        isDestPath('.cursor/rules');
      }
      const legacyTime = performance.now() - legacyStart;

      // Should be essentially the same performance (since they're aliases)
      expect(Math.abs(legacyTime - modernTime)).toBeLessThan(modernTime * 0.1);
    });
  });

  describe('Memory Consistency', () => {
    test('should not create memory leaks with legacy APIs', () => {
      // Test that repeated calls don't accumulate memory
      const initialUsage = process.memoryUsage();

      for (let i = 0; i < 10_000; i++) {
        createDestinationId('cursor');
        createDestPath('.cursor/rules');
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalUsage = process.memoryUsage();

      // Memory usage should not grow significantly
      const heapGrowth = finalUsage.heapUsed - initialUsage.heapUsed;
      expect(heapGrowth).toBeLessThan(1024 * 1024); // Less than 1MB growth
    });
  });
});
