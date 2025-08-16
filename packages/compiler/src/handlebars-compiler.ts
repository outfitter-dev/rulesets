/**
 * Handlebars-based compiler for Rulesets v0.2+
 * Implementation of the Handlebars adoption proposal
 * 
 * Phase 1: Foundation (Week 1-2)
 * - Core handlebars wrapper with basic helpers
 * - Provider context generation
 * - Section helper framework
 */

import Handlebars from 'handlebars';
import type { 
  ParsedDoc, 
  CompiledDoc, 
  Provider as RulesetProvider,
  RulesetContext 
} from '@rulesets/types';

/**
 * Enhanced compilation context for Handlebars templates
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
 * Options for section helpers (auto-generated for freeform sections)
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
 * Main Handlebars compiler for Rulesets
 * Replaces custom parser with battle-tested Handlebars engine
 */
export class HandlebarsRulesetCompiler {
  private hbs: typeof Handlebars;
  private providers: Map<string, RulesetProvider>;

  constructor(providers: RulesetProvider[] = []) {
    // Create isolated Handlebars instance
    this.hbs = Handlebars.create();
    
    // Store providers for context building
    this.providers = new Map(providers.map(p => [p.id as string, p]));
    
    // Register core helpers
    this.registerCoreHelpers();
    
    // Register provider-specific helpers
    this.registerProviderHelpers();
  }

  /**
   * Compile a parsed document using Handlebars
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
      const compiledContent = template(context);
      
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
   * Build Handlebars context from parsed document and provider
   */
  private buildContext(
    parsedDoc: ParsedDoc,
    provider: RulesetProvider,
    projectConfig: Record<string, unknown>
  ): HandlebarsContext {
    const frontmatter = parsedDoc.source.frontmatter || {};
    
    return {
      // Provider information
      provider: {
        id: provider.id as string,
        name: provider.name,
        type: provider.config?.type || 'unknown',
        capabilities: provider.config?.capabilities || [],
      },

      // File metadata
      file: {
        name: this.extractFileName(parsedDoc.source.path),
        version: frontmatter.version as string || '1.0.0',
        path: parsedDoc.source.path,
        frontmatter,
      },

      // Project data (from frontmatter or config)
      project: {
        ...projectConfig,
        ...frontmatter.project as Record<string, unknown> || {},
      },

      // System variables
      timestamp: new Date().toISOString(),
      rulesetVersion: '0.2.0-handlebars',

      // Legacy compatibility
      destinationId: provider.id as string,
      config: projectConfig,
    };
  }

  /**
   * Extract filename from path
   */
  private extractFileName(filePath: string): string {
    const filename = filePath.split('/').pop() || 'unknown';
    return filename.replace(/\.(rule\.)?md$/, '');
  }

  /**
   * Extract template content (remove frontmatter)
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
   * Register core Handlebars helpers
   */
  private registerCoreHelpers(): void {
    // Provider conditional helpers
    this.hbs.registerHelper('if-provider', this.ifProviderHelper.bind(this));
    this.hbs.registerHelper('unless-provider', this.unlessProviderHelper.bind(this));
    this.hbs.registerHelper('switch-provider', this.switchProviderHelper.bind(this));
    
    // Utility helpers
    this.hbs.registerHelper('kebab-to-snake', this.kebabToSnakeHelper.bind(this));
    this.hbs.registerHelper('format-date', this.formatDateHelper.bind(this));
    this.hbs.registerHelper('include-file', this.includeFileHelper.bind(this));
    
    // Auto-register section helpers for freeform names
    this.hbs.registerHelper('helperMissing', this.createSectionHelper.bind(this));
  }

  /**
   * Register provider-specific helpers
   */
  private registerProviderHelpers(): void {
    // TODO: Load provider-specific helpers from provider definitions
    // This will be implemented in Phase 2
  }

  /**
   * Helper: Check if current provider matches list
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
   * Helper: Inverse provider check
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
   * Helper: Switch statement for providers
   */
  private switchProviderHelper(
    providerId: string,
    options: Handlebars.HelperOptions
  ): string {
    const context = options.data.root as HandlebarsContext;
    
    // TODO: Implement switch/case logic for provider routing
    // This will be enhanced in Phase 2
    return options.fn(context);
  }

  /**
   * Helper: Convert kebab-case to snake_case
   */
  private kebabToSnakeHelper(str: string): string {
    return str.replace(/-/g, '_');
  }

  /**
   * Helper: Format date
   */
  private formatDateHelper(date: string, format: string): string {
    // Basic date formatting - can be enhanced later
    return new Date(date).toISOString();
  }

  /**
   * Helper: Include file content
   */
  private includeFileHelper(filePath: string): string {
    // TODO: Implement file inclusion logic
    // This will be implemented in Phase 3
    return `<!-- Include: ${filePath} -->`;
  }

  /**
   * Auto-generate section helpers for freeform names
   * This is the key innovation - any {{#name}} becomes a section helper
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
 * Legacy wrapper for backward compatibility
 */
export function compileWithHandlebars(
  parsedDoc: ParsedDoc,
  provider: RulesetProvider,
  projectConfig: Record<string, unknown> = {}
): CompiledDoc {
  const compiler = new HandlebarsRulesetCompiler([provider]);
  return compiler.compile(parsedDoc, provider.id as string, projectConfig);
}