/**
 * Provider types for Rulesets - Modern provider-based architecture
 * Replaces destination terminology with provider terminology
 */

import type {
  ProviderId,
  OutputPath,
  SourcePath,
  CompiledContent,
  RawContent,
  Version,
  BlockName,
  PropertyName,
} from './brands';

/**
 * Core provider interface - represents a tool that can compile and use rules
 */
export interface Provider {
  readonly id: ProviderId;
  readonly name: string;
  readonly version: Version;
  readonly description?: string;
  readonly website?: string;
  readonly type: ProviderType;
  readonly config: ProviderConfig;
  readonly capabilities: ProviderCapabilities;
}

/**
 * Provider types categorized by tool nature
 */
export type ProviderType =
  | 'ide'           // VS Code extensions, IDEs
  | 'cli'           // Command line tools
  | 'web'           // Web-based tools
  | 'agent'         // AI agents
  | 'editor'        // Text editors
  | 'platform';     // Development platforms

/**
 * Provider configuration for compilation
 */
export interface ProviderConfig {
  readonly outputPath: OutputPath;
  readonly fileNaming?: FileNamingStrategy;
  readonly format: OutputFormat;
  readonly template?: TemplateConfig;
  readonly validation?: ValidationConfig;
  readonly features?: ProviderFeatures;
}

/**
 * Provider capabilities - what the provider can handle
 */
export interface ProviderCapabilities {
  readonly supportsBlocks: boolean;
  readonly supportsImports: boolean;
  readonly supportsVariables: boolean;
  readonly supportsXml: boolean;
  readonly supportsMarkdown: boolean;
  readonly maxFileSize?: number;
  readonly allowedFormats: OutputFormat[];
  readonly requiresSpecialHandling?: string[];
}

/**
 * Output format types supported by providers
 */
export type OutputFormat = 
  | 'markdown'
  | 'xml'
  | 'json'
  | 'yaml'
  | 'text'
  | 'html'
  | 'mixed';

/**
 * File naming strategies for output files
 */
export type FileNamingStrategy =
  | 'preserve'      // Keep original name
  | 'transform'     // Apply transformation rules
  | 'template'      // Use template pattern
  | 'custom';       // Custom function

/**
 * Template configuration for providers
 */
export interface TemplateConfig {
  readonly format: OutputFormat;
  readonly header?: string;
  readonly footer?: string;
  readonly wrapper?: {
    readonly before: string;
    readonly after: string;
  };
  readonly blockWrapper?: {
    readonly open: string;
    readonly close: string;
  };
}

/**
 * Validation configuration for providers
 */
export interface ValidationConfig {
  readonly strictMode?: boolean;
  readonly allowedBlocks?: BlockName[];
  readonly forbiddenBlocks?: BlockName[];
  readonly maxNestingDepth?: number;
  readonly requireVersion?: boolean;
  readonly customRules?: ValidationRule[];
}

/**
 * Custom validation rule
 */
export interface ValidationRule {
  readonly name: string;
  readonly description: string;
  readonly severity: 'error' | 'warning' | 'info';
  readonly pattern?: RegExp;
  readonly validator?: (content: string) => boolean;
}

/**
 * Provider-specific features
 */
export interface ProviderFeatures {
  readonly autoFormat?: boolean;
  readonly livePreview?: boolean;
  readonly syntaxHighlighting?: boolean;
  readonly codeCompletion?: boolean;
  readonly errorReporting?: boolean;
  readonly customProperties?: PropertyName[];
}

/**
 * Provider plugin interface - for extensibility
 */
export interface ProviderPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: Version;
  readonly provider: Provider;
  readonly hooks: ProviderHooks;
}

/**
 * Provider hooks for compilation pipeline
 */
export interface ProviderHooks {
  readonly beforeParse?: (content: RawContent) => RawContent;
  readonly afterParse?: (ast: any) => any;
  readonly beforeCompile?: (ast: any) => any;
  readonly afterCompile?: (content: CompiledContent) => CompiledContent;
  readonly beforeWrite?: (content: CompiledContent, path: OutputPath) => void;
  readonly afterWrite?: (path: OutputPath) => void;
}

/**
 * Provider compilation context
 */
