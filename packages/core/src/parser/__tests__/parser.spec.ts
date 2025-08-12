// TLDR: Unit tests for the Rulesets parser module
import { describe, expect, it } from 'vitest';
import { parse } from '../index';

describe('parser', () => {
  describe('parse', () => {
    it('should parse a document with frontmatter and body', async () => {
      const content = `---
ruleset: v0
title: Test Rule
destinations:
  cursor:
    path: ".cursor/rules/test.mdc"
---

# Test Content

This is the body content.`;

      const result = await parse(content);

      expect(result.source.content).toBe(content);
      expect(result.source.frontmatter).toEqual({
        ruleset: 'v0',
        title: 'Test Rule',
        destinations: {
          cursor: {
            path: '.cursor/rules/test.mdc',
          },
        },
      });
      expect(result.ast.blocks).toEqual([]);
      expect(result.ast.imports).toEqual([]);
      expect(result.ast.variables).toEqual([]);
      expect(result.ast.markers).toEqual([]);
      expect(result.errors).toBeUndefined();
    });

    it('should parse a document without frontmatter', async () => {
      const content = `# Test Content

This is a document without frontmatter.`;

      const result = await parse(content);

      expect(result.source.content).toBe(content);
      expect(result.source.frontmatter).toBeUndefined();
      expect(result.errors).toBeUndefined();
    });

    it('should handle empty frontmatter', async () => {
      const content = `---
---

# Test Content`;

      const result = await parse(content);

      expect(result.source.frontmatter).toBeUndefined();
      expect(result.errors).toBeUndefined();
    });

    it('should report error for invalid YAML frontmatter', async () => {
      const content = `---
invalid: yaml: content
  bad indentation
---

# Test Content`;

      const result = await parse(content);

      expect(result.errors).toBeDefined();
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0]?.message).toContain('Invalid YAML syntax');
      expect(result.errors![0]?.line).toBe(1);
    });

    it('should report error for unclosed frontmatter', async () => {
      const content = `---
title: Test
description: Missing closing delimiter

# Test Content`;

      const result = await parse(content);

      expect(result.errors).toBeDefined();
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0]?.message).toContain(
        'Unclosed frontmatter block'
      );
      expect(result.errors![0]?.line).toBe(1);
    });

    it('should handle empty content', async () => {
      const content = '';

      const result = await parse(content);

      expect(result.source.content).toBe('');
      expect(result.source.frontmatter).toBeUndefined();
      expect(result.errors).toBeUndefined();
    });

    it('should preserve body content exactly as-is', async () => {
      const content = `---
title: Test
---

# Test Content

This has {{blocks}} and {{$variables}} and {{>imports}} that should be preserved.`;

      const result = await parse(content);

      const expectedBody =
        '\n# Test Content\n\nThis has {{blocks}} and {{$variables}} and {{>imports}} that should be preserved.';
      expect(result.source.content).toContain(expectedBody);
    });
  });
});
