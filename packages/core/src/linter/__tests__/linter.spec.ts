// TLDR: Tests for the linter module to ensure proper validation of frontmatter schema (mixd-v0)

import { describe, it, expect } from 'vitest';
import { lint, LinterConfig } from '../index';
import { ParsedDoc } from '../../interfaces/compiled-doc';

describe('Linter module', () => {
  const createParsedDoc = (frontmatter: Record<string, any> = {}, errors?: Array<{ message: string; line?: number; column?: number }>): ParsedDoc => ({
    source: {
      content: '# Test Content',
      frontmatter,
    },
    ast: {
      stems: [],
      imports: [],
      variables: [],
      markers: [],
    },
    errors,
  });

  it('should pass validation with valid frontmatter', async () => {
    const parsedDoc = createParsedDoc({
      mixdown: 'v0',
      title: 'Test Document',
      destinations: {
        'cursor': {
          outputPath: '.cursor/rules/test.mdc',
        },
      },
    });

    const results = await lint(parsedDoc);
    expect(results).toEqual([]);
  });

  it('should report error when frontmatter is missing', async () => {
    const parsedDoc = createParsedDoc({});
    const results = await lint(parsedDoc);

    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('mixdown');
    expect(results[0].severity).toBe('error');
  });

  it('should report error when mixdown key is missing', async () => {
    const parsedDoc = createParsedDoc({
      title: 'Test Document',
      destinations: {
        'cursor': {
          outputPath: '.cursor/rules/test.mdc',
        },
      },
    });

    const results = await lint(parsedDoc);
    
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain("'mixdown' key is missing");
    expect(results[0].severity).toBe('error');
  });

  it('should report error when destinations are missing', async () => {
    const parsedDoc = createParsedDoc({
      mixdown: 'v0',
      title: 'Test Document',
    });

    const results = await lint(parsedDoc);
    
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain("'destinations' object is missing");
    expect(results[0].severity).toBe('error');
  });

  it('should report error for invalid destination ID format', async () => {
    const parsedDoc = createParsedDoc({
      mixdown: 'v0',
      title: 'Test Document',
      destinations: {
        'Invalid_ID': {
          outputPath: '.cursor/rules/test.mdc',
        },
      },
    });

    const results = await lint(parsedDoc);
    
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain("must be kebab-case");
    expect(results[0].severity).toBe('error');
  });

  it('should report error for non-object destination config', async () => {
    const parsedDoc = createParsedDoc({
      mixdown: 'v0',
      title: 'Test Document',
      destinations: {
        'cursor': 'not an object',
      },
    });

    const results = await lint(parsedDoc);
    
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain("must be an object");
    expect(results[0].severity).toBe('error');
  });

  it('should report error for empty destinations object', async () => {
    const parsedDoc = createParsedDoc({
      mixdown: 'v0',
      title: 'Test Document',
      destinations: {},
    });

    const results = await lint(parsedDoc);
    
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain("At least one destination must be defined");
    expect(results[0].severity).toBe('error');
  });

  it('should include parser errors in linting results', async () => {
    const parsedDoc = createParsedDoc(
      { mixdown: 'v0' },
      [{ message: 'Parser error: Invalid frontmatter syntax', line: 2, column: 5 }]
    );

    const results = await lint(parsedDoc);
    
    expect(results).toHaveLength(2); // Parser error + missing destinations
    expect(results[0].message).toContain("Parser error");
    expect(results[0].line).toBe(2);
    expect(results[0].column).toBe(5);
  });

  it('should respect custom config options', async () => {
    const parsedDoc = createParsedDoc({
      title: 'Test Document', // No mixdown key
    });

    const customConfig: LinterConfig = {
      requireMixdownKey: false,
      requireDestinations: false,
    };

    const results = await lint(parsedDoc, customConfig);
    expect(results).toEqual([]);
  });
});