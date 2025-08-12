// Marker and block type definitions for Rulesets syntax processing
// Provides comprehensive type safety for parsing and processing {{...}} markers

import type {
  BlockName,
  VariableName,
  PropertyName,
  MarkerContent,
  DestinationId,
  PartialPath,
} from './brands';

// ============================================================================
// Core Marker Types
// ============================================================================

/**
 * Enumeration of all supported marker types in Rulesets syntax
 */
export type MarkerType = 
  | 'block'          // {{block-name}}...{{/block-name}}
  | 'block-end'      // {{/block-name}}
  | 'import'         // {{> path}}
  | 'variable'       // {{$variable}}
  | 'raw'            // {{{content}}}
  | 'comment'        // {{! comment}}
  | 'unknown';       // Unrecognized marker format

/**
 * Base marker interface that all specific marker types extend
 * Provides common properties and location information
 */
export interface BaseMarker {
  /** Unique identifier for this marker instance */
  readonly id: string;

  /** Type of marker */
  readonly type: MarkerType;

  /** Raw marker content including braces */
  readonly raw: MarkerContent;

  /** Processed marker content (without braces) */
  readonly content: string;

  /** Source location information */
  readonly location: {
    /** Starting position */
    readonly start: SourcePosition;
    /** Ending position */
    readonly end: SourcePosition;
  };

  /** Properties extracted from the marker */
  readonly properties: ReadonlyArray<MarkerProperty>;

  /** Validation state */
  readonly validation: {
    /** Whether the marker passed validation */
    readonly valid: boolean;
    /** Validation errors if any */
    readonly errors: ReadonlyArray<string>;
    /** Validation warnings if any */
    readonly warnings: ReadonlyArray<string>;
  };
}

/**
 * Source position information for precise error reporting
 */
export interface SourcePosition {
  /** Line number (1-based) */
  readonly line: number;
  /** Column number (0-based) */
  readonly column: number;
  /** Byte offset in source */
  readonly offset: number;
}

/**
 * Marker property with type-safe values and scoping
 */
export interface MarkerProperty {
  /** Property name */
  readonly name: PropertyName;
  
  /** Property value (optional) */
  readonly value?: string | number | boolean;
  
  /** Destination scope (if property is destination-specific) */
  readonly scope?: DestinationId;
  
  /** Property modifiers */
  readonly modifiers: ReadonlyArray<PropertyModifier>;
  
  /** Source location of this property */
  readonly location: SourcePosition;
}

/**
 * Property modifiers that affect behavior
 */
export type PropertyModifier = 
  | '+'           // Inclusion modifier
  | '!'           // Exclusion modifier  
  | 'required'    // Property is required
  | 'optional'    // Property is optional
  | 'deprecated'  // Property is deprecated
  | 'experimental'; // Property is experimental

// ============================================================================
// Specific Marker Types
// ============================================================================

/**
 * Block opening marker: {{block-name}}
 */
export interface BlockMarker extends BaseMarker {
  readonly type: 'block';
  
  /** Block name (validated) */
  readonly name: BlockName;
  
  /** Destination inclusions */
  readonly inclusions: ReadonlySet<DestinationId>;
  
  /** Destination exclusions */
  readonly exclusions: ReadonlySet<DestinationId>;
  
  /** Output configuration */
  readonly output: BlockOutputConfig;
  
  /** Block metadata */
  readonly metadata: BlockMetadata;
}

/**
 * Block closing marker: {{/block-name}}
 */
export interface BlockEndMarker extends BaseMarker {
  readonly type: 'block-end';
  
  /** Block name being closed */
  readonly name: BlockName;
  
  /** Reference to matching opening marker */
  readonly matchingBlock?: BlockMarker;
}

/**
 * Import marker: {{> path}}
 */
export interface ImportMarker extends BaseMarker {
  readonly type: 'import';
  
  /** Import path */
  readonly path: string;
  
  /** Resolved partial path (if applicable) */
  readonly partialPath?: PartialPath;
  
  /** Specific blocks to import */
  readonly blocks?: ReadonlySet<BlockName>;
  
  /** Import filtering configuration */
  readonly filter: ImportFilter;
  
