#!/usr/bin/env node

// TLDR: CLI for Rulesets compiler (ruleset-v0.1-beta)
// TLDR: Auto-discovery and compilation of .rule.md files

import { readdir, stat } from 'node:fs/promises';
import { join, basename, dirname, resolve, relative } from 'node:path';
import { existsSync } from 'node:fs';
import { Command } from 'commander';
// TODO: Re-enable when core package dependencies are fixed
// import { runRulesetsV0, ConsoleLogger } from '@rulesets/core';
// import type { Logger } from '@rulesets/types';
// import chalk from 'chalk';

// Auto-discovery CLI for Rulesets with support for .rule.md files
// TODO: Enable actual compilation when core dependencies are resolved"

const program = new Command();

/**
 * File discovery utilities for finding .rule.md files
 */
interface DiscoveredFile {
  path: string;
  relativePath: string;
  name: string;
}

/**
 * Recursively discover .rule.md files in a directory
 * Excludes _partials/ directory from discovery
 */
async function discoverRuleFiles(
  searchPath: string,
  baseDir?: string
): Promise<DiscoveredFile[]> {
  const resolvedPath = resolve(searchPath);
  const actualBaseDir = baseDir || dirname(resolvedPath);
  const discovered: DiscoveredFile[] = [];

  try {
    const entries = await readdir(resolvedPath);
    
    for (const entry of entries) {
      const fullPath = join(resolvedPath, entry);
      const stats = await stat(fullPath);
      
      if (stats.isDirectory()) {
        // Skip _partials directory
        if (basename(fullPath) === '_partials') {
          continue;
        }
        
        // Recursively search subdirectories
        const subFiles = await discoverRuleFiles(fullPath, actualBaseDir);
        discovered.push(...subFiles);
      } else if (stats.isFile()) {
        // Check for .rule.md files
        if (entry.endsWith('.rule.md')) {
          discovered.push({
            path: fullPath,
            relativePath: relative(actualBaseDir, fullPath),
            name: basename(entry, '.rule.md')
          });
        }
      }
    }
  } catch (error) {
    throw new Error(`Failed to discover files in ${resolvedPath}: ${error}`);
  }

  return discovered;
}

/**
 * Fallback to discover .md files if no .rule.md files found
 */
async function discoverFallbackFiles(
  searchPath: string,
  baseDir?: string
): Promise<DiscoveredFile[]> {
  const resolvedPath = resolve(searchPath);
  const actualBaseDir = baseDir || dirname(resolvedPath);
  const discovered: DiscoveredFile[] = [];

  try {
    const entries = await readdir(resolvedPath);
    
    for (const entry of entries) {
      const fullPath = join(resolvedPath, entry);
      const stats = await stat(fullPath);
      
      if (stats.isDirectory()) {
        // Skip _partials directory and common directories
        const dirName = basename(fullPath);
        if (['_partials', 'node_modules', '.git', 'dist'].includes(dirName)) {
          continue;
        }
        
        // Recursively search subdirectories
        const subFiles = await discoverFallbackFiles(fullPath, actualBaseDir);
        discovered.push(...subFiles);
      } else if (stats.isFile()) {
        // Check for .md files (but not .rule.md as those were already checked)
        if (entry.endsWith('.md') && !entry.endsWith('.rule.md')) {
          discovered.push({
            path: fullPath,
            relativePath: relative(actualBaseDir, fullPath),
            name: basename(entry, '.md')
          });
        }
      }
    }
  } catch (error) {
    throw new Error(`Failed to discover fallback files in ${resolvedPath}: ${error}`);
  }

  return discovered;
}

/**
 * Find the default search directory (.ruleset/src or current directory)
 */
function findDefaultSearchDirectory(): string {
  const cwd = process.cwd();
  const rulesetSrcPath = join(cwd, '.ruleset', 'src');
  
  if (existsSync(rulesetSrcPath)) {
    return rulesetSrcPath;
  }
  
  return cwd;
}

/**
 * Auto-discover rule files with fallback to .md files
 */
async function autoDiscoverFiles(searchPath?: string): Promise<DiscoveredFile[]> {
  const actualSearchPath = searchPath || findDefaultSearchDirectory();
  
  if (!existsSync(actualSearchPath)) {
    throw new Error(`Search path does not exist: ${actualSearchPath}`);
  }

  // First, try to find .rule.md files
  let discovered = await discoverRuleFiles(actualSearchPath);
  
  // If no .rule.md files found, fallback to .md files
  if (discovered.length === 0) {
    discovered = await discoverFallbackFiles(actualSearchPath);
  }
  
  return discovered;
}

/**
 * Filter files by provider if specified
 */
function filterByProvider(files: DiscoveredFile[], provider?: string): DiscoveredFile[] {
  if (!provider) {
    return files;
  }
  
  // This is a simple name-based filter. In the future, we could parse
  // frontmatter to check for provider configuration
  return files.filter(file => 
    file.name.toLowerCase().includes(provider.toLowerCase()) ||
    file.relativePath.toLowerCase().includes(provider.toLowerCase())
  );
}

/**
 * Simple logger for CLI output
 */
const logger = {
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
  warn: (msg: string) => console.warn(`⚠️  ${msg}`),
  error: (msg: string, error?: any) => {
    console.error(`❌ ${msg}`);
    if (error) console.error(error);
  },
};

