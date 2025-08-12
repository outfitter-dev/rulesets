// Concrete context types for Rulesets compilation and processing
// Provides type-safe interfaces for compilation context and configuration

import type {
  DestinationId,
  SourcePath,
  DestPath,
  Version,
  RawContent,
  CompiledContent,
  BlockName,
  VariableName,
  PropertyName,
} from './brands';

// ============================================================================
// Compilation Context
// ============================================================================

/**
 * Core compilation context that flows through the entire compilation process
 * Provides type-safe access to all compilation-related information
 */
export interface CompilationContext {
  /** Source file information */
  readonly source: {
    /** Path to the source rules file */
    readonly path: SourcePath;
    /** Raw content of the source file */
    readonly content: RawContent;
    /** Parsed frontmatter from the source file */
    readonly frontmatter: FrontmatterData;
  };

  /** Current destination being compiled for */
  readonly destination: {
    /** Destination identifier */
    readonly id: DestinationId;
    /** Destination-specific output path */
    readonly outputPath: DestPath;
    /** Destination-specific configuration */
    readonly config: DestinationConfig;
  };

  /** Global compilation configuration */
  readonly config: {
    /** Global ruleset configuration */
    readonly global: GlobalConfig;
    /** Project-specific configuration */
    readonly project: ProjectConfig;
    /** Runtime compilation options */
    readonly runtime: RuntimeConfig;
  };

  /** Compilation metadata and tracking */
  readonly metadata: {
    /** Compilation run timestamp */
    readonly timestamp: Date;
    /** Unique compilation run identifier */
    readonly runId: string;
    /** Rulesets version used for compilation */
    readonly version: Version;
    /** Base directory for path resolution */
    readonly baseDir: string;
  };
}

/**
 * Write context passed to destination plugins
 * Extends compilation context with write-specific information
 */
export interface WriteContext extends Pick<CompilationContext, 'source' | 'destination' | 'metadata'> {
  /** Compiled document ready for writing */
  readonly compiled: {
    /** Final compiled content */
    readonly content: CompiledContent;
    /** Destination-specific metadata */
    readonly metadata: Record<string, unknown>;
  };

  /** Logger instance for the write operation */
  readonly logger: LoggerInstance;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Frontmatter data structure from source rules files
 * Provides typed access to document metadata
 */
export interface FrontmatterData {
  /** Ruleset format information */
  readonly ruleset?: {
    /** Version of Ruleset syntax used */
    readonly version: Version;
  };

  /** Document metadata */
  readonly name?: string;
  readonly description?: string;
  readonly version?: Version;

  /** File matching patterns */
  readonly globs?: ReadonlyArray<string>;

  /** Destination filtering */
  readonly destination?: {
    readonly include?: ReadonlyArray<DestinationId>;
    readonly exclude?: ReadonlyArray<DestinationId>;
    readonly path?: string;
  };

  /** Destination-specific frontmatter */
  readonly [destinationId: string]: unknown;
}

/**
 * Global configuration for the Rulesets system
 */
export interface GlobalConfig {
  /** Source directory configuration */
  readonly source: {
    /** Path to source rules directory */
    readonly directory: string;
    /** File patterns to include */
    readonly include: ReadonlyArray<string>;
    /** File patterns to exclude */
    readonly exclude: ReadonlyArray<string>;
  };

  /** Output configuration */
  readonly output: {
    /** Base output directory */
    readonly directory: string;
    /** Whether to create symlink to latest */
    readonly createLatestSymlink: boolean;
    /** Retention policy for old compilations */
    readonly retention: {
      readonly maxRuns: number;
      readonly maxAge: string; // e.g., "30d", "7d"
    };
  };

  /** Validation configuration */
  readonly validation: {
    /** Whether to enable strict validation */
    readonly strict: boolean;
    /** Custom validation rules */
    readonly rules: ReadonlyArray<string>;
  };

  /** Logging configuration */
  readonly logging: {
    readonly level: 'error' | 'warn' | 'info' | 'debug';
    readonly format: 'text' | 'json';
    readonly output: 'console' | 'file' | 'both';
  };
}

/**
 * Project-specific configuration
 */
export interface ProjectConfig {
  /** Project metadata */
  readonly project: {
    readonly name: string;
    readonly version: Version;
    readonly description?: string;
  };

  /** Project-specific source configuration */
  readonly source?: {
    readonly directory?: string;
    readonly include?: ReadonlyArray<string>;
    readonly exclude?: ReadonlyArray<string>;
  };

  /** Destination configurations */
  readonly destinations: ReadonlyMap<DestinationId, DestinationConfig>;

  /** Variable definitions */
  readonly variables: ReadonlyMap<VariableName, string>;

  /** Default properties */
  readonly properties: ReadonlyMap<PropertyName, unknown>;
}

/**
 * Destination-specific configuration
 */
export interface DestinationConfig {
  /** Whether this destination is enabled */
  readonly enabled: boolean;

