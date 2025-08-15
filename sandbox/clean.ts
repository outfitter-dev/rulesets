#!/usr/bin/env bun

/**
 * Clean Sandbox Output
 *
 * Removes all generated files from the sandbox output directory
 * while preserving the directory structure.
 */

import { existsSync, mkdirSync, rmSync } from 'node:fs';

const OUTPUT_DIR = './sandbox/output';

console.log('🧹 Cleaning sandbox output...');

if (existsSync(OUTPUT_DIR)) {
  rmSync(OUTPUT_DIR, { recursive: true });
  console.log('✅ Removed existing output directory');
}

mkdirSync(OUTPUT_DIR, { recursive: true });
await Bun.write(`${OUTPUT_DIR}/.gitkeep`, '# Sandbox output directory\n');

console.log('✨ Sandbox cleaned and ready for use!');
console.log(`📁 Clean output directory: ${OUTPUT_DIR}`);
console.log('');
console.log('🎮 Try running an example:');
console.log('   bun sandbox/run.ts examples/basic-rules.ruleset.md');
