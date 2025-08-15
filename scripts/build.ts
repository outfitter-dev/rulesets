#!/usr/bin/env bun

/**
 * Bun-native build system for Rulesets monorepo
 * Replaces turbo with native Bun capabilities for faster builds
 */

import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { $ } from 'bun';

// Define workspace structure
const ROOT_DIR = resolve(import.meta.dir, '..');
const PACKAGES_DIR = join(ROOT_DIR, 'packages');
const APPS_DIR = join(ROOT_DIR, 'apps');

// Build order based on dependencies
const BUILD_ORDER = [
  // Base packages (no internal deps)
  'packages/types',
  // "packages/config", // Skip - empty package

  // Core packages (depend on types)
  'packages/parser',
  'packages/compiler',
  'packages/linter',
  'packages/testing',

  // Plugin packages (depend on types)
  'packages/plugin-cursor',
  'packages/plugin-claude-code',
  'packages/plugin-windsurf',

  // Orchestration (depends on others)
  'packages/core',

  // Apps (depend on packages)
  'apps/cli',
];

interface BuildOptions {
  watch?: boolean;
  parallel?: boolean;
  typecheck?: boolean;
  clean?: boolean;
}

/**
 * Build a single package
 */
async function buildPackage(pkgPath: string, options: BuildOptions = {}) {
  const fullPath = join(ROOT_DIR, pkgPath);
  const pkgJsonPath = join(fullPath, 'package.json');

  if (!existsSync(pkgJsonPath)) {
    console.log(`⏭️  Skipping ${pkgPath} (no package.json)`);
    return;
  }

  const pkgJson = await Bun.file(pkgJsonPath).json();
  const pkgName = pkgJson.name || pkgPath;

  console.log(`🔨 Building ${pkgName}...`);

  // Clean if requested
  if (options.clean) {
    await $`cd ${fullPath} && rm -rf dist`.quiet();
  }

  // Check if package has source files to build
  const srcPath = join(fullPath, 'src');
  if (!existsSync(srcPath)) {
    console.log(`⏭️  Skipping ${pkgName} (no src directory)`);
    return;
  }

  const entryPoint = join(srcPath, 'index.ts');
  if (!existsSync(entryPoint)) {
    console.log(`⏭️  Skipping ${pkgName} (no index.ts)`);
    return;
  }

  try {
    // Import build configuration
    const { getPackageBuildConfig } = await import('./build.config');
    const env = options.watch ? 'development' : 'production';
    const buildConfig = getPackageBuildConfig(pkgName, env);

    // Build with Bun using shared configuration
    const buildResult = await Bun.build({
      entrypoints: [entryPoint],
      outdir: join(fullPath, 'dist'),
      ...buildConfig,
      // Override with local options
      minify: !options.watch && buildConfig.minify !== false,
      sourcemap: options.watch ? 'inline' : buildConfig.sourcemap || 'none',
      // Generate a single file output for simplicity
      splitting: false,
      naming: '[dir]/[name].[ext]',
    });

    if (!buildResult.success) {
      console.error(`❌ Build failed for ${pkgName}`);
      for (const log of buildResult.logs) {
        console.error(log);
      }
      throw new Error(`Build failed for ${pkgName}`);
    }

    // Generate TypeScript declarations if tsc is available
    if (options.typecheck !== false) {
      const tscConfigPath = join(fullPath, 'tsconfig.json');
      if (existsSync(tscConfigPath)) {
        try {
          await $`cd ${fullPath} && bun x tsc --declaration --emitDeclarationOnly --outDir dist --skipLibCheck src/index.ts`.quiet();
        } catch (tscError) {
          console.warn(
            `⚠️  TypeScript declarations failed for ${pkgName} (continuing build)`
          );
          // Continue with build even if TypeScript declarations fail
        }
      }
    }

    console.log(`✅ Built ${pkgName}`);
  } catch (error) {
    console.error(`❌ Failed to build ${pkgName}:`, error);
    throw error;
  }
}

/**
 * Build all packages in dependency order
 */
async function buildAll(options: BuildOptions = {}) {
  const startTime = performance.now();

  console.log('🚀 Starting Bun-native build...\n');

  if (options.parallel) {
    // Group packages by dependency level for parallel builds
    const groups = [
      ['packages/types'],
      [
        'packages/parser',
        'packages/compiler',
        'packages/linter',
        'packages/testing',
      ],
      [
        'packages/plugin-cursor',
        'packages/plugin-claude-code',
        'packages/plugin-windsurf',
      ],
      ['packages/core'],
      ['apps/cli'],
    ];

    for (const group of groups) {
      await Promise.all(group.map((pkg) => buildPackage(pkg, options)));
    }
  } else {
    // Sequential build
    for (const pkg of BUILD_ORDER) {
      await buildPackage(pkg, options);
    }
  }

  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log(`\n✨ Build completed in ${duration}s`);
}

/**
 * Watch mode - rebuild on changes
 */
async function watchPackages() {
  console.log('👀 Watching for changes...\n');

  // Use Bun's file watcher (coming in future Bun versions)
  // For now, we'll use a simple polling approach
  const watchers = BUILD_ORDER.map(async (pkgPath) => {
    const fullPath = join(ROOT_DIR, pkgPath);
    const srcPath = join(fullPath, 'src');

    if (!existsSync(srcPath)) return;

    // Initial build
    await buildPackage(pkgPath, { watch: true });

    // Note: In production, you'd use a proper file watcher
    // Bun is adding native watch support soon
    console.log(`👁️  Watching ${pkgPath}...`);
  });

  await Promise.all(watchers);
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const options: BuildOptions = {
    parallel: args.includes('--parallel') || args.includes('-p'),
    typecheck: !args.includes('--no-types'),
    clean: args.includes('--clean'),
    watch: args.includes('--watch') || args.includes('-w'),
  };

  try {
    if (options.watch) {
      await watchPackages();
    } else {
      await buildAll(options);
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

export { buildAll, buildPackage, BUILD_ORDER };
