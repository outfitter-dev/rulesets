// TLDR: Defines the CompiledDoc interface for Mixdown. Represents the result of compiling a source rules file for a specific destination (mixd-v0)

/**
 * Represents the structure of a parsed Mixdown stem.
 * For v0, this will be minimal as stems are not processed from the body.
 */
export interface Stem {
  name: string;
  // properties: Record<string, any>; // To be detailed in v0.1+
  // content: string; // To be detailed in v0.1+
  // rawMarker: string; // To be detailed in v0.1+
}

/**
 * Represents the structure of a parsed Mixdown import.
 * For v0, this will be minimal.
 */
export interface Import {
  path: string;
  // properties: Record<string, any>; // To be detailed in v0.1+
  // rawMarker: string; // To be detailed in v0.1+
}

/**
 * Represents the structure of a parsed Mixdown variable.
 * For v0, this will be minimal.
 */
export interface Variable {
  name: string;
  // rawMarker: string; // To be detailed in v0.1+
}

/**
 * Represents the structure of a generic Mixdown marker.
 * For v0, this will be minimal.
 */
export interface Marker {
  type: 'stem' | 'import' | 'variable' | 'unknown';
  // rawMarker: string; // To be detailed in v0.1+
  // position: { line: number, column: number }; // To be detailed in v0.1+
}


/**
 * Represents a document that has been parsed by the Mixdown parser.
 * This is an intermediate representation before full compilation.
 */
export interface ParsedDoc {
  source: {
    path?: string; // Original source file path, if applicable
    content: string; // Raw source content
    frontmatter?: Record<string, any>; // Parsed frontmatter data
  };
  ast: { // Abstract Syntax Tree - minimal for v0
    stems: Stem[];
    imports: Import[];
    variables: Variable[];
    markers: Marker[]; // All markers found - empty for v0 body processing
  };
  errors?: Array<{ message: string; line?: number; column?: number }>; // Parsing errors
}

/**
 * Represents a document that has been compiled for a specific destination.
 * This is the primary data structure passed to destination plugins.
 */
export interface CompiledDoc {
  /** Original source content and metadata */
  source: {
    path?: string;          // Original source file path, if applicable
    content: string;        // Raw source content
    frontmatter?: Record<string, any>;     // Parsed frontmatter data
  };

  /**
   * Parsed representation of the source document.
   * For v0, `stems`, `imports`, `variables`, and `markers` will be empty
   * or reflect only what might be in frontmatter if we decide to parse that deep.
   * The primary focus for v0 body content is that it's not processed for markers.
   */
  ast: {
    stems: Stem[];         // Array of parsed stems (empty for v0 body)
    imports: Import[];     // Array of parsed imports (empty for v0 body)
    variables: Variable[]; // Array of parsed variables (empty for v0 body)
    markers: Marker[];     // All markers found in the document (empty for v0 body)
  };

  /** Destination-specific output */
  output: {
    content: string;       // Transformed content for the destination (raw body for v0)
    metadata?: Record<string, any>; // Any metadata needed by the destination (e.g., derived from frontmatter)
  };

  /** Additional context for the compilation */
  context: {
    destinationId: string; // Current destination being compiled for
    config: Record<string, any>; // Resolved configuration for this compilation (e.g., project config, destination-specific config)
  };
}