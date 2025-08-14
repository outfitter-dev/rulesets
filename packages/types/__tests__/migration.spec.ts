/**
 * Comprehensive tests for migration system
 * Tests configuration migration, batch operations, error handling, and analytics
 */

import { describe, expect, test } from 'bun:test';
import {
  createPropertyName,
  type DestinationId,
  type DestPath,
  type ProviderId,
} from '../src/brands';
import {
  batchMigrateConfigs,
  getMigrationRecommendations,
  isLegacyConfig,
  // Migration interfaces
  type LegacyDestinationConfig,
  // Migration functions
  migrateDestinationConfig,
  migrateLinterConfig,
  migratePropertyScope,
  summarizeMigrationResults,
  validateMigrationCompleteness,
} from '../src/migration';

import type { LinterConfig, Property, ProviderConfig } from '../src/provider';

describe('Migration System', () => {
  describe('Legacy Configuration Detection', () => {
    describe('isLegacyConfig', () => {
      test('should detect legacy destination configurations', () => {
        const legacyConfigs = [
          { destinationId: 'cursor' },
          { destPath: '.cursor/rules' },
          { destination: 'cursor' },
          { allowedDestinations: ['cursor', 'claude-code'] },
          { legacyScope: 'cursor' },
          { legacyId: 'cursor' },
          { legacyDestPath: '.cursor/rules' },
        ];

        for (const config of legacyConfigs) {
          expect(isLegacyConfig(config)).toBe(true);
        }
      });

      test('should not detect modern configurations', () => {
        const modernConfigs = [
          { providerId: 'cursor' },
          { outputPath: '.cursor/rules' },
          { allowedProviders: ['cursor'] },
          { scope: 'cursor' },
          {},
          { otherField: 'value' },
        ];

        for (const config of modernConfigs) {
          expect(isLegacyConfig(config)).toBe(false);
        }
      });

      test('should handle invalid inputs gracefully', () => {
        const invalidInputs = [null, undefined, 'string', 123, [], true];

        for (const input of invalidInputs) {
          expect(isLegacyConfig(input)).toBe(false);
        }
      });
    });

    describe('getMigrationRecommendations', () => {
      test('should provide recommendations for legacy fields', () => {
        const legacyConfig = {
          destinationId: 'cursor',
          destPath: '.cursor/rules',
          allowedDestinations: ['cursor', 'claude-code'],
        };

        const recommendations = getMigrationRecommendations(legacyConfig);

        expect(recommendations).toHaveLength(3);

        const fieldRecommendations = recommendations.map((r) => r.field);
        expect(fieldRecommendations).toContain('destinationId');
        expect(fieldRecommendations).toContain('destPath');
        expect(fieldRecommendations).toContain('allowedDestinations');

        const suggestionTexts = recommendations.map((r) => r.suggestion);
        expect(suggestionTexts.some((s) => s?.includes('providerId'))).toBe(
          true
        );
        expect(suggestionTexts.some((s) => s?.includes('outputPath'))).toBe(
          true
        );
        expect(
          suggestionTexts.some((s) => s?.includes('allowedProviders'))
        ).toBe(true);
      });

      test('should not recommend changes for modern configs', () => {
        const modernConfig = {
          providerId: 'cursor',
          outputPath: '.cursor/rules',
          allowedProviders: ['cursor'],
        };

        const recommendations = getMigrationRecommendations(modernConfig);
        expect(recommendations).toHaveLength(0);
      });

      test('should handle partial legacy configs', () => {
        const partialConfig = {
          destinationId: 'cursor',
          outputPath: '.cursor/rules', // Already modern
        };

        const recommendations = getMigrationRecommendations(partialConfig);
        expect(recommendations).toHaveLength(1);
        expect(recommendations[0].field).toBe('destinationId');
      });
    });
  });

  describe('Destination Configuration Migration', () => {
    describe('migrateDestinationConfig', () => {
      test('should successfully migrate complete legacy config', () => {
        const legacyConfig: LegacyDestinationConfig = {
          id: 'cursor' as DestinationId,
          destPath: '.cursor/rules' as DestPath,
          fileNaming: 'transform',
          includeXml: false,
          template: {
            format: 'markdown',
          },
          validation: {
            allowedFormats: ['markdown'],
            maxLength: 10_000,
          },
        };

        const result = migrateDestinationConfig(legacyConfig);

        expect(result.success).toBe(true);
        expect(result.result).toBeDefined();
        expect(result.errors).toHaveLength(0);

        const migratedConfig = result.result!;
        expect(migratedConfig.outputPath).toBe('.cursor/rules');
        expect(migratedConfig.format).toBe('markdown');
        expect(migratedConfig.fileNaming).toBe('transform');
        expect(migratedConfig.template?.format).toBe('markdown');
        expect(migratedConfig.validation?.strictMode).toBe(true);
      });

      test('should handle minimal legacy config', () => {
        const legacyConfig: LegacyDestinationConfig = {
          id: 'cursor' as DestinationId,
          destPath: '.cursor/rules' as DestPath,
        };

        const result = migrateDestinationConfig(legacyConfig);

        expect(result.success).toBe(true);
        expect(result.result).toBeDefined();

        const migratedConfig = result.result!;
        expect(migratedConfig.outputPath).toBe('.cursor/rules');
        expect(migratedConfig.format).toBe('markdown'); // Default
        expect(migratedConfig.fileNaming).toBeUndefined();
        expect(migratedConfig.template).toBeUndefined();
        expect(migratedConfig.validation).toBeUndefined();
      });

      test('should fail for invalid legacy config', () => {
        const invalidConfigs = [
          null,
          undefined,
          'string',
          123,
          {},
          { id: 'cursor' }, // Missing destPath
        ];

        for (const config of invalidConfigs) {
          const result = migrateDestinationConfig(config as any);

          expect(result.success).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);

          // Note: The migration function may still return a partial result object
          // even when success is false
        }
      });

      test('should generate appropriate warnings for deprecated features', () => {
        const legacyConfig: LegacyDestinationConfig = {
          id: 'cursor' as DestinationId,
          destPath: '.cursor/rules' as DestPath,
          includeXml: true, // Deprecated feature
        };

        const result = migrateDestinationConfig(legacyConfig);

        expect(result.success).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);

        const deprecatedWarning = result.warnings.find(
          (w) => w.type === 'deprecated' && w.field === 'includeXml'
        );
        expect(deprecatedWarning).toBeDefined();
        expect(deprecatedWarning?.suggestion).toContain('format configuration');
      });

      test('should track migration metadata accurately', () => {
        const legacyConfig: LegacyDestinationConfig = {
          id: 'cursor' as DestinationId,
          destPath: '.cursor/rules' as DestPath,
          fileNaming: 'transform',
          template: { format: 'markdown' },
        };

        const result = migrateDestinationConfig(legacyConfig);

        expect(result.metadata.version).toBe('1.0.0');
        expect(result.metadata.timestamp).toBeDefined();
        expect(result.metadata.fieldsProcessed).toContain('destPath');
        expect(result.metadata.fieldsProcessed).toContain('fileNaming');
        expect(result.metadata.fieldsMigrated).toContain(
          'destPath -> outputPath'
        );
        expect(result.metadata.fieldsMigrated).toContain('fileNaming');
        expect(result.metadata.assumptionsMade).toContain(
          'destination ID maps to provider ID'
        );
      });

      test('should handle migration errors gracefully', () => {
        const invalidConfig = {
          id: 'cursor',
          // Missing required destPath
          fileNaming: 'transform',
        };

        const result = migrateDestinationConfig(invalidConfig as any);

        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe('missing');
        expect(result.errors[0].code).toBe('MISSING_DEST_PATH');
        expect(result.errors[0].field).toBe('destPath');
      });

      test('should warn about data loss for unsupported fields', () => {
        const legacyConfig: LegacyDestinationConfig = {
          id: 'cursor' as DestinationId,
          destPath: '.cursor/rules' as DestPath,
          validation: {
            allowedFormats: ['markdown'],
            maxLength: 5000, // This field doesn't directly map
          },
        };

        const result = migrateDestinationConfig(legacyConfig);

        expect(result.success).toBe(true);
        expect(
          result.warnings.some(
            (w) => w.type === 'data-loss' && w.field === 'validation.maxLength'
          )
        ).toBe(true);
      });
    });
  });

  describe('Property Scope Migration', () => {
    describe('migratePropertyScope', () => {
      test('should migrate legacy scope to provider scope', () => {
        const legacyProperty: Property = {
          name: createPropertyName('priority-high') as any,
          value: 'high',
          legacyScope: 'cursor' as DestinationId,
        };

        const result = migratePropertyScope(legacyProperty);

        expect(result.success).toBe(true);
        expect(result.result).toBeDefined();

        const migratedProperty = result.result!;
        expect(migratedProperty.scope).toBe('cursor');
        expect(migratedProperty.legacyScope).toBeUndefined();
        expect(migratedProperty.name).toBe(legacyProperty.name);
        expect(migratedProperty.value).toBe(legacyProperty.value);
      });

      test('should handle properties without scope', () => {
        const property: Property = {
          name: createPropertyName('global-prop') as any,
          value: 'value',
        };

        const result = migratePropertyScope(property);

        expect(result.success).toBe(true);
        expect(result.result).toBe(property);
        expect(result.warnings).toHaveLength(0);
        expect(result.metadata.fieldsMigrated).toHaveLength(0);
      });

      test('should prefer legacyScope over scope', () => {
        const property: Property = {
          name: createPropertyName('test-prop') as any,
          value: 'value',
          scope: 'windsurf' as ProviderId,
          legacyScope: 'cursor' as DestinationId,
        };

        const result = migratePropertyScope(property);

        expect(result.success).toBe(true);
        expect(result.result?.scope).toBe('cursor'); // Uses legacyScope
      });

      test('should generate migration warnings', () => {
        const property: Property = {
          name: createPropertyName('test-prop') as any,
          value: 'value',
          legacyScope: 'cursor' as DestinationId,
        };

        const result = migratePropertyScope(property);

        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0].type).toBe('assumption');
        expect(result.warnings[0].message).toContain(
          'Destination scope migrated to provider scope'
        );
      });
    });
  });

  describe('Linter Configuration Migration', () => {
    describe('migrateLinterConfig', () => {
      test('should migrate allowedDestinations to allowedProviders', () => {
        const legacyConfig: LinterConfig = {
          requireRulesetsVersion: true,
          allowedDestinations: ['cursor', 'claude-code'] as ProviderId[],
          maxErrors: 10,
        };

        const result = migrateLinterConfig(legacyConfig);

        expect(result.success).toBe(true);
        expect(result.result).toBeDefined();

        const migratedConfig = result.result!;
        expect(migratedConfig.allowedProviders).toEqual([
          'cursor',
          'claude-code',
        ]);
        expect(migratedConfig.requireRulesetsVersion).toBe(true);
        expect(migratedConfig.maxErrors).toBe(10);
      });

      test('should handle config without allowedDestinations', () => {
        const config: LinterConfig = {
          requireRulesetsVersion: true,
          maxErrors: 5,
        };

        const result = migrateLinterConfig(config);

        expect(result.success).toBe(true);
        expect(result.result).toEqual(config);
        expect(result.warnings).toHaveLength(0);
        expect(result.metadata.fieldsMigrated).toHaveLength(0);
      });

      test('should generate migration warnings for destination fields', () => {
        const legacyConfig: LinterConfig = {
          requireRulesetsVersion: true,
          allowedDestinations: ['cursor'] as ProviderId[],
        };

        const result = migrateLinterConfig(legacyConfig);

        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0].type).toBe('assumption');
        expect(result.warnings[0].message).toContain(
          'Destination IDs migrated to provider IDs'
        );
      });

      test('should handle migration errors', () => {
        // Force an error by providing invalid input
        const invalidConfig = null as any;

        expect(() => migrateLinterConfig(invalidConfig)).not.toThrow();

        // The function should handle this gracefully
        const result = migrateLinterConfig(invalidConfig);
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Migration Completeness Validation', () => {
    describe('validateMigrationCompleteness', () => {
      test('should validate complete migration', () => {
        const originalConfig = {
          destinationId: 'cursor',
          destPath: '.cursor/rules',
          format: 'markdown',
        };

        const migratedConfig = {
          providerId: 'cursor',
          outputPath: '.cursor/rules',
          format: 'markdown',
        };

        const warnings = validateMigrationCompleteness(
          originalConfig,
          migratedConfig
        );
        expect(warnings).toHaveLength(0);
      });

      test('should detect missing fields', () => {
        const originalConfig = {
          destinationId: 'cursor',
          destPath: '.cursor/rules',
          format: 'markdown',
          extraField: 'value',
        };

        const migratedConfig = {
          providerId: 'cursor',
          outputPath: '.cursor/rules',
          format: 'markdown',
          // Missing extraField
        };

        const warnings = validateMigrationCompleteness(
          originalConfig,
          migratedConfig
        );
        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0].type).toBe('data-loss');
        expect(warnings[0].message).toContain('extraField');
      });

      test('should handle invalid inputs', () => {
        const warnings1 = validateMigrationCompleteness(null, {});
        expect(warnings1.length).toBeGreaterThan(0);
        expect(warnings1[0].type).toBe('data-loss');

        const warnings2 = validateMigrationCompleteness({}, null);
        expect(warnings2.length).toBeGreaterThan(0);

        const warnings3 = validateMigrationCompleteness('invalid', {});
        expect(warnings3.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Batch Migration', () => {
    describe('batchMigrateConfigs', () => {
      test('should migrate multiple destination configs', () => {
        const configs = {
          cursor: {
            id: 'cursor',
            destPath: '.cursor/rules',
            format: 'markdown',
          },
          claudeCode: {
            id: 'claude-code',
            destPath: 'CLAUDE.md',
            format: 'markdown',
          },
        };

        const results = batchMigrateConfigs(configs);

        expect(Object.keys(results)).toHaveLength(2);
        expect(results.cursor.success).toBe(true);
        expect(results.claudeCode.success).toBe(true);

        const cursorResult = results.cursor.result as ProviderConfig;
        expect(cursorResult.outputPath).toBe('.cursor/rules');

        const claudeCodeResult = results.claudeCode.result as ProviderConfig;
        expect(claudeCodeResult.outputPath).toBe('CLAUDE.md');
      });

      test('should migrate linter configs', () => {
        const configs = {
          linter: {
            requireRulesetsVersion: true,
            allowedDestinations: ['cursor', 'claude-code'],
          },
        };

        const results = batchMigrateConfigs(configs);

        expect(results.linter.success).toBe(true);
        const linterResult = results.linter.result as LinterConfig;
        expect(linterResult.allowedProviders).toEqual([
          'cursor',
          'claude-code',
        ]);
      });

      test('should handle non-legacy configs gracefully', () => {
        const configs = {
          modern: {
            providerId: 'cursor',
            outputPath: '.cursor/rules',
          },
        };

        const results = batchMigrateConfigs(configs);

        expect(results.modern.success).toBe(true);
        expect(results.modern.result).toBe(configs.modern);
        expect(results.modern.errors).toHaveLength(0);
      });

      test('should handle unrecognized legacy configs', () => {
        const configs = {
          unknown: {
            legacyField: 'value',
            anotherLegacyField: 'value',
          },
        };

        const results = batchMigrateConfigs(configs);

        expect(results.unknown.success).toBe(false);
        expect(results.unknown.errors[0].type).toBe('incompatible');
        expect(results.unknown.errors[0].code).toBe('UNKNOWN_LEGACY_FORMAT');
      });

      test('should handle invalid config types', () => {
        const configs = {
          invalid: 'not an object',
          number: 123,
        };

        const results = batchMigrateConfigs(configs as any);

        expect(results.invalid.success).toBe(false);
        expect(results.number.success).toBe(false);
        expect(results.invalid.errors[0].type).toBe('validation');
      });
    });
  });

  describe('Migration Analytics', () => {
    describe('summarizeMigrationResults', () => {
      test('should create comprehensive summary', () => {
        const results = {
          success1: {
            success: true,
            errors: [],
            warnings: [],
            metadata: {
              version: '1.0.0',
              timestamp: new Date().toISOString(),
              fieldsProcessed: [],
              fieldsMigrated: [],
              fieldsSkipped: [],
              assumptionsMade: [],
            },
          },
          success2: {
            success: true,
            errors: [],
            warnings: [
              { type: 'deprecated' as const, message: 'Test warning' },
            ],
            metadata: {
              version: '1.0.0',
              timestamp: new Date().toISOString(),
              fieldsProcessed: [],
              fieldsMigrated: [],
              fieldsSkipped: [],
              assumptionsMade: [],
            },
          },
          failure1: {
            success: false,
            errors: [
              {
                type: 'validation' as const,
                message: 'Test error',
                code: 'TEST_ERROR',
              },
              {
                type: 'missing' as const,
                message: 'Missing field',
                code: 'MISSING_FIELD',
              },
            ],
            warnings: [],
            metadata: {
              version: '1.0.0',
              timestamp: new Date().toISOString(),
              fieldsProcessed: [],
              fieldsMigrated: [],
              fieldsSkipped: [],
              assumptionsMade: [],
            },
          },
        };

        const summary = summarizeMigrationResults(results);

        expect(summary.totalConfigs).toBe(3);
        expect(summary.successfulMigrations).toBe(2);
        expect(summary.failedMigrations).toBe(1);
        expect(summary.totalErrors).toBe(2);
        expect(summary.totalWarnings).toBe(1);

        expect(summary.mostCommonErrors).toHaveLength(2);
        expect(summary.mostCommonErrors[0].type).toBe('validation');
        expect(summary.mostCommonErrors[0].count).toBe(1);

        expect(summary.mostCommonWarnings).toHaveLength(1);
        expect(summary.mostCommonWarnings[0].type).toBe('deprecated');
        expect(summary.mostCommonWarnings[0].count).toBe(1);
      });

      test('should handle empty results', () => {
        const summary = summarizeMigrationResults({});

        expect(summary.totalConfigs).toBe(0);
        expect(summary.successfulMigrations).toBe(0);
        expect(summary.failedMigrations).toBe(0);
        expect(summary.totalErrors).toBe(0);
        expect(summary.totalWarnings).toBe(0);
        expect(summary.mostCommonErrors).toHaveLength(0);
        expect(summary.mostCommonWarnings).toHaveLength(0);
      });

      test('should sort errors and warnings by frequency', () => {
        const results = {
          config1: {
            success: false,
            errors: [
              { type: 'validation' as const, message: 'Error 1', code: 'ERR1' },
              { type: 'missing' as const, message: 'Error 2', code: 'ERR2' },
            ],
            warnings: [],
            metadata: {
              version: '1.0.0',
              timestamp: new Date().toISOString(),
              fieldsProcessed: [],
              fieldsMigrated: [],
              fieldsSkipped: [],
              assumptionsMade: [],
            },
          },
          config2: {
            success: false,
            errors: [
              { type: 'validation' as const, message: 'Error 3', code: 'ERR3' },
            ],
            warnings: [],
            metadata: {
              version: '1.0.0',
              timestamp: new Date().toISOString(),
              fieldsProcessed: [],
              fieldsMigrated: [],
              fieldsSkipped: [],
              assumptionsMade: [],
            },
          },
        };

        const summary = summarizeMigrationResults(results);

        // validation should appear first (2 occurrences) before missing (1 occurrence)
        expect(summary.mostCommonErrors[0].type).toBe('validation');
        expect(summary.mostCommonErrors[0].count).toBe(2);
        expect(summary.mostCommonErrors[1].type).toBe('missing');
        expect(summary.mostCommonErrors[1].count).toBe(1);
      });

      test('should limit to top 5 most common issues', () => {
        const errors = Array.from({ length: 10 }, (_, i) => ({
          type: `error${i}` as 'validation',
          message: `Error ${i}`,
          code: `ERR${i}`,
        }));

        const results = Object.fromEntries(
          errors.map((error, i) => [
            `config${i}`,
            {
              success: false,
              errors: [error],
              warnings: [],
              metadata: {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                fieldsProcessed: [],
                fieldsMigrated: [],
                fieldsSkipped: [],
                assumptionsMade: [],
              },
            },
          ])
        );

        const summary = summarizeMigrationResults(results);

        expect(summary.mostCommonErrors.length).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Migration Result Interface', () => {
    test('should create proper migration result structure', () => {
      const legacyConfig: LegacyDestinationConfig = {
        id: 'cursor' as DestinationId,
        destPath: '.cursor/rules' as DestPath,
      };

      const result = migrateDestinationConfig(legacyConfig);

      // Validate the complete structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('metadata');

      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(typeof result.metadata).toBe('object');

      // Validate metadata structure
      expect(result.metadata).toHaveProperty('version');
      expect(result.metadata).toHaveProperty('timestamp');
      expect(result.metadata).toHaveProperty('fieldsProcessed');
      expect(result.metadata).toHaveProperty('fieldsMigrated');
      expect(result.metadata).toHaveProperty('fieldsSkipped');
      expect(result.metadata).toHaveProperty('assumptionsMade');

      expect(Array.isArray(result.metadata.fieldsProcessed)).toBe(true);
      expect(Array.isArray(result.metadata.fieldsMigrated)).toBe(true);
      expect(Array.isArray(result.metadata.fieldsSkipped)).toBe(true);
      expect(Array.isArray(result.metadata.assumptionsMade)).toBe(true);
    });

    test('should validate error structure', () => {
      const invalidConfig = {} as LegacyDestinationConfig;
      const result = migrateDestinationConfig(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      for (const error of result.errors) {
        expect(error).toHaveProperty('type');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('code');
        expect(['validation', 'mapping', 'incompatible', 'missing']).toContain(
          error.type
        );
        expect(typeof error.message).toBe('string');
        expect(typeof error.code).toBe('string');
      }
    });

    test('should validate warning structure', () => {
      const legacyConfig: LegacyDestinationConfig = {
        id: 'cursor' as DestinationId,
        destPath: '.cursor/rules' as DestPath,
        includeXml: true, // This will generate warnings
      };

      const result = migrateDestinationConfig(legacyConfig);

      expect(result.warnings.length).toBeGreaterThan(0);

      for (const warning of result.warnings) {
        expect(warning).toHaveProperty('type');
        expect(warning).toHaveProperty('message');
        expect(['deprecated', 'fallback', 'assumption', 'data-loss']).toContain(
          warning.type
        );
        expect(typeof warning.message).toBe('string');
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle corrupted migration state gracefully', () => {
      // Test various edge cases that might occur in real-world usage
      const edgeCases = [
        { circular: null as any },
        { deep: { nested: { config: { value: 'test' } } } },
        { arrayField: ['item1', 'item2'] },
        { functionField: () => 'test' },
      ];

      // Set up circular reference
      edgeCases[0].circular = edgeCases[0];

      for (const edgeCase of edgeCases) {
        expect(() => {
          const result = batchMigrateConfigs({ test: edgeCase });
          expect(result.test).toBeDefined();
        }).not.toThrow();
      }
    });

    test('should handle concurrent migration requests', async () => {
      const configs = Array.from({ length: 10 }, (_, i) => ({
        [`config${i}`]: {
          id: 'cursor',
          destPath: `.cursor/rules${i}`,
        },
      })).reduce((acc, curr) => ({ ...acc, ...curr }), {});

      // Simulate concurrent migrations
      const migrationPromises = Array.from({ length: 5 }, () =>
        Promise.resolve(batchMigrateConfigs(configs))
      );

      const results = await Promise.all(migrationPromises);

      // All should succeed
      for (const result of results) {
        expect(Object.keys(result)).toHaveLength(10);
        for (const configResult of Object.values(result)) {
          expect(configResult.success).toBe(true);
        }
      }
    });

    test('should maintain referential integrity during migration', () => {
      const sharedConfig = {
        id: 'cursor',
        destPath: '.cursor/rules',
      };

      const configs = {
        config1: sharedConfig,
        config2: sharedConfig, // Same reference
      };

      const results = batchMigrateConfigs(configs);

      // Both should succeed independently
      expect(results.config1.success).toBe(true);
      expect(results.config2.success).toBe(true);

      // Results should be independent (not sharing references)
      expect(results.config1.result).not.toBe(results.config2.result);
    });
  });
});
