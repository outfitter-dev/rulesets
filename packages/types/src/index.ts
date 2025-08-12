// TLDR: Export all types and interfaces from the types package

// Legacy exports (preserved for backwards compatibility)
export * from './compiled-doc';
export * from './destination-plugin';
export * from './logger';
export * from './provider-registry';
export * from './provider-types';

// New branded types system
export * from './brands';
export * from './ruleset-context';

// Re-export specific items to avoid naming conflicts
export {
  // Marker types (rename to avoid conflict with compiled-doc)
  type MarkerType,
  type BaseMarker,
  type BlockMarker,
  type BlockEndMarker,
  type ImportMarker,
  type VariableMarker,
  type RawMarker,
  type CommentMarker,
  type UnknownMarker,
  type Marker as RulesetMarker,
  
  // Block configuration types
  type BlockOutputConfig,
  type TagRenderConfig,
  type ContentWrapConfig,
  type IndentConfig,
  type BlockMetadata,
  
  // Import configuration types
  type ImportFilter,
  type ImportScope,
  
  // Variable configuration types
  type VariableScope,
  type VariableTransform,
  
  // Processing types
  type ProcessedBlock,
  type ProcessedImport,
  type ProcessedVariable,
  type VariableSource,
  type ProcessingMetadata,
  
  // Parser types
  type ParserState,
  type ParserConfig,
  type MarkerHandler,
  type ParsingError,
  
  // Utility types
  type MarkerFactory,
  type MarkerVisitor,
  type MarkerTransform,
  type TransformContext,
  type MarkerValidationResult,
  
  // Output format (rename to avoid conflict with provider-types)
  type OutputFormat as MarkerOutputFormat,
} from './markers';

export * from './validation';
