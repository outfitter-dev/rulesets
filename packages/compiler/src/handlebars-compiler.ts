/**

- Handlebars-based compiler for Rulesets v0.2+
- Implementation of the Handlebars adoption proposal
-
- Phase 1: Foundation (Week 1-2)
- - Core handlebars wrapper with basic helpers
- - Provider context generation
- - Section helper framework
 */

import Handlebars from 'handlebars';
import type {
  ParsedDoc,
  CompiledDoc,
  Provider as RulesetProvider,
  RulesetContext
} from '@rulesets/types';
import {
  PartialResolver,
  PostProcessorFactory,
  type PartialResolverOptions
} from './partial-resolver';

/**

- Enhanced compilation context for Handlebars templates
 */
export interface HandlebarsContext extends RulesetContext {
  // Provider information
  provider: {
    id: string;
    name: string;
    type: string;
    capabilities: string[];
  };

  // File metadata
  file: {
    name: string;
    version: string;
    path: string;
    frontmatter: Record<string, unknown>;
  };

  // Project data from frontmatter
  project: Record<string, unknown>;

  // System variables
  timestamp: string;
  rulesetVersion: string;
}

/**

- Options for section helpers (auto-generated for freeform sections)
 */
export interface SectionOptions extends Handlebars.HelperOptions {
  hash: {
    include?: string;
    exclude?: string;
    format?: 'xml' | 'heading' | 'raw';
    name?: string;
  };
}

/**

- Main Handlebars compiler for Rulesets
- Replaces custom parser with battle-tested Handlebars engine
 */
export class HandlebarsRulesetCompiler {
  private hbs: typeof Handlebars;
  private providers: Map<string, RulesetProvider>;
  private partialResolver?: PartialResolver;

  constructor(
    providers: RulesetProvider[] = [],
    partialOptions?: PartialResolverOptions
  ) {
    // Create isolated Handlebars instance
    this.hbs = Handlebars.create();

    // Store providers for context building
    this.providers = new Map(providers.map(p => [p.id as string, p]));

    // Set up partial resolver if options provided
    if (partialOptions) {
      this.partialResolver = new PartialResolver(partialOptions);
      this.hbs.registerPartials = this.partialResolver.createHandlebarsLoader();
    }

    // Register core helpers
    this.registerCoreHelpers();

    // Register provider-specific helpers
    this.registerProviderHelpers();
  }

  /**

- Compile a parsed document using Handlebars
   */
  compile(
    parsedDoc: ParsedDoc,
    providerId: string,
    projectConfig: Record<string, unknown> = {}
  ): CompiledDoc {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    // Build Handlebars context
    const context = this.buildContext(parsedDoc, provider, projectConfig);

    // Get the content body (without frontmatter)
    const templateContent = this.extractTemplateContent(parsedDoc.source.content);

    try {
      // Compile and execute template
      const template = this.hbs.compile(templateContent);
      let compiledContent = template(context);

      // Apply provider-specific post-processing
      const postProcessor = PostProcessorFactory.create(providerId);
      if (postProcessor) {
        compiledContent = postProcessor.process(compiledContent, context);
      }
      
      // Build compiled document
      return {
        source: parsedDoc.source,
        ast: parsedDoc.ast,
        output: {
          content: compiledContent.trim(),
          metadata: {
            provider: provider.id,
            providerName: provider.name,
            compiledAt: context.timestamp,
            handlebarsVersion: '2.0.0-handlebars',
            postProcessed: !!postProcessor,
            ...parsedDoc.source.frontmatter,
          },
        },
        context: {
          destinationId: providerId,
          config: projectConfig,
        },
      };
    } catch (error) {
      throw new Error(`Handlebars compilation failed: ${error.message}`);
    }
  }

  /**

- Build Handlebars context from parsed document and provider
   */
  private buildContext(
    parsedDoc: ParsedDoc,
    provider: RulesetProvider,
    projectConfig: Record<string, unknown>
  ): HandlebarsContext {
    const frontmatter = parsedDoc.source.frontmatter || {};

    // Enhanced provider capabilities with dynamic detection
    const providerCapabilities = this.detectProviderCapabilities(provider);

    return {
      // Provider information
      provider: {
        id: provider.id as string,
        name: provider.name,
        type: provider.config?.type || 'unknown',
        capabilities: providerCapabilities,
      },

      // File metadata with enhanced parsing
      file: {
        name: this.extractFileName(parsedDoc.source.path),
        version: frontmatter.version as string || '1.0.0',
        path: parsedDoc.source.path,
        frontmatter: this.flattenFrontmatter(frontmatter),
      },

      // Project data with deep merging
      project: this.mergeProjectData(frontmatter, projectConfig),

      // System variables
      timestamp: new Date().toISOString(),
      rulesetVersion: '0.2.0-handlebars',

      // User-defined variables from frontmatter
      ...this.extractUserVariables(frontmatter),

      // Legacy compatibility
      destinationId: provider.id as string,
      config: projectConfig,
    };
  }

