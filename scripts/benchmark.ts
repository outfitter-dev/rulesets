#!/usr/bin/env bun

/**
 * Benchmark script to compare build times
 */

import { $ } from 'bun';

async function benchmark() {
  console.log('🏁 Benchmarking Bun-native build system...\n');

  // Clean build
  console.log('📦 Cold Build (with clean):');
  const cleanBuildStart = performance.now();
  await $`bun scripts/run.ts build --parallel --clean`.quiet();
  const cleanBuildEnd = performance.now();
  const cleanBuildTime = ((cleanBuildEnd - cleanBuildStart) / 1000).toFixed(2);
  console.log(`  Time: ${cleanBuildTime}s\n`);

  // Incremental build
  console.log('🔄 Incremental Build (no changes):');
  const incrementalStart = performance.now();
  await $`bun scripts/run.ts build --parallel`.quiet();
  const incrementalEnd = performance.now();
  const incrementalTime = ((incrementalEnd - incrementalStart) / 1000).toFixed(
    2
  );
  console.log(`  Time: ${incrementalTime}s\n`);

  // Test suite
  console.log('🧪 Test Suite:');
  const testStart = performance.now();
  await $`bun scripts/run.ts test`.quiet().catch(() => {});
  const testEnd = performance.now();
  const testTime = ((testEnd - testStart) / 1000).toFixed(2);
  console.log(`  Time: ${testTime}s\n`);

  // Type checking
  console.log('🔍 Type Checking:');
  const typecheckStart = performance.now();
  await $`bun scripts/run.ts typecheck --parallel`.quiet().catch(() => {});
  const typecheckEnd = performance.now();
  const typecheckTime = ((typecheckEnd - typecheckStart) / 1000).toFixed(2);
  console.log(`  Time: ${typecheckTime}s\n`);

  // Summary
  console.log('='.repeat(50));
  console.log('📊 Benchmark Summary:');
  console.log('='.repeat(50));
  console.log(`  Cold Build:        ${cleanBuildTime}s`);
  console.log(`  Incremental Build: ${incrementalTime}s`);
  console.log(`  Test Suite:        ${testTime}s`);
  console.log(`  Type Check:        ${typecheckTime}s`);
  console.log('='.repeat(50));

  const totalTime =
    Number.parseFloat(cleanBuildTime) +
    Number.parseFloat(incrementalTime) +
    Number.parseFloat(testTime) +
    Number.parseFloat(typecheckTime);
  console.log(`  Total:             ${totalTime.toFixed(2)}s`);

  console.log('\n✨ Benchmark complete!');
}

if (import.meta.main) {
  benchmark();
}
