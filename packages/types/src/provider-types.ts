// Provider type definitions for AI coding tools
// Comprehensive type system for defining AI tool providers and their capabilities

import type { JSONSchema7 } from './destination-plugin';

export type ProviderType =
  | 'cursor'
  | 'windsurf'
  | 'claude-code'
  | 'cline'
  | 'roo-code'
  | 'codex-cli'
  | 'codex-agent'
  | 'bolt'
  | 'v0'
  | 'replit'
  | 'github-copilot';

export type RuleActivationType =
  | 'always-apply' // Rules always active
  | 'auto-attached' // Automatically attached based on context
  | 'model-decision' // AI model decides when to apply
  | 'manual' // User manually activates
  | 'workspace' // Applied at workspace level
  | 'project'; // Applied at project level

export type ScopingMechanism =
  | 'global' // Global across all projects
  | 'workspace' // Workspace-specific
  | 'project' // Project-specific
  | 'directory' // Directory-specific
  | 'file'; // File-specific

export type OutputFormat =
  | 'markdown' // Pure markdown
  | 'xml' // XML tags in markdown
  | 'yaml' // YAML frontmatter + markdown
  | 'json' // JSON configuration
  | 'toml' // TOML configuration
  | 'jsonc'; // JSON with comments

export type IntegrationType =
  | 'ide' // Integrated development environment
  | 'cli' // Command line interface
  | 'web' // Web-based interface
  | 'extension' // Editor extension
  | 'agent' // Autonomous agent
  | 'api'; // API-based service

export interface ProviderCapabilities {
  /** Types of rule activation supported */
  ruleTypes: RuleActivationType[];

  /** Scoping mechanisms available */
  scopingMechanisms: ScopingMechanism[];

  /** Supported output formats */
  fileFormats: OutputFormat[];

  /** Character/token limits */
  characterLimits?: {
    perFile?: number;
    total?: number;
    perRule?: number;
  };

  /** File pattern support */
  filePatterns?: {
    supported: string[];
    ignored: string[];
  };

  /** Advanced features */
  features: {
    streaming?: boolean;
    multiFile?: boolean;
    realTime?: boolean;
    collaboration?: boolean;
    versioning?: boolean;
    templates?: boolean;
  };
}

export interface ProviderMetadata {
  /** Unique provider identifier */
  id: ProviderType;

  /** Human-readable name */
  name: string;

  /** Brief description */
  description: string;

  /** Provider version */
  version: string;

  /** Integration type */
  type: IntegrationType;

  /** Official website or documentation */
  website?: string;

  /** Repository URL */
  repository?: string;

  /** Maintainer information */
  maintainer?: {
    name: string;
    email?: string;
    url?: string;
  };

  /** License information */
  license?: string;
}

export interface ProviderConfiguration {
  /** Provider metadata */
  metadata: ProviderMetadata;

  /** Provider capabilities */
  capabilities: ProviderCapabilities;

  /** Configuration schema */
  configSchema: JSONSchema7;

  /** Default configuration values */
  defaultConfig: Record<string, unknown>;

  /** Destination-specific settings */
  destinationConfig?: {
    /** Default output directory */
    outputPath?: string;

    /** File naming pattern */
    fileNaming?: string;

    /** Template configuration */
    template?: {
      header?: string;
      footer?: string;
      format?: OutputFormat;
    };

    /** Validation rules */
    validation?: {
      required?: string[];
      maxLength?: number;
      allowedFormats?: OutputFormat[];
    };
  };
}

// Specific provider type definitions
export interface CursorProvider extends ProviderConfiguration {
  metadata: ProviderMetadata & {
    id: 'cursor';
    name: 'Cursor';
    type: 'ide';
  };
  capabilities: ProviderCapabilities & {
    ruleTypes: ['always-apply', 'auto-attached'];
    scopingMechanisms: ['global', 'project', 'directory'];
    fileFormats: ['markdown'];
  };
}

export interface WindsurfProvider extends ProviderConfiguration {
  metadata: ProviderMetadata & {
    id: 'windsurf';
    name: 'Windsurf';
    type: 'ide';
  };
  capabilities: ProviderCapabilities & {
    ruleTypes: ['always-apply', 'manual'];
    scopingMechanisms: ['global', 'project'];
    fileFormats: ['markdown'];
  };
}

export interface ClaudeCodeProvider extends ProviderConfiguration {
  metadata: ProviderMetadata & {
    id: 'claude-code';
    name: 'Claude Code';
    type: 'cli';
  };
  capabilities: ProviderCapabilities & {
    ruleTypes: ['always-apply', 'project', 'workspace'];
    scopingMechanisms: ['global', 'project', 'workspace'];
    fileFormats: ['markdown', 'xml'];
  };
}

export interface ClineProvider extends ProviderConfiguration {
  metadata: ProviderMetadata & {
    id: 'cline';
    name: 'Cline';
    type: 'extension';
  };
  capabilities: ProviderCapabilities & {
    ruleTypes: ['always-apply', 'manual'];
    scopingMechanisms: ['global', 'workspace', 'project'];
    fileFormats: ['markdown', 'xml'];
  };
}

