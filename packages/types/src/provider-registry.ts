// Provider registry implementation
// Manages registration and discovery of AI tool providers

import type {
  BoltProvider,
  ClaudeCodeProvider,
  ClineProvider,
  CodexProvider,
  CursorProvider,
  GitHubCopilotProvider,
  IntegrationType,
  Provider,
  ProviderCapabilities,
  ProviderRegistry,
  ProviderType,
  ReplitProvider,
  RooCodeProvider,
  V0Provider,
  WindsurfProvider,
} from './provider-types';

// Default provider configurations
export const DEFAULT_PROVIDERS: Record<ProviderType, Provider> = {
  cursor: {
    metadata: {
      id: 'cursor',
      name: 'Cursor',
      description: 'AI-first code editor with intelligent pair programming',
      version: '0.1.0',
      type: 'ide',
      website: 'https://cursor.sh',
      repository: 'https://github.com/getcursor/cursor',
      maintainer: {
        name: 'Cursor Team',
        url: 'https://cursor.sh',
      },
      license: 'Proprietary',
    },
    capabilities: {
      ruleTypes: ['always-apply', 'auto-attached'],
      scopingMechanisms: ['global', 'project', 'directory'],
      fileFormats: ['markdown'],
      characterLimits: {
        perFile: 100_000,
        total: 500_000,
      },
      filePatterns: {
        supported: ['**/*.md', '**/*.mdc'],
        ignored: ['node_modules/**', '.git/**'],
      },
      features: {
        streaming: true,
        multiFile: true,
        realTime: true,
        collaboration: false,
        versioning: true,
        templates: true,
      },
    },
    configSchema: {
      type: 'object',
      properties: {
        alwaysApply: {
          type: 'boolean',
          description: 'Whether rules should always be applied',
          default: false,
        },
        outputPath: {
          type: 'string',
          description: 'Path to output directory',
          default: '.cursor/rules',
        },
        fileNaming: {
          type: 'string',
          description: 'File naming pattern',
          default: '{name}.mdc',
        },
      },
      required: [],
    },
    defaultConfig: {
      alwaysApply: false,
      outputPath: '.cursor/rules',
      fileNaming: '{name}.mdc',
    },
    destinationConfig: {
      outputPath: '.cursor/rules',
      fileNaming: '{name}.mdc',
      template: {
        format: 'markdown',
      },
      validation: {
        allowedFormats: ['markdown'],
        maxLength: 100_000,
      },
    },
  } as CursorProvider,

  windsurf: {
    metadata: {
      id: 'windsurf',
      name: 'Windsurf',
      description: 'AI-powered IDE with advanced code generation capabilities',
      version: '0.1.0',
      type: 'ide',
      website: 'https://windsurf.com',
      maintainer: {
        name: 'Windsurf Team',
      },
      license: 'Proprietary',
    },
    capabilities: {
      ruleTypes: ['always-apply', 'manual'],
      scopingMechanisms: ['global', 'project'],
      fileFormats: ['markdown'],
      characterLimits: {
        perFile: 50_000,
        total: 200_000,
      },
      features: {
        streaming: true,
        multiFile: true,
        realTime: false,
        collaboration: false,
        versioning: false,
        templates: true,
      },
    },
    configSchema: {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description: 'Path to output directory',
          default: '.windsurf',
        },
      },
      required: [],
    },
    defaultConfig: {
      outputPath: '.windsurf',
    },
    destinationConfig: {
      outputPath: '.windsurf',
      fileNaming: 'rules.md',
      template: {
        format: 'markdown',
      },
    },
  } as WindsurfProvider,

  'claude-code': {
    metadata: {
      id: 'claude-code',
      name: 'Claude Code',
      description:
        'Command-line interface for Claude AI with code-focused capabilities',
      version: '0.1.0',
      type: 'cli',
      website: 'https://claude.ai/code',
      repository: 'https://github.com/anthropics/claude-code',
      maintainer: {
        name: 'Anthropic',
        url: 'https://anthropic.com',
      },
      license: 'MIT',
    },
    capabilities: {
      ruleTypes: ['always-apply', 'project', 'workspace'],
      scopingMechanisms: ['global', 'project', 'workspace'],
      fileFormats: ['markdown', 'xml'],
      characterLimits: {
        total: 1_000_000,
      },
      features: {
        streaming: true,
        multiFile: true,
        realTime: true,
        collaboration: true,
        versioning: true,
        templates: true,
      },
    },
    configSchema: {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          description: 'Path to output file',
          default: 'CLAUDE.md',
        },
        includeXml: {
          type: 'boolean',
          description: 'Include XML tags in output',
          default: true,
        },
      },
      required: [],
    },
    defaultConfig: {
      outputPath: 'CLAUDE.md',
      includeXml: true,
    },
    destinationConfig: {
      outputPath: 'CLAUDE.md',
      template: {
        format: 'markdown',
      },
    },
  } as ClaudeCodeProvider,

  cline: {
    metadata: {
      id: 'cline',
      name: 'Cline',
      description: 'VS Code extension for autonomous coding agent',
      version: '0.1.0',
      type: 'extension',
      website: 'https://cline.bot',
      repository: 'https://github.com/saoudrizwan/claude-dev',
      maintainer: {
        name: 'Cline Team',
      },
      license: 'MIT',
    },
    capabilities: {
      ruleTypes: ['always-apply', 'manual'],
      scopingMechanisms: ['global', 'workspace', 'project'],
      fileFormats: ['markdown', 'xml'],
      features: {
        streaming: false,
        multiFile: true,
        realTime: false,
        collaboration: false,
        versioning: false,
        templates: false,
      },
    },
    configSchema: {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          default: '.cline/rules.md',
        },
      },
      required: [],
    },
    defaultConfig: {
      outputPath: '.cline/rules.md',
    },
  } as ClineProvider,

  'roo-code': {
    metadata: {
      id: 'roo-code',
      name: 'Roo Code',
      description: 'AI coding assistant extension for VS Code',
      version: '0.1.0',
      type: 'extension',
      website: 'https://roocode.dev',
      maintainer: {
        name: 'Roo Team',
      },
      license: 'MIT',
    },
    capabilities: {
      ruleTypes: ['always-apply', 'auto-attached'],
      scopingMechanisms: ['project', 'directory'],
      fileFormats: ['markdown'],
      features: {
        streaming: false,
        multiFile: false,
        realTime: false,
        collaboration: false,
        versioning: false,
        templates: false,
      },
    },
    configSchema: {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          default: '.roo/rules.md',
        },
      },
      required: [],
    },
    defaultConfig: {
      outputPath: '.roo/rules.md',
    },
  } as RooCodeProvider,

  codex: {
    metadata: {
      id: 'codex',
      name: 'OpenAI Codex',
      description: 'AI-powered code assistant with CLI and web agent support',
      version: '0.1.0',
      type: 'cli',
      website: 'https://openai.com/codex',
      maintainer: {
        name: 'OpenAI',
      },
      license: 'MIT',
    },
    capabilities: {
      ruleTypes: ['manual', 'model-decision', 'auto-attached'],
      scopingMechanisms: ['global', 'project'],
      fileFormats: ['markdown', 'json', 'yaml'],
      features: {
        streaming: true,
        multiFile: true,
        realTime: true,
        collaboration: false,
        versioning: false,
        templates: true,
      },
    },
    configSchema: {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          default: 'AGENTS.md',
        },
      },
    },
    defaultConfig: {
      outputPath: 'AGENTS.md',
    },
  } as CodexProvider,

  bolt: {
    metadata: {
      id: 'bolt',
      name: 'Bolt',
      description: 'AI-powered web development platform',
      version: '0.1.0',
      type: 'web',
      website: 'https://bolt.new',
      maintainer: {
        name: 'StackBlitz',
      },
      license: 'Proprietary',
    },
    capabilities: {
      ruleTypes: ['always-apply', 'manual'],
      scopingMechanisms: ['project'],
      fileFormats: ['markdown', 'json'],
      features: {
        streaming: true,
        multiFile: true,
        realTime: true,
        collaboration: true,
        versioning: false,
        templates: true,
      },
    },
    configSchema: {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          default: 'bolt-rules.md',
        },
      },
    },
    defaultConfig: {
      outputPath: 'bolt-rules.md',
    },
  } as BoltProvider,

  v0: {
    metadata: {
      id: 'v0',
      name: 'v0 by Vercel',
      description: 'AI-powered UI generation platform',
      version: '0.1.0',
      type: 'web',
      website: 'https://v0.dev',
      maintainer: {
        name: 'Vercel',
      },
      license: 'Proprietary',
    },
    capabilities: {
      ruleTypes: ['manual', 'model-decision'],
      scopingMechanisms: ['project'],
      fileFormats: ['markdown', 'json'],
      features: {
        streaming: true,
        multiFile: false,
        realTime: false,
        collaboration: false,
        versioning: false,
        templates: true,
      },
    },
    configSchema: {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          default: 'v0-rules.md',
        },
      },
    },
    defaultConfig: {
      outputPath: 'v0-rules.md',
    },
  } as V0Provider,

  replit: {
    metadata: {
      id: 'replit',
      name: 'Replit',
      description: 'Collaborative online IDE with AI assistance',
      version: '0.1.0',
      type: 'web',
      website: 'https://replit.com',
      maintainer: {
        name: 'Replit',
      },
      license: 'Proprietary',
    },
    capabilities: {
      ruleTypes: ['always-apply', 'project'],
      scopingMechanisms: ['project', 'workspace'],
      fileFormats: ['markdown', 'json'],
      features: {
        streaming: false,
        multiFile: true,
        realTime: true,
        collaboration: true,
        versioning: true,
        templates: false,
      },
    },
    configSchema: {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          default: '.replit/rules.md',
        },
      },
    },
    defaultConfig: {
      outputPath: '.replit/rules.md',
    },
  } as ReplitProvider,

  'github-copilot': {
    metadata: {
      id: 'github-copilot',
      name: 'GitHub Copilot',
      description: 'AI pair programmer for code completion and generation',
      version: '0.1.0',
      type: 'extension',
      website: 'https://github.com/features/copilot',
      maintainer: {
        name: 'GitHub',
      },
      license: 'Proprietary',
    },
    capabilities: {
      ruleTypes: ['auto-attached', 'model-decision'],
      scopingMechanisms: ['global', 'workspace', 'project'],
      fileFormats: ['markdown', 'json'],
      features: {
        streaming: true,
        multiFile: false,
        realTime: true,
        collaboration: false,
        versioning: false,
        templates: false,
      },
    },
    configSchema: {
      type: 'object',
      properties: {
        outputPath: {
          type: 'string',
          default: '.github/copilot-rules.md',
        },
      },
    },
    defaultConfig: {
      outputPath: '.github/copilot-rules.md',
    },
  } as GitHubCopilotProvider,
};

