#!/usr/bin/env node

// TLDR: CLI for Rulesets - clean, simple, Handlebars-powered
// TLDR: Auto-discovery, provider filtering, elegant build workflow

import { Command } from 'commander';
import { runRulesets, ConsoleLogger } from '@rulesets/core';
import chalk from 'chalk';
import { resolve, join } from 'node:path';
import { existsSync, readdirSync, statSync } from 'node:fs';

const program = new Command();

program
  .name('rulesets')
  .description('Build AI rules for multiple providers from source files')
  .version('0.2.0')
  .option('--provider <providers>', 'Comma-separated list of providers to build for')
  .option('--dev', 'Enable development mode with enhanced debugging', false)
  .option('--no-cache', 'Disable template and partial caching', false)
  .action(async (options) => {
    await buildRulesets(options);
  });

program
  .command('build')
  .description('Build rulesets (same as running without command)')
  .option('--provider <providers>', 'Comma-separated list of providers to build for')
  .option('--dev', 'Enable development mode with enhanced debugging', false)
  .option('--no-cache', 'Disable template and partial caching', false)
  .action(async (options) => {
    await buildRulesets(options);
  });

async function buildRulesets(options: any) {
  const logger = new ConsoleLogger();
  
  try {
    logger.info(chalk.blue('🚀 Building Rulesets...'));
    
    // Auto-discover source files
    const sourceFiles = await discoverSourceFiles();
    
    if (sourceFiles.length === 0) {
      logger.warn('No source files found in .ruleset/src/');
      logger.info('Run `rulesets init` to set up a new project');
      return;
    }
    
    logger.info(`📂 Found ${sourceFiles.length} source file${sourceFiles.length === 1 ? '' : 's'}`);
    
    // Parse provider filter if provided
    const providers = options.provider ? options.provider.split(',').map((p: string) => p.trim()) : undefined;
    if (providers) {
      logger.info(`🎯 Building for providers: ${providers.join(', ')}`);
    }
    
    // Build each source file
    for (const sourceFile of sourceFiles) {
      logger.info(`📄 Processing: ${sourceFile}`);
      
      await runRulesets(sourceFile, logger, {
        providers,
        developmentMode: options.dev,
        cacheTemplates: options.cache !== false,
      });
    }
    
    logger.info(chalk.green('✅ Build completed successfully!'));
  } catch (error) {
    logger.error(chalk.red('❌ Build failed:'), error);
    process.exit(1);
  }
}

async function discoverSourceFiles(): Promise<string[]> {
  const sourceDir = '.ruleset/src';
  const files: string[] = [];
  
  if (!existsSync(sourceDir)) {
    return files;
  }
  
  try {
    const entries = readdirSync(sourceDir);
    
    for (const entry of entries) {
      const fullPath = join(sourceDir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isFile() && (entry.endsWith('.rule.md') || entry.endsWith('.md'))) {
        files.push(resolve(fullPath));
      } else if (stat.isDirectory() && !entry.startsWith('.') && entry !== '_partials') {
        // Recursively search subdirectories
        const subFiles = await discoverSourceFilesInDir(fullPath);
        files.push(...subFiles);
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read source directory: ${error}`);
  }
  
  return files.sort();
}

async function discoverSourceFilesInDir(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isFile() && (entry.endsWith('.rule.md') || entry.endsWith('.md'))) {
        files.push(resolve(fullPath));
      } else if (stat.isDirectory() && !entry.startsWith('.') && entry !== '_partials') {
        const subFiles = await discoverSourceFilesInDir(fullPath);
        files.push(...subFiles);
      }
    }
  } catch (error) {
    // Ignore errors in subdirectories
  }
  
  return files;
}

program
  .command('init')
  .description('Initialize a new rulesets project')
  .action(async () => {
    const logger = new ConsoleLogger();
    
    logger.info(chalk.blue('🚀 Initializing new rulesets project...'));
    
    // TODO: Create .ruleset/src/ structure
    // TODO: Create example source file
    // TODO: Create ruleset.config.json
    logger.warn('Project initialization not yet implemented');
    
    logger.info(chalk.green('✅ Project initialization would be completed here'));
  });

program
  .command('migrate')
  .description('Migrate existing scattered rules into .ruleset/src/')
  .option('--dry-run', 'Show what would be imported without creating files', false)
  .action(async (options) => {
    const logger = new ConsoleLogger();
    
    logger.info(chalk.blue('🔄 Migrating existing rules into .ruleset/src/...'));
    
    if (options.dryRun) {
      logger.info('🧪 Dry run mode - no files will be created');
    }
    
    // TODO: Discover existing .cursor/rules, CLAUDE.md, etc.
    // TODO: Import them into .ruleset/src/ with appropriate frontmatter
    // TODO: Create consolidated source files
    logger.warn('Migration tool not yet implemented');
    logger.info('Would discover and import:');
    logger.info('  • .cursor/rules/*.mdc → .ruleset/src/');
    logger.info('  • CLAUDE.md → .ruleset/src/');
    logger.info('  • .roo/rules.md → .ruleset/src/');
    logger.info('  • And create appropriate frontmatter configuration');
    
    logger.info(chalk.green('✅ Migration would be completed here'));
  });

program.parse();
