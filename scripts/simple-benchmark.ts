#!/usr/bin/env bun

/**
 * Simplified performance benchmark for Rulesets monorepo
 */

import { performance } from 'node:perf_hooks';
import { compile } from '@rulesets/compiler';
import { lint } from '@rulesets/linter';
import { parse } from '@rulesets/parser';

// Test data generation
function generateRuleset(size: number): string {
  const frontmatter = `---
ruleset:
  version: "0.1.0"
title: "Performance Test"
description: "Generated ruleset for performance testing"
destinations:
  cursor:
    outputPath: ".cursor/rules/test.mdc"
  claude-code:
    outputPath: "./CLAUDE.md#test"
---

`;

  const body = `# Test Rules

These are test rules for performance analysis.

## Instructions

- Follow TypeScript strict mode
- Use meaningful variable names
- Write comprehensive tests
- Optimize for performance

## Code Style

\`\`\`typescript
interface User {
  id: string;
  email: string;
  name: string;
}
\`\`\`

## Performance Guidelines

- Prefer \`const\` over \`let\`
- Use type annotations
- Avoid \`any\` type
- Implement proper error handling

`;

  let content = frontmatter;
  const targetSize = size - frontmatter.length;
  const repetitions = Math.ceil(targetSize / body.length);

  for (let i = 0; i < repetitions && content.length < size; i++) {
    content += body;
  }

  return content.slice(0, size);
}

async function benchmark() {
  console.log('🔬 Rulesets Performance Benchmark');
  console.log('=================================\n');

  const testSizes = [
    { name: 'Small (1KB)', size: 1024 },
    { name: 'Medium (10KB)', size: 10_240 },
    { name: 'Large (100KB)', size: 102_400 },
    { name: 'XLarge (1MB)', size: 1_048_576 },
  ];

  const parseResults = await runParsingBenchmarks(testSizes);
  const compileResults = runCompilationBenchmarks(testSizes, parseResults);
  runLintingBenchmarks(testSizes, parseResults);
  const concurrentMetrics = await runConcurrentBenchmarks();
  displayMemoryUsage();
  analyzePerformance(parseResults, compileResults, concurrentMetrics);
}

async function runParsingBenchmarks(
  testSizes: Array<{ name: string; size: number }>
) {
  console.log('📊 PARSING PERFORMANCE');
  console.log('-'.repeat(40));

  const parseResults: Array<{
    name: string;
    size: number;
    duration: number;
    parsed: unknown;
  }> = [];

  for (const test of testSizes) {
    const content = generateRuleset(test.size);
    const startTime = performance.now();
    const parsed = await parse(content);
    const endTime = performance.now();

    const duration = endTime - startTime;
    parseResults.push({ ...test, duration, parsed });
    console.log(`${test.name.padEnd(15)} ${duration.toFixed(2)}ms`);
  }

  return parseResults;
}

function runCompilationBenchmarks(
  testSizes: Array<{ name: string; size: number }>,
  parseResults: Array<{
    name: string;
    size: number;
    duration: number;
    parsed: unknown;
  }>
) {
  console.log('\n🔧 COMPILATION PERFORMANCE');
  console.log('-'.repeat(40));

  const compileResults: Array<{
    name: string;
    destination: string;
    duration: number;
    compiled: unknown;
  }> = [];
  const destinations = ['cursor', 'claude-code', 'windsurf'];

  for (const test of testSizes.slice(0, 2)) {
    const parseResult = parseResults.find((r) => r.name === test.name);
    if (!parseResult) {
      continue;
    }

    for (const dest of destinations) {
      const startTime = performance.now();
      const compiled = compile(parseResult.parsed, dest);
      const endTime = performance.now();

      const duration = endTime - startTime;
      compileResults.push({ ...test, destination: dest, duration, compiled });
      console.log(`${test.name} → ${dest.padEnd(12)} ${duration.toFixed(2)}ms`);
    }
  }

  return compileResults;
}

function runLintingBenchmarks(
  testSizes: Array<{ name: string; size: number }>,
  parseResults: Array<{
    name: string;
    size: number;
    duration: number;
    parsed: unknown;
  }>
) {
  console.log('\n🔍 LINTING PERFORMANCE');
  console.log('-'.repeat(40));

  const destinations = ['cursor', 'claude-code', 'windsurf'];

  for (const test of testSizes.slice(0, 2)) {
    const parseResult = parseResults.find((r) => r.name === test.name);
    if (!parseResult) {
      continue;
    }

    const startTime = performance.now();
    const lintResult = lint(parseResult.parsed, {
      requireRulesetsVersion: true,
      allowedDestinations: destinations,
    });
    const endTime = performance.now();

    const duration = endTime - startTime;
    const errorCount = lintResult.filter((r) => r.severity === 'error').length;
    const warningCount = lintResult.filter(
      (r) => r.severity === 'warning'
    ).length;

    console.log(
      `${test.name.padEnd(15)} ${duration.toFixed(2)}ms (${errorCount} errors, ${warningCount} warnings)`
    );
  }
}