  /** Import scope */
  readonly scope: ImportScope;
}

/**
 * Variable marker: {{$variable}}
 */
export interface VariableMarker extends BaseMarker {
  readonly type: 'variable';
  
  /** Variable name */
  readonly name: VariableName;
  
  /** Default value if variable is undefined */
  readonly defaultValue?: string;
  
  /** Variable scope */
  readonly scope: VariableScope;
  
  /** Transformation functions */
  readonly transforms: ReadonlyArray<VariableTransform>;
}

/**
 * Raw content marker: {{{content}}}
 */
export interface RawMarker extends BaseMarker {
  readonly type: 'raw';
  
  /** Raw content to preserve */
  readonly preservedContent: string;
  
  /** Whether to escape the content */
  readonly escape: boolean;
}

/**
 * Comment marker: {{! comment}}
 */
export interface CommentMarker extends BaseMarker {
  readonly type: 'comment';
  
  /** Comment text */
  readonly text: string;
  
  /** Whether comment should appear in output */
  readonly preserve: boolean;
}

/**
 * Unknown/invalid marker
 */
export interface UnknownMarker extends BaseMarker {
  readonly type: 'unknown';
  
  /** Reason why marker is unknown */
  readonly reason: string;
  
  /** Suggested corrections */
  readonly suggestions: ReadonlyArray<string>;
}

/**
 * Union type for all marker types
 */
export type Marker = 
  | BlockMarker
  | BlockEndMarker  
  | ImportMarker
  | VariableMarker
  | RawMarker
  | CommentMarker
  | UnknownMarker;

// ============================================================================
// Block Configuration Types
// ============================================================================

/**
 * Block output configuration
 */
export interface BlockOutputConfig {
  /** Output format */
  readonly format: OutputFormat;
  
  /** Tag rendering configuration */
  readonly tag: TagRenderConfig;
  
  /** Content wrapping */
  readonly wrap: ContentWrapConfig;
  
  /** Indentation settings */
  readonly indent: IndentConfig;
}

/**
 * Output formats supported by blocks
 */
export type OutputFormat = 
  | 'xml'        // <block>content</block>
  | 'markdown'   // ## Block\ncontent
  | 'html'       // <div class="block">content</div>
  | 'raw'        // content only
  | 'json'       // {"block": "content"}
  | 'yaml';      // block: |
                 //   content

/**
 * Tag rendering configuration
 */
export interface TagRenderConfig {
  /** Whether to render opening/closing tags */
  readonly enabled: boolean;
  
  /** Tag name override */
  readonly name?: string;
  
  /** Additional attributes */
  readonly attributes: ReadonlyMap<string, string>;
  
  /** Whether to self-close empty tags */
  readonly selfClose: boolean;
}

/**
 * Content wrapping configuration  
 */
export interface ContentWrapConfig {
  /** Prefix to add before content */
  readonly prefix?: string;
  
  /** Suffix to add after content */
  readonly suffix?: string;
  
  /** Whether to trim whitespace */
  readonly trim: boolean;
  
  /** Line ending style */
  readonly lineEnding: 'lf' | 'crlf' | 'auto';
}

/**
 * Indentation configuration
 */
export interface IndentConfig {
  /** Indentation style */
  readonly style: 'spaces' | 'tabs';
  
  /** Number of spaces (if using spaces) */
  readonly size: number;
  
  /** Whether to indent content */
  readonly content: boolean;
  
  /** Whether to indent nested blocks */
  readonly nested: boolean;
}

/**
 * Block metadata
 */
export interface BlockMetadata {
  /** Human-readable description */
  readonly description?: string;
  
  /** Block version */
  readonly version?: string;
  
  /** Author information */
  readonly author?: string;
  
  /** Tags for categorization */
  readonly tags: ReadonlySet<string>;
  
  /** Deprecation information */
  readonly deprecated?: {
    readonly since: string;
    readonly reason: string;
    readonly replacement?: BlockName;
  };
  
  /** Experimental status */
  readonly experimental?: {
    readonly since: string;
    readonly stabilization?: string;
  };
}

// ============================================================================
// Import Configuration Types
// ============================================================================

/**
 * Import filtering configuration
 */
