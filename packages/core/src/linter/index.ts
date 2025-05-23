// TLDR: Validate frontmatter schema (mixd-v0)
import type { ParsedDoc } from '../interfaces/compiled-doc';

export interface LintResult {
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning';
}

export interface LinterConfig {
  requiredMixdownKey?: boolean;
}

// <!-- TLDR: Lints parsed document frontmatter -->
export async function lint(parsed: ParsedDoc, config: LinterConfig = { requiredMixdownKey: true }): Promise<LintResult[]> {
  const results: LintResult[] = [];
  if (config.requiredMixdownKey && (!parsed.source.frontmatter || !parsed.source.frontmatter.mixdown)) {
    results.push({ message: 'Missing required "mixdown" frontmatter key', severity: 'error' });
  }
  return results;
}
