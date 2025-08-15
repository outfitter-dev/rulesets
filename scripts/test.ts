#!/usr/bin/env bun

/**
 * Bun-native test runner for Rulesets monorepo
 * Replaces turbo test commands with native Bun test capabilities
 */

import { $ } from "bun";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT_DIR = resolve(import.meta.dir, "..");

// Define test order (same as build order for consistency)
const TEST_ORDER = [
  "packages/types",
  // "packages/config", // Skip - empty package
  "packages/parser",
  "packages/compiler",
  "packages/linter",
  "packages/testing",
  "packages/plugin-cursor",
  "packages/plugin-claude-code",
  "packages/plugin-windsurf",
  "packages/core",
  "apps/cli",
];

interface TestOptions {
  watch?: boolean;
  coverage?: boolean;
  parallel?: boolean;
  pattern?: string;
}

/**
 * Run tests for a single package
 */
async function testPackage(pkgPath: string, options: TestOptions = {}) {
  const fullPath = join(ROOT_DIR, pkgPath);
  const pkgJsonPath = join(fullPath, "package.json");
  
  if (!existsSync(pkgJsonPath)) {
    console.log(`⏭️  Skipping ${pkgPath} (no package.json)`);
    return { success: true, skipped: true };
  }
  
  const pkgJson = await Bun.file(pkgJsonPath).json();
  const pkgName = pkgJson.name || pkgPath;
  
  // Check for test files
  const hasTests = existsSync(join(fullPath, "src")) && 
    (existsSync(join(fullPath, "test")) || 
     existsSync(join(fullPath, "tests")) ||
     // Check for *.test.ts files in src
     await $`find ${fullPath}/src -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | head -1`.text().then(t => t.trim().length > 0).catch(() => false));
  
  if (!hasTests) {
    console.log(`⏭️  Skipping ${pkgName} (no tests)`);
    return { success: true, skipped: true };
  }
  
  console.log(`🧪 Testing ${pkgName}...`);
  
  try {
    // Build command based on test runner preference
    const testScript = pkgJson.scripts?.test;
    
    let testCmd: string;
    if (testScript?.includes("vitest")) {
      // Use vitest if specified
      testCmd = options.watch ? "vitest" : "vitest run";
      if (options.coverage) testCmd += " --coverage";
    } else {
      // Default to bun test
      testCmd = "bun test";
      if (options.watch) testCmd += " --watch";
      if (options.coverage) testCmd += " --coverage";
      if (options.pattern) testCmd += ` ${options.pattern}`;
    }
    
    const result = await $`cd ${fullPath} && ${testCmd}`.quiet();
    
    console.log(`✅ Tests passed for ${pkgName}`);
    return { success: true, skipped: false };
  } catch (error) {
    console.error(`❌ Tests failed for ${pkgName}`);
    return { success: false, skipped: false, error };
  }
}

/**
 * Run all tests
 */
async function testAll(options: TestOptions = {}) {
  const startTime = performance.now();
  
  console.log("🚀 Starting Bun-native test runner...\n");
  
  const results = [];
  
  if (options.parallel) {
    // Run tests in parallel
    const promises = TEST_ORDER.map(pkg => testPackage(pkg, options));
    const parallelResults = await Promise.allSettled(promises);
    
    results.push(...parallelResults.map(r => 
      r.status === 'fulfilled' ? r.value : { success: false, error: r.reason }
    ));
  } else {
    // Run tests sequentially
    for (const pkg of TEST_ORDER) {
      const result = await testPackage(pkg, options);
      results.push(result);
      
      // Stop on first failure in CI mode
      if (!result.success && !result.skipped && !options.watch) {
        break;
      }
    }
  }
  
  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Summary
  const passed = results.filter(r => r.success && !r.skipped).length;
  const failed = results.filter(r => !r.success).length;
  const skipped = results.filter(r => r.skipped).length;
  
  console.log("\n" + "=".repeat(50));
  console.log(`Test Summary:`);
  console.log(`  ✅ Passed: ${passed}`);
  if (failed > 0) console.log(`  ❌ Failed: ${failed}`);
  if (skipped > 0) console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ⏱️  Duration: ${duration}s`);
  console.log("=".repeat(50));
  
  return failed === 0;
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  const options: TestOptions = {
    watch: args.includes("--watch") || args.includes("-w"),
    coverage: args.includes("--coverage") || args.includes("-c"),
    parallel: args.includes("--parallel") || args.includes("-p"),
    pattern: args.find(arg => !arg.startsWith("--"))
  };
  
  try {
    const success = await testAll(options);
    if (!success && !options.watch) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test runner failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

export { testAll, testPackage };