async function runConcurrentBenchmarks() {
  console.log('\n⚡ CONCURRENT PROCESSING');
  console.log('-'.repeat(40));

  const mediumContent = generateRuleset(10_240);
  const concurrentCount = 100;

  const startConcurrent = performance.now();
  const promises = Array.from({ length: concurrentCount }, () =>
    parse(mediumContent)
  );
  await Promise.all(promises);
  const endConcurrent = performance.now();

  const concurrentDuration = endConcurrent - startConcurrent;
  const avgPerParse = concurrentDuration / concurrentCount;

  console.log(
    `${concurrentCount} concurrent parses: ${concurrentDuration.toFixed(2)}ms total`
  );
  console.log(`Average per parse: ${avgPerParse.toFixed(3)}ms`);

  return { concurrentDuration, concurrentCount };
}

function displayMemoryUsage() {
  console.log('\n🧠 MEMORY USAGE');
  console.log('-'.repeat(40));

  const memUsage = process.memoryUsage();
  console.log(`RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(
    `Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`
  );
  console.log(`External: ${(memUsage.external / 1024 / 1024).toFixed(2)} MB`);
}

function analyzePerformance(
  parseResults: Array<{
    name: string;
    size: number;
    duration: number;
    parsed: unknown;
  }>,
  compileResults: Array<{
    name: string;
    destination: string;
    duration: number;
    compiled: unknown;
  }>,
  concurrentMetrics: { concurrentDuration: number; concurrentCount: number }
) {
  console.log('\n📈 PERFORMANCE ANALYSIS');
  console.log('-'.repeat(40));

  const scalingFactor = analyzeParsingScalability(parseResults);
  const avgCompileTime = analyzeCompilationPerformance(compileResults);
  generateRecommendations(scalingFactor, avgCompileTime, concurrentMetrics);
}

function analyzeParsingScalability(
  parseResults: Array<{
    name: string;
    size: number;
    duration: number;
    parsed: unknown;
  }>
) {
  const parseRates = parseResults.map((r) => ({
    name: r.name,
    rate: r.duration / (r.size / 1024), // ms per KB
  }));

  console.log('Parsing rates (ms per KB):');
  for (const r of parseRates) {
    console.log(`  ${r.name}: ${r.rate.toFixed(3)} ms/KB`);
  }

  const largeRate = parseRates.at(-1)?.rate || 0;
  const smallRate = parseRates[0]?.rate || 1;
  const scalingFactor = largeRate / smallRate;

  console.log(`\nScaling factor (large/small): ${scalingFactor.toFixed(2)}x`);

  if (scalingFactor < 2) {
    console.log('✅ Excellent linear scaling');
  } else if (scalingFactor < 5) {
    console.log('⚠️  Moderate scaling degradation');
  } else {
    console.log('🚨 Poor scaling - potential O(n²) behavior');
  }

  return scalingFactor;
}

function analyzeCompilationPerformance(
  compileResults: Array<{
    name: string;
    destination: string;
    duration: number;
    compiled: unknown;
  }>
) {
  const avgCompileTime =
    compileResults.reduce((sum, r) => sum + r.duration, 0) /
    compileResults.length;
  console.log(`\nAverage compilation time: ${avgCompileTime.toFixed(3)}ms`);

  if (avgCompileTime < 0.1) {
    console.log('✅ Excellent compilation performance');
  } else if (avgCompileTime < 1) {
    console.log('✅ Good compilation performance');
  } else {
    console.log('⚠️  Compilation could be optimized');
  }

  return avgCompileTime;
}

function generateRecommendations(
  scalingFactor: number,
  avgCompileTime: number,
  concurrentMetrics: { concurrentDuration: number; concurrentCount: number }
) {
  console.log('\n💡 RECOMMENDATIONS');
  console.log('-'.repeat(40));

  const recommendations: string[] = [];
  const memUsage = process.memoryUsage();

  if (scalingFactor > 3) {
    recommendations.push(
      'Consider implementing streaming parsing for large files'
    );
    recommendations.push('Profile YAML parsing for potential optimizations');
  }

  if (avgCompileTime > 0.5) {
    recommendations.push(
      'Optimize compilation by pre-computing destination mappings'
    );
  }

  if (memUsage.heapUsed > 100 * 1024 * 1024) {
    recommendations.push('Consider memory pooling for large file processing');
  }

  if (
    concurrentMetrics.concurrentDuration / concurrentMetrics.concurrentCount >
    0.1
  ) {
    recommendations.push('Investigate opportunity for parser caching');
  }

  if (recommendations.length === 0) {
    console.log('✅ No immediate performance concerns detected');
    console.log(
      '✅ Current implementation shows good performance characteristics'
    );
  } else {
    for (const [index, rec] of recommendations.entries()) {
      console.log(`${index + 1}. ${rec}`);
    }
  }
}

// Run the benchmark
benchmark().catch(console.error);
