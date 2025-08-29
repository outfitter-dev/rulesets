/**
 * Partial resolution system for Handlebars templates
 * Supports @partial syntax and file inclusion
 * Phase 3: Advanced Features (Week 5-6)
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import type { HandlebarsContext } from './handlebars-compiler';

export interface PartialResolverOptions {
  rootDir: string;
  partialsDir: string;
  encoding?: BufferEncoding;
  cache?: boolean;
}

export interface ResolvedPartial {
  content: string;
  path: string;
  frontmatter?: Record<string, unknown>;
}

/**
 * Resolves partials with @syntax support and file inclusion
 */
export class PartialResolver {
  private cache = new Map<string, ResolvedPartial>();
  private options: Required<PartialResolverOptions>;

  constructor(options: PartialResolverOptions) {
    this.options = {
      encoding: 'utf-8',
      cache: true,
      ...options,
    };
  }

  /**
   * Resolve a partial by name or path
   * Supports:
   * - @partial-name (from _partials/ directory)
   * - relative/path/to/file.md
   * - absolute paths
   */
  resolve(partialPath: string, context?: HandlebarsContext): ResolvedPartial {
    const cacheKey = this.getCacheKey(partialPath, context);
    
    if (this.options.cache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const resolved = this.resolvePartialPath(partialPath, context);
    
    if (this.options.cache) {
      this.cache.set(cacheKey, resolved);
    }
    
    return resolved;
  }

  /**
   * Register a custom partial loader for Handlebars
   */
  createHandlebarsLoader(): (name: string) => string {
    return (name: string) => {
      try {
        const resolved = this.resolve(name);
        return resolved.content;
      } catch (error) {
        console.warn(`Failed to load partial "${name}":`, error.message);
        return `<!-- Partial not found: ${name} -->`;
      }
    };
  }

  /**
   * Clear the partial cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Resolve the actual file path for a partial
   */
  private resolvePartialPath(partialPath: string, context?: HandlebarsContext): ResolvedPartial {
    let resolvedPath: string;
    
    if (partialPath.startsWith('@')) {
      // @partial syntax - look in _partials directory
      const partialName = partialPath.slice(1);
      resolvedPath = this.resolvePartialsDirectoryPath(partialName);
    } else if (partialPath.startsWith('/')) {
      // Absolute path
      resolvedPath = partialPath;
    } else {
      // Relative path - resolve from current file or root
      const basePath = context?.file.path 
        ? dirname(resolve(this.options.rootDir, context.file.path))
        : this.options.rootDir;
      resolvedPath = resolve(basePath, partialPath);
    }

    return this.loadPartialFile(resolvedPath);
  }

  /**
   * Resolve path in _partials directory
   */
  private resolvePartialsDirectoryPath(partialName: string): string {
    // Try different extensions
    const extensions = ['.md', '.rule.md', '.handlebars', '.hbs'];
    const basePath = join(this.options.rootDir, this.options.partialsDir, partialName);
    
    for (const ext of extensions) {
      const fullPath = basePath + ext;
      if (existsSync(fullPath)) {
        return fullPath;
      }
    }
    
    // Try without extension
    if (existsSync(basePath)) {
      return basePath;
    }
    
    throw new Error(`Partial not found: @${partialName} (searched in ${this.options.partialsDir})`);
  }

  /**
   * Load and parse a partial file
   */
  private loadPartialFile(filePath: string): ResolvedPartial {
    if (!existsSync(filePath)) {
      throw new Error(`Partial file not found: ${filePath}`);
    }

    const content = readFileSync(filePath, this.options.encoding);
    const { frontmatter, body } = this.parseFrontmatter(content);
    
    return {
      content: body,
      path: filePath,
      frontmatter,
    };
  }

  /**
   * Parse frontmatter from file content
   */
  private parseFrontmatter(content: string): { 
    frontmatter?: Record<string, unknown>; 
    body: string 
  } {
    const lines = content.split('\n');
    
    if (lines[0] !== '---') {
      return { body: content };
    }

    let frontmatterEnd = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') {
        frontmatterEnd = i;
        break;
      }
    }

    if (frontmatterEnd === -1) {
      return { body: content };
    }

    const frontmatterText = lines.slice(1, frontmatterEnd).join('\n');
    const body = lines.slice(frontmatterEnd + 1).join('\n').trim();
    
    try {
      // Simple YAML parsing for frontmatter
      const frontmatter = this.parseSimpleYaml(frontmatterText);
      return { frontmatter, body };
    } catch (error) {
      console.warn('Failed to parse frontmatter:', error.message);
      return { body };
    }
  }

  /**
   * Simple YAML parser for basic frontmatter
   * TODO: Replace with proper YAML parser when dependencies are available
   */
  private parseSimpleYaml(yaml: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = yaml.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();
      
      // Handle quoted strings
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        result[key] = value.slice(1, -1);
      } else if (value === 'true') {
        result[key] = true;
      } else if (value === 'false') {
        result[key] = false;
      } else if (!isNaN(Number(value))) {
        result[key] = Number(value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Generate cache key for a partial
   */
  private getCacheKey(partialPath: string, context?: HandlebarsContext): string {
    const contextKey = context?.file.path || 'no-context';
    return `${partialPath}::${contextKey}`;
  }
}

/**
 * Provider-specific post-processor for compiled content
 */
export interface PostProcessor {
  process(content: string, context: HandlebarsContext): string;
}

/**
 * Post-processor for Cursor (.mdc format)
 */
export class CursorPostProcessor implements PostProcessor {
  process(content: string, context: HandlebarsContext): string {
    // Convert bare markdown links to .mdc extension
    let processed = content.replace(
      /\[([^\]]+)\]\(([^)]+\.md)\)/g,
      '[$1]($2c)' // Add 'c' to make .mdc
    );
    
    // Ensure relative paths are relative to output directory
    processed = processed.replace(
      /\[([^\]]+)\]\((?!https?:\/\/)([^)]+)\)/g,
      (match, text, path) => {
        if (path.startsWith('/')) return match; // Absolute paths unchanged
        return `[${text}](./${path})`; // Make relative paths explicit
      }
    );
    
    return processed;
  }
}

/**
 * Post-processor for Claude Code (markdown format)
 */
export class ClaudeCodePostProcessor implements PostProcessor {
  process(content: string, context: HandlebarsContext): string {
    // Ensure proper heading hierarchy
    let processed = content.replace(/^#{7,}/gm, '######'); // Max 6 levels
    
    // Add file reference comments for debugging
    if (context.file.path) {
      processed = `<!-- Generated from: ${context.file.path} -->\n${processed}`;
    }
    
    return processed;
  }
}

/**
 * Post-processor factory
 */
export class PostProcessorFactory {
  private static processors = new Map<string, () => PostProcessor>([
    ['cursor', () => new CursorPostProcessor()],
    ['claude-code', () => new ClaudeCodePostProcessor()],
  ]);

  static register(providerId: string, factory: () => PostProcessor): void {
    this.processors.set(providerId, factory);
  }

  static create(providerId: string): PostProcessor | null {
    const factory = this.processors.get(providerId);
    return factory ? factory() : null;
  }

  static getAvailable(): string[] {
    return Array.from(this.processors.keys());
  }
}