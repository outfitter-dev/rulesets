#!/usr/bin/env bun

/**
 * Main orchestrator for Bun-native monorepo tasks
 * Single entry point for all build, test, and dev operations
 */

import { buildAll } from "./build";
import { testAll } from "./test";
import { typecheckAll } from "./typecheck";
import { startDev } from "./dev";

const COMMANDS = {
  build: "Build all packages",
  test: "Run all tests",
  typecheck: "Type check all packages",
  dev: "Start development mode",
  ci: "Run full CI pipeline (lint, typecheck, test, build)",
  help: "Show this help message",
};

async function showHelp() {
  console.log("🚀 Rulesets Monorepo - Bun Build System\n");
  console.log("Usage: bun run scripts/run.ts <command> [options]\n");
  console.log("Commands:");
  
  for (const [cmd, desc] of Object.entries(COMMANDS)) {
    console.log(`  ${cmd.padEnd(12)} ${desc}`);
  }
  
  console.log("\nOptions:");
  console.log("  --parallel   Run tasks in parallel where possible");
  console.log("  --watch      Watch mode (for applicable commands)");
  console.log("  --coverage   Include coverage (for tests)");
  console.log("  --clean      Clean before building");
  console.log("  --all        Include all packages (for dev mode)");
  console.log("\nExamples:");
  console.log("  bun run scripts/run.ts build --parallel");
  console.log("  bun run scripts/run.ts test --coverage");
  console.log("  bun run scripts/run.ts dev core cli");
  console.log("  bun run scripts/run.ts ci");
}

async function runCI() {
  const startTime = performance.now();
  
  console.log("🔄 Running full CI pipeline...\n");
  
  // 1. Lint (using existing commands)
  console.log("📝 Running linters...");
  try {
    const { $ } = await import("bun");
    await $`bun run format:check:all`.quiet();
    console.log("✅ Linting passed\n");
  } catch (error) {
    console.error("❌ Linting failed");
    return false;
  }
  
  // 2. Typecheck
  console.log("🔍 Running type checks...");
  const typecheckSuccess = await typecheckAll({ parallel: true });
  if (!typecheckSuccess) {
    console.error("❌ Type checking failed");
    return false;
  }
  console.log();
  
  // 3. Test
  console.log("🧪 Running tests...");
  const testSuccess = await testAll({ parallel: false, coverage: true });
  if (!testSuccess) {
    console.error("❌ Tests failed");
    return false;
  }
  console.log();
  
  // 4. Build
  console.log("🔨 Building packages...");
  await buildAll({ parallel: true, clean: true });
  
  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log(`\n✨ CI pipeline completed successfully in ${duration}s`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === "help") {
    showHelp();
    process.exit(0);
  }
  
  const options = {
    parallel: args.includes("--parallel") || args.includes("-p"),
    watch: args.includes("--watch") || args.includes("-w"),
    coverage: args.includes("--coverage") || args.includes("-c"),
    clean: args.includes("--clean"),
    all: args.includes("--all") || args.includes("-a"),
  };
  
  try {
    switch (command) {
      case "build":
        await buildAll(options);
        break;
        
      case "test":
        const testSuccess = await testAll(options);
        if (!testSuccess) process.exit(1);
        break;
        
      case "typecheck":
        const typecheckSuccess = await typecheckAll(options);
        if (!typecheckSuccess) process.exit(1);
        break;
        
      case "dev":
        const packages = args.slice(1).filter(arg => !arg.startsWith("-"));
        await startDev({ 
          all: options.all,
          packages: packages.length > 0 ? packages : undefined 
        });
        break;
        
      case "ci":
        const ciSuccess = await runCI();
        if (!ciSuccess) process.exit(1);
        break;
        
      default:
        console.error(`Unknown command: ${command}\n`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(`Command failed: ${error}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}