  /**

- Detect provider capabilities dynamically
   */
  private detectProviderCapabilities(provider: RulesetProvider): string[] {
    const baseCapabilities = provider.config?.capabilities || [];
    const detectedCapabilities = [];

    // Dynamic capability detection based on provider type
    switch (provider.config?.type) {
      case 'ide':
        detectedCapabilities.push('workspaces', 'debugging', 'extensions');
        break;
      case 'cli':
        detectedCapabilities.push('scripting', 'automation');
        break;
      case 'web':
        detectedCapabilities.push('collaboration', 'cloud-sync');
        break;
    }

    return [...new Set([...baseCapabilities, ...detectedCapabilities])];
  }

  /**

- Flatten nested frontmatter for easier template access
   */
  private flattenFrontmatter(frontmatter: Record<string, unknown>): Record<string, unknown> {
    const flattened: Record<string, unknown> = {};

    const flatten = (obj: Record<string, unknown>, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          flatten(value as Record<string, unknown>, newKey);
        } else {
          flattened[newKey] = value;
        }
      }
    };

    flatten(frontmatter);
    return { ...frontmatter, ...flattened };
  }

  /**

- Merge project data with deep merging support
   */
  private mergeProjectData(
    frontmatter: Record<string, unknown>,
    projectConfig: Record<string, unknown>
  ): Record<string, unknown> {
    const projectData = frontmatter.project as Record<string, unknown> || {};
    const configProject = projectConfig.project as Record<string, unknown> || {};

    return {
      ...projectConfig,
      ...configProject,
      ...projectData,
    };
  }

  /**

- Extract user-defined variables from frontmatter
   */
  private extractUserVariables(frontmatter: Record<string, unknown>): Record<string, unknown> {
    const variables = frontmatter.variables as Record<string, unknown> || {};
    const custom = frontmatter.custom as Record<string, unknown> || {};

    return {
      variables,
      custom,
    };
  }

  /**

- Extract filename from path
   */
  private extractFileName(filePath: string): string {
    if (!filePath || typeof filePath !== 'string') {
      return 'unknown';
    }
    const filename = filePath.split('/').pop() || 'unknown';
    return filename.replace(/\.(rule\.)?md$/, '');
  }

  /**

- Extract template content (remove frontmatter)
   */
  private extractTemplateContent(content: string): string {
    const lines = content.split('\n');

    if (lines[0] === '---') {
      let frontmatterEnd = -1;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i] === '---') {
          frontmatterEnd = i;
          break;
        }
      }

      if (frontmatterEnd > 0) {
        return lines.slice(frontmatterEnd + 1).join('\n').trim();
      }
    }

    return content.trim();
  }

  /**

- Register core Handlebars helpers
   */
  private registerCoreHelpers(): void {
    // Provider conditional helpers
    this.hbs.registerHelper('if-provider', this.ifProviderHelper.bind(this));
    this.hbs.registerHelper('unless-provider', this.unlessProviderHelper.bind(this));
    this.hbs.registerHelper('switch-provider', this.switchProviderHelper.bind(this));
    this.hbs.registerHelper('case', this.caseHelper.bind(this));
    this.hbs.registerHelper('default', this.defaultHelper.bind(this));

    // Advanced conditionals and logic
    this.hbs.registerHelper('has-capability', this.hasCapabilityHelper.bind(this));
    this.hbs.registerHelper('eq', this.eqHelper.bind(this));
    this.hbs.registerHelper('or', this.orHelper.bind(this));
    this.hbs.registerHelper('and', this.andHelper.bind(this));

    // Utility helpers
    this.hbs.registerHelper('kebab-to-snake', this.kebabToSnakeHelper.bind(this));
    this.hbs.registerHelper('format-date', this.formatDateHelper.bind(this));
    this.hbs.registerHelper('include-file', this.includeFileHelper.bind(this));

    // Auto-register section helpers for freeform names
    this.hbs.registerHelper('helperMissing', this.createSectionHelper.bind(this));
  }

  /**

- Register provider-specific helpers
   */
  private registerProviderHelpers(): void {
    // TODO: Load provider-specific helpers from provider definitions
    // This will be implemented in Phase 2
  }

  /**

- Helper: Check if current provider matches list
   */
  private ifProviderHelper(
    providers: string,
    options: Handlebars.HelperOptions
  ): string {
    const context = options.data.root as HandlebarsContext;
    const allowedProviders = providers.split(',').map(p => p.trim());

    if (allowedProviders.includes(context.provider.id)) {
      return options.fn(context);
    }

    return options.inverse ? options.inverse(context) : '';
  }

  /**

- Helper: Inverse provider check
   */
  private unlessProviderHelper(
    providers: string,
    options: Handlebars.HelperOptions
  ): string {
    const context = options.data.root as HandlebarsContext;
    const excludedProviders = providers.split(',').map(p => p.trim());

    if (!excludedProviders.includes(context.provider.id)) {
      return options.fn(context);
    }

    return options.inverse ? options.inverse(context) : '';
  }

  /**

- Helper: Switch statement for providers
   */
  private switchProviderHelper(
    this: HandlebarsContext,
    options: Handlebars.HelperOptions
  ): string {
    const context = options.data.root as HandlebarsContext;

    // Store the current provider for case matching
    options.data.switchProvider = context.provider.id;

    return options.fn(context);
  }

  /**

- Helper: Case statement for switch
   */
  private caseHelper(
    providerPattern: string,
    options: Handlebars.HelperOptions
  ): string {
    const switchProvider = options.data.switchProvider;
    if (!switchProvider) {
      throw new Error('case helper must be used within switch helper');
    }

    const patterns = providerPattern.split(',').map(p => p.trim());

    if (patterns.includes(switchProvider)) {
      return options.fn(this);
    }

    return '';
  }

  /**

- Helper: Default case for switch
   */
  private defaultHelper(
    options: Handlebars.HelperOptions
  ): string {
    // Check if any case has matched
    const hasMatched = options.data.caseMatched || false;

    if (!hasMatched) {
      return options.fn(this);
    }

    return '';
  }

  /**

- Helper: Convert kebab-case to snake_case
   */
  private kebabToSnakeHelper(str: string): string {
    return str.replace(/-/g, '_');
  }

  /**

- Helper: Format date
   */
  private formatDateHelper(date: string, format: string): string {
    // Basic date formatting - can be enhanced later
    return new Date(date).toISOString();
  }

  /**

- Helper: Include file content
   */
  private includeFileHelper(filePath: string): string {
    if (!this.partialResolver) {
      return `<!-- Include: ${filePath} (No partial resolver configured) -->`;
    }

    try {
      const resolved = this.partialResolver.resolve(filePath);
      return resolved.content;
    } catch (error) {
      console.warn(`Failed to include file "${filePath}":`, error.message);
      return `<!-- Include failed: ${filePath} -->`;
    }
  }

  /**

- Helper: Check if provider has capability
   */
  private hasCapabilityHelper(
    capability: string,
    options: Handlebars.HelperOptions
  ): string {
    const context = options.data.root as HandlebarsContext;

    if (context.provider.capabilities.includes(capability)) {
      return options.fn(context);
    }

    return options.inverse ? options.inverse(context) : '';
  }

  /**

- Helper: Equality comparison
   */
  private eqHelper(a: any, b: any): boolean {
    return a === b;
  }

  /**

- Helper: Logical OR
   */
  private orHelper(...args: any[]): boolean {
    // Remove the options object from the end
    const values = args.slice(0, -1);
    return values.some(Boolean);
  }

  /**

- Helper: Logical AND
   */
  private andHelper(...args: any[]): boolean {
    // Remove the options object from the end
    const values = args.slice(0, -1);
    return values.every(Boolean);
  }

  /**

- Auto-generate section helpers for freeform names
- This is the key innovation - any {{#name}} becomes a section helper
   */
  private createSectionHelper(
    name: string,
    context: HandlebarsContext,
    options: SectionOptions
  ): string {
    // Skip if this is a known Handlebars helper
    if (['if', 'unless', 'each', 'with', 'lookup', 'log'].includes(name)) {
      return '';
    }

    const { include, exclude, format = 'xml' } = options.hash;

    // Provider filtering
    if (include && !include.split(',').includes(context.provider.id)) {
      return '';
    }
    if (exclude && exclude.split(',').includes(context.provider.id)) {
      return '';
    }

    const content = options.fn(context).trim();

    // Format output based on provider preferences
    switch (format) {
      case 'xml':
        const xmlTag = name.replace(/-/g, '_');
        return `<${xmlTag}>\n${content}\n</${xmlTag}>`;

      case 'heading':
        const title = name
          .split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        return `## ${title}\n\n${content}`;

      case 'raw':
        return content;

      default:
        return content;
    }
  }
}

/**

- Legacy wrapper for backward compatibility
 */
export function compileWithHandlebars(
  parsedDoc: ParsedDoc,
  provider: RulesetProvider,
  projectConfig: Record<string, unknown> = {}
): CompiledDoc {
  const compiler = new HandlebarsRulesetCompiler([provider]);
  return compiler.compile(parsedDoc, provider.id as string, projectConfig);
}
