// TLDR: Parse frontmatter and body from Markdown content (mixd-v0)
import { load } from 'js-yaml';
import type { ParsedDoc } from '../interfaces/compiled-doc';

const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n?/;

// <!-- TLDR: Parses Markdown content into frontmatter and body -->
export async function parse(content: string): Promise<ParsedDoc> {
  const match = content.match(FRONTMATTER_REGEX);
  const frontmatter = match ? (load(match[1]) as Record<string, any>) : undefined;
  const body = match ? content.slice(match[0].length) : content;
  return {
    source: { content, frontmatter },
    ast: { stems: [], imports: [], variables: [], markers: [] },
    errors: []
  };
}
