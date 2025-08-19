#!/usr/bin/env node

// TLDR: Simplified CLI for file discovery testing
// TLDR: Auto-discovery of .rule.md files without full compilation

import { readdir, stat } from 'node:fs/promises';
import { join, basename, dirname, resolve, relative } from 'node:path';
import { existsSync } from 'node:fs';
import { Command } from 'commander';

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
 * Simple logger for CLI output
 */
const logger = {
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
  warn: (msg: string) => console.warn(`⚠️  ${msg}`),
  error: (msg: string) => console.error(`❌ ${msg}`),
};

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
        // Skip common directories
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
    logger.info('No .rule.md files found, checking for .md files...');
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
  
  // Simple name-based filter
  return files.filter(file => 
    file.name.toLowerCase().includes(provider.toLowerCase()) ||
    file.relativePath.toLowerCase().includes(provider.toLowerCase())
  );
}

program
  .name('rulesets-simple')
  .description('Simple CLI for file discovery testing')
  .version('0.1.0');

// List command for file discovery
program
  .command('list')
  .description('List discoverable rule files')
  .option('-d, --directory <dir>', 'Search directory')
  .option('-p, --provider <provider>', 'Filter by provider')
  .action(async (options) => {
    try {
      logger.info('🔍 Discovering rule files...');
      
      const searchDir = options.directory || findDefaultSearchDirectory();
      logger.info(`📁 Searching in: ${searchDir}`);
      
      const files = await autoDiscoverFiles(options.directory);
      const filteredFiles = filterByProvider(files, options.provider);
      
      if (filteredFiles.length === 0) {
        logger.warn('No rule files found.');
        logger.info('\nChecked for:');
        logger.info('  • .rule.md files (preferred)');
        logger.info('  • .md files (fallback)');
        logger.info('  • Excluded _partials/ directory');
        return;
      }
      
      logger.info(`\n📄 Found ${filteredFiles.length} rule file(s):\n`);
      
      filteredFiles.forEach(file => {
        console.log(`  • ${file.name}`);
        console.log(`    Path: ${file.relativePath}`);
        console.log(`    Full: ${file.path}\n`);
      });
      
      if (options.provider) {
        logger.info(`🎯 Filtered by provider: ${options.provider}`);
      }
      
    } catch (error) {
      logger.error(`Discovery failed: ${error}`);
      process.exit(1);
    }
  });

// Test command to verify functionality
program
  .command('test')
  .description('Test file discovery functionality')
  .action(async () => {
    try {
      logger.info('🧪 Testing file discovery...\n');
      
      // Test default directory discovery
      const defaultDir = findDefaultSearchDirectory();
      logger.info(`Default search directory: ${defaultDir}`);
      
      // Test auto discovery
      const files = await autoDiscoverFiles();
      logger.info(`Found ${files.length} files total`);
      
      // Test with different search paths
      const testPaths = ['.', './src', './.ruleset/src'];
      
      for (const testPath of testPaths) {
        if (existsSync(testPath)) {
          try {
            const testFiles = await autoDiscoverFiles(testPath);
            logger.info(`${testPath}: ${testFiles.length} files`);
          } catch (error) {
            logger.info(`${testPath}: Error - ${error}`);
          }
        } else {
          logger.info(`${testPath}: Does not exist`);
        }
      }
      
      logger.info('\n✅ Test complete!');
      
    } catch (error) {
      logger.error(`Test failed: ${error}`);
      process.exit(1);
    }
  });

program.parse();