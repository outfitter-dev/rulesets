/**
 * Migration utilities for transitioning from destination to provider terminology
 * Provides backwards compatibility and safe migration paths
 */

import type {
  ProviderId,
  OutputPath,
  DestinationId,
  DestPath,
  BlockName,
  PropertyName,
} from './brands';
import type {
  Provider,
  ProviderConfig,
  ProviderCapabilities,
  ProviderError,
  ProviderWarning,
} from './provider';
import type {
  BaseCompilationContext,
  ProviderConfiguration,
  LinterConfig,
  Property,
} from './ruleset-context';

/**
 * Legacy destination configuration interface
 */
export interface LegacyDestinationConfig {
  readonly id: DestinationId;
  readonly destPath: DestPath;
  readonly fileNaming?: string;
  readonly includeXml?: boolean;
  readonly template?: {
    readonly format: 'markdown' | 'xml' | 'json';
  };
  readonly validation?: {
    readonly allowedFormats: string[];
    readonly maxLength: number;
  };
}

/**
 * Migration result with success status and warnings
 */
export interface MigrationResult<T> {
  readonly success: boolean;
  readonly result?: T;
  readonly errors: MigrationError[];
  readonly warnings: MigrationWarning[];
  readonly metadata: MigrationMetadata;
}

/**
 * Migration error types
 */
export interface MigrationError {
  readonly type: 'validation' | 'mapping' | 'incompatible' | 'missing';
  readonly message: string;
  readonly code: string;
  readonly field?: string;
  readonly context?: Record<string, unknown>;
}

/**
 * Migration warning types
 */
export interface MigrationWarning {
  readonly type: 'deprecated' | 'fallback' | 'assumption' | 'data-loss';
  readonly message: string;
  readonly suggestion?: string;
  readonly field?: string;
}

/**
 * Migration metadata
 */
export interface MigrationMetadata {
  readonly version: string;
  readonly timestamp: string;
  readonly fieldsProcessed: string[];
  readonly fieldsMigrated: string[];
  readonly fieldsSkipped: string[];
  readonly assumptionsMade: string[];
}

/**
 * Migrate legacy destination configuration to provider configuration
 */
