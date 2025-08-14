#!/usr/bin/env bun

/**
 * Fix critical linting and TypeScript issues in the codebase
 */

import { promises as fs } from 'node:fs';
import { glob } from 'glob';

async function fixNodeImports(filePath: string) {
  let content = await fs.readFile(filePath, 'utf-8');

  // Fix Node.js import protocols
  const nodeModules = [
    'fs',
    'path',
    'crypto',
    'util',
    'stream',
    'os',
    'perf_hooks',
    'child_process',
    'url',
  ];

  for (const module of nodeModules) {
    // Handle various import patterns
    content = content.replace(
      new RegExp(`from ['"]${module}['"]`, 'g'),
      `from 'node:${module}'`
    );
  }

  await fs.writeFile(filePath, content);
}

async function removeSkippedTests(filePath: string) {
  let content = await fs.readFile(filePath, 'utf-8');

  // Remove .skip from tests
  content = content.replace(/test\.skip\(/g, 'test(');
  content = content.replace(/it\.skip\(/g, 'it(');
  content = content.replace(/describe\.skip\(/g, 'describe(');

  await fs.writeFile(filePath, content);
}

async function fixAsyncFunctions(filePath: string) {
  const content = await fs.readFile(filePath, 'utf-8');

  // This is more complex and would need proper AST parsing
  // For now, just flag files that need manual review
  if (content.includes('async ') && !content.includes('await ')) {
    console.log(`⚠️  File may have async without await: ${filePath}`);
  }
}

async function main() {
  console.log('🔧 Fixing critical issues...\n');

  // Find all TypeScript files
  const tsFiles = await glob('**/*.ts', {
    ignore: ['node_modules/**', '.turbo/**', 'dist/**', 'build/**'],
  });

  console.log(`Found ${tsFiles.length} TypeScript files\n`);

  // Fix Node.js imports
  console.log('📦 Fixing Node.js import protocols...');
  for (const file of tsFiles) {
    await fixNodeImports(file);
  }

  // Fix test files
  console.log('✅ Removing skipped tests...');
  const testFiles = tsFiles.filter(
    (f) => f.includes('.test.') || f.includes('.spec.')
  );
  for (const file of testFiles) {
    await removeSkippedTests(file);
  }

  // Check for async issues
  console.log('🔍 Checking for async/await issues...');
  for (const file of tsFiles) {
    await fixAsyncFunctions(file);
  }

  console.log('\n✨ Critical fixes applied!');
  console.log('Run "bun run lint" to check remaining issues');
}

main().catch(console.error);
