#!/usr/bin/env bun

/**
 * Bun-native development server orchestrator for Rulesets monorepo
 * Manages watch mode for multiple packages simultaneously
 */

import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Subprocess } from 'bun';
import { $ } from 'bun';

const ROOT_DIR = resolve(import.meta.dir, '..');

interface DevOptions {
  packages?: string[];
  all?: boolean;
}

/**
 * Start dev mode for a single package
 */
async function startDevPackage(pkgPath: string): Promise<Subprocess | null> {
  const fullPath = join(ROOT_DIR, pkgPath);
  const pkgJsonPath = join(fullPath, 'package.json');

  if (!existsSync(pkgJsonPath)) {
    console.log(`⏭️  Skipping ${pkgPath} (no package.json)`);
    return null;
  }

  const pkgJson = await Bun.file(pkgJsonPath).json();
  const pkgName = pkgJson.name || pkgPath;

  // Check if package has a dev script
  if (!pkgJson.scripts?.dev) {
    console.log(`⏭️  Skipping ${pkgName} (no dev script)`);
    return null;
  }

  console.log(`🔄 Starting dev mode for ${pkgName}...`);

  // Spawn the dev process
  const proc = Bun.spawn(['bun', 'run', 'dev'], {
    cwd: fullPath,
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  });

  return proc;
}

/**
 * Discover all packages
 */
async function discoverPackages(): Promise<string[]> {
  const packages: string[] = [];

  // Check packages directory
  const packagesDir = join(ROOT_DIR, 'packages');
  if (existsSync(packagesDir)) {
    const dirs = await $`ls ${packagesDir}`.text();
    for (const dir of dirs.trim().split('\n')) {
      if (dir) {
        packages.push(`packages/${dir}`);
      }
    }
  }

  // Check apps directory
  const appsDir = join(ROOT_DIR, 'apps');
  if (existsSync(appsDir)) {
    const dirs = await $`ls ${appsDir}`.text();
    for (const dir of dirs.trim().split('\n')) {
      if (dir) {
        packages.push(`apps/${dir}`);
      }
    }
  }

  return packages;
}

/**
 * Start dev mode for specified packages
 */
async function startDev(options: DevOptions = {}) {
  console.log('🚀 Starting development mode...\n');

  let packages: string[] = [];

  if (options.all) {
    packages = await discoverPackages();
  } else if (options.packages && options.packages.length > 0) {
    packages = options.packages;
  } else {
    // Default to common dev packages
    packages = [
      'packages/core',
      'packages/compiler',
      'packages/parser',
      'apps/cli',
    ];
  }

  const processes: Subprocess[] = [];

  for (const pkg of packages) {
    const proc = await startDevPackage(pkg);
    if (proc) {
      processes.push(proc);
    }
  }

  if (processes.length === 0) {
    console.log('No packages to run in dev mode.');
    return;
  }

  console.log(`\n✨ Running ${processes.length} package(s) in dev mode`);
  console.log('Press Ctrl+C to stop all processes\n');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping all dev processes...');
    for (const proc of processes) {
      proc.kill();
    }
    process.exit(0);
  });

  // Wait for all processes
  await Promise.all(processes.map((p) => p.exited));
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  const options: DevOptions = {
    all: args.includes('--all') || args.includes('-a'),
    packages: args
      .filter((arg) => !arg.startsWith('-'))
      .map((arg) => {
        // Convert package names to paths if needed
        if (!arg.includes('/')) {
          // Try to find the package
          if (existsSync(join(ROOT_DIR, 'packages', arg))) {
            return `packages/${arg}`;
          }
          if (existsSync(join(ROOT_DIR, 'apps', arg))) {
            return `apps/${arg}`;
          }
        }
        return arg;
      }),
  };

  try {
    await startDev(options);
  } catch (error) {
    console.error('Dev mode failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

export { startDev, startDevPackage };
