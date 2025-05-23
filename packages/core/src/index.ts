// TLDR: Mixdown v0 orchestration entry point (mixd-v0)
import { parse } from './parser';
import { lint } from './linter';
import { compile } from './compiler';
import { cursorPlugin, windsurfPlugin } from './destinations';
import type { Logger } from './interfaces/logger';

// <!-- TLDR: Runs the Mixdown v0 process for a single file -->
export async function runMixdownV0(source: string, logger: Logger): Promise<void> {
  const parsed = await parse(source);
  const lintResults = await lint(parsed);
  lintResults.forEach(r => logger.info(r.message));
  const compiledCursor = await compile(parsed, 'cursor');
  await cursorPlugin.write({ compiled: compiledCursor, destPath: '.mixdown/dist/cursor/output.md', config: {}, logger });
  const compiledWindsurf = await compile(parsed, 'windsurf');
  await windsurfPlugin.write({ compiled: compiledWindsurf, destPath: '.mixdown/dist/windsurf/output.md', config: {}, logger });
}
