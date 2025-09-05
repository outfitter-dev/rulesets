#!/usr/bin/env node
import { Command } from 'commander';
import { ConsoleLogger, runRulesetsV0 } from '../index';
import { CloneMode } from '../modes/clone-mode';
import { DriftDetector } from '../drift/drift-detector';
import { destinations } from '../destinations';
import { ConfigLoader } from '../config';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import * as TOML from '@iarna/toml';

const logger = new ConsoleLogger();
const program = new Command();

program
  .name('rulesets')
  .description('Rulesets - Universal rules compiler for AI coding assistants')
  .version('0.1.0');

// Compile command
program
  .command('compile [source]')
  .description('Compile source rules to destination formats')
  .option('-d, --destinations <destinations...>', 'Specific destinations to compile for')
  .option('--use-agents-dir', 'Use .agents/rules/ instead of .ruleset/')
  .option('--no-drift-detection', 'Disable drift detection')
  .action(async (source = './my-rules.mix.md', options) => {
    try {
      logger.info(`Compiling ${source}...`);
      
      // Load project configuration
      const configLoader = new ConfigLoader(logger);
      const projectConfig = await configLoader.load();
      
      // Merge with command-line options
      const config: Record<string, unknown> = { ...projectConfig };
      
      if (options.destinations) {
        config.destinations = options.destinations;
      }
      
      if (options.useAgentsDir) {
        // Apply to all destinations
        const dests = options.destinations || Array.from(destinations.keys());
        for (const dest of dests) {
          if (!config.destinations) {
            config.destinations = {};
          }
          (config.destinations as any)[dest] = {
            useAgentsDir: true
          };
        }
      }
      
      // Set up drift detection if enabled
      const driftEnabled = options.driftDetection !== false && 
                           (projectConfig.driftDetection?.enabled ?? true);
      if (driftEnabled) {
        const driftDetector = new DriftDetector({ 
          logger,
          historyPath: projectConfig.driftDetection?.historyPath
        });
        config.driftDetector = driftDetector;
      }
      
      await runRulesetsV0(source, logger, config);
    } catch (error) {
      logger.error('Compilation failed:', error);
      process.exit(1);
    }
  });

// Clone command
program
  .command('clone')
  .description('Clone between AGENTS.md and CLAUDE.md files')
  .option('-r, --recursive', 'Clone recursively in subdirectories', true)
  .option('--dry-run', 'Show what would be cloned without doing it')
  .option('-p, --path <path>', 'Root path to start from', '.')
  .action(async (options) => {
    try {
      const cloneMode = new CloneMode(logger);
      const result = await cloneMode.execute({
        rootPath: options.path,
        recursive: options.recursive,
        dryRun: options.dryRun
      });
      
      if (result.filesCloned > 0) {
        logger.info(`Successfully cloned ${result.filesCloned} files from ${result.source} to ${result.target}`);
      }
    } catch (error) {
      logger.error('Clone failed:', error);
      process.exit(1);
    }
  });

// Drift command
program
  .command('drift')
  .description('Check for drift between source and compiled rules')
  .option('-s, --source <source>', 'Source file to check', './my-rules.mix.md')
  .option('--history', 'Show drift history')
  .option('--limit <n>', 'Limit history entries', '10')
  .action(async (options) => {
    try {
      const driftDetector = new DriftDetector({ logger });
      
      if (options.history) {
        const history = await driftDetector.getDriftHistory({
          limit: parseInt(options.limit)
        });
        
        if (history.length === 0) {
          logger.info('No drift history found.');
        } else {
          logger.info(`Found ${history.length} drift entries:`);
          for (const entry of history) {
            logger.info(`  ${entry.timestamp}: ${entry.destination} - ${entry.type}`);
          }
        }
      } else {
        // Check current drift
        const compiledPaths = new Map<string, string>();
        
        // Find compiled files based on destinations
        for (const [destId, plugin] of destinations) {
          const paths = [
            `.ruleset/${destId}.md`,
            `.agents/rules/${destId}.md`,
            `.cursor/rules/${path.basename(options.source, '.mix.md')}.mdc`,
            `.windsurf/rules/${path.basename(options.source, '.mix.md')}.md`,
            'AGENTS.md',
            'CLAUDE.md'
          ];
          
          for (const p of paths) {
            try {
              await fs.access(p);
              compiledPaths.set(destId, p);
              break;
            } catch {
              // File doesn't exist, try next
            }
          }
        }
        
        const report = await driftDetector.checkDrift({
          sourcePath: options.source,
          compiledPaths
        });
        
        if (report.hasDrift) {
          logger.warn(`Drift detected in ${report.drifts.length} file(s)`);
          for (const drift of report.drifts) {
            logger.info(`  ${drift.destination}: ${drift.path}`);
            logger.info(`    Type: ${drift.type}`);
          }
        } else {
          logger.info('No drift detected.');
        }
      }
    } catch (error) {
      logger.error('Drift check failed:', error);
      process.exit(1);
    }
  });

