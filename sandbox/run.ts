#!/usr/bin/env bun

/**
 * Sandbox Runner for Rulesets
 *
 * This script provides a safe environment to test and experiment with
 * Rulesets compilation without affecting the main project.
 */

import { basename, dirname, resolve } from 'node:path';
import { ConsoleLogger, runRulesetsV0 } from '../packages/core/src/index.js';

const logger = new ConsoleLogger();

// Configuration for sandbox environment
const SANDBOX_CONFIG = {
  outputDirectory: './sandbox/output',
  providers: {
    cursor: { enabled: true },
    'claude-code': { enabled: true },
    windsurf: { enabled: true },
    amp: { enabled: true },
    codex: { enabled: true },
  },
  gitignore: {
    enabled: false, // Don't modify gitignore in sandbox
  },
};

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    logger.info('🎮 Rulesets Sandbox');
    logger.info('');
    logger.info('Usage: bun sandbox/run.ts <ruleset-file>');
    logger.info('');
    logger.info('Examples:');
    logger.info('  bun sandbox/run.ts examples/basic-rules.ruleset.md');
    logger.info('  bun sandbox/run.ts examples/typescript-rules.ruleset.md');
    logger.info('  bun sandbox/run.ts examples/react-guidelines.ruleset.md');
    logger.info('');
    logger.info('Available examples:');

    try {
      const examples = await Array.fromAsync(
        new Bun.Glob('examples/*.ruleset.md').scan('.')
      );
      for (const example of examples) {
        logger.info(`  📝 ${example}`);
      }
    } catch {
      logger.info('  (No examples found - create some in ./examples/)');
    }

    process.exit(0);
  }

  const inputFile = resolve(args[0]);
  const fileName = basename(inputFile, '.ruleset.md');

  logger.info('🚀 Running Rulesets Sandbox');
  logger.info(`📁 Input: ${args[0]}`);
  logger.info(`📤 Output: ${SANDBOX_CONFIG.outputDirectory}`);
  logger.info('');

  // Ensure output directory exists
  await Bun.write(`${SANDBOX_CONFIG.outputDirectory}/.gitkeep`, '');

  try {
    // Run Rulesets with sandbox configuration
    await runRulesetsV0(inputFile, logger, SANDBOX_CONFIG);

    logger.info('');
    logger.info('✨ Sandbox run completed!');
    logger.info('');
    logger.info('📂 Check your output in:');

    // List generated files
    const outputGlob = new Bun.Glob('**/*');
    const outputFiles = await Array.fromAsync(
      outputGlob.scan(SANDBOX_CONFIG.outputDirectory)
    );

    for (const file of outputFiles.filter((f) => f !== '.gitkeep')) {
      logger.info(`   ${SANDBOX_CONFIG.outputDirectory}/${file}`);
    }
  } catch (error) {
    logger.error('❌ Sandbox run failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
