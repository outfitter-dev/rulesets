/**

- @fileoverview Main entry point for the Rulesets Sandbox application
-
- Provides a clean, type-safe API for the sandbox functionality with
- comprehensive error handling and proper separation of concerns.
 */

// Export domain layer
export *from './domain';
// Export shared types and utilities
export* from './shared/types';

// Export application version and metadata
export const VERSION = '0.2.0' as const;
export const APP_NAME = 'rulesets-sandbox' as const;

/**

- Application metadata
 */
export const AppMetadata = {
  name: APP_NAME,
  version: VERSION,
  description:
    'Interactive sandbox for testing and exploring Rulesets compilation',
  author: 'Outfitter Development Team',
  license: 'MIT',
  repository: '<https://github.com/outfitter-dev/rulesets>',
  documentation: '<https://docs.outfitter.dev/rulesets>',
  homepage: '<https://outfitter.dev>',
} as const;

/**

- Re-export commonly used types for convenience
 */
export type {
  CompilationConfig,
  CompilationError,
  // Domain models
  CompilationRequest,
  // Branded types
  CompilationRequestId,
  CompilationResult,
  CompilationResultId,
  CompiledContent,
  ConfigurationError,
  ErrorCode,
  FileSystemError,
  // Service interfaces
  ICompilationService,
  IConfigurationService,
  IFileSystemService,
  ILogger,
  IProviderRegistry,
  OutputFile,
  PerformanceConfig,
  ProviderError,
  // Provider and validation models (use specific names to avoid conflicts)
  ProviderInfo,
  ProviderType,
  // Core types
  Result,
  SafeDirectoryPath,
  SafeFilePath,
  // Configuration
  SandboxConfig,
  // Error types
  SandboxError,
  SecurityConfig,
  SecurityError,
  SemanticVersion,
  SourceContent,
  ValidationError,
  ValidationResult,
} from './domain';

/**

- Utility functions re-exported for convenience
 */
export {
  // Brand utilities
  BrandedTypeUtils,
  CommonSuggestions,
  ConfigurationUtils,
  // Brand creators
  createCompilationRequestId,
  createCompilationResultId,
  createCompiledContent,
  createErrorCode,
  createProviderType,
  createSafeDirectoryPath,
  createSafeFilePath,
  createSemanticVersion,
  createSourceContent,
  // Configuration utilities
  DefaultDevelopmentConfig,
  DefaultProductionConfig,
  Err,
  // Error codes
  ErrorCodes,
  // Result creators
  Ok,
} from './domain';
