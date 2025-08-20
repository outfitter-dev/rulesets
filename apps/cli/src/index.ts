#!/usr/bin/env node

// TLDR: CLI for Rulesets compiler (ruleset-v0.1-beta)
// TLDR: ruleset-v0.1-beta Basic CLI implementation with provider filtering

import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { Command } from 'commander';
import { ConsoleLogger, runRulesetsV0, type RulesetConfig } from '@rulesets/core';

const program = new Command();

program
  .name('rulesets')
  .description('CLI for Rulesets compiler')
  .version('0.1.0');

program
  .command('compile')
  .description('Compile rulesets files')
  .argument('<input>', 'Input file or directory')
  .option('-o, --output <dir>', 'Output directory', '.ruleset/dist')
  .option(
    '-p, --provider <providers...>',
    'Filter compilation to specific providers (e.g., cursor, windsurf, claude-code)'
  )
  .option('--verbose', 'Enable verbose logging')
  .option('--quiet', 'Suppress non-error output')
  .action(async (input, options) => {
    const logger = new ConsoleLogger();
    
    // Note: ConsoleLogger doesn't support setLevel yet
    // TODO: Enhanced logger configuration for quiet/verbose modes will be added in future version
    if (options.quiet) {
      // Suppress non-error output by overriding logger methods
      logger.info = () => {};
      logger.debug = () => {};
      logger.warn = () => {};
    }

    try {
      // Resolve input path
      const inputPath = resolve(input);
      
      // Check if input is a file or directory
      const stat = await fs.stat(inputPath);
      const filesToProcess: string[] = [];
      
      if (stat.isFile()) {
        // Single file
        if (!inputPath.endsWith('.rule.md') && !inputPath.endsWith('.ruleset.md')) {
          logger.warn(`Input file ${inputPath} does not have expected extension (.rule.md or .ruleset.md)`);
        }
        filesToProcess.push(inputPath);
      } else if (stat.isDirectory()) {
        // Directory - find all rule files
        const findRuleFiles = async (dir: string): Promise<string[]> => {
          const files: string[] = [];
          const entries = await fs.readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            if (entry.isDirectory()) {
              // Skip certain directories
              if (!entry.name.startsWith('.') && !entry.name.startsWith('node_modules')) {
                files.push(...await findRuleFiles(join(dir, entry.name)));
              }
            } else if (entry.isFile()) {
              if (entry.name.endsWith('.rule.md') || entry.name.endsWith('.ruleset.md')) {
                files.push(join(dir, entry.name));
              }
            }
          }
          return files;
        };
        
        filesToProcess.push(...await findRuleFiles(inputPath));
        
        if (filesToProcess.length === 0) {
          throw new Error(`No .rule.md or .ruleset.md files found in directory: ${inputPath}`);
        }
        
        logger.info(`Found ${filesToProcess.length} rule file(s) to process`);
      } else {
        throw new Error(`Input path is neither a file nor a directory: ${inputPath}`);
      }

      // Build configuration override for provider filtering
      let configOverride: Partial<RulesetConfig> = {
        outputDirectory: options.output,
      };

      // Apply provider filtering if specified
      if (options.provider && options.provider.length > 0) {
        logger.info(`Filtering compilation to providers: ${options.provider.join(', ')}`);
        
        // Build providers config with only specified providers enabled
        const providers: Record<string, { enabled: boolean }> = {};
        
        // First disable all providers
        const allProviders = [
          'cursor', 'windsurf', 'claude-code', 'codex-cli', 'amp', 'opencode'
        ];
        
        for (const provider of allProviders) {
          providers[provider] = { enabled: false };
        }
        
        // Then enable only the specified providers
        for (const provider of options.provider) {
          if (allProviders.includes(provider)) {
            providers[provider] = { enabled: true };
          } else {
            logger.warn(`Unknown provider: ${provider}. Available providers: ${allProviders.join(', ')}`);
          }
        }
        
        // Create a new config override with providers
        configOverride = {
          ...configOverride,
          providers: providers as Readonly<Record<string, { enabled: boolean }>>,
        };
      }

      // Process each file
      for (const filePath of filesToProcess) {
        logger.info(`Processing: ${filePath}`);
        await runRulesetsV0(filePath, logger, configOverride);
      }

      logger.info(`Successfully processed ${filesToProcess.length} file(s)`);
    } catch (error) {
      logger.error(`Compilation failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new rulesets project')
  .option('--name <name>', 'Project name')
  .option('--output <dir>', 'Output directory', '.ruleset')
  .action(async (options) => {
    const logger = new ConsoleLogger();
    
    try {
      const outputDir = resolve(options.output);
      
      // Create directory structure
      await fs.mkdir(join(outputDir, 'src'), { recursive: true });
      await fs.mkdir(join(outputDir, 'src', '_partials'), { recursive: true });
      
      // Create sample configuration file
      const sampleConfig: RulesetConfig = {
        rulesets: { version: '0.1.0' },
        outputDirectory: '.ruleset/dist',
        providers: {
          cursor: { enabled: true },
          windsurf: { enabled: true },
          'claude-code': { enabled: true },
        },
        gitignore: {
          enabled: true,
        },
      };
      
      await fs.writeFile(
        join(outputDir, '..', 'ruleset.config.jsonc'),
        JSON.stringify(sampleConfig, null, 2)
      );
      
      // Create sample rule file
      const sampleRule = `---
ruleset:
  version: "0.1.0"
title: "${options.name || 'My Rules'}"
description: "Sample rulesets file"
---

# ${options.name || 'My Rules'}

{{#instructions}}
These are the instructions for AI assistants.
{{/instructions}}

## Guidelines

- Write clean, maintainable code
- Follow consistent formatting
- Include comprehensive tests

{{#examples}}
\`\`\`typescript
// Example code
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`
{{/examples}}
`;
      
      await fs.writeFile(
        join(outputDir, 'src', 'my-rules.rule.md'),
        sampleRule
      );
      
      logger.info(`Initialized new rulesets project in ${outputDir}`);
      logger.info(`Configuration: ${join(outputDir, '..', 'ruleset.config.jsonc')}`);
      logger.info(`Sample rule: ${join(outputDir, 'src', 'my-rules.rule.md')}`);
      logger.info(`Run "rulesets compile ${join(outputDir, 'src', 'my-rules.rule.md')}" to test compilation`);
    } catch (error) {
      logger.error(`Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program.parse();
