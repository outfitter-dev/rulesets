/**
 * Tests for Partial Resolution System
 * Phase 3: Advanced Features - File inclusion and @syntax
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PartialResolver, PostProcessorFactory, CursorPostProcessor } from '../partial-resolver';
import type { HandlebarsContext } from '../handlebars-compiler';

describe('PartialResolver', () => {
  const testDir = join(process.cwd(), '.test-partials');
  const partialsDir = '_partials';
  let resolver: PartialResolver;

  beforeEach(() => {
    // Create test directory structure
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, partialsDir), { recursive: true });
    
    resolver = new PartialResolver({
      rootDir: testDir,
      partialsDir,
      cache: true,
    });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  describe('@ Syntax Resolution', () => {
    it('should resolve @partial from _partials directory', () => {
      const partialContent = `## Common Guidelines

- Follow coding standards
- Write comprehensive tests
- Document public APIs`;

      writeFileSync(join(testDir, partialsDir, 'common-guidelines.md'), partialContent);

      const resolved = resolver.resolve('@common-guidelines');
      
      expect(resolved.content).toBe(partialContent);
      expect(resolved.path).toContain('common-guidelines.md');
    });

    it('should try multiple extensions for @partials', () => {
      const partialContent = `# TypeScript Rules`;
      writeFileSync(join(testDir, partialsDir, 'typescript.rule.md'), partialContent);

      const resolved = resolver.resolve('@typescript');
      
      expect(resolved.content).toBe(partialContent);
      expect(resolved.path).toContain('typescript.rule.md');
    });

    it('should throw error for missing @partial', () => {
      expect(() => {
        resolver.resolve('@non-existent');
      }).toThrow('Partial not found: @non-existent');
    });
  });

  describe('Relative Path Resolution', () => {
    it('should resolve relative paths from context', () => {
      const relativeContent = 'Relative file content';
      mkdirSync(join(testDir, 'docs'), { recursive: true });
      writeFileSync(join(testDir, 'docs', 'relative.md'), relativeContent);

      const context: Partial<HandlebarsContext> = {
        file: {
          path: 'docs/main.md',
          name: 'main',
          version: '1.0.0',
          frontmatter: {},
        },
      };

      const resolved = resolver.resolve('relative.md', context as HandlebarsContext);
      
      expect(resolved.content).toBe(relativeContent);
    });

    it('should resolve relative paths from root when no context', () => {
      const content = 'Root level content';
      writeFileSync(join(testDir, 'root-file.md'), content);

      const resolved = resolver.resolve('root-file.md');
      
      expect(resolved.content).toBe(content);
    });
  });

  describe('Frontmatter Parsing', () => {
    it('should parse frontmatter from partial files', () => {
      const partialWithFrontmatter = `---
title: Shared Component
version: 1.2.0
tags: [shared, reusable]
---

# {{title}} v{{version}}

This is a reusable component.`;

      writeFileSync(join(testDir, partialsDir, 'component.md'), partialWithFrontmatter);

      const resolved = resolver.resolve('@component');
      
      expect(resolved.frontmatter).toEqual({
        title: 'Shared Component',
        version: '1.2.0',
        tags: '[shared, reusable]', // Simple YAML parser limitation
      });
      expect(resolved.content).toContain('# {{title}} v{{version}}');
      expect(resolved.content).not.toContain('---');
    });

    it('should handle files without frontmatter', () => {
      const simpleContent = 'Just markdown content';
      writeFileSync(join(testDir, partialsDir, 'simple.md'), simpleContent);

      const resolved = resolver.resolve('@simple');
      
      expect(resolved.frontmatter).toBeUndefined();
      expect(resolved.content).toBe(simpleContent);
    });
  });

  describe('Caching', () => {
    it('should cache resolved partials', () => {
      const content = 'Cached content';
      writeFileSync(join(testDir, partialsDir, 'cached.md'), content);

      resolver.resolve('@cached');
      const stats = resolver.getCacheStats();
      
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain('@cached::no-context');
    });

    it('should clear cache when requested', () => {
      writeFileSync(join(testDir, partialsDir, 'temp.md'), 'temp');
      
      resolver.resolve('@temp');
      expect(resolver.getCacheStats().size).toBe(1);
      
      resolver.clearCache();
      expect(resolver.getCacheStats().size).toBe(0);
    });
  });

  describe('Handlebars Integration', () => {
    it('should create handlebars loader function', () => {
      const content = 'Loader test content';
      writeFileSync(join(testDir, partialsDir, 'loader-test.md'), content);

      const loader = resolver.createHandlebarsLoader();
      const result = loader('@loader-test');
      
      expect(result).toBe(content);
    });

    it('should handle loader errors gracefully', () => {
      const loader = resolver.createHandlebarsLoader();
      const result = loader('@missing-partial');
      
      expect(result).toContain('<!-- Partial not found: @missing-partial -->');
    });
  });
});

describe('PostProcessors', () => {
  describe('CursorPostProcessor', () => {
    it('should convert .md links to .mdc', () => {
      const processor = new CursorPostProcessor();
      const content = `
Check out the [main guide](../docs/guide.md) and [API reference](api.md).
External links like [GitHub](https://github.com) should be unchanged.
      `.trim();

      const context = {
        provider: { id: 'cursor', name: 'Cursor', type: 'ide', capabilities: [] },
        file: { path: 'test.md', name: 'test', version: '1.0.0', frontmatter: {} },
      } as HandlebarsContext;

      const result = processor.process(content, context);
      
      expect(result).toContain('[main guide](../docs/guide.mdc)');
      expect(result).toContain('[API reference](api.mdc)');
      expect(result).toContain('[GitHub](https://github.com)'); // Unchanged
    });

    it('should make relative paths explicit', () => {
      const processor = new CursorPostProcessor();
      const content = '[File](docs/file.md) and [Other](other.mdc)';

      const context = {} as HandlebarsContext;
      const result = processor.process(content, context);
      
      expect(result).toContain('[File](./docs/file.mdc)');
      expect(result).toContain('[Other](./other.mdc)');
    });
  });

  describe('PostProcessorFactory', () => {
    it('should create known processors', () => {
      const cursorProcessor = PostProcessorFactory.create('cursor');
      const claudeProcessor = PostProcessorFactory.create('claude-code');
      
      expect(cursorProcessor).toBeInstanceOf(CursorPostProcessor);
      expect(claudeProcessor).toBeTruthy();
    });

    it('should return null for unknown providers', () => {
      const unknown = PostProcessorFactory.create('unknown-provider');
      expect(unknown).toBeNull();
    });

    it('should list available processors', () => {
      const available = PostProcessorFactory.getAvailable();
      expect(available).toContain('cursor');
      expect(available).toContain('claude-code');
    });

    it('should allow registering custom processors', () => {
      class CustomProcessor {
        process(content: string) {
          return `<!-- Custom --> ${content}`;
        }
      }

      PostProcessorFactory.register('custom', () => new CustomProcessor());
      
      const processor = PostProcessorFactory.create('custom');
      expect(processor).toBeInstanceOf(CustomProcessor);
      
      const result = processor!.process('test', {} as HandlebarsContext);
      expect(result).toContain('<!-- Custom --> test');
    });
  });
});