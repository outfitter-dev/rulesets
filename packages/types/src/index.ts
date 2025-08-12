// TLDR: Export all types and interfaces from the types package

// Legacy exports (preserved for backwards compatibility)
export * from './logger';

// New branded types system (inspired by Grapple) - primary exports
export * from './brands';
export * from './ruleset-context';

// Markers exports (selective to avoid conflicts)
export type {
  MarkerType,
  BaseMarker,
  MarkerPosition,
  BlockOpenMarker,
  BlockCloseMarker,
  ImportMarker,
  VariableMarker,
  RawOpenMarker,
  RawCloseMarker,
  PlaceholderMarker,
  Marker,
  MarkerProperty,
  MarkerModifier,
  BlockFilter,
  ParsedBlock,
  BlockValidation,
  BlockError,
  BlockWarning,
  ReservedBlockName,
  // Type guards
  isBlockOpenMarker,
  isBlockCloseMarker,
  isImportMarker,
  isVariableMarker,
  isRawOpenMarker,
  isRawCloseMarker,
  isPlaceholderMarker,
  isReservedBlock,
  // Constants
  MARKER_PATTERNS,
  RESERVED_BLOCKS,
  BLOCK_PROPERTIES,
  PROPERTY_FAMILIES,
} from './markers';

// Modern provider-based architecture
export * from './provider';
export * from './migration';

// Legacy module re-exports (with namespace to avoid conflicts)
export * as LegacyTypes from './compiled-doc';
export * as LegacyDestination from './destination-plugin';
export * as LegacyProviderRegistry from './provider-registry';
export * as LegacyProviderTypes from './provider-types';