export interface ImportFilter {
  /** Blocks to include */
  readonly include: ReadonlySet<BlockName>;
  
  /** Blocks to exclude */
  readonly exclude: ReadonlySet<BlockName>;
  
  /** Properties to match */
  readonly properties: ReadonlyMap<PropertyName, unknown>;
  
  /** Content patterns to match */
  readonly patterns: ReadonlyArray<RegExp>;
}

/**
 * Import scope configuration
 */
export type ImportScope = 
  | 'global'     // Available throughout document
  | 'local'      // Available only in current block
  | 'parent'     // Available in parent block only
  | 'children';  // Available to child blocks only

// ============================================================================
// Variable Configuration Types
// ============================================================================

/**
 * Variable scope configuration
 */
export type VariableScope = 
  | 'system'     // System-provided variable (e.g., $destination)
  | 'global'     // Global configuration variable
  | 'document'   // Document frontmatter variable
  | 'block'      // Block-local variable
  | 'runtime';   // Runtime-calculated variable

/**
 * Variable transformation functions
 */
export type VariableTransform = 
  | 'uppercase'   // Convert to uppercase
  | 'lowercase'   // Convert to lowercase
  | 'kebab-case'  // Convert to kebab-case
  | 'snake_case'  // Convert to snake_case
  | 'camelCase'   // Convert to camelCase
  | 'PascalCase'  // Convert to PascalCase
  | 'slug'        // Convert to URL-safe slug
  | 'escape-html' // Escape HTML characters
  | 'escape-xml'  // Escape XML characters
  | 'encode-uri'  // URI encode
  | 'trim'        // Trim whitespace
  | 'json'        // Convert to JSON string
  | 'base64';     // Base64 encode

// ============================================================================
// Processing Types
// ============================================================================

/**
 * Processed block with resolved content and metadata
 */
export interface ProcessedBlock {
  /** Original block marker */
  readonly marker: BlockMarker;
  
  /** Processed block content */
  readonly content: string;
  
  /** Child blocks */
  readonly children: ReadonlyArray<ProcessedBlock>;
  
  /** Resolved properties */
  readonly properties: ReadonlyMap<PropertyName, unknown>;
  
  /** Processing metadata */
  readonly metadata: ProcessingMetadata;
  
  /** Output for each destination */
  readonly outputs: ReadonlyMap<DestinationId, string>;
}

/**
 * Processed import with resolved content
 */
export interface ProcessedImport {
  /** Original import marker */
  readonly marker: ImportMarker;
  
  /** Resolved import content */
  readonly content: string;
  
  /** Imported blocks */
  readonly blocks: ReadonlyArray<ProcessedBlock>;
  
  /** Import metadata */
  readonly metadata: ProcessingMetadata;
}

/**
 * Processed variable with resolved value
 */
export interface ProcessedVariable {
  /** Original variable marker */
  readonly marker: VariableMarker;
  
  /** Resolved variable value */
  readonly value: string;
  
  /** Value source */
  readonly source: VariableSource;
  
  /** Processing metadata */
  readonly metadata: ProcessingMetadata;
}

/**
 * Variable value source
 */
export type VariableSource = 
  | 'system'       // System-provided value
  | 'config'       // Configuration value
  | 'frontmatter'  // Frontmatter value
  | 'default'      // Default value
  | 'runtime'      // Runtime-calculated value
  | 'environment'; // Environment variable

/**
 * Processing metadata
 */
export interface ProcessingMetadata {
  /** Processing timestamp */
  readonly processedAt: Date;
  
  /** Processing duration in milliseconds */
  readonly duration: number;
  
  /** Cache information */
  readonly cache: {
    readonly hit: boolean;
    readonly key?: string;
    readonly expiry?: Date;
  };
  
  /** Dependencies */
  readonly dependencies: ReadonlyArray<string>;
  
  /** Processing warnings */
  readonly warnings: ReadonlyArray<string>;
}

// ============================================================================
// Parser State Types
// ============================================================================

/**
 * Parser state during marker processing
 */
export interface ParserState {
  /** Current position in source */
  readonly position: SourcePosition;
  
  /** Current nesting level */
  readonly depth: number;
  
