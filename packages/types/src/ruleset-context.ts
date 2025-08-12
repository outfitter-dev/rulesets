/**
 * Concrete context types for Rulesets compilation
 * Replaces complex generics with simple, discoverable types
 */

import type {
  BlockName,
  CompiledContent,
  ProviderId,
  OutputPath,
  MarkerContent,
  PropertyName,
  RawContent,
  SourcePath,
  VariableName,
  Version,
  // Backwards compatibility aliases
  DestinationId,
  DestPath,
} from './brands';

/**
 * Compilation environment
 */
export interface CompilationEnvironment {
  readonly workspaceRoot: string;
  readonly outputDir: string;
  readonly rulesetsVersion: Version;
  readonly debug?: boolean;
  readonly strict?: boolean;
}

/**
 * Base context shared by all compilation stages
 */
export interface BaseCompilationContext {
  readonly sourcePath: SourcePath;
  readonly providerId: ProviderId;
  readonly environment: CompilationEnvironment;
  readonly metadata: Record<string, unknown>;
  /** @deprecated Use providerId instead */
  readonly destinationId?: DestinationId;
}

/**
 * Parser context - when parsing source files
 */
export interface ParserContext extends BaseCompilationContext {
  readonly stage: 'parse';
  readonly rawContent: RawContent;
  readonly frontmatter?: Record<string, unknown>;
}

/**
 * Linter context - when validating parsed content
 */
export interface LinterContext extends BaseCompilationContext {
  readonly stage: 'lint';
  readonly parsedDoc: ParsedDocument;
  readonly config: LinterConfig;
}

/**
 * Compiler context - when compiling to destination format
 */
export interface CompilerContext extends BaseCompilationContext {
  readonly stage: 'compile';
  readonly parsedDoc: ParsedDocument;
  readonly outputPath: OutputPath;
  readonly providerConfig: ProviderConfiguration;
  /** @deprecated Use outputPath instead */
  readonly destPath?: DestPath;
}

/**
 * Writer context - when writing compiled output
 */
export interface WriterContext extends BaseCompilationContext {
  readonly stage: 'write';
  readonly compiledContent: CompiledContent;
  readonly outputPath: OutputPath;
  readonly overwrite?: boolean;
  /** @deprecated Use outputPath instead */
  readonly destPath?: DestPath;
}

/**
 * Union of all compilation contexts
 */
export type CompilationContext =
  | ParserContext
  | LinterContext
  | CompilerContext
  | WriterContext;

/**
 * Parsed document structure with branded types
 */
export interface ParsedDocument {
  readonly source: {
    readonly path: SourcePath;
    readonly content: RawContent;
    readonly frontmatter?: Record<string, unknown>;
  };
  readonly ast: {
    readonly blocks: Block[];
    readonly imports: Import[];
    readonly variables: Variable[];
    readonly markers: Marker[];
  };
  readonly errors?: ParseError[];
}

/**
 * Block structure with concrete types
 */
export interface Block {
  readonly name: BlockName;
  readonly content: MarkerContent;
  readonly properties: Property[];
  readonly line: number;
  readonly column: number;
  readonly isClosing?: boolean;
}

/**
 * Import structure
 */
export interface Import {
  readonly path: string; // Can be relative or aliased
  readonly blockName?: BlockName;
  readonly properties: Property[];
  readonly line: number;
  readonly column: number;
}

/**
 * Variable structure
 */
export interface Variable {
  readonly name: VariableName;
  readonly value?: string;
  readonly isSystem?: boolean; // System variables like $destination
  readonly line: number;
  readonly column: number;
}

/**
 * Property structure
 */
export interface Property {
  readonly name: PropertyName;
  readonly value?: string;
  readonly modifier?: '+' | '-' | '!';
  readonly scope?: ProviderId;
  /** @deprecated Use scope with ProviderId instead */
  readonly legacyScope?: DestinationId;
}

/**
 * Marker structure - generic marker representation
 */