export function migrateDestinationConfig(
  legacyConfig: LegacyDestinationConfig
): MigrationResult<ProviderConfig> {
  const errors: MigrationError[] = [];
  const warnings: MigrationWarning[] = [];
  const fieldsProcessed: string[] = [];
  const fieldsMigrated: string[] = [];
  const fieldsSkipped: string[] = [];
  const assumptionsMade: string[] = [];

  try {
    // Validate legacy config structure
    if (!legacyConfig || typeof legacyConfig !== 'object') {
      errors.push({
        type: 'validation',
        message: 'Legacy config must be an object',
        code: 'INVALID_LEGACY_CONFIG',
      });
      return createMigrationResult(false, undefined, errors, warnings, {
        fieldsProcessed,
        fieldsMigrated,
        fieldsSkipped,
        assumptionsMade,
      });
    }

    // Start migration - build new config object instead of mutating
    const configBuilder: {
      outputPath?: OutputPath;
      fileNaming?: any;
      format?: any;
      template?: any;
      validation?: any;
    } = {};

    // Migrate ID: DestinationId -> ProviderId (direct mapping)
    if ('id' in legacyConfig) {
      fieldsProcessed.push('id');
      configBuilder.outputPath = legacyConfig.destPath as unknown as OutputPath;
      fieldsMigrated.push('id -> outputPath mapping');
      warnings.push({
        type: 'assumption',
        message: 'ID migration assumes destination ID maps to provider ID',
        field: 'id',
      });
      assumptionsMade.push('destination ID maps to provider ID');
    }

    // Migrate destPath -> outputPath
    if ('destPath' in legacyConfig) {
      fieldsProcessed.push('destPath');
      configBuilder.outputPath = legacyConfig.destPath as unknown as OutputPath;
      fieldsMigrated.push('destPath -> outputPath');
    } else {
      errors.push({
        type: 'missing',
        message: 'destPath is required for migration',
        code: 'MISSING_DEST_PATH',
        field: 'destPath',
      });
    }

    // Migrate fileNaming
    if ('fileNaming' in legacyConfig) {
      fieldsProcessed.push('fileNaming');
      configBuilder.fileNaming = legacyConfig.fileNaming as any;
      fieldsMigrated.push('fileNaming');
    }

    // Migrate template format
    if (legacyConfig.template?.format) {
      fieldsProcessed.push('template.format');
      configBuilder.format = legacyConfig.template.format as any;
      configBuilder.template = {
        format: legacyConfig.template.format as any,
      };
      fieldsMigrated.push('template.format -> format');
    } else {
      // Default to markdown if no format specified
      configBuilder.format = 'markdown';
      assumptionsMade.push('format defaulted to markdown');
      warnings.push({
        type: 'assumption',
        message: 'No format specified, defaulting to markdown',
        suggestion: 'Explicitly specify format in new configuration',
      });
    }

    // Migrate validation settings
    if (legacyConfig.validation) {
      fieldsProcessed.push('validation');
      configBuilder.validation = {
        strictMode: true, // Enable strict mode by default for migrated configs
        customRules: [], // Empty rules array for now
      };
      fieldsMigrated.push('validation');
      
      if (legacyConfig.validation.maxLength) {
        // Note: maxLength doesn't directly map, add as warning
        warnings.push({
          type: 'data-loss',
          message: 'maxLength validation property not directly supported in new format',
          suggestion: 'Consider implementing as custom validation rule',
          field: 'validation.maxLength',
        });
      }
    }

    // Build final config as readonly
    const migratedConfig: ProviderConfig = {
      outputPath: configBuilder.outputPath!,
      format: configBuilder.format || 'markdown',
      fileNaming: configBuilder.fileNaming,
      template: configBuilder.template,
      validation: configBuilder.validation,
    };

    // Check for includeXml (deprecated feature)
    if ('includeXml' in legacyConfig) {
      fieldsProcessed.push('includeXml');
      warnings.push({
        type: 'deprecated',
        message: 'includeXml is deprecated and may not be fully supported',
        suggestion: 'Use format configuration instead',
        field: 'includeXml',
      });
      fieldsSkipped.push('includeXml (deprecated)');
    }

    return createMigrationResult(
      errors.length === 0,
      migratedConfig,
      errors,
      warnings,
      {
        fieldsProcessed,
        fieldsMigrated,
        fieldsSkipped,
        assumptionsMade,
      }
    );

  } catch (error) {
    errors.push({
      type: 'validation',
      message: `Unexpected error during migration: ${error}`,
      code: 'MIGRATION_ERROR',
    });

    return createMigrationResult(false, undefined, errors, warnings, {
      fieldsProcessed,
      fieldsMigrated,
      fieldsSkipped,
      assumptionsMade,
    });
  }
}

/**
 * Migrate legacy property with destination scope to provider scope
 */
export function migratePropertyScope(legacyProperty: Property): MigrationResult<Property> {
  const errors: MigrationError[] = [];
  const warnings: MigrationWarning[] = [];

  try {
    if (!legacyProperty.scope && !legacyProperty.legacyScope) {
      // No scope to migrate
      return createMigrationResult(true, legacyProperty, errors, warnings, {
        fieldsProcessed: ['scope'],
        fieldsMigrated: [],
        fieldsSkipped: [],
        assumptionsMade: [],
      });
    }

    // Use legacy scope if present, otherwise scope is already provider-based
    const scopeToMigrate = legacyProperty.legacyScope || legacyProperty.scope;
    
    const migratedProperty: Property = {
      ...legacyProperty,
      scope: scopeToMigrate as ProviderId,
      // Clear legacy scope
      legacyScope: undefined,
    };

    warnings.push({
      type: 'assumption',
      message: 'Destination scope migrated to provider scope',
      suggestion: 'Verify provider ID is correct',
      field: 'scope',
    });

    return createMigrationResult(true, migratedProperty, errors, warnings, {
      fieldsProcessed: ['scope', 'legacyScope'],
      fieldsMigrated: ['scope'],
      fieldsSkipped: [],
      assumptionsMade: ['destination scope maps to provider scope'],
    });

  } catch (error) {
    errors.push({
      type: 'validation',
      message: `Error migrating property scope: ${error}`,
      code: 'PROPERTY_SCOPE_MIGRATION_ERROR',
    });

    return createMigrationResult(false, undefined, errors, warnings, {
      fieldsProcessed: ['scope'],
      fieldsMigrated: [],
      fieldsSkipped: [],
      assumptionsMade: [],
    });
  }
}