  /** Open blocks stack */
  readonly blockStack: ReadonlyArray<BlockMarker>;
  
  /** Processed markers */
  readonly markers: ReadonlyArray<Marker>;
  
  /** Parser configuration */
  readonly config: ParserConfig;
  
  /** Error recovery state */
  readonly recovery: {
    readonly mode: 'strict' | 'lenient' | 'skip';
    readonly errors: ReadonlyArray<ParsingError>;
    readonly recovered: boolean;
  };
}

/**
 * Parser configuration
 */
export interface ParserConfig {
  /** Maximum nesting depth */
  readonly maxDepth: number;
  
  /** Whether to allow unknown markers */
  readonly allowUnknownMarkers: boolean;
  
  /** Whether to validate marker syntax strictly */
  readonly strictSyntax: boolean;
  
  /** Whether to preserve comments */
  readonly preserveComments: boolean;
  
  /** Error recovery strategy */
  readonly errorRecovery: 'strict' | 'lenient' | 'skip';
  
  /** Custom marker patterns */
  readonly customMarkers: ReadonlyMap<string, MarkerHandler>;
}

/**
 * Custom marker handler
 */
export interface MarkerHandler {
  /** Handler name */
  readonly name: string;
  
  /** Pattern to match */
  readonly pattern: RegExp;
  
  /** Handler function */
  readonly handler: (content: string, properties: ReadonlyArray<MarkerProperty>) => Marker;
  
  /** Handler metadata */
  readonly metadata: {
    readonly description: string;
    readonly examples: ReadonlyArray<string>;
    readonly deprecated?: boolean;
  };
}

/**
 * Parsing error with detailed information
 */
export interface ParsingError {
  /** Error code */
  readonly code: string;
  
  /** Human-readable message */
  readonly message: string;
  
  /** Error severity */
  readonly severity: 'error' | 'warning' | 'info';
  
  /** Source location */
  readonly location: SourcePosition;
  
  /** Error context */
  readonly context: {
    readonly marker?: string;
    readonly expected?: string;
    readonly actual?: string;
    readonly suggestions?: ReadonlyArray<string>;
  };
  
  /** Recovery information */
  readonly recovery?: {
    readonly attempted: boolean;
    readonly successful: boolean;
    readonly strategy: string;
  };
}

// ============================================================================
// Utility Functions Types
// ============================================================================

/**
 * Marker factory function type
 */
export type MarkerFactory<T extends Marker = Marker> = (
  content: MarkerContent,
  location: SourcePosition,
  properties: ReadonlyArray<MarkerProperty>
) => T;

/**
 * Marker visitor function for AST traversal
 */
export type MarkerVisitor<T = void> = {
  readonly visitBlock?: (block: ProcessedBlock) => T;
  readonly visitImport?: (importNode: ProcessedImport) => T;
  readonly visitVariable?: (variable: ProcessedVariable) => T;
  readonly visitRaw?: (raw: RawMarker) => T;
  readonly visitComment?: (comment: CommentMarker) => T;
  readonly visitUnknown?: (unknown: UnknownMarker) => T;
};

/**
 * Marker transformation function
 */
export type MarkerTransform<TIn extends Marker, TOut = TIn> = (
  marker: TIn,
  context: TransformContext
) => TOut;

/**
 * Transform context
 */
export interface TransformContext {
  /** Current destination being processed */
  readonly destination: DestinationId;
  
  /** Available variables */
  readonly variables: ReadonlyMap<VariableName, string>;
  
  /** Parent block context */
  readonly parent?: ProcessedBlock;
  
  /** Transform configuration */
  readonly config: Record<string, unknown>;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Marker validation result
 */
export interface MarkerValidationResult {
  /** Whether marker is valid */
  readonly valid: boolean;
  
  /** Validation errors */
  readonly errors: ReadonlyArray<{
    readonly code: string;
    readonly message: string;
    readonly location: SourcePosition;
    readonly severity: 'error' | 'warning';
  }>;
  
  /** Suggested fixes */
  readonly suggestions: ReadonlyArray<{
    readonly description: string;
    readonly fix: string;
    readonly confidence: number;
  }>;
}