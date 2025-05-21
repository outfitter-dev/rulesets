// TLDR: Tests for parser frontmatter extraction (mixd-v0)
import { parse } from '../index';
import { describe, it, expect } from 'vitest';

describe('parse', () => {
  it('extracts frontmatter and body', async () => {
    const content = `---\nmixdown: v0\ntitle: Test\n---\nbody text`;
    const result = await parse(content);
    expect(result.source.frontmatter?.mixdown).toBe('v0');
    expect(result.source.content).toBe(content);
  });
});
