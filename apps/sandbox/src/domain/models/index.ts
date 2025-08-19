/**

- @fileoverview Domain models for the Rulesets Sandbox application
-
- Exports all domain models with proper type definitions and utility functions
 */

// Core domain models
export *from './compilation-request';
// Re-export compilation result without OutputFile conflict
export type {
  CompilationDiagnostic,
  CompilationMetrics,
  CompilationResult,
  CompilationResultStatus,
  CompilationSummary,
  DiagnosticCategory,
  DiagnosticFix,
  DiagnosticPosition,
  DiagnosticRange,
  DiagnosticSeverity,
  ProviderResult,
} from './compilation-result';
export {
  CompilationResultBuilder,
  CompilationResultUtils,
} from './compilation-result';
// Export OutputFile model separately to avoid conflict
export type {
  OutputFile,
  OutputFileStatus,
  OutputFileSummary,
  SourceMapping,
} from './output-file';
export { OutputFileUtils } from './output-file';
export * from './provider-info';
export * from './validation-result';
