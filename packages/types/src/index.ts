// TLDR: Export all types and interfaces from the types package

// New branded types system (inspired by Grapple) - primary exports
export * from './brands';
// Legacy exports for backwards compatibility (selective exports to avoid conflicts)
export type { CompiledDoc, ParsedDoc } from './compiled-doc';
export type { DestinationPlugin, JSONSchema7 } from './destination-plugin';
// Legacy exports (preserved for backwards compatibility)
export * from './logger';
// Markers exports (selective to avoid conflicts) - renamed Marker to avoid conflict
export type {
  BaseMarker,
  BLOCK_PROPERTIES,
  BlockCloseMarker,
  BlockError,
  BlockFilter,
  BlockOpenMarker,
  BlockValidation,
  BlockWarning,
  ImportMarker,
  isBlockCloseMarker,
  // Type guards
  isBlockOpenMarker,
  isImportMarker,
  isPlaceholderMarker,
  isRawCloseMarker,
  isRawOpenMarker,
  isReservedBlock,
  isVariableMarker,
  // Constants
  MARKER_PATTERNS,
  Marker as DetailedMarker, // Renamed to avoid conflict with ruleset-context Marker
  MarkerModifier,
  MarkerPosition,
  MarkerProperty,
  MarkerType,
  ParsedBlock,
  PlaceholderMarker,
  PROPERTY_FAMILIES,
  RawCloseMarker,
  RawOpenMarker,
  RESERVED_BLOCKS,
  ReservedBlockName,
  VariableMarker,
} from './markers';
export * from './migration';
// Modern provider-based architecture
export * from './provider';
export * from './ruleset-context';
// Skip provider-registry and provider-types exports to avoid conflicts

// Legacy module re-exports (with namespace to avoid conflicts)
export * as LegacyTypes from './compiled-doc';
export * as LegacyDestination from './destination-plugin';
export * as LegacyProviderRegistry from './provider-registry';
export * as LegacyProviderTypes from './provider-types';
