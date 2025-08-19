// TLDR: Handlebars-based compiler for Rulesets (ruleset-v0.2-beta+)
// TLDR: Implements full marker processing with Handlebars templating engine and template caching

import { createHash } from 'node:crypto';
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
 * Template cache entry with metadata
 */
interface CachedTemplate {
  template: Handlebars.Template;
  contentHash: string;
  compiledAt: Date;
  accessCount: number;
  lastAccessed: Date;
}

/**
 * Handlebars-based Rulesets compiler with template caching
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
  ]);
  
  // Template caching system
  private templateCache = new Map<string, CachedTemplate>();
  private maxCacheSize = 1000; // Maximum number of cached templates
  private cacheEnabled = true; // Can be disabled for testing

  constructor(options: { cacheEnabled?: boolean; maxCacheSize?: number } = {}) {
    this.hbs = Handlebars.create();
    this.cacheEnabled = options.cacheEnabled ?? true;
    this.maxCacheSize = options.maxCacheSize ?? 1000;
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

      // Get or compile template with caching
      const template = this.getOrCompileTemplate(bodyContent);

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

  /**
   * Gets a cached template or compiles and caches a new one
   */
  private getOrCompileTemplate(content: string): Handlebars.Template {
    if (!this.cacheEnabled) {
      return this.hbs.compile(content, {
        noEscape: true,
        strict: false,
      });
    }

    const contentHash = this.generateContentHash(content);
    const cached = this.templateCache.get(contentHash);

    if (cached) {
      // Update access metadata
      cached.accessCount++;
      cached.lastAccessed = new Date();
      pinoLogger.debug(`Template cache hit for hash: ${contentHash}`);
      return cached.template;
    }

    // Compile new template
    const template = this.hbs.compile(content, {
      noEscape: true,
      strict: false,
    });

    // Cache the compiled template
    this.cacheTemplate(contentHash, template);
    pinoLogger.debug(`Template compiled and cached with hash: ${contentHash}`);

    return template;
  }

  /**
   * Generates a hash for template content to use as cache key
   */
  private generateContentHash(content: string): string {
    return createHash('sha256').update(content.trim()).digest('hex').substring(0, 16);
  }

  /**
   * Caches a compiled template with metadata
   */
  private cacheTemplate(contentHash: string, template: Handlebars.Template): void {
    // Enforce cache size limit
    if (this.templateCache.size >= this.maxCacheSize) {
      this.evictOldestTemplates();
    }

    const now = new Date();
    const cacheEntry: CachedTemplate = {
      template,
      contentHash,
      compiledAt: now,
      accessCount: 1,
      lastAccessed: now,
    };

    this.templateCache.set(contentHash, cacheEntry);
  }

  /**
   * Evicts oldest templates when cache is full
   */
  private evictOldestTemplates(): void {
    const entries = Array.from(this.templateCache.entries());
    
    // Sort by last accessed time (oldest first)
    entries.sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime());
    
    // Remove oldest 25% of entries
    const toRemove = Math.floor(entries.length * 0.25) || 1;
    
    for (let i = 0; i < toRemove; i++) {
      this.templateCache.delete(entries[i][0]);
    }
    
    pinoLogger.debug(`Evicted ${toRemove} templates from cache`);
  }

  /**
   * Clears the entire template cache
   */
  public clearTemplateCache(): void {
    this.templateCache.clear();
    pinoLogger.debug('Template cache cleared');
  }

  /**
   * Gets template cache statistics
   */
  public getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate?: number;
    entries: Array<{
      hash: string;
      compiledAt: Date;
      accessCount: number;
      lastAccessed: Date;
    }>;
  } {
    const entries = Array.from(this.templateCache.values()).map(entry => ({
      hash: entry.contentHash,
      compiledAt: entry.compiledAt,
      accessCount: entry.accessCount,
      lastAccessed: entry.lastAccessed,
    }));

    return {
      size: this.templateCache.size,
      maxSize: this.maxCacheSize,
      entries,
    };
  }

  /**
   * Preheats the cache by compiling common templates
   */
  public preheatCache(templates: string[]): void {
    if (!this.cacheEnabled) {
      return;
    }

    pinoLogger.debug(`Preheating cache with ${templates.length} templates`);
    
    for (const template of templates) {
      try {
        this.getOrCompileTemplate(template);
      } catch (error) {
        pinoLogger.warn(`Failed to preheat template:`, error);
      }
    }
  }

  /**
   * Enables or disables template caching
   */
  public setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.clearTemplateCache();
    }
    pinoLogger.debug(`Template caching ${enabled ? 'enabled' : 'disabled'}`);
  }
}
