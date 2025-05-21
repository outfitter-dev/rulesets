// TLDR: Tests for compiler pass-through behavior (mixd-v0)
import { compile } from '../index';
import { describe, it, expect } from 'vitest';
import type { ParsedDoc } from '../../interfaces/compiled-doc';

const parsed: ParsedDoc = {
  source: { content: '---\nmixdown: v0\n---\nbody', frontmatter: { mixdown: 'v0' } },
  ast: { stems: [], imports: [], variables: [], markers: [] }
};

describe('compile', () => {
  it('passes through body content', async () => {
    const result = await compile(parsed, 'cursor');
    expect(result.output.content).toBe('body');
    expect(result.context.destinationId).toBe('cursor');
  });
});
