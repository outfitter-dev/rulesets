// TLDR: Tests for the parser module to ensure correct frontmatter extraction and body parsing (mixd-v0)

import { describe, it, expect } from 'vitest';
import { parse } from '../index';
import { ParsedDoc } from '../../interfaces/compiled-doc';

describe('Parser module', () => {
  it('should parse a document with frontmatter and body', async () => {
    const content = `---
title: Test Document
description: A test document for Mixdown
mixdown: v0
destinations:
  cursor:
    outputPath: ".cursor/rules/test.mdc"
---

# This is the body content

This is a paragraph in the body.`;

    const result = await parse(content);

    expect(result.source.frontmatter).toEqual({
      title: 'Test Document',
      description: 'A test document for Mixdown',
      mixdown: 'v0',
      destinations: {
        cursor: {
          outputPath: '.cursor/rules/test.mdc'
        }
      }
    });

    expect(result.source.content).toBe('# This is the body content\n\nThis is a paragraph in the body.');
    expect(result.ast.stems).toEqual([]);
    expect(result.ast.imports).toEqual([]);
    expect(result.ast.variables).toEqual([]);
    expect(result.ast.markers).toEqual([]);
    expect(result.errors).toBeUndefined();
  });

  it('should handle a document with no frontmatter', async () => {
    const content = '# This is just body content\n\nNo frontmatter here.';
    const result = await parse(content);

    expect(result.source.frontmatter).toEqual({});
    expect(result.source.content).toBe(content);
    expect(result.errors).toBeUndefined();
  });

  it('should handle empty content', async () => {
    const content = '';
    const result = await parse(content);

    expect(result.source.frontmatter).toEqual({});
    expect(result.source.content).toBe('');
    expect(result.errors).toBeUndefined();
  });

  it('should report errors for invalid YAML frontmatter', async () => {
    const content = `---
title: "Unclosed quote
mixdown: v0
---

# Body content`;

    const result = await parse(content);
    
    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toContain('Error parsing frontmatter');
    expect(result.source.content).toBe('# Body content');
  });

  it('should handle non-object frontmatter', async () => {
    const content = `---
- list item 1
- list item 2
---

# Body with array frontmatter`;

    const result = await parse(content);
    
    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toContain('must be a valid YAML object');
    expect(result.source.content).toBe('# Body with array frontmatter');
  });

  it('should handle frontmatter with markers (not processed in v0)', async () => {
    const content = `---
title: Test with Markers
markers:
  - {{stem-name}}
  - {{/stem-name}}
---

# Body with {{markers}} in it

This body has some {{unprocessed-markers}} which are ignored in v0.`;

    const result = await parse(content);
    
    expect(result.source.frontmatter).toEqual({
      title: 'Test with Markers',
      markers: ['{{stem-name}}', '{{/stem-name}}']
    });
    
    expect(result.source.content).toBe('# Body with {{markers}} in it\n\nThis body has some {{unprocessed-markers}} which are ignored in v0.');
    expect(result.ast.markers).toEqual([]);
  });
});