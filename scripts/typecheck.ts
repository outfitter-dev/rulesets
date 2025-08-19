#!/usr/bin/env bun

/**
 * Bun-native typecheck runner for Rulesets monorepo
 * Runs TypeScript type checking in parallel for all packages
 */

import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { $ } from 'bun';

const ROOT_DIR = resolve(import.meta.dir, '..');

interface TypecheckOptions {
  parallel?: boolean;
  strict?: boolean;
}

/**
 * Typecheck a single package
 */
async function typecheckPackage(
  pkgPath: string,
  options: TypecheckOptions = {}
) {
  const fullPath = join(ROOT_DIR, pkgPath);
  const tsconfigPath = join(fullPath, 'tsconfig.json');

  if (!existsSync(tsconfigPath)) {
    return { success: true, skipped: true, package: pkgPath };
  }

  const pkgJsonPath = join(fullPath, 'package.json');
  const pkgJson = existsSync(pkgJsonPath)
    ? await Bun.file(pkgJsonPath).json()
    : { name: pkgPath };
  const pkgName = pkgJson.name || pkgPath;

  console.log(`🔍 Type checking ${pkgName}...`);

  try {
    const flags = ['--noEmit'];
    if (options.strict) {
      flags.push('--strict');
    }

    await $`cd ${fullPath} && bun x tsc ${flags.join(' ')}`.quiet();
    console.log(`✅ Type check passed for ${pkgName}`);
    return { success: true, skipped: false, package: pkgPath };
  } catch (error) {
    console.error(`❌ Type check failed for ${pkgName}`);
    // Print the actual error output
    console.error(error.stderr?.toString() || error.message);
    return { success: false, skipped: false, package: pkgPath, error };
  }
}

/**
 * Discover all packages with TypeScript configs
 */
async function discoverPackages(): Promise<string[]> {
  const packages: string[] = [];

  // Check packages directory
  const packagesDir = join(ROOT_DIR, 'packages');
  if (existsSync(packagesDir)) {
    const dirs = await $`ls ${packagesDir}`.text();
    for (const dir of dirs.trim().split('\n')) {
      if (dir && existsSync(join(packagesDir, dir, 'tsconfig.json'))) {
        packages.push(`packages/${dir}`);
      }
    }
  }

  // Check apps directory
  const appsDir = join(ROOT_DIR, 'apps');
  if (existsSync(appsDir)) {
    const dirs = await $`ls ${appsDir}`.text();
    for (const dir of dirs.trim().split('\n')) {
      if (dir && existsSync(join(appsDir, dir, 'tsconfig.json'))) {
        packages.push(`apps/${dir}`);
      }
    }
  }

  return packages;
}

/**
 * Run typecheck for all packages
 */
async function typecheckAll(options: TypecheckOptions = {}) {
  const startTime = performance.now();

  console.log('🚀 Starting TypeScript type checking...\n');

  const packages = await discoverPackages();

  if (packages.length === 0) {
    console.log('No packages with TypeScript configurations found.');
    return true;
  }

  let results;

  if (options.parallel) {
    // Run in parallel
    console.log(
      `Running type checks in parallel for ${packages.length} packages...\n`
    );
    const promises = packages.map((pkg) => typecheckPackage(pkg, options));
    const parallelResults = await Promise.allSettled(promises);

    results = parallelResults.map((r) =>
      r.status === 'fulfilled' ? r.value : { success: false, error: r.reason }
    );
  } else {
    // Run sequentially
    console.log(
      `Running type checks sequentially for ${packages.length} packages...\n`
    );
    results = [];
    for (const pkg of packages) {
      const result = await typecheckPackage(pkg, options);
      results.push(result);

      // Stop on first failure
      if (!(result.success || result.skipped)) {
        break;
      }
    }
  }

  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Summary
  const passed = results.filter((r) => r.success && !r.skipped).length;
  const failed = results.filter((r) => !r.success).length;
  const skipped = results.filter((r) => r.skipped).length;

  console.log('\n' + '='.repeat(50));
  console.log('Type Check Summary:');
  console.log(`  ✅ Passed: ${passed}`);
  if (failed > 0) {
    console.log(`  ❌ Failed: ${failed}`);
    console.log('\nFailed packages:');
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`    - ${r.package}`);
      });
  }
  if (skipped > 0) console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ⏱️  Duration: ${duration}s`);
  console.log('='.repeat(50));

  return failed === 0;
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  const options: TypecheckOptions = {
    parallel: args.includes('--parallel') || args.includes('-p'),
    strict: args.includes('--strict'),
  };

  try {
    const success = await typecheckAll(options);
    if (!success) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Type check failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

export { typecheckAll, typecheckPackage };
