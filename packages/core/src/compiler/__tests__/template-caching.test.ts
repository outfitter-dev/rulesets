/**
 * Tests for the Handlebars template caching system
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { HandlebarsRulesetCompiler } from '../handlebars-compiler';
import type { ParsedDoc } from '../../interfaces';

describe('Handlebars Template Caching System', () => {
  let compiler: HandlebarsRulesetCompiler;

  beforeEach(() => {
    compiler = new HandlebarsRulesetCompiler({ cacheEnabled: true, maxCacheSize: 100 });
  });

  it('should cache compiled templates and reuse them', () => {
    const templateContent = `
# Test Template

{{#instructions}}
These are instructions for {{provider.name}}.
{{/instructions}}

Provider type: {{provider.type}}
`;

    const parsedDoc: ParsedDoc = {
      source: {
        path: '/test/template.md',
        content: templateContent,
        frontmatter: { title: 'Test' }
      },
      ast: { blocks: [], imports: [], variables: [], markers: [] },
      errors: []
    };

    // First compilation - should cache the template
    const result1 = compiler.compile(parsedDoc, 'cursor');
    expect(result1.output.content).toContain('Cursor');
    
    const stats1 = compiler.getCacheStats();
    expect(stats1.size).toBe(1);
    expect(stats1.entries[0].accessCount).toBe(1);

    // Second compilation with same content - should use cache
    const result2 = compiler.compile(parsedDoc, 'windsurf');
    expect(result2.output.content).toContain('Windsurf');
    
    const stats2 = compiler.getCacheStats();
    expect(stats2.size).toBe(1); // Still only one template cached
    expect(stats2.entries[0].accessCount).toBe(2); // Access count increased
  });

  it('should handle different templates with separate cache entries', () => {
    const template1 = '# Template 1\n{{provider.name}}';
    const template2 = '# Template 2\n{{provider.type}}';

    const parsedDoc1: ParsedDoc = {
      source: { path: '/test1.md', content: template1, frontmatter: {} },
      ast: { blocks: [], imports: [], variables: [], markers: [] },
      errors: []
    };

    const parsedDoc2: ParsedDoc = {
      source: { path: '/test2.md', content: template2, frontmatter: {} },
      ast: { blocks: [], imports: [], variables: [], markers: [] },
      errors: []
    };

    compiler.compile(parsedDoc1, 'cursor');
    compiler.compile(parsedDoc2, 'cursor');

    const stats = compiler.getCacheStats();
    expect(stats.size).toBe(2);
    expect(stats.entries.length).toBe(2);
  });

  it('should evict old templates when cache is full', () => {
    const smallCacheCompiler = new HandlebarsRulesetCompiler({ 
      cacheEnabled: true, 
      maxCacheSize: 3 
    });

    // Fill cache to capacity
    for (let i = 1; i <= 3; i++) {
      const template = `# Template ${i}\n{{provider.name}}`;
      const parsedDoc: ParsedDoc = {
        source: { path: `/test${i}.md`, content: template, frontmatter: {} },
        ast: { blocks: [], imports: [], variables: [], markers: [] },
        errors: []
      };
      smallCacheCompiler.compile(parsedDoc, 'cursor');
    }

    expect(smallCacheCompiler.getCacheStats().size).toBe(3);

    // Add one more to trigger eviction
    const template4 = '# Template 4\n{{provider.name}}';
    const parsedDoc4: ParsedDoc = {
      source: { path: '/test4.md', content: template4, frontmatter: {} },
      ast: { blocks: [], imports: [], variables: [], markers: [] },
      errors: []
    };
    smallCacheCompiler.compile(parsedDoc4, 'cursor');

    // Should still be at capacity, but oldest entry should be evicted
    const stats = smallCacheCompiler.getCacheStats();
    expect(stats.size).toBe(3);
  });

  it('should generate consistent hashes for identical content', () => {
    const template = '# Test\n{{provider.name}}';
    
    // Use reflection to access private method for testing
    const compiler1 = new HandlebarsRulesetCompiler();
    const compiler2 = new HandlebarsRulesetCompiler();

    // Access private method via any casting for testing
    const hash1 = (compiler1 as any).generateContentHash(template);
    const hash2 = (compiler2 as any).generateContentHash(template);

    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe('string');
    expect(hash1.length).toBe(16); // Truncated SHA256
  });

  it('should generate different hashes for different content', () => {
    const template1 = '# Test 1\n{{provider.name}}';
    const template2 = '# Test 2\n{{provider.type}}';

    const hash1 = (compiler as any).generateContentHash(template1);
    const hash2 = (compiler as any).generateContentHash(template2);

    expect(hash1).not.toBe(hash2);
  });

  it('should work correctly when caching is disabled', () => {
    const noCacheCompiler = new HandlebarsRulesetCompiler({ cacheEnabled: false });

    const template = '# No Cache Test\n{{provider.name}}';
    const parsedDoc: ParsedDoc = {
      source: { path: '/test.md', content: template, frontmatter: {} },
      ast: { blocks: [], imports: [], variables: [], markers: [] },
      errors: []
    };

    const result1 = noCacheCompiler.compile(parsedDoc, 'cursor');
    const result2 = noCacheCompiler.compile(parsedDoc, 'windsurf');

    expect(result1.output.content).toContain('Cursor');
    expect(result2.output.content).toContain('Windsurf');

    // Cache should remain empty
    const stats = noCacheCompiler.getCacheStats();
    expect(stats.size).toBe(0);
  });

  it('should clear cache when requested', () => {
    const template = '# Clear Test\n{{provider.name}}';
    const parsedDoc: ParsedDoc = {
      source: { path: '/test.md', content: template, frontmatter: {} },
      ast: { blocks: [], imports: [], variables: [], markers: [] },
      errors: []
    };

    compiler.compile(parsedDoc, 'cursor');
    expect(compiler.getCacheStats().size).toBe(1);

    compiler.clearTemplateCache();
    expect(compiler.getCacheStats().size).toBe(0);
  });

  it('should support cache preheating', () => {
    const templates = [
      '# Template 1\n{{provider.name}}',
      '# Template 2\n{{provider.type}}',
      '# Template 3\n{{provider.id}}'
    ];

    compiler.preheatCache(templates);

    const stats = compiler.getCacheStats();
    expect(stats.size).toBe(3);
    expect(stats.entries.every(entry => entry.accessCount === 1)).toBe(true);
  });

  it('should handle cache enable/disable toggle', () => {
    const template = '# Toggle Test\n{{provider.name}}';
    const parsedDoc: ParsedDoc = {
      source: { path: '/test.md', content: template, frontmatter: {} },
      ast: { blocks: [], imports: [], variables: [], markers: [] },
      errors: []
    };

    // Initially enabled
    compiler.compile(parsedDoc, 'cursor');
    expect(compiler.getCacheStats().size).toBe(1);

    // Disable caching - should clear cache
    compiler.setCacheEnabled(false);
    expect(compiler.getCacheStats().size).toBe(0);

    // Compile with caching disabled
    compiler.compile(parsedDoc, 'windsurf');
    expect(compiler.getCacheStats().size).toBe(0);

    // Re-enable caching
    compiler.setCacheEnabled(true);
    compiler.compile(parsedDoc, 'cursor');
    expect(compiler.getCacheStats().size).toBe(1);
  });

  it('should handle preheating with invalid templates gracefully', () => {
    const templates = [
      '# Valid Template\n{{provider.name}}',
      '{{#invalid-handlebars-syntax}', // Invalid template
      '# Another Valid Template\n{{provider.type}}'
    ];

    // Should not throw, but should skip invalid templates
    expect(() => compiler.preheatCache(templates)).not.toThrow();

    const stats = compiler.getCacheStats();
    expect(stats.size).toBeGreaterThan(0);
  });

  it('should provide accurate cache statistics', () => {
    const template1 = '# Stats Test 1\n{{provider.name}}';
    const template2 = '# Stats Test 2\n{{provider.type}}';

    const parsedDoc1: ParsedDoc = {
      source: { path: '/test1.md', content: template1, frontmatter: {} },
      ast: { blocks: [], imports: [], variables: [], markers: [] },
      errors: []
    };

    const parsedDoc2: ParsedDoc = {
      source: { path: '/test2.md', content: template2, frontmatter: {} },
      ast: { blocks: [], imports: [], variables: [], markers: [] },
      errors: []
    };

    // First compilation
    compiler.compile(parsedDoc1, 'cursor');
    
    // Second compilation (same template)
    compiler.compile(parsedDoc1, 'windsurf');
    
    // Third compilation (different template)
    compiler.compile(parsedDoc2, 'cursor');

    const stats = compiler.getCacheStats();
    
    expect(stats.size).toBe(2);
    expect(stats.maxSize).toBe(100);
    expect(stats.entries.length).toBe(2);

    // Find the entry for template1 (should have higher access count)
    const template1Entry = stats.entries.find(entry => 
      entry.accessCount === 2
    );
    const template2Entry = stats.entries.find(entry => 
      entry.accessCount === 1
    );

    expect(template1Entry).toBeDefined();
    expect(template2Entry).toBeDefined();
    expect(template1Entry?.accessCount).toBe(2);
    expect(template2Entry?.accessCount).toBe(1);
  });

  it('should handle templates with complex Handlebars syntax', () => {
    const complexTemplate = `
# Complex Template

{{#instructions}}
Provider: {{provider.name}}
{{#if provider.capabilities}}
Capabilities:
{{#each provider.capabilities}}
- {{this}}
{{/each}}
{{/if}}
{{/instructions}}

Provider ID: {{provider.id}}
`;

    const parsedDoc: ParsedDoc = {
      source: { path: '/complex.md', content: complexTemplate, frontmatter: {} },
      ast: { blocks: [], imports: [], variables: [], markers: [] },
      errors: []
    };

    const result1 = compiler.compile(parsedDoc, 'cursor');
    const result2 = compiler.compile(parsedDoc, 'cursor'); // Should use cache

    expect(result1.output.content).toContain('Cursor');
    expect(result1.output.content).toContain('cursor'); // Provider ID
    expect(result2.output.content).toContain('Cursor');

    const stats = compiler.getCacheStats();
    expect(stats.size).toBe(1);
    expect(stats.entries[0].accessCount).toBe(2);
  });
});