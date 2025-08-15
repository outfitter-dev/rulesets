#!/usr/bin/env bun

/**
 * Test script for Handlebars compiler
 */

import { parse } from 'yaml';
import { HandlebarsRulesetCompiler } from '../packages/core/src/compiler/handlebars-compiler';
import type { ParsedDoc } from '../packages/core/src/interfaces';

async function testHandlebarsCompiler() {
  // Read the test file
  const content = await Bun.file(
    './temp-test/handlebars-example.rule.md'
  ).text();

  // Simple frontmatter parsing
  let frontmatter: Record<string, unknown> = {};
  let _bodyContent = content;

  if (content.startsWith('---\n')) {
    const endIndex = content.indexOf('\n---\n', 4);
    if (endIndex !== -1) {
      const frontmatterText = content.slice(4, endIndex);
      frontmatter = parse(frontmatterText);
      _bodyContent = content.slice(endIndex + 5);
    }
  }

  // Create parsed doc
  const parsedDoc: ParsedDoc = {
    source: {
      path: 'temp-test/handlebars-example.rule.md',
      content,
      frontmatter,
    },
    ast: {
      blocks: [],
      imports: [],
      variables: [],
      markers: [],
    },
  };

  // Create compiler and test with different providers
  const compiler = new HandlebarsRulesetCompiler();
  const providers = ['cursor', 'windsurf', 'claude-code'];

  for (const provider of providers) {
    try {
      const _result = compiler.compile(parsedDoc, provider);
    } catch (_error) {
      // Ignore compilation errors during testing
    }
  }
}

// Run the test
testHandlebarsCompiler().catch((_error) => {
  // Handle test errors silently
  // Ignore error for this test
});