export interface Marker {
  readonly type: 'block' | 'import' | 'variable' | 'raw';
  readonly content: MarkerContent;
  readonly line: number;
  readonly column: number;
}

/**
 * Parse error structure
 */
export interface ParseError {
  readonly message: string;
  readonly line?: number;
  readonly column?: number;
  readonly severity: 'error' | 'warning' | 'info';
  readonly code?: string;
}

/**
 * Linter configuration
 */
export interface LinterConfig {
  readonly requireRulesetsVersion?: boolean;
  readonly allowedProviders?: ProviderId[];
  readonly maxFileSize?: number;
  readonly maxBlockDepth?: number;
  readonly strictMode?: boolean;
  /** @deprecated Use allowedProviders instead */
  readonly allowedDestinations?: DestinationId[];
}

/**
 * Provider configuration
 */
export interface ProviderConfiguration {
  readonly id: ProviderId;
  readonly outputPath: OutputPath;
  readonly fileNaming?: string;
  readonly includeXml?: boolean;
  readonly template?: {
    readonly format: 'markdown' | 'xml' | 'json';
  };
  readonly validation?: {
    readonly allowedFormats: string[];
    readonly maxLength: number;
  };
  /** @deprecated Use id with ProviderId instead */
  readonly legacyId?: DestinationId;
  /** @deprecated Use outputPath with OutputPath instead */
  readonly legacyDestPath?: DestPath;
}

/**
 * Compiled document structure
 */
export interface CompiledDocument {
  readonly source: ParsedDocument['source'];
  readonly ast: ParsedDocument['ast'];
  readonly output: {
    readonly content: CompiledContent;
    readonly metadata: Record<string, unknown>;
  };
  readonly context: {
    readonly providerId: ProviderId;
    readonly config: Record<string, unknown>;
    /** @deprecated Use providerId instead */
    readonly destinationId?: DestinationId;
  };
}

/**
 * Type guards for context discrimination
 */
export function isParserContext(ctx: CompilationContext): ctx is ParserContext {
  return ctx.stage === 'parse';
}

export function isLinterContext(ctx: CompilationContext): ctx is LinterContext {
  return ctx.stage === 'lint';
}

export function isCompilerContext(ctx: CompilationContext): ctx is CompilerContext {
  return ctx.stage === 'compile';
}

export function isWriterContext(ctx: CompilationContext): ctx is WriterContext {
  return ctx.stage === 'write';
}

/**
 * Context creation helpers
 */
export function createParserContext(
  sourcePath: SourcePath,
  rawContent: RawContent,
  providerId: ProviderId,
  environment: CompilationEnvironment
): ParserContext {
  return {
    stage: 'parse',
    sourcePath,
    rawContent,
    providerId,
    environment,
    metadata: {},
  };
}

export function createLinterContext(
  parsedDoc: ParsedDocument,
  config: LinterConfig,
  providerId: ProviderId,
  environment: CompilationEnvironment
): LinterContext {
  return {
    stage: 'lint',
    sourcePath: parsedDoc.source.path,
    parsedDoc,
    config,
    providerId,
    environment,
    metadata: {},
  };
}

export function createCompilerContext(
  parsedDoc: ParsedDocument,
  outputPath: OutputPath,
  providerId: ProviderId,
  providerConfig: ProviderConfiguration,
  environment: CompilationEnvironment
): CompilerContext {
  return {
    stage: 'compile',
    sourcePath: parsedDoc.source.path,
    parsedDoc,
    outputPath,
    providerId,
    providerConfig,
    environment,
    metadata: {},
  };
}

export function createWriterContext(
  compiledContent: CompiledContent,
  outputPath: OutputPath,
  sourcePath: SourcePath,
  providerId: ProviderId,
  environment: CompilationEnvironment,
  overwrite = false
): WriterContext {
  return {
    stage: 'write',
    sourcePath,
    compiledContent,
    outputPath,
    providerId,
    environment,
    metadata: {},
    overwrite,
  };
}