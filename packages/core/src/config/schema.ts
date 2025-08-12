/**
 * JSON Schema definitions for Rulesets configuration validation
 * Supports comprehensive validation for both JSONC and TOML formats
 */

import type { JSONSchemaType } from 'ajv';
import type { RulesetConfig, ProviderConfig, GitignoreConfig } from './types';

/**
 * Provider configuration schema
 */
export const providerConfigSchema: JSONSchemaType<ProviderConfig> = {
  type: 'object',
  properties: {
    enabled: {
      type: 'boolean',
      nullable: true,
      description: 'Whether this provider is enabled',
    },
    outputPath: {
      type: 'string',
      nullable: true,
      description: 'Output path for this provider (overrides default)',
    },
    options: {
      type: 'object',
      nullable: true,
      additionalProperties: true,
      description: 'Provider-specific options',
    },
  },
  additionalProperties: false,
};

/**
 * Gitignore configuration schema
 */
export const gitignoreConfigSchema: JSONSchemaType<GitignoreConfig> = {
  type: 'object',
  properties: {
    enabled: {
      type: 'boolean',
      nullable: true,
      description: 'Whether gitignore management is enabled',
    },
    keep: {
      type: 'array',
      items: { type: 'string' },
      nullable: true,
      description: 'Files to keep in gitignore despite being generated',
    },
    ignore: {
      type: 'array',
      items: { type: 'string' },
      nullable: true,
      description: 'Additional patterns to always ignore',
    },
    options: {
      type: 'object',
      properties: {
        comment: {
          type: 'string',
          nullable: true,
          description: 'Custom comment for managed block',
        },
        sort: {
          type: 'boolean',
          nullable: true,
          description: 'Whether to sort entries alphabetically',
        },
      },
      additionalProperties: false,
      nullable: true,
    },
  },
  additionalProperties: false,
};

/**
 * Main Rulesets configuration schema
 */
export const rulesetConfigSchema: JSONSchemaType<RulesetConfig> = {
  type: 'object',
  properties: {
    providers: {
      type: 'object',
      patternProperties: {
        '^[a-zA-Z][a-zA-Z0-9-]*$': providerConfigSchema,
      },
      additionalProperties: false,
      nullable: true,
      description: 'Provider-specific settings',
    },
    gitignore: {
      ...gitignoreConfigSchema,
      nullable: true,
      description: 'Gitignore management settings',
    },
    defaultProviders: {
      type: 'array',
      items: {
        type: 'string',
        pattern: '^[a-zA-Z][a-zA-Z0-9-]*$',
      },
      nullable: true,
      description: 'Default providers to enable when none specified',
    },
    strict: {
      type: 'boolean',
      nullable: true,
      description: 'Strict mode - fail on warnings',
    },
    outputDirectory: {
      type: 'string',
      nullable: true,
      pattern: '^[^\\0]+$', // Any non-null string
      description: 'Output directory for compiled rules',
    },
    options: {
      type: 'object',
      nullable: true,
      additionalProperties: true,
      description: 'Global configuration options',
    },
  },
  additionalProperties: false,
};

/**
 * Known provider IDs for validation
 */
export const KNOWN_PROVIDERS = [
  'cursor',
  'claude-code',
  'windsurf',
  'roo-code',
  'cline',
  'codex-cli',
  'codex-agent',
] as const;

/**
 * Enhanced schema with provider validation
 */
export const rulesetConfigSchemaEnhanced: JSONSchemaType<RulesetConfig> = {
  ...rulesetConfigSchema,
  properties: {
    ...rulesetConfigSchema.properties,
    providers: {
      type: 'object',
      patternProperties: {
        [`^(${KNOWN_PROVIDERS.join('|')}|[a-zA-Z][a-zA-Z0-9-]*)$`]: providerConfigSchema,
      },
      additionalProperties: false,
      nullable: true,
      description: 'Provider-specific settings (validates known providers)',
    },
    defaultProviders: {
      type: 'array',
      items: {
        type: 'string',
        enum: [...KNOWN_PROVIDERS] as unknown as string[],
      },
      nullable: true,
      description: 'Default providers to enable (must be known providers)',
    },
  },
};

/**
 * Schema for environment variable overrides
 * Supports RULESETS_PROVIDERS_CURSOR_ENABLED=true syntax
 */
export const envOverridePatterns = [
  // Provider settings: RULESETS_PROVIDERS_<PROVIDER>_<SETTING>
  {
    pattern: /^RULESETS_PROVIDERS_([A-Z][A-Z0-9_]*)_ENABLED$/,
    path: (match: RegExpMatchArray) => ['providers', match[1].toLowerCase().replace(/_/g, '-'), 'enabled'],
    type: 'boolean',
  },
  {
    pattern: /^RULESETS_PROVIDERS_([A-Z][A-Z0-9_]*)_OUTPUT_PATH$/,
    path: (match: RegExpMatchArray) => ['providers', match[1].toLowerCase().replace(/_/g, '-'), 'outputPath'],
    type: 'string',
  },
  // Gitignore settings: RULESETS_GITIGNORE_<SETTING>
  {
    pattern: /^RULESETS_GITIGNORE_ENABLED$/,
    path: () => ['gitignore', 'enabled'],
    type: 'boolean',
  },
  // Global settings: RULESETS_<SETTING>
  {
    pattern: /^RULESETS_STRICT$/,
    path: () => ['strict'],
    type: 'boolean',
  },
  {
    pattern: /^RULESETS_OUTPUT_DIRECTORY$/,
    path: () => ['outputDirectory'],
    type: 'string',
  },
] as const;

/**
 * Validation error messages
 */
export const ValidationMessages = {
  INVALID_PROVIDER_ID: 'Provider ID must start with a letter and contain only letters, numbers, and hyphens',
  UNKNOWN_PROVIDER: 'Unknown provider. Known providers are: cursor, claude-code, windsurf, roo-code, cline, codex-cli, codex-agent',
  INVALID_OUTPUT_PATH: 'Output path cannot be empty',
  INVALID_GITIGNORE_PATTERN: 'Gitignore pattern must be a valid glob pattern',
  EMPTY_DEFAULT_PROVIDERS: 'Default providers array cannot be empty',
  INVALID_ENV_OVERRIDE: 'Invalid environment variable override format',
} as const;