export interface ProviderCompilationContext {
  readonly provider: Provider;
  readonly sourcePath: SourcePath;
  readonly outputPath: OutputPath;
  readonly variables: Record<string, unknown>;
  readonly metadata: Record<string, unknown>;
}

/**
 * Provider compilation result
 */
export interface ProviderCompilationResult {
  readonly success: boolean;
  readonly content?: CompiledContent;
  readonly errors: ProviderError[];
  readonly warnings: ProviderWarning[];
  readonly metadata: Record<string, unknown>;
  readonly stats: CompilationStats;
}

/**
 * Provider error types
 */
export interface ProviderError {
  readonly type: 'validation' | 'compilation' | 'output' | 'configuration';
  readonly message: string;
  readonly code?: string;
  readonly line?: number;
  readonly column?: number;
  readonly context?: Record<string, unknown>;
}

/**
 * Provider warning types
 */
export interface ProviderWarning {
  readonly type: 'deprecated' | 'performance' | 'compatibility' | 'style';
  readonly message: string;
  readonly suggestion?: string;
  readonly line?: number;
  readonly column?: number;
}

/**
 * Compilation statistics
 */
export interface CompilationStats {
  readonly duration: number; // milliseconds
  readonly inputSize: number; // bytes
  readonly outputSize: number; // bytes
  readonly blocksProcessed: number;
  readonly importsResolved: number;
  readonly variablesSubstituted: number;
}

// WriteResult is imported from destination-plugin.ts to avoid duplication
// Export it here for convenience
export type { WriteResult } from './destination-plugin';
export { hasGeneratedPaths } from './destination-plugin';

/**
 * Built-in provider definitions
 */
export const BUILT_IN_PROVIDERS: Record<string, Provider> = {
  cursor: {
    id: 'cursor' as ProviderId,
    name: 'Cursor',
    version: '1.0.0' as Version,
    description: 'Cursor IDE with AI assistant',
    website: 'https://cursor.sh',
    type: 'ide',
    config: {
      outputPath: '.cursor/rules' as OutputPath,
      format: 'markdown',
      fileNaming: 'transform',
    },
    capabilities: {
      supportsBlocks: true,
      supportsImports: true,
      supportsVariables: true,
      supportsXml: false,
      supportsMarkdown: true,
      allowedFormats: ['markdown'],
    },
  },
  'claude-code': {
    id: 'claude-code' as ProviderId,
    name: 'Claude Code',
    version: '1.0.0' as Version,
    description: 'Claude Code CLI tool',
    website: 'https://claude.ai/code',
    type: 'cli',
    config: {
      outputPath: 'CLAUDE.md' as OutputPath,
      format: 'markdown',
      fileNaming: 'preserve',
    },
    capabilities: {
      supportsBlocks: true,
      supportsImports: true,
      supportsVariables: true,
      supportsXml: true,
      supportsMarkdown: true,
      allowedFormats: ['markdown', 'mixed'],
    },
  },
  windsurf: {
    id: 'windsurf' as ProviderId,
    name: 'Windsurf',
    version: '1.0.0' as Version,
    description: 'Windsurf AI-powered IDE',
    type: 'ide',
    config: {
      outputPath: '.windsurf/rules' as OutputPath,
      format: 'markdown',
      fileNaming: 'transform',
    },
    capabilities: {
      supportsBlocks: true,
      supportsImports: true,
      supportsVariables: true,
      supportsXml: false,
      supportsMarkdown: true,
      allowedFormats: ['markdown'],
    },
  },
  'codex-cli': {
    id: 'codex-cli' as ProviderId,
    name: 'OpenAI Codex CLI',
    version: '1.0.0' as Version,
    description: 'OpenAI Codex CLI assistant',
    website: 'https://github.com/openai/codex',
    type: 'cli',
    config: {
      outputPath: 'AGENTS.md' as OutputPath,
      format: 'markdown',
      fileNaming: 'preserve',
    },
    capabilities: {
      supportsBlocks: true,
      supportsImports: true,
      supportsVariables: true,
      supportsXml: false,
      supportsMarkdown: true,
      allowedFormats: ['markdown'],
    },
  },
  amp: {
    id: 'amp' as ProviderId,
    name: 'Amp',
    version: '1.0.0' as Version,
    description: 'Amp AI assistant',
    website: 'https://amp.dev',
    type: 'agent',
    config: {
      outputPath: 'AGENT.md' as OutputPath,
      format: 'markdown',
      fileNaming: 'preserve',
    },
    capabilities: {
      supportsBlocks: true,
      supportsImports: true,
      supportsVariables: true,
      supportsXml: false,
      supportsMarkdown: true,
      allowedFormats: ['markdown'],
    },
  },
} as const;

