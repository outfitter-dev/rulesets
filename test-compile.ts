#!/usr/bin/env bun

import { ConsoleLogger, runRulesetsV0 } from './packages/core/src/index';

async function main() {
  const logger = new ConsoleLogger();
  const sourceFile = process.argv[2] || './my-rules.mix.md';
  
  try {
    logger.info(`Testing Rulesets compiler with: ${sourceFile}`);
    await runRulesetsV0(sourceFile, logger);
    logger.info('✅ Compilation successful!');
  } catch (error) {
    logger.error('❌ Compilation failed:', error);
    process.exit(1);
  }
}

main();