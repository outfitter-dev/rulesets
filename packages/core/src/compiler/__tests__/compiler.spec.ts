import { describe, it, expect } from 'vitest';
import { compile } from '../index';
import type { ParsedDoc } from '../../interfaces';

describe('compiler', () => {
  describe('compile', () => {
    it('should compile a document with frontmatter and body', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          content: `---
mixdown: v0
title: Test Rules
description: Test description
destinations:
  cursor:
    outputPath: ".cursor/rules/test.mdc"
    priority: high
---

# Test Content

This is the body with {{stems}} and {{$variables}}.`,
          frontmatter: {
            mixdown: 'v0',
            title: 'Test Rules',
            description: 'Test description',
            destinations: {
              cursor: {
                outputPath: '.cursor/rules/test.mdc',
                priority: 'high',
              },
            },
          },
        },
        ast: {
          stems: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compile(parsedDoc, 'cursor');

      // Source should be preserved
      expect(result.source).toEqual(parsedDoc.source);

      // AST should pass through
      expect(result.ast).toEqual(parsedDoc.ast);

      // Output should contain only the body
      expect(result.output.content).toBe('# Test Content\n\nThis is the body with {{stems}} and {{$variables}}.');

      // Metadata should include relevant fields
      expect(result.output.metadata).toEqual({
        title: 'Test Rules',
        description: 'Test description',
        version: undefined,
        outputPath: '.cursor/rules/test.mdc',
        priority: 'high',
      });

      // Context should include destination and config
      expect(result.context.destinationId).toBe('cursor');
      expect(result.context.config).toEqual({
        outputPath: '.cursor/rules/test.mdc',
        priority: 'high',
      });
    });

    it('should handle document without frontmatter', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          content: '# Just Content\n\nNo frontmatter here.',
        },
        ast: {
          stems: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compile(parsedDoc, 'windsurf');

      expect(result.output.content).toBe('# Just Content\n\nNo frontmatter here.');
      expect(result.output.metadata).toEqual({
        title: undefined,
        description: undefined,
        version: undefined,
      });
      expect(result.context.destinationId).toBe('windsurf');
    });

    it('should merge project config with destination config', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          content: `---
mixdown: v0
destinations:
  cursor:
    outputPath: ".cursor/rules/test.mdc"
    priority: high
---

# Content`,
          frontmatter: {
            mixdown: 'v0',
            destinations: {
              cursor: {
                outputPath: '.cursor/rules/test.mdc',
                priority: 'high',
              },
            },
          },
        },
        ast: {
          stems: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const projectConfig = {
        baseUrl: 'https://example.com',
        debug: true,
      };

      const result = compile(parsedDoc, 'cursor', projectConfig);

      expect(result.context.config).toEqual({
        baseUrl: 'https://example.com',
        debug: true,
        outputPath: '.cursor/rules/test.mdc',
        priority: 'high',
      });
    });

    it('should handle empty body after frontmatter', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          content: `---
mixdown: v0
---`,
          frontmatter: {
            mixdown: 'v0',
          },
        },
        ast: {
          stems: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compile(parsedDoc, 'cursor');

      expect(result.output.content).toBe('');
    });

    it('should preserve markers in output for v0', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          content: `---
mixdown: v0
---

{{instructions}}
Do not modify these markers in v0.
{{/instructions}}

{{> common-rules}}

The value is {{$myVariable}}.`,
          frontmatter: {
            mixdown: 'v0',
          },
        },
        ast: {
          stems: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compile(parsedDoc, 'cursor');

      expect(result.output.content).toContain('{{instructions}}');
      expect(result.output.content).toContain('{{/instructions}}');
      expect(result.output.content).toContain('{{> common-rules}}');
      expect(result.output.content).toContain('{{$myVariable}}');
    });

    it('should handle destination without config', () => {
      const parsedDoc: ParsedDoc = {
        source: {
          content: `---
mixdown: v0
destinations:
  cursor:
    path: "/test"
  windsurf: {}
---

# Content`,
          frontmatter: {
            mixdown: 'v0',
            destinations: {
              cursor: { path: '/test' },
              windsurf: {},
            },
          },
        },
        ast: {
          stems: [],
          imports: [],
          variables: [],
          markers: [],
        },
      };

      const result = compile(parsedDoc, 'windsurf');

      expect(result.context.config).toEqual({});
      expect(result.output.metadata).toEqual({
        title: undefined,
        description: undefined,
        version: undefined,
      });
    });
  });
describe('additional edge cases', () => {
  const baseAst = { stems: [], imports: [], variables: [], markers: [] };

  function makeDoc(content: string, frontmatter?: any): ParsedDoc {
    return {
      source: frontmatter
        ? { content, frontmatter }
        : { content },
      ast: baseAst,
    } as ParsedDoc;
  }

  it('should throw when destination id is missing', () => {
    const doc = makeDoc('# No destination front-matter');
    expect(() => compile(doc, 'not-there')).toThrow();
  });

  it('should fill undefined metadata fields when front-matter keys are absent', () => {
    const doc = makeDoc(`# Content without title/description`, { mixdown: 'v0' });
    const { output } = compile(doc, 'windsurf');
    expect(output.metadata).toEqual(
      expect.objectContaining({
        title: undefined,
        description: undefined,
        version: undefined,
      }),
    );
  });

  it('should let destination config override project config on key conflict', () => {
    const doc = makeDoc(
      `---
mixdown: v0
destinations:
  cursor:
    path: "/dest"
    priority: low
---
# body`,
      {
        mixdown: 'v0',
        destinations: { cursor: { path: '/dest', priority: 'low' } },
      },
    );

    const result = compile(doc, 'cursor', { priority: 'high', debug: false });
    expect(result.context.config).toEqual(
      expect.objectContaining({ priority: 'low', debug: false }),
    );
  });

  it('should still return output for unsupported mixdown version', () => {
    const doc = makeDoc(`---
mixdown: v99
---
{{marker}}
`, { mixdown: 'v99' });
    const result = compile(doc, 'cursor');
    expect(result.output.content).toContain('{{marker}}');
  });

  it('should handle totally empty content gracefully', () => {
    const doc = makeDoc('');
    const res = compile(doc, 'cursor');
    expect(res.output.content).toBe('');
    expect(res.output.metadata).toEqual({
      title: undefined,
      description: undefined,
      version: undefined,
    });
  });
});