/**
 * Default implementation of the ProviderRegistry interface
 */
export class DefaultProviderRegistry implements ProviderRegistry {
  private providers: Map<ProviderType, Provider> = new Map();

  constructor() {
    // Initialize with default providers
    Object.entries(DEFAULT_PROVIDERS).forEach(([id, provider]) => {
      this.providers.set(id as ProviderType, provider);
    });
  }

  getAllProviders(): Provider[] {
    return Array.from(this.providers.values());
  }

  getProvider(id: ProviderType): Provider | undefined {
    return this.providers.get(id);
  }

  getProvidersByType(type: IntegrationType): Provider[] {
    return this.getAllProviders().filter(
      (provider) => provider.metadata.type === type
    );
  }

  getProvidersByCapability(capability: keyof ProviderCapabilities): Provider[] {
    return this.getAllProviders().filter(
      (provider) => provider.capabilities[capability] !== undefined
    );
  }

  registerProvider(provider: Provider): void {
    if (this.validateProvider(provider)) {
      this.providers.set(provider.metadata.id, provider);
    } else {
      throw new Error(
        `Invalid provider configuration for ${provider.metadata.id}`
      );
    }
  }

  validateProvider(provider: Provider): boolean {
    // Basic validation
    if (!(provider.metadata?.id && provider.metadata?.name)) {
      return false;
    }

    if (
      !(provider.capabilities && Array.isArray(provider.capabilities.ruleTypes))
    ) {
      return false;
    }

    if (!provider.configSchema || typeof provider.configSchema !== 'object') {
      return false;
    }

    return true;
  }
}

// Singleton instance
export const providerRegistry = new DefaultProviderRegistry();

// Utility functions
export function getProviderById(id: ProviderType): Provider | undefined {
  return providerRegistry.getProvider(id);
}

export function getAllProviders(): Provider[] {
  return providerRegistry.getAllProviders();
}

export function getProvidersByType(type: IntegrationType): Provider[] {
  return providerRegistry.getProvidersByType(type);
}

export function isProviderSupported(id: string): id is ProviderType {
  return id in DEFAULT_PROVIDERS;
}