/**
 * Type guards for provider types
 */
export function isProvider(value: unknown): value is Provider {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'type' in value &&
    'config' in value &&
    'capabilities' in value
  );
}

export function isProviderPlugin(value: unknown): value is ProviderPlugin {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'provider' in value &&
    'hooks' in value &&
    isProvider((value as any).provider)
  );
}

/**
 * Provider utility functions
 */
export function getProviderById(id: ProviderId): Provider | undefined {
  return Object.values(BUILT_IN_PROVIDERS).find(provider => provider.id === id);
}

export function getProvidersByType(type: ProviderType): Provider[] {
  return Object.values(BUILT_IN_PROVIDERS).filter(provider => provider.type === type);
}

export function validateProviderConfig(config: ProviderConfig): ProviderError[] {
  const errors: ProviderError[] = [];

  if (!config.outputPath) {
    errors.push({
      type: 'configuration',
      message: 'outputPath is required',
      code: 'MISSING_OUTPUT_PATH',
    });
  }

  if (!config.format) {
    errors.push({
      type: 'configuration',
      message: 'format is required',
      code: 'MISSING_FORMAT',
    });
  }

  return errors;
}

/**
 * Backwards compatibility layer
 * @deprecated These will be removed in v1.0
 */

// Legacy destination types mapped to provider types
export type DestinationPlugin = ProviderPlugin;
export type DestinationConfig = ProviderConfig;
export type DestinationCapabilities = ProviderCapabilities;

/**
 * Migration helpers for backwards compatibility
 */
export function migrateDestinationToProvider(
  legacyConfig: Record<string, unknown>
): ProviderConfig {
  // Build new config object instead of mutating
  const outputPath = ('destPath' in legacyConfig 
    ? legacyConfig.destPath as OutputPath
    : 'destinationPath' in legacyConfig 
    ? legacyConfig.destinationPath as OutputPath
    : '' as OutputPath);

  const format = (legacyConfig.format as OutputFormat) || 'markdown';

  const migrated: ProviderConfig = {
    outputPath,
    format,
    fileNaming: legacyConfig.fileNaming as any,
    template: legacyConfig.template as any,
    validation: legacyConfig.validation as any,
    features: legacyConfig.features as any,
  };

  return migrated;
}

export function isLegacyDestinationConfig(config: unknown): boolean {
  return (
    typeof config === 'object' &&
    config !== null &&
    ('destPath' in config || 'destinationPath' in config || 'destination' in config)
  );
}

/**
 * Default provider configurations for common tools
 */
export const DEFAULT_PROVIDER_CONFIGS: Record<string, Partial<ProviderConfig>> = {
  cursor: {
    outputPath: '.cursor/rules' as OutputPath,
    format: 'markdown',
    fileNaming: 'transform',
  },
  'claude-code': {
    outputPath: 'CLAUDE.md' as OutputPath,
    format: 'markdown',
    fileNaming: 'preserve',
  },
  windsurf: {
    outputPath: '.windsurf/rules' as OutputPath,
    format: 'markdown',
    fileNaming: 'transform',
  },
  'codex-cli': {
    outputPath: 'AGENTS.md' as OutputPath,
    format: 'markdown',
    fileNaming: 'preserve',
  },
  cline: {
    outputPath: '.cline/rules' as OutputPath,
    format: 'markdown',
    fileNaming: 'transform',
  },
  'roo-code': {
    outputPath: '.roo/rules.md' as OutputPath,
    format: 'markdown',
    fileNaming: 'preserve',
  },
  amp: {
    outputPath: 'AGENT.md' as OutputPath,
    format: 'markdown',
    fileNaming: 'preserve',
  },
} as const;