export interface RooCodeProvider extends ProviderConfiguration {
  metadata: ProviderMetadata & {
    id: 'roo-code';
    name: 'Roo Code';
    type: 'extension';
  };
  capabilities: ProviderCapabilities & {
    ruleTypes: ['always-apply', 'auto-attached'];
    scopingMechanisms: ['project', 'directory'];
    fileFormats: ['markdown'];
  };
}

export interface CodexCliProvider extends ProviderConfiguration {
  metadata: ProviderMetadata & {
    id: 'codex-cli';
    name: 'OpenAI Codex CLI';
    type: 'cli';
  };
  capabilities: ProviderCapabilities & {
    ruleTypes: ['manual', 'model-decision'];
    scopingMechanisms: ['global', 'project'];
    fileFormats: ['markdown', 'json'];
  };
}

export interface CodexAgentProvider extends ProviderConfiguration {
  metadata: ProviderMetadata & {
    id: 'codex-agent';
    name: 'OpenAI Codex Agent';
    type: 'agent';
  };
  capabilities: ProviderCapabilities & {
    ruleTypes: ['model-decision', 'auto-attached'];
    scopingMechanisms: ['global', 'project'];
    fileFormats: ['json', 'yaml'];
  };
}

export interface BoltProvider extends ProviderConfiguration {
  metadata: ProviderMetadata & {
    id: 'bolt';
    name: 'Bolt';
    type: 'web';
  };
  capabilities: ProviderCapabilities & {
    ruleTypes: ['always-apply', 'manual'];
    scopingMechanisms: ['project'];
    fileFormats: ['markdown', 'json'];
  };
}

export interface V0Provider extends ProviderConfiguration {
  metadata: ProviderMetadata & {
    id: 'v0';
    name: 'v0 by Vercel';
    type: 'web';
  };
  capabilities: ProviderCapabilities & {
    ruleTypes: ['manual', 'model-decision'];
    scopingMechanisms: ['project'];
    fileFormats: ['markdown', 'json'];
  };
}

export interface ReplitProvider extends ProviderConfiguration {
  metadata: ProviderMetadata & {
    id: 'replit';
    name: 'Replit';
    type: 'web';
  };
  capabilities: ProviderCapabilities & {
    ruleTypes: ['always-apply', 'project'];
    scopingMechanisms: ['project', 'workspace'];
    fileFormats: ['markdown', 'json'];
  };
}

export interface GitHubCopilotProvider extends ProviderConfiguration {
  metadata: ProviderMetadata & {
    id: 'github-copilot';
    name: 'GitHub Copilot';
    type: 'extension';
  };
  capabilities: ProviderCapabilities & {
    ruleTypes: ['auto-attached', 'model-decision'];
    scopingMechanisms: ['global', 'workspace', 'project'];
    fileFormats: ['markdown', 'json'];
  };
}

// Union type for all providers
export type Provider =
  | CursorProvider
  | WindsurfProvider
  | ClaudeCodeProvider
  | ClineProvider
  | RooCodeProvider
  | CodexCliProvider
  | CodexAgentProvider
  | BoltProvider
  | V0Provider
  | ReplitProvider
  | GitHubCopilotProvider;

// Provider registry interface
export interface ProviderRegistry {
  /** Get all available providers */
  getAllProviders(): Provider[];

  /** Get provider by ID */
  getProvider(id: ProviderType): Provider | undefined;

  /** Get providers by type */
  getProvidersByType(type: IntegrationType): Provider[];

  /** Get providers supporting specific capabilities */
  getProvidersByCapability(capability: keyof ProviderCapabilities): Provider[];

  /** Register a new provider */
  registerProvider(provider: Provider): void;

  /** Validate provider configuration */
  validateProvider(provider: Provider): boolean;
}

// Factory function type for creating providers
export type ProviderFactory<T extends Provider = Provider> = (
  config?: Partial<T['defaultConfig']>
) => T;

// Provider middleware interface
export interface ProviderMiddleware<TInput = unknown, TOutput = unknown> {
  /** Unique middleware identifier */
  id: string;

  /** Process provider input before sending to destination */
  processInput?(input: TInput): Promise<TInput> | TInput;

  /** Process provider output after receiving from destination */
  processOutput?(output: TOutput): Promise<TOutput> | TOutput;

  /** Handle errors during provider operations */
  handleError?(
    error: Error,
    context: { providerId: ProviderType }
  ): Promise<Error> | Error;
}

// Advanced provider options
export interface ProviderOptions {
  /** Enable debug mode */
  debug?: boolean;

  /** Custom headers for API requests */
  headers?: Record<string, string>;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Retry configuration */
  retry?: {
    attempts: number;
    delay: number;
    backoff?: 'linear' | 'exponential';
  };

  /** Middleware stack */
  middleware?: ProviderMiddleware[];

  /** Custom proxy configuration */
  proxy?: {
    url: string;
    auth?: {
      username: string;
      password: string;
    };
  };
}
