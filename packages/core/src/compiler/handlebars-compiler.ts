// TLDR: Handlebars-based compiler for Rulesets (ruleset-v0.2-beta+)
// TLDR: Implements full marker processing with Handlebars templating engine

import Handlebars from 'handlebars';
import type { CompiledDoc, ParsedDoc } from '../interfaces';
import { getChildLogger } from '../utils/logger';

const pinoLogger = getChildLogger('handlebars-compiler');

// Regex constants at top level for performance
const FILE_EXTENSION_REGEX = /\.[^.]*$/;
const BLOCK_HELPER_REGEX = /\{\{#([a-zA-Z][a-zA-Z0-9-]*)/g;

/**
 * Context provided to Handlebars templates during compilation
 */
export interface RulesetContext {
  // Provider information (updated from "destination" terminology)
  provider: {
    id: string; // "cursor"
    name: string; // "Cursor"
    type: string; // "ide"
    capabilities: string[]; // ["workspaces", "git"]
  };

  // File metadata
  file: {
    name: string; // "coding-standards"
    version: string; // "1.0.0"
    path: string; // ".ruleset/src/coding-standards.md"
    frontmatter: Record<string, unknown>; // Full frontmatter object
  };

  // User-defined variables from frontmatter
  project?: {
    name?: string;
    language?: string;
    framework?: string;
    [key: string]: unknown;
  };

  // System variables
  timestamp: string;
  rulesetVersion: string;

  // Additional frontmatter variables
  [key: string]: unknown;
}

/**
 * Options for section helpers (formerly block helpers)
 */
interface SectionOptions extends Handlebars.HelperOptions {
  hash: {
    include?: string; // "cursor,windsurf"
    exclude?: string; // "claude-code"
    format?: 'xml' | 'heading' | 'raw';
  };
}

/**
 * Handlebars-based Rulesets compiler
 */
export class HandlebarsRulesetCompiler {
  private hbs: typeof Handlebars;
  private reservedHelpers = new Set([
    'if',
    'unless',
    'each',
    'with',
    'lookup',
    'log',
    'switch-provider',
    'case',
    'default',
  ]);

  constructor() {
    this.hbs = Handlebars.create();
    this.registerCoreHelpers();
    this.setupPartialResolver();
  }

  /**
   * Compiles a parsed document using Handlebars
   */
  compile(
    parsedDoc: ParsedDoc,
    providerId: string,
    projectConfig: Record<string, unknown> = {}
  ): CompiledDoc {
    const { source } = parsedDoc;

    // Handle empty files
    if (!source.content.trim()) {
      pinoLogger.warn({ path: source.path }, 'Compiling empty source file');
    }

    // Extract body content (everything after frontmatter)
    const bodyContent = this.extractBodyContent(
      source.content,
      source.frontmatter
    );

    try {
      // Pre-register section helpers by scanning the template
      this.preRegisterSectionHelpers(bodyContent);

      // Build compilation context
      const context = this.buildContext(source, providerId, projectConfig);

      // Compile template with Handlebars
      const template = this.hbs.compile(bodyContent, {
        noEscape: true, // Preserve markdown formatting
        strict: false, // Allow undefined variables for flexibility
      });

      const compiledContent = template(context);

      // Build the compiled document
      const compiledDoc: CompiledDoc = {
        source: {
          path: source.path,
          content: source.content,
          frontmatter: source.frontmatter,
        },
        ast: {
          blocks: [], // TODO: Parse Handlebars AST in future version
          imports: [],
          variables: [],
          markers: [],
        },
        output: {
          content: compiledContent,
          metadata: {
            title: source.frontmatter?.title,
            description: source.frontmatter?.description,
            version: source.frontmatter?.version,
            provider: providerId,
          },
        },
        context: {
          destinationId: providerId, // Backwards compatibility
          config: {
            ...projectConfig,
            provider: providerId,
          },
        },
      };

      return compiledDoc;
    } catch (error) {
      pinoLogger.error(
        { error, path: source.path },
        'Failed to compile template'
      );
      throw new Error(
        `Handlebars compilation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extracts body content by removing frontmatter
   */
  private extractBodyContent(
    content: string,
    frontmatter?: Record<string, unknown>
  ): string {
    if (!frontmatter) {
      return content;
    }

    const lines = content.split('\n');
    let frontmatterEnd = -1;

    if (lines[0] === '---') {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i] === '---') {
          frontmatterEnd = i;
          break;
        }
      }

      if (frontmatterEnd > 0) {
        return lines
          .slice(frontmatterEnd + 1)
          .join('\n')
          .trim();
      }
    }

    return content;
  }

  /**
   * Builds the Handlebars context for template compilation
   */
  private buildContext(
    source: {
      path?: string;
      content: string;
      frontmatter?: Record<string, unknown>;
    },
    providerId: string,
    projectConfig: Record<string, unknown>
  ): RulesetContext {
    const frontmatter = source.frontmatter || {};

    // Extract file name from path or frontmatter
    const fileName =
      (frontmatter.name as string) ||
      (source.path
        ? source.path.split('/').pop()?.replace(FILE_EXTENSION_REGEX, '') ||
          'unnamed'
        : 'unnamed');

    return {
      provider: {
        id: providerId,
        name: this.getProviderDisplayName(providerId),
        type: this.getProviderType(providerId),
        capabilities: this.getProviderCapabilities(providerId),
      },
      file: {
        name: fileName,
        version: (frontmatter.version as string) || '1.0.0',
        path: source.path || '',
        frontmatter,
      },
      project: (frontmatter.project as Record<string, unknown>) || {},
      timestamp: new Date().toISOString(),
      rulesetVersion: '0.2.0',
      ...frontmatter, // Spread all frontmatter variables
      ...projectConfig, // Allow project config to override
    };
  }

  /**
   * Gets display name for a provider
   */
  private getProviderDisplayName(providerId: string): string {
    const displayNames: Record<string, string> = {
      cursor: 'Cursor',
      windsurf: 'Windsurf',
      'claude-code': 'Claude Code',
      'roo-code': 'Roo Code',
      cline: 'Cline',
      codex: 'OpenAI Codex',
    };
    return displayNames[providerId] || providerId;
  }

  /**
   * Gets provider type
   */
  private getProviderType(providerId: string): string {
    const types: Record<string, string> = {
      cursor: 'ide',
      windsurf: 'ide',
      'claude-code': 'cli',
      'roo-code': 'extension',
      cline: 'extension',
      codex: 'cli',
    };
    return types[providerId] || 'unknown';
  }

  /**
   * Gets provider capabilities
   */
  private getProviderCapabilities(providerId: string): string[] {
    const capabilities: Record<string, string[]> = {
      cursor: ['workspaces', 'git', 'debugging'],
      windsurf: ['workspaces', 'git', 'debugging'],
      'claude-code': ['cli', 'git', 'terminal'],
      'roo-code': ['workspaces'],
      cline: ['workspaces'],
      codex: ['cli'],
    };
    return capabilities[providerId] || [];
  }

  /**
   * Registers core Handlebars helpers
   */
  private registerCoreHelpers(): void {
    // Provider conditional helpers
    this.hbs.registerHelper('if-provider', this.createIfProviderHelper());
    this.hbs.registerHelper(
      'unless-provider',
      this.createUnlessProviderHelper()
    );

    // Provider switch helpers
    this.hbs.registerHelper('switch-provider', this.createSwitchProviderHelper());
    this.hbs.registerHelper('case', this.createCaseHelper());
    this.hbs.registerHelper('default', this.createDefaultHelper());

    // Setup missing helper handler for freeform sections
    this.hbs.registerHelper('helperMissing', this.createMissingHelperHandler());
  }

  /**
   * Pre-registers a section helper for a given name
   */
  private registerSectionHelper(name: string): void {
    if (!(this.reservedHelpers.has(name) || this.hbs.helpers[name])) {
      this.hbs.registerHelper(name, this.createSectionHelper(name));
    }
  }

  /**
   * Scans template content and pre-registers section helpers
   */
  private preRegisterSectionHelpers(content: string): void {
    // Simple regex to find block helpers: {{#name}} or {{#name arg1 arg2}}
    let match: RegExpExecArray | null = BLOCK_HELPER_REGEX.exec(content);

    while (match !== null) {
      const helperName = match[1];
      if (helperName) {
        this.registerSectionHelper(helperName);
      }
      match = BLOCK_HELPER_REGEX.exec(content);
    }
  }

  /**
   * Creates the if-provider helper
   */
  private createIfProviderHelper() {
    return function (
      this: RulesetContext,
      providers: string,
      options: Handlebars.HelperOptions
    ): string {
      const allowedProviders = providers.split(',').map((p) => p.trim());

      if (allowedProviders.includes(this.provider.id)) {
        return options.fn(this);
      }

      return options.inverse ? options.inverse(this) : '';
    };
  }

  /**
   * Creates the unless-provider helper
   */
  private createUnlessProviderHelper() {
    return function (
      this: RulesetContext,
      providers: string,
      options: Handlebars.HelperOptions
    ): string {
      const excludedProviders = providers.split(',').map((p) => p.trim());

      if (!excludedProviders.includes(this.provider.id)) {
        return options.fn(this);
      }

      return options.inverse ? options.inverse(this) : '';
    };
  }

  /**
   * Creates the switch-provider helper
   * Sets up a switch context for case/default helpers to use
   */
  private createSwitchProviderHelper() {
    return function (
      this: RulesetContext,
      options: Handlebars.HelperOptions
    ): string {
      // Create a new context with switch state
      const switchContext = {
        ...this,
        __switchProvider: {
          currentProviderId: this.provider.id,
          matched: false,
        },
      };

      // Execute the block with the switch context
      const result = options.fn(switchContext);

      return result;
    };
  }

  /**
   * Creates the case helper
   * Matches against the current provider ID in a switch-provider context
   */
  private createCaseHelper() {
    return function (
      this: RulesetContext & { __switchProvider?: { currentProviderId: string; matched: boolean } },
      providerIds: string,
      options: Handlebars.HelperOptions
    ): string {
      // Check if we're in a switch-provider context
      if (!this.__switchProvider) {
        throw new Error(
          'case helper can only be used inside a switch-provider block'
        );
      }

      // If we've already matched a case, skip this one
      if (this.__switchProvider.matched) {
        return '';
      }

      // Parse the provider IDs (support comma-separated list)
      const targetProviders = providerIds.split(',').map((p) => p.trim());

      // Check if current provider matches any of the target providers
      if (targetProviders.includes(this.__switchProvider.currentProviderId)) {
        // Mark as matched to prevent other cases from executing
        this.__switchProvider.matched = true;
        return options.fn(this);
      }

      return '';
    };
  }

  /**
   * Creates the default helper
   * Executes if no case matched in a switch-provider context
   */
  private createDefaultHelper() {
    return function (
      this: RulesetContext & { __switchProvider?: { currentProviderId: string; matched: boolean } },
      options: Handlebars.HelperOptions
    ): string {
      // Check if we're in a switch-provider context
      if (!this.__switchProvider) {
        throw new Error(
          'default helper can only be used inside a switch-provider block'
        );
      }

      // Only execute if no case has matched
      if (!this.__switchProvider.matched) {
        return options.fn(this);
      }

      return '';
    };
  }

  /**
   * Creates the missing helper handler for freeform sections
   */
  private createMissingHelperHandler() {
    return (context: unknown, options: SectionOptions): string => {
      // The first argument is actually the helper name when used as helperMissing
      const name = context as string;

      // Only handle block helpers ({{#name}}) that aren't reserved
      if (!options?.fn || this.reservedHelpers.has(name)) {
        throw new Error(`Helper '${name}' is not defined`);
      }

      // This is a freeform section helper - call it with the current template context
      const helper = this.createSectionHelper(name);
      return helper.call(options.data?.root, options);
    };
  }

  /**
   * Creates a section helper for freeform section names
   */
  private createSectionHelper(sectionName: string) {
    return function (this: RulesetContext, options: SectionOptions): string {
      const { include, exclude, format = 'xml' } = options.hash || {};

      // Provider filtering
      if (
        include &&
        !include
          .split(',')
          .map((p) => p.trim())
          .includes(this.provider.id)
      ) {
        return '';
      }
      if (
        exclude
          ?.split(',')
          .map((p) => p.trim())
          .includes(this.provider.id)
      ) {
        return '';
      }

      const content = options.fn(this).trim();

      // Format output based on provider preferences
      switch (format) {
        case 'xml': {
          const xmlTag = sectionName.replace(/-/g, '_');
          return `<${xmlTag}>\n${content}\n</${xmlTag}>`;
        }

        case 'heading': {
          const title = sectionName
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
          return `## ${title}\n\n${content}`;
        }

        case 'raw':
          return content;

        default:
          return content;
      }
    };
  }

  /**
   * Sets up partial resolution for @-prefixed partials
   */
  private setupPartialResolver(): void {
    // TODO: Implement @-prefixed partial loading from _partials/
    // This will load files like @common-patterns from .ruleset/src/_partials/
  }
}
