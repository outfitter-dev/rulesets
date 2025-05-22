#!/usr/bin/env node
// TLDR: Main CLI entry point for branch-diffs tool

import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'node:child_process';
import { loadConfig } from './config';
import { getBranchesWithPattern, listPatterns, applyPatterns } from './patternBranch';
import { createVersionFilter } from './patternVersion';

const program = new Command();

// TLDR: Execute git command and return trimmed output
function runGitCommand(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (error) {
    throw new Error(`Git command failed: ${cmd}`);
  }
}

// TLDR: Get branches based on scope (local, remote, or all) that match a filter
function getBranchesWithFilter(filter?: string, scope: 'local' | 'remote' | 'all' = 'all'): string[] {
  let gitCommand = '';
  
  switch (scope) {
    case 'local':
      gitCommand = 'git branch';
      break;
    case 'remote':
      gitCommand = 'git branch -r';
      break;
    case 'all':
    default:
      gitCommand = 'git branch -a';
      break;
  }

  const branches = runGitCommand(gitCommand)
    .split('\n')
    .map(branch => branch.trim())
    .filter(branch => branch && !branch.startsWith('*'))
    .map(branch => {
      // Clean up remote branch names
      if (branch.startsWith('remotes/origin/')) {
        return branch.replace('remotes/origin/', '');
      }
      return branch;
    })
    .filter(branch => !branch.includes('HEAD ->')) // Remove HEAD reference
    .filter((branch, index, arr) => arr.indexOf(branch) === index); // Remove duplicates

  if (filter) {
    return branches.filter(branch => branch.includes(filter));
  }

  return branches;
}

program
  .name('branch-diffs')
  .description('CLI tool for comparing git branches and generating comprehensive diff reports')
  .version('0.1.0');

program
  .argument('[branches...]', 'specific branches to compare')
  .option('-t, --target <branch>', 'target branch to compare against')
  .option('-f, --filter <pattern>', 'filter branches by pattern')
  .option('-p, --pattern <name>', 'use named pattern from config')
  .option('-m, --match <patterns>', 'manual pattern matching (comma-separated, supports !, + syntax)')
  .option('-v, --version <version>', 'version-aware pattern matching (e.g., 0, v0.1, 1.2.x)')
  .option('-s, --scope <type>', 'branch scope: all, local, or remote')
  .action((branches: string[], options: { target?: string; filter?: string; pattern?: string; match?: string; version?: string; scope?: string }) => {
    // Load configuration
    const config = loadConfig();
    
    // Use config defaults if not provided
    const effectiveTarget = options.target || config.git.defaultTarget;
    const effectiveScope = options.scope || config.git.defaultScope;
    
    console.log(chalk.blue('🔍 Branch Diffs CLI'));
    console.log(chalk.gray(`Target: ${effectiveTarget}`));
    console.log(chalk.gray(`Scope: ${effectiveScope}`));

    let branchesToCompare: string[] = branches;

    if (options.filter || options.pattern || options.match || options.version) {
      // Validate scope option
      const validScopes = ['all', 'local', 'remote'] as const;
      const scope = effectiveScope as 'local' | 'remote' | 'all';
      
      if (!validScopes.includes(scope)) {
        console.log(chalk.red(`❌ Invalid scope: "${effectiveScope}". Must be one of: ${validScopes.join(', ')}`));
        process.exit(1);
      }

      // Get all branches in scope
      const allBranches = getBranchesWithFilter(undefined, scope);

      if (options.pattern) {
        // Use named pattern from config
        try {
          console.log(chalk.yellow(`📋 Using pattern "${options.pattern}" on ${scope} branches`));
          branchesToCompare = getBranchesWithPattern(allBranches, options.pattern, config);
        } catch (error) {
          console.log(chalk.red(`❌ ${error.message}`));
          console.log(chalk.gray(`Available patterns: ${listPatterns(config).join(', ')}`));
          process.exit(1);
        }
      } else if (options.match) {
        // Use manual pattern matching
        console.log(chalk.yellow(`📋 Matching ${scope} branches with manual patterns: "${options.match}"`));
        const manualPatterns = options.match.split(',').map(p => p.trim());
        branchesToCompare = applyPatterns(allBranches, manualPatterns);
      } else if (options.version) {
        // Use version-aware pattern matching
        console.log(chalk.yellow(`📋 Finding ${scope} branches matching version: "${options.version}"`));
        const versionFilter = createVersionFilter(options.version);
        branchesToCompare = versionFilter(allBranches);
      } else if (options.filter) {
        // Use simple filter
        console.log(chalk.yellow(`📋 Filtering ${scope} branches with pattern: "${options.filter}"`));
        branchesToCompare = getBranchesWithFilter(options.filter, scope);
      }
      
      if (branchesToCompare.length === 0) {
        let method = '';
        if (options.pattern) method = `pattern "${options.pattern}"`;
        else if (options.match) method = `manual patterns "${options.match}"`;
        else if (options.version) method = `version "${options.version}"`;
        else if (options.filter) method = `filter "${options.filter}"`;
        
        console.log(chalk.red(`❌ No ${scope} branches found matching ${method}`));
        process.exit(1);
      }

      console.log(chalk.green(`✅ Found ${branchesToCompare.length} ${scope} branches:`));
      branchesToCompare.forEach(branch => {
        console.log(chalk.gray(`  - ${branch}`));
      });
    }

    if (branchesToCompare.length === 0) {
      console.log(chalk.red('❌ No branches specified to compare'));
      console.log(chalk.gray('Use specific branch names, --filter, --pattern, --match, or --version option'));
      process.exit(1);
    }

    console.log(chalk.blue('\n🚧 Report generation not yet implemented'));
    console.log(chalk.gray('Would generate diff report for:'));
    console.log(chalk.gray(`  Target: ${effectiveTarget}`));
    branchesToCompare.forEach(branch => {
      console.log(chalk.gray(`  Compare: ${branch}`));
    });
  });

program.parse();