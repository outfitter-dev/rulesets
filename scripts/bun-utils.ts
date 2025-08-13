#!/usr/bin/env bun

/**
 * Bun utility scripts demonstrating native capabilities
 */

import { parseArgs } from 'node:util';
import { $ } from 'bun';

// Parse command line arguments
const { values } = parseArgs({
  args: Bun.argv,
  options: {
    command: {
      type: 'string',
      short: 'c',
    },
    help: {
      type: 'boolean',
      short: 'h',
    },
  },
  strict: true,
  allowPositionals: true,
});

// Command handlers
const commands = {
  async clean() {
    console.log('🧹 Cleaning build artifacts...');
    await $`rm -rf dist .turbo node_modules bun.lockb`;
    console.log('✅ Clean complete');
  },

  async typecheck() {
    console.log('🔍 Type checking...');
    const result = await $`bun x tsc --noEmit`.quiet();
    if (result.exitCode === 0) {
      console.log('✅ Type check passed');
    } else {
      console.error('❌ Type check failed');
      process.exit(1);
    }
  },

  async bundle() {
    console.log('📦 Building with Bun bundler...');
    const result = await Bun.build({
      entrypoints: ['./packages/core/src/index.ts'],
      outdir: './dist',
      target: 'node',
      minify: true,
      sourcemap: 'external',
      external: ['react', 'react-dom'],
    });

    if (result.success) {
      console.log('✅ Bundle complete');
    } else {
      console.error('❌ Bundle failed:', result.logs);
      process.exit(1);
    }
  },

  async serve() {
    console.log('🚀 Starting development server...');
    Bun.serve({
      port: 3000,
      development: true,
      fetch() {
        return new Response('Bun development server running!');
      },
    });
    console.log('Server running at http://localhost:3000');
  },

  help() {
    console.log(`
Bun Utility Scripts

Usage: bun scripts/bun-utils.ts [command]

Commands:
  clean      Remove build artifacts and dependencies
  typecheck  Run TypeScript type checking
  bundle     Build packages with Bun bundler
  serve      Start development server
  help       Show this help message

Examples:
  bun scripts/bun-utils.ts clean
  bun scripts/bun-utils.ts --command=typecheck
`);
  },
};

// Main execution
if (values.help || !values.command) {
  commands.help();
} else if (values.command in commands) {
  await commands[values.command as keyof typeof commands]();
} else {
  console.error(`Unknown command: ${values.command}`);
  commands.help();
  process.exit(1);
}
