/**
 * Marker and block types for Rulesets
 * Concrete types for all marker patterns in the Rulesets language
 */

import type {
  BlockName,
  MarkerContent,
  PropertyName,
  VariableName,
} from './brands';

/**
 * Marker types - all possible marker patterns
 */
export type MarkerType =
  | 'block-open'
  | 'block-close'
  | 'import'
  | 'variable'
  | 'raw-open'
  | 'raw-close'
  | 'placeholder';

/**
 * Base marker interface
 */
export interface BaseMarker {
  readonly type: MarkerType;
  readonly raw: string; // Original marker text including {{}}
  readonly content: MarkerContent; // Content within {{}}
  readonly position: MarkerPosition;
}

/**
 * Position information for markers
 */
export interface MarkerPosition {
  readonly line: number;
  readonly column: number;
  readonly offset: number;
  readonly length: number;
}

/**
 * Block opening marker: {{block-name}}
 */
export interface BlockOpenMarker extends BaseMarker {
  readonly type: 'block-open';
  readonly name: BlockName;
  readonly properties: MarkerProperty[];
  readonly modifiers: MarkerModifier[];
}

/**
 * Block closing marker: {{/block-name}}
 */
export interface BlockCloseMarker extends BaseMarker {
  readonly type: 'block-close';
  readonly name: BlockName;
}

/**
 * Import marker: {{> path}}
 */
export interface ImportMarker extends BaseMarker {
  readonly type: 'import';
  readonly path: string; // Can be relative or aliased
  readonly blockFilter?: BlockFilter;
  readonly properties: MarkerProperty[];
}

/**
 * Variable marker: {{$variable}}
 */
export interface VariableMarker extends BaseMarker {
  readonly type: 'variable';
  readonly name: VariableName;
  readonly fallback?: string; // {{$var || "default"}}
}

/**
 * Raw block markers: {{{...}}}
 */
export interface RawOpenMarker extends BaseMarker {
  readonly type: 'raw-open';
  readonly tag?: string; // Optional tag for raw blocks
}

export interface RawCloseMarker extends BaseMarker {
  readonly type: 'raw-close';
  readonly tag?: string;
}

/**
 * Placeholder marker: [placeholder] or {placeholder}
 */
export interface PlaceholderMarker extends BaseMarker {
  readonly type: 'placeholder';
  readonly name: string;
  readonly style: 'bracket' | 'brace'; // [] vs {}
}

/**
 * Union of all marker types
 */
export type Marker =
  | BlockOpenMarker
  | BlockCloseMarker
  | ImportMarker
  | VariableMarker
  | RawOpenMarker
  | RawCloseMarker
  | PlaceholderMarker;

/**
 * Marker property - modifies marker behavior
 */
export interface MarkerProperty {
  readonly name: PropertyName;
  readonly value?: string;
  readonly quoted?: boolean; // Whether value was quoted
}

/**
 * Marker modifier - inclusion/exclusion
 */
export interface MarkerModifier {
  readonly type: '+' | '-' | '!';
  readonly target: string; // Destination or block name
}

/**
 * Block filter for imports
 */
export interface BlockFilter {
  readonly include?: BlockName[];
  readonly exclude?: BlockName[];
  readonly selector?: string; // CSS-like selector syntax
}

/**
 * Parsed block structure - complete block with content
 */
export interface ParsedBlock {
  readonly open: BlockOpenMarker;
  readonly close?: BlockCloseMarker;
  readonly content: string; // Content between markers
  readonly children: ParsedBlock[]; // Nested blocks
  readonly depth: number;
  readonly isComplete: boolean; // Has matching close marker
}

/**
 * Block validation result
 */
export interface BlockValidation {
  readonly isValid: boolean;
  readonly errors: BlockError[];
  readonly warnings: BlockWarning[];
}

/**
 * Block error types
 */
export interface BlockError {
  readonly type: 'unclosed' | 'mismatch' | 'duplicate' | 'invalid-nesting';
  readonly message: string;
  readonly marker: Marker;
  readonly context?: Record<string, unknown>;
}

/**
 * Block warning types
 */
export interface BlockWarning {
  readonly type: 'deprecated' | 'unknown-property' | 'reserved-name';
  readonly message: string;
  readonly marker: Marker;
  readonly suggestion?: string;
}

/**
 * Type guards for markers
 */
export function isBlockOpenMarker(marker: Marker): marker is BlockOpenMarker {
  return marker.type === 'block-open';
}

export function isBlockCloseMarker(marker: Marker): marker is BlockCloseMarker {
  return marker.type === 'block-close';
}

export function isImportMarker(marker: Marker): marker is ImportMarker {
  return marker.type === 'import';
}

export function isVariableMarker(marker: Marker): marker is VariableMarker {
  return marker.type === 'variable';
}

export function isRawOpenMarker(marker: Marker): marker is RawOpenMarker {
  return marker.type === 'raw-open';
}

export function isRawCloseMarker(marker: Marker): marker is RawCloseMarker {
  return marker.type === 'raw-close';
}

export function isPlaceholderMarker(
  marker: Marker
): marker is PlaceholderMarker {
  return marker.type === 'placeholder';
}

/**
 * Marker pattern constants
 */
export const MARKER_PATTERNS = {
  // Standard markers
  OPEN: /\{\{([^}]+)\}\}/,
  CLOSE: /\{\{\/([^}]+)\}\}/,
  IMPORT: /\{\{>\s*([^}]+)\}\}/,
  VARIABLE: /\{\{\$([^}]+)\}\}/,

  // Raw markers
  RAW_OPEN: /\{\{\{([^}]*)\}\}\}/,
  RAW_CLOSE: /\{\{\{\/([^}]*)\}\}\}/,

  // Placeholders
  BRACKET_PLACEHOLDER: /\[([^\]]+)\]/,
  BRACE_PLACEHOLDER: /\{([^}]+)\}/,

  // Property patterns
  PROPERTY: /(\w+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s]+)))?/,
  MODIFIER: /([+\-!])(\w+)/,
} as const;

/**
 * Reserved block names that have special meaning
 */
export const RESERVED_BLOCKS = [
  'instructions',
  'context',
  'rules',
  'examples',
  'system',
  'user',
  'assistant',
] as const;

export type ReservedBlockName = (typeof RESERVED_BLOCKS)[number];

/**
 * Check if a block name is reserved
 */
export function isReservedBlock(name: string): name is ReservedBlockName {
  return RESERVED_BLOCKS.includes(name as ReservedBlockName);
}

/**
 * Common block properties
 */
export const BLOCK_PROPERTIES = {
  // Output control
  OUTPUT: ['output', 'format', 'render'],

  // Scope control
  SCOPE: ['provider', 'target', 'only', 'except', 'destination'], // destination kept for backwards compatibility

  // Display control
  DISPLAY: ['name', 'title', 'label', 'id'],

  // Behavior control
  BEHAVIOR: ['required', 'optional', 'hidden', 'collapsed'],
} as const;

/**
 * Property families for validation
 */
export const PROPERTY_FAMILIES = {
  'output-': ['tag', 'xml', 'markdown', 'json', 'omit'],
  'code-': ['javascript', 'typescript', 'python', 'ruby', 'go'],
  'format-': ['pretty', 'minify', 'compact', 'raw'],
  'indent-': ['2', '4', 'tab'],
} as const;
