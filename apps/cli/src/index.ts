#!/usr/bin/env node

// TLDR: CLI for Rulesets compiler (ruleset-v0.1-beta + v0.2-handlebars)
// TLDR: ruleset-v0.1-beta Basic CLI implementation with v0.2 handlebars support

import { Command } from 'commander';
import { runRulesetsV0, runRulesetsV2, ConsoleLogger, migrateRulesets } from '@rulesets/core';
import type { HandlebarsOrchestrationOptions, MigrationOptions } from '@rulesets/core';
import chalk from 'chalk';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const program = new Command();

program
  .name('rulesets')
  .description('CLI for Rulesets compiler')
  .version('0.1.0');

program
  .command('compile')
  .description('Compile rulesets files')
  .argument('<input>', 'Input file or directory')
  .option('-o, --output <dir>', 'Output directory', 'dist')
  .option('--handlebars', 'Use Handlebars compilation (v0.2)', false)
  .option('--dev', 'Enable development mode with enhanced debugging', false)
  .option('--no-cache', 'Disable template and partial caching', false)
  .option('--precompile', 'Precompile templates for production', false)
  .action(async (input, options) => {
    const logger = new ConsoleLogger();
    
    try {
      // Resolve input path
      const inputPath = resolve(input);
      if (!existsSync(inputPath)) {
        logger.error(`Input file not found: ${inputPath}`);
        process.exit(1);
      }

      logger.info(chalk.blue(`🚀 Starting Rulesets compilation${options.handlebars ? ' (Handlebars v0.2)' : ' (Legacy v0.1)'}`));
      logger.info(`📂 Input: ${inputPath}`);

      if (options.handlebars) {
        // Use v0.2 Handlebars compilation
        const handlebarsOptions: HandlebarsOrchestrationOptions = {
          enableHandlebars: true,
          cacheTemplates: options.cache !== false,
          precompileTemplates: options.precompile,
          developmentMode: options.dev,
        };

        await runRulesetsV2(inputPath, logger, undefined, handlebarsOptions);
      } else {
        // Use v0.1 legacy compilation
        await runRulesetsV0(inputPath, logger);
      }

      logger.info(chalk.green('✅ Compilation completed successfully!'));
    } catch (error) {
      logger.error(chalk.red('❌ Compilation failed:'), error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new rulesets project')
  .option('--handlebars', 'Initialize with Handlebars v0.2 templates', false)
  .action((options) => {
    const logger = new ConsoleLogger();
    
    logger.info(chalk.blue('🚀 Initializing new rulesets project...'));
    
    if (options.handlebars) {
      logger.info('📋 Creating Handlebars v0.2 project structure');
      // TODO: Create handlebars project template
      logger.warn('Handlebars initialization not yet implemented');
    } else {
      logger.info('📋 Creating legacy v0.1 project structure');
      // TODO: Create legacy project template
      logger.warn('Project initialization not yet implemented');
    }
    
    logger.info(chalk.green('✅ Project initialization would be completed here'));
  });

// Add migration command for v0.1 -> v0.2
program
  .command('migrate')
  .description('Migrate v0.1 rulesets files to v0.2 Handlebars syntax')
  .argument('<input>', 'Input file or directory to migrate')
  .option('-o, --output <dir>', 'Output directory for migrated files')
  .option('--dry-run', 'Show what would be changed without writing files', false)
  .action((input, options) => {
    const logger = new ConsoleLogger();
    
    logger.info(chalk.blue('🔄 Starting migration from v0.1 to v0.2 Handlebars...'));
    logger.info(`📂 Input: ${resolve(input)}`);
    
    if (options.dryRun) {
      logger.info('🧪 Dry run mode - no files will be modified');
    }
    
    if (options.output) {
      logger.info(`📁 Output: ${resolve(options.output)}`);
    }
    
    try {
      const migrationOptions: MigrationOptions = {
        input: inputPath,
        output: options.output,
        dryRun: options.dryRun,
        backup: true,
        logger,
      };

      const result = await migrateRulesets(migrationOptions);

      if (result.errors.length > 0) {
        logger.error(chalk.red(`❌ Migration completed with ${result.errors.length} errors`));
        for (const error of result.errors) {
          logger.error(`  ${error.file}: ${error.error}`);
        }
      } else {
        logger.info(chalk.green('✅ Migration completed successfully!'));
      }

      // Show transformation summary
      if (result.transformations.length > 0 && options.dryRun) {
        logger.info('\n📋 Preview of changes:');
        for (const transformation of result.transformations.slice(0, 3)) {
          logger.info(`\n📄 ${transformation.file}:`);
          for (const change of transformation.changes.slice(0, 3)) {
            logger.info(`  Line ${change.line}: ${change.pattern}`);
            logger.info(`    - ${change.original.trim()}`);
            logger.info(`    + ${change.transformed.trim()}`);
          }
          if (transformation.changes.length > 3) {
            logger.info(`    ... and ${transformation.changes.length - 3} more changes`);
          }
        }
        if (result.transformations.length > 3) {
          logger.info(`\n... and ${result.transformations.length - 3} more files`);
        }
      }

    } catch (error) {
      logger.error(chalk.red('❌ Migration failed:'), error);
      process.exit(1);
    }
  });

program.parse();