  /** Output configuration */
  readonly output: {
    /** Base output path for this destination */
    readonly path?: string;
    /** File naming pattern */
    readonly filename?: string;
    /** Whether to create output directory */
    readonly createDirectory: boolean;
  };

  /** Destination plugin configuration */
  readonly plugin: {
    /** Plugin-specific options */
    readonly options: Record<string, unknown>;
    /** Override default plugin behavior */
    readonly overrides?: Record<string, unknown>;
  };

  /** Transformation configuration */
  readonly transform: {
    /** Whether to apply transformations */
    readonly enabled: boolean;
    /** Custom transformation rules */
    readonly rules: ReadonlyArray<TransformRule>;
  };

  /** Validation configuration */
  readonly validation: {
    /** Whether to validate output */
    readonly enabled: boolean;
    /** Custom validation schema */
    readonly schema?: Record<string, unknown>;
  };
}

/**
 * Runtime compilation configuration
 */
export interface RuntimeConfig {
  /** Performance configuration */
  readonly performance: {
    /** Maximum compilation time in milliseconds */
    readonly timeout: number;
    /** Maximum memory usage in bytes */
    readonly maxMemory: number;
    /** Whether to enable performance monitoring */
    readonly monitoring: boolean;
  };

  /** Security configuration */
  readonly security: {
    /** Whether to enable sandbox mode */
    readonly sandbox: boolean;
    /** Allowed system operations */
    readonly allowedOperations: ReadonlyArray<'read' | 'write' | 'execute'>;
    /** File size limits */
    readonly limits: {
      readonly maxFileSize: number;
      readonly maxTotalSize: number;
    };
  };

  /** Debug configuration */
  readonly debug: {
    /** Whether debug mode is enabled */
    readonly enabled: boolean;
    /** Debug output directory */
    readonly outputDir?: string;
    /** What to include in debug output */
    readonly include: ReadonlyArray<'ast' | 'tokens' | 'context' | 'timings'>;
  };
}

/**
 * Transformation rule configuration
 */
export interface TransformRule {
  /** Rule identifier */
  readonly id: string;
  /** Rule description */
  readonly description: string;
  /** When to apply this rule */
  readonly condition: {
    /** Block names to target */
    readonly blocks?: ReadonlyArray<BlockName>;
    /** Properties to match */
    readonly properties?: ReadonlyArray<PropertyName>;
    /** Content patterns to match */
    readonly patterns?: ReadonlyArray<string>;
  };
  /** How to transform the content */
  readonly action: {
    /** Type of transformation */
    readonly type: 'replace' | 'wrap' | 'remove' | 'modify';
    /** Transformation parameters */
    readonly params: Record<string, unknown>;
  };
}

// ============================================================================
// Execution Context
// ============================================================================

/**
 * Parser execution context
 * Provides type-safe access to parsing state and configuration
 */
export interface ParserContext {
  /** Source being parsed */
  readonly source: CompilationContext['source'];
  /** Parser configuration */
  readonly config: {
    /** Whether to parse frontmatter */
    readonly parseFrontmatter: boolean;
    /** Whether to parse body markers */
    readonly parseMarkers: boolean;
    /** Maximum nesting depth */
    readonly maxDepth: number;
  };
  /** Current parsing state */
  readonly state: {
    /** Current line number */
    readonly line: number;
    /** Current column */
    readonly column: number;
    /** Current nesting level */
    readonly depth: number;
  };
}

/**
 * Compiler execution context
 * Provides type-safe access to compilation state
 */
export interface CompilerContext extends CompilationContext {
  /** AST being processed */
  readonly ast: {
    /** Parsed blocks */
    readonly blocks: ReadonlyArray<ParsedBlock>;
    /** Parsed imports */
    readonly imports: ReadonlyArray<ParsedImport>;
    /** Parsed variables */
    readonly variables: ReadonlyArray<ParsedVariable>;
  };

  /** Compilation state */
  readonly state: {
    /** Current processing phase */
    readonly phase: 'parsing' | 'resolving' | 'transforming' | 'generating';
    /** Resolved imports cache */
    readonly imports: ReadonlyMap<string, CompilationContext>;
    /** Variable substitutions */
    readonly variables: ReadonlyMap<VariableName, string>;
  };
}

/**
 * Plugin execution context
 * Provides type-safe access to plugin-specific information
 */
export interface PluginContext extends WriteContext {
  /** Plugin metadata */
  readonly plugin: {
    /** Plugin name */
    readonly name: string;
    /** Plugin version */
    readonly version: Version;
    /** Plugin configuration schema */
    readonly schema: Record<string, unknown>;
  };

