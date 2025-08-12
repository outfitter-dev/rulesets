// TLDR: Export all types and interfaces from the types package

// Legacy exports (preserved for backwards compatibility)
export * from './logger';

// New branded types system (inspired by Grapple) - primary exports
export * from './brands';
export * from './ruleset-context';

// Markers exports (selective to avoid conflicts) - renamed Marker to avoid conflict
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
  Marker as DetailedMarker, // Renamed to avoid conflict with ruleset-context Marker
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

// Legacy exports for backwards compatibility (selective exports to avoid conflicts)
export type { CompiledDoc, ParsedDoc } from './compiled-doc';
export type { DestinationPlugin, JSONSchema7 } from './destination-plugin';
// Skip provider-registry and provider-types exports to avoid conflicts

// Legacy module re-exports (with namespace to avoid conflicts)
export * as LegacyTypes from './compiled-doc';
export * as LegacyDestination from './destination-plugin';
export * as LegacyProviderRegistry from './provider-registry';
export * as LegacyProviderTypes from './provider-types';
