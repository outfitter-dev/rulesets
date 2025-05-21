// TLDR: Tests for linter frontmatter validation (mixd-v0)
import { lint } from '../index';
import { describe, it, expect } from 'vitest';
import type { ParsedDoc } from '../../interfaces/compiled-doc';

const parsed: ParsedDoc = {
  source: { content: '---\nmixdown: v0\n---\nbody', frontmatter: { mixdown: 'v0' } },
  ast: { stems: [], imports: [], variables: [], markers: [] }
};

describe('lint', () => {
  it('returns error when mixdown key missing', async () => {
    const bad: ParsedDoc = { ...parsed, source: { content: '---\n---\n', frontmatter: {} } };
    const res = await lint(bad);
    expect(res.length).toBe(1);
  });
  it('passes when mixdown key present', async () => {
    const res = await lint(parsed);
    expect(res.length).toBe(0);
  });
});