  /** Execution environment */
  readonly environment: {
    /** Node.js version */
    readonly nodeVersion: string;
    /** Operating system */
    readonly platform: NodeJS.Platform;
    /** Current working directory */
    readonly cwd: string;
    /** Environment variables */
    readonly env: ReadonlyMap<string, string>;
  };
}

// ============================================================================
// AST Node Types
// ============================================================================

/**
 * Base interface for all parsed AST nodes
 */
interface ParsedNode {
  /** Unique node identifier */
  readonly id: string;
  /** Node type */
  readonly type: string;
  /** Source location information */
  readonly location: {
    readonly start: { line: number; column: number };
    readonly end: { line: number; column: number };
  };
  /** Raw source text */
  readonly raw: string;
}

/**
 * Parsed block node
 */
export interface ParsedBlock extends ParsedNode {
  readonly type: 'block';
  /** Block name */
  readonly name: BlockName;
  /** Block properties */
  readonly properties: ReadonlyArray<ParsedProperty>;
  /** Block content */
  readonly content: string;
  /** Child blocks (for nested blocks) */
  readonly children: ReadonlyArray<ParsedBlock>;
}

/**
 * Parsed import node
 */
export interface ParsedImport extends ParsedNode {
  readonly type: 'import';
  /** Import path */
  readonly path: string;
  /** Import properties */
  readonly properties: ReadonlyArray<ParsedProperty>;
  /** Specific blocks to import */
  readonly blocks?: ReadonlyArray<BlockName>;
  /** Resolved import content */
  readonly resolved?: CompilationContext;
}

/**
 * Parsed variable node
 */
export interface ParsedVariable extends ParsedNode {
  readonly type: 'variable';
  /** Variable name */
  readonly name: VariableName;
  /** Default value */
  readonly defaultValue?: string;
  /** Resolved value */
  readonly value?: string;
}

/**
 * Parsed property node
 */
export interface ParsedProperty extends ParsedNode {
  readonly type: 'property';
  /** Property name */
  readonly name: PropertyName;
  /** Property value */
  readonly value?: string;
  /** Destination scope */
  readonly scope?: DestinationId;
  /** Property modifiers */
  readonly modifiers: ReadonlyArray<'+' | '!' | string>;
}

// ============================================================================
// Logger Interface
// ============================================================================

/**
 * Logger instance interface
 * Provides structured logging with context awareness
 */
export interface LoggerInstance {
  /** Log error messages */
  error(message: string, error?: Error | unknown): void;
  /** Log warning messages */
  warn(message: string, context?: Record<string, unknown>): void;
  /** Log info messages */
  info(message: string, context?: Record<string, unknown>): void;
  /** Log debug messages */
  debug(message: string, context?: Record<string, unknown>): void;

  /** Create child logger with additional context */
  child(context: Record<string, unknown>): LoggerInstance;

  /** Set minimum log level */
  setLevel(level: 'error' | 'warn' | 'info' | 'debug'): void;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Validation result with detailed error information
 */
export interface ValidationResult<T> {
  /** Whether validation passed */
  readonly valid: boolean;
  /** Validated data (if valid) */
  readonly data?: T;
  /** Validation errors (if invalid) */
  readonly errors: ReadonlyArray<{
    readonly path: string;
    readonly message: string;
    readonly code: string;
    readonly value?: unknown;
  }>;
  /** Validation warnings */
  readonly warnings: ReadonlyArray<{
    readonly path: string;
    readonly message: string;
    readonly value?: unknown;
  }>;
}

/**
 * Performance metrics for compilation operations
 */
export interface PerformanceMetrics {
  /** Operation timings */
  readonly timings: {
    readonly total: number;
    readonly parsing: number;
    readonly compilation: number;
    readonly writing: number;
  };

  /** Memory usage */
  readonly memory: {
    readonly peak: number;
    readonly average: number;
    readonly final: number;
  };

  /** Processing statistics */
  readonly stats: {
    readonly filesProcessed: number;
    readonly blocksProcessed: number;
    readonly importsResolved: number;
    readonly variablesSubstituted: number;
  };

  /** Error and warning counts */
  readonly issues: {
    readonly errors: number;
    readonly warnings: number;
    readonly notices: number;
  };
}

/**
 * Compilation result with comprehensive information
 */
export interface CompilationResult {
  /** Whether compilation was successful */
  readonly success: boolean;

  /** Compilation context */
  readonly context: CompilationContext;

  /** Generated output */
  readonly output: ReadonlyMap<DestinationId, CompiledContent>;

  /** Performance metrics */
  readonly metrics: PerformanceMetrics;

  /** Issues encountered during compilation */
  readonly issues: ReadonlyArray<{
    readonly level: 'error' | 'warning' | 'notice';
    readonly message: string;
    readonly location?: {
      readonly file: SourcePath;
      readonly line: number;
      readonly column: number;
    };
    readonly context?: Record<string, unknown>;
  }>;

  /** Generated file paths */
  readonly files: ReadonlyMap<DestinationId, DestPath>;
}