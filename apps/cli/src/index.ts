#!/usr/bin/env node

// :M: tldr: CLI for Rulesets compiler
// :M: v0.1.0: Basic CLI implementation

import { Command } from 'commander';

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
  .action((_input, _options) => {
    // TODO: Implement compilation logic
    // console.log(`Compiling ${input} to ${options.output}`);
  });

program
  .command('init')
  .description('Initialize a new rulesets project')
  .action(() => {
    // TODO: Implement initialization logic
    // console.log('Initializing new rulesets project');
  });

program.parse();
