#!/usr/bin/env bun

/**
 * Turbo-compatible wrapper for Bun scripts
 *
 * This wrapper allows the same commands to work with or without Turbo:
 * - Direct: `bun run build` → runs Bun scripts directly
 * - Turbo: `turbo build` → Turbo calls this wrapper
 *
 * When Turbo is added later, no script changes needed!
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { $ } from 'bun';

const command = process.argv[2];
const args = process.argv.slice(3);

// Check if we're in a workspace package or root
const cwd = process.cwd();
const packageJsonPath = join(cwd, 'package.json');

if (!existsSync(packageJsonPath)) {
  console.error('❌ No package.json found in current directory');
  process.exit(1);
}

const packageJson = await Bun.file(packageJsonPath).json();
const isRoot = packageJson.name === 'rulesets';

// Map commands to their implementations
const commandMap: Record<string, string> = {
  // Root-level commands use our custom scripts
  build: isRoot ? 'bun scripts/build.ts' : 'bun run build:package',
  test: isRoot ? 'bun scripts/test.ts' : 'bun test',
  typecheck: isRoot ? 'bun scripts/typecheck.ts' : 'tsc --noEmit',
  lint: isRoot ? 'bun x ultracite@latest lint' : 'bun x ultracite@latest lint',
  dev: isRoot ? 'bun scripts/dev.ts' : 'bun run dev:package',
  clean: 'rm -rf dist coverage *.tsbuildinfo',
};

const implementation = commandMap[command];

if (!implementation) {
  console.error(`❌ Unknown command: ${command}`);
  console.log('Available commands:', Object.keys(commandMap).join(', '));
  process.exit(1);
}

// Execute the command
try {
  await $`${implementation} ${args.join(' ')}`.quiet(false);
} catch (error) {
  process.exit(1);
}
