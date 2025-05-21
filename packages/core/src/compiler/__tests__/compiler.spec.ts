// TLDR: Tests for the compiler module to verify pass-through behavior (mixd-v0)

import { describe, it, expect } from 'vitest';
import { compile } from '../index';
import { ParsedDoc } from '../../interfaces/compiled-doc';

describe('Compiler module', () => {
  const createParsedDoc = (content: string, frontmatter: Record<string, any> = {}): ParsedDoc => ({
    source: {
      content,
      frontmatter,
    },
    ast: {
      stems: [],
      imports: [],
      variables: [],
      markers: [],
    },
  });

  it('should compile a document with pass-through behavior', async () => {
    const content = '# Test Content\n\nThis is some test content.';
    const parsedDoc = createParsedDoc(content, {
      mixdown: 'v0',
      title: 'Test Document',
      destinations: {
        'cursor': {
          outputPath: '.cursor/rules/test.mdc',
        },
      },
    });

    const result = await compile(parsedDoc, 'cursor');

    // Verify source is preserved
    expect(result.source).toEqual(parsedDoc.source);
    
    // Verify AST is preserved
    expect(result.ast).toEqual(parsedDoc.ast);
    
    // Verify output content is the raw body (pass-through)
    expect(result.output.content).toBe(content);
    
    // Verify destination-specific metadata is set
    expect(result.output.metadata).toEqual({
      outputPath: '.cursor/rules/test.mdc',
    });
    
    // Verify context is set correctly
    expect(result.context).toEqual({
      destinationId: 'cursor',
      config: {},
    });
  });

  it('should handle content with markers (not processed in v0)', async () => {
    const content = '# Test with {{markers}}\n\nThis content has {{stem}}markers{{/stem}} which are not processed in v0.';
    const parsedDoc = createParsedDoc(content, {
      mixdown: 'v0',
      destinations: {
        'windsurf': {},
      },
    });

    const result = await compile(parsedDoc, 'windsurf');

    // Verify content is passed through unchanged
    expect(result.output.content).toBe(content);
  });

  it('should handle missing destination in frontmatter', async () => {
    const content = '# Test Content';
    const parsedDoc = createParsedDoc(content, {
      mixdown: 'v0',
      destinations: {
        'cursor': { outputPath: '.cursor/rules/test.mdc' },
      },
    });

    // Compile for a destination not in frontmatter
    const result = await compile(parsedDoc, 'windsurf');

    // Should still work but with empty metadata
    expect(result.output.content).toBe(content);
    expect(result.output.metadata).toEqual({});
    expect(result.context.destinationId).toBe('windsurf');
  });

  it('should respect project configuration', async () => {
    const content = '# Test Content';
    const parsedDoc = createParsedDoc(content, {
      mixdown: 'v0',
      destinations: {
        'cursor': {},
      },
    });

    const projectConfig = {
      outputDir: '.mixdown/dist',
      defaultDestination: 'cursor',
    };

    const result = await compile(parsedDoc, 'cursor', projectConfig);

    // Project config should be in context
    expect(result.context.config).toEqual(projectConfig);
  });
});