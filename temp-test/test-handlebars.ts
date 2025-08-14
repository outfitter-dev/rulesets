#!/usr/bin/env bun

/**
 * Test script for Handlebars compiler
 */

import { readFile } from 'fs/promises';
import { parse } from 'yaml';
import { HandlebarsRulesetCompiler } from '../packages/core/src/compiler/handlebars-compiler';
import type { ParsedDoc } from '../packages/core/src/interfaces';

async function testHandlebarsCompiler() {
  console.log('🔧 Testing Handlebars compiler...\n');

  // Read the test file
  const content = await readFile('./temp-test/handlebars-example.rule.md', 'utf-8');

  // Simple frontmatter parsing
  let frontmatter: Record<string, unknown> = {};
  let bodyContent = content;

  if (content.startsWith('---\n')) {
    const endIndex = content.indexOf('\n---\n', 4);
    if (endIndex !== -1) {
      const frontmatterText = content.slice(4, endIndex);
      frontmatter = parse(frontmatterText);
      bodyContent = content.slice(endIndex + 5);
    }
  }

  // Create parsed doc
  const parsedDoc: ParsedDoc = {
    source: {
      path: 'temp-test/handlebars-example.rule.md',
      content,
      frontmatter
    },
    ast: {
      blocks: [],
      imports: [],
      variables: [],
      markers: []
    }
  };

  // Create compiler and test with different providers
  const compiler = new HandlebarsRulesetCompiler();
  const providers = ['cursor', 'windsurf', 'claude-code'];

  for (const provider of providers) {
    console.log(`📝 Compiling for ${provider}:`);
    console.log('='.repeat(50));

    try {
      const result = compiler.compile(parsedDoc, provider);
      console.log(result.output.content);
      console.log('\n' + '='.repeat(50) + '\n');
    } catch (error) {
      console.error(`❌ Error compiling for ${provider}:`, error);
    }
  }
}

// Run the test
testHandlebarsCompiler().catch(console.error);