// Init command
program
  .command('init')
  .description('Initialize a new Rulesets project')
  .option('--use-agents-dir', 'Use .agents/rules/ as default directory')
  .action(async (options) => {
    try {
      logger.info('Initializing Rulesets project...');
      
      // Create config object
      const config = {
        version: '0.1.0',
        defaultDestination: options.useAgentsDir ? '.agents/rules/' : '.ruleset/',
        destinations: {
          'agents-md': {
            outputPath: 'AGENTS.md'
          },
          'claude-code': {
            outputPath: 'CLAUDE.md'
          }
        },
        cloneMode: {
          enabled: true,
          autoDetect: true
        },
        driftDetection: {
          enabled: true,
          historyPath: '.rulesets/history.jsonl'
        }
      };
      
      // Create directories
      await fs.mkdir('.rulesets/src/_mixins', { recursive: true });
      await fs.mkdir('.rulesets/dist', { recursive: true });
      
      if (options.useAgentsDir) {
        await fs.mkdir('.agents/rules', { recursive: true });
      } else {
        await fs.mkdir('.ruleset', { recursive: true });
      }
      
      // Write config file in TOML format
      const tomlContent = TOML.stringify(config as any);
      await fs.writeFile(
        '.rulesets/rulesets.toml',
        tomlContent,
        'utf-8'
      );
      
      logger.info('Created .rulesets/rulesets.toml configuration file');
      
      // Create sample source file
      const sampleContent = `---
rulesets:
  version: "0.1.0"
title: My Project Rules
description: Rules for AI coding assistants working on this project.
destinations:
  agents-md:
    outputPath: "AGENTS.md"
  claude-code:
    outputPath: "CLAUDE.md"
---

# Project Overview

This project uses Rulesets to maintain consistent rules across AI coding assistants.

## Development Guidelines

- Follow existing code patterns
- Write tests for new features
- Use semantic commit messages

## Build Instructions

\`\`\`bash
npm install
npm run build
npm test
\`\`\`

## Code Style

- Use TypeScript with strict mode
- Format with Prettier
- Lint with ESLint
`;
      
      await fs.writeFile('my-rules.mix.md', sampleContent, 'utf-8');
      
      logger.info('✅ Rulesets project initialized successfully!');
      logger.info('');
      logger.info('Next steps:');
      logger.info('  1. Edit my-rules.mix.md to add your project rules');
      logger.info('  2. Run "rulesets compile" to generate destination files');
      logger.info('  3. Run "rulesets clone" to sync AGENTS.md and CLAUDE.md');
      logger.info('');
      logger.info(`Default destination: ${config.defaultDestination}`);
    } catch (error) {
      logger.error('Initialization failed:', error);
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .description('List available destinations')
  .action(() => {
    logger.info('Available destinations:');
    logger.info('');
    
    const sortedDests = Array.from(destinations.entries()).sort((a, b) => 
      a[0].localeCompare(b[0])
    );
    
    for (const [id, plugin] of sortedDests) {
      logger.info(`  ${id.padEnd(20)} - ${plugin.description}`);
    }
    
    logger.info('');
    logger.info('Special destinations:');
    logger.info(`  ${'agents-md'.padEnd(20)} - Universal standard (works with 15+ tools)`);
  });

// Migrate command
program
  .command('migrate')
  .description('Migrate legacy JSON config to TOML format')
  .option('-s, --source <path>', 'Source JSON config path', '.rulesets/rulesets.config.json')
  .option('-t, --target <path>', 'Target TOML config path')
  .action(async (options) => {
    try {
      const configLoader = new ConfigLoader(logger);
      await configLoader.migrateFromJson(options.source, options.target);
      logger.info('Migration completed successfully!');
    } catch (error) {
      logger.error('Migration failed:', error);
      process.exit(1);
    }
  });

program.parse();