/**
 * Compile a single file
 * TODO: Re-enable actual compilation when core package dependencies are fixed
 */
async function compileFile(file: DiscoveredFile): Promise<void> {
  try {
    logger.info(`[MOCK] Compiling: ${file.relativePath}`);
    // TODO: await runRulesetsV0(file.path, logger);
    await new Promise(resolve => setTimeout(resolve, 100)); // Mock compilation delay
    logger.info(`✓ Successfully compiled: ${file.name}`);
  } catch (error) {
    logger.error(`✗ Failed to compile ${file.relativePath}:`, error);
    throw error;
  }
}

program
  .name('rulesets')
  .description('CLI for Rulesets compiler with auto-discovery')
  .version('0.1.0');

// Default command (auto-discovery)
program
  .option('-p, --provider <provider>', 'Filter by provider (e.g., cursor, claude-code)')
  .option('-d, --directory <dir>', 'Search directory (default: .ruleset/src or current directory)')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    
    try {
      logger.info('🔍 Auto-discovering rule files...');
      
      const files = await autoDiscoverFiles(options.directory);
      const filteredFiles = filterByProvider(files, options.provider);
      
      if (filteredFiles.length === 0) {
        if (options.provider) {
          logger.warn(`No rule files found matching provider: ${options.provider}`);
        } else {
          logger.warn('No rule files found. Make sure you have .rule.md files in .ruleset/src/ or current directory.');
        }
        logger.info('\nTo initialize a new rulesets project, run: rulesets init');
        process.exit(1);
      }
      
      logger.info(`📁 Found ${filteredFiles.length} rule file(s):`);
      filteredFiles.forEach(file => {
        logger.info(`  • ${file.relativePath}`);
      });
      
      if (options.provider) {
        logger.info(`🎯 Filtering by provider: ${options.provider}`);
      }
      
      logger.info('\n🚀 Starting compilation...\n');
      
      let compiled = 0;
      let failed = 0;
      
      for (const file of filteredFiles) {
        try {
          await compileFile(file);
          compiled++;
        } catch (error) {
          failed++;
        }
      }
      
      logger.info(`\n📊 Compilation complete:`);
      logger.info(`  • Compiled: ${compiled} files`);
      if (failed > 0) {
        logger.info(`  • Failed: ${failed} files`);
        process.exit(1);
      }
      
    } catch (error) {
      logger.error('❌ Auto-discovery failed:', error);
      process.exit(1);
    }
  });

// Explicit compile command
program
  .command('compile')
  .description('Compile specific rulesets file or directory')
  .argument('<input>', 'Input file or directory')
  .option('-p, --provider <provider>', 'Filter by provider')
  .option('-v, --verbose', 'Verbose output')
  .action(async (input, options) => {
    
    try {
      const inputPath = resolve(input);
      
      if (!existsSync(inputPath)) {
        logger.error(`Input path does not exist: ${input}`);
        process.exit(1);
      }
      
      const stats = await stat(inputPath);
      
      if (stats.isFile()) {
        // Single file compilation
        if (!inputPath.endsWith('.rule.md') && !inputPath.endsWith('.md')) {
          logger.error('Input file must be a .rule.md or .md file');
          process.exit(1);
        }
        
        const file: DiscoveredFile = {
          path: inputPath,
          relativePath: relative(process.cwd(), inputPath),
          name: basename(inputPath).replace(/\.(rule\.)?md$/, '')
        };
        
        logger.info(`📁 Compiling single file: ${file.relativePath}`);
        await compileFile(file);
        
      } else if (stats.isDirectory()) {
        // Directory compilation
        logger.info(`🔍 Discovering files in: ${input}`);
        
        const files = await autoDiscoverFiles(inputPath);
        const filteredFiles = filterByProvider(files, options.provider);
        
        if (filteredFiles.length === 0) {
          logger.warn(`No rule files found in directory: ${input}`);
          process.exit(1);
        }
        
        logger.info(`📁 Found ${filteredFiles.length} rule file(s)`);
        
        for (const file of filteredFiles) {
          await compileFile(file);
        }
      }
      
      logger.info('✅ Compilation completed successfully!');
      
    } catch (error) {
      logger.error('❌ Compilation failed:', error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new rulesets project')
  .action(() => {
    // TODO: Implement initialization logic
    console.log('Initializing new rulesets project...');
    console.log('This feature is not yet implemented.');
  });

// List command for debugging
program
  .command('list')
  .description('List discoverable rule files')
  .option('-d, --directory <dir>', 'Search directory')
  .option('-p, --provider <provider>', 'Filter by provider')
  .action(async (options) => {
    
    try {
      logger.info('🔍 Discovering rule files...');
      
      const files = await autoDiscoverFiles(options.directory);
      const filteredFiles = filterByProvider(files, options.provider);
      
      if (filteredFiles.length === 0) {
        logger.warn('No rule files found.');
        return;
      }
      
      logger.info(`\n📁 Found ${filteredFiles.length} rule file(s):\n`);
      
      filteredFiles.forEach(file => {
        logger.info(`  • ${file.name}`);
        logger.info(`    Path: ${file.relativePath}`);
        logger.info(`    Full: ${file.path}\n`);
      });
      
    } catch (error) {
      logger.error('❌ Discovery failed:', error);
      process.exit(1);
    }
  });

program.parse();