/**
 * Migrate legacy linter configuration
 */
export function migrateLinterConfig(legacyConfig: LinterConfig): MigrationResult<LinterConfig> {
  const errors: MigrationError[] = [];
  const warnings: MigrationWarning[] = [];
  const fieldsProcessed: string[] = [];
  const fieldsMigrated: string[] = [];

  try {
    // Build new config object instead of mutating
    const migratedConfig: LinterConfig = {
      ...legacyConfig,
      // Migrate allowedDestinations to allowedProviders
      ...(legacyConfig.allowedDestinations && {
        allowedProviders: legacyConfig.allowedDestinations as ProviderId[],
      }),
    };

    // Track migration
    if (legacyConfig.allowedDestinations) {
      fieldsProcessed.push('allowedDestinations');
      fieldsMigrated.push('allowedDestinations -> allowedProviders');
      
      warnings.push({
        type: 'assumption',
        message: 'Destination IDs migrated to provider IDs',
        suggestion: 'Verify provider IDs are valid',
        field: 'allowedProviders',
      });
    }

    return createMigrationResult(true, migratedConfig, errors, warnings, {
      fieldsProcessed,
      fieldsMigrated,
      fieldsSkipped: [],
      assumptionsMade: legacyConfig.allowedDestinations ? ['destination IDs map to provider IDs'] : [],
    });

  } catch (error) {
    errors.push({
      type: 'validation',
      message: `Error migrating linter config: ${error}`,
      code: 'LINTER_CONFIG_MIGRATION_ERROR',
    });

    return createMigrationResult(false, undefined, errors, warnings, {
      fieldsProcessed,
      fieldsMigrated,
      fieldsSkipped: [],
      assumptionsMade: [],
    });
  }
}

/**
 * Detect if configuration uses legacy destination terminology
 */
export function isLegacyConfig(config: unknown): boolean {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const legacyFields = [
    'destinationId',
    'destPath',
    'destination',
    'allowedDestinations',
    'legacyScope',
    'legacyId',
    'legacyDestPath',
  ];

  return legacyFields.some(field => field in config);
}

/**
 * Extract migration recommendations from a configuration
 */
export function getMigrationRecommendations(config: unknown): MigrationWarning[] {
  const recommendations: MigrationWarning[] = [];

  if (!config || typeof config !== 'object') {
    return recommendations;
  }

  // Check for specific legacy patterns
  if ('destinationId' in config && !('providerId' in config)) {
    recommendations.push({
      type: 'deprecated',
      message: 'Use providerId instead of destinationId',
      suggestion: 'Rename destinationId field to providerId',
      field: 'destinationId',
    });
  }

  if ('destPath' in config && !('outputPath' in config)) {
    recommendations.push({
      type: 'deprecated',
      message: 'Use outputPath instead of destPath',
      suggestion: 'Rename destPath field to outputPath',
      field: 'destPath',
    });
  }

  if ('allowedDestinations' in config && !('allowedProviders' in config)) {
    recommendations.push({
      type: 'deprecated',
      message: 'Use allowedProviders instead of allowedDestinations',
      suggestion: 'Rename allowedDestinations field to allowedProviders',
      field: 'allowedDestinations',
    });
  }

  return recommendations;
}

/**
 * Validate migration completeness
 */
export function validateMigrationCompleteness(
  originalConfig: unknown,
  migratedConfig: unknown
): MigrationWarning[] {
  const warnings: MigrationWarning[] = [];

  if (!originalConfig || !migratedConfig) {
    warnings.push({
      type: 'data-loss',
      message: 'Unable to validate migration completeness due to missing configuration',
    });
    return warnings;
  }

  // Type guard to ensure objects
  if (typeof originalConfig !== 'object' || typeof migratedConfig !== 'object') {
    warnings.push({
      type: 'data-loss',
      message: 'Configuration must be objects for completeness validation',
    });
    return warnings;
  }

  // Check for potential data loss
  const originalKeys = Object.keys(originalConfig as Record<string, unknown>);
  const migratedKeys = Object.keys(migratedConfig as Record<string, unknown>);

  const missingKeys = originalKeys.filter(key => !migratedKeys.includes(key));
  
  if (missingKeys.length > 0) {
    warnings.push({
      type: 'data-loss',
      message: `Some fields were not migrated: ${missingKeys.join(', ')}`,
      suggestion: 'Review missing fields and migrate manually if needed',
    });
  }

  return warnings;
}

/**
 * Helper function to create migration result
 */
function createMigrationResult<T>(
  success: boolean,
  result: T | undefined,
  errors: MigrationError[],
  warnings: MigrationWarning[],
  metadata: Omit<MigrationMetadata, 'version' | 'timestamp'>
): MigrationResult<T> {
  return {
    success,
    result,
    errors,
    warnings,
    metadata: {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}

/**
 * Batch migration utility for multiple configurations
 */
export function batchMigrateConfigs(
  configs: Record<string, unknown>
): Record<string, MigrationResult<unknown>> {
  const results: Record<string, MigrationResult<unknown>> = {};

  for (const [key, config] of Object.entries(configs)) {
    if (isLegacyConfig(config)) {
      // Attempt migration based on config structure
      if (typeof config === 'object' && config !== null) {
        if ('destPath' in config && 'id' in config) {
          results[key] = migrateDestinationConfig(config as LegacyDestinationConfig);
        } else if ('allowedDestinations' in config) {
          results[key] = migrateLinterConfig(config as LinterConfig);
        } else {
          // Generic migration attempt
          const configObject = config as Record<string, unknown>;
          results[key] = {
            success: false,
            errors: [{
              type: 'incompatible',
              message: 'Config structure not recognized for automatic migration',
              code: 'UNKNOWN_LEGACY_FORMAT',
            }],
            warnings: getMigrationRecommendations(config),
            metadata: {
              version: '1.0.0',
              timestamp: new Date().toISOString(),
              fieldsProcessed: Object.keys(configObject),
              fieldsMigrated: [],
              fieldsSkipped: Object.keys(configObject),
              assumptionsMade: [],
            },
          };
        }
      } else {
        // Invalid config type
        results[key] = {
          success: false,
          errors: [{
            type: 'validation',
            message: 'Config must be an object',
            code: 'INVALID_CONFIG_TYPE',
          }],
          warnings: [],
          metadata: {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            fieldsProcessed: [],
            fieldsMigrated: [],
            fieldsSkipped: [],
            assumptionsMade: [],
          },
        };
      }
    } else {
      // Not a legacy config, return success with no changes
      const configObject = config as Record<string, unknown>;
      results[key] = {
        success: true,
        result: config,
        errors: [],
        warnings: [],
        metadata: {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          fieldsProcessed: typeof config === 'object' && config !== null ? Object.keys(configObject) : [],
          fieldsMigrated: [],
          fieldsSkipped: [],
          assumptionsMade: [],
        },
      };
    }
  }

  return results;
}

/**
 * Migration summary utilities
 */
export function summarizeMigrationResults(
  results: Record<string, MigrationResult<unknown>>
): MigrationSummary {
  const errorCounts: Record<string, number> = {};
  const warningCounts: Record<string, number> = {};
  
  let successfulMigrations = 0;
  let failedMigrations = 0;
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const result of Object.values(results)) {
    if (result.success) {
      successfulMigrations++;
    } else {
      failedMigrations++;
    }

    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;

    // Count error types
    for (const error of result.errors) {
      errorCounts[error.type] = (errorCounts[error.type] || 0) + 1;
    }

    // Count warning types
    for (const warning of result.warnings) {
      warningCounts[warning.type] = (warningCounts[warning.type] || 0) + 1;
    }
  }

  // Get most common issues
  const mostCommonErrors = Object.entries(errorCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  const mostCommonWarnings = Object.entries(warningCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  // Build final summary
  const summary: MigrationSummary = {
    totalConfigs: Object.keys(results).length,
    successfulMigrations,
    failedMigrations,
    totalErrors,
    totalWarnings,
    mostCommonErrors,
    mostCommonWarnings,
  };

  return summary;
}

/**
 * Migration summary interface
 */
export interface MigrationSummary {
  readonly totalConfigs: number;
  readonly successfulMigrations: number;
  readonly failedMigrations: number;
  readonly totalErrors: number;
  readonly totalWarnings: number;
  readonly mostCommonErrors: Array<{ type: string; count: number }>;
  readonly mostCommonWarnings: Array<{ type: string; count: number }>;
}