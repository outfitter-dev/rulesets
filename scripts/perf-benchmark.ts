#!/usr/bin/env bun

/**
 * Performance benchmark script for Rulesets monorepo
 * Measures build times, runtime performance, and memory usage
 */

import { compile } from '@rulesets/compiler';
import { ConsoleLogger, runRulesetsV0 } from '@rulesets/core';
import { lint } from '@rulesets/linter';
import { parse } from '@rulesets/parser';
import { promises as fs } from 'fs';
import { performance } from 'perf_hooks';

// import type { ParsedDoc } from '@rulesets/types';

interface BenchmarkResult {
  operation: string;
  duration: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
}

class PerformanceBenchmarker {
  private results: BenchmarkResult[] = [];
  // private logger = new ConsoleLogger();

  async measureOperation<T>(
    operation: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const startMem = process.memoryUsage();
    const start = performance.now();

    const result = await fn();

    const end = performance.now();
    const endMem = process.memoryUsage();
    const duration = end - start;

    this.results.push({
      operation,
      duration,
      memoryUsage: {
        heapUsed: endMem.heapUsed - startMem.heapUsed,
        heapTotal: endMem.heapTotal - startMem.heapTotal,
        external: endMem.external - startMem.external,
        rss: endMem.rss - startMem.rss,
      },
    });

    console.log(`✓ ${operation}: ${duration.toFixed(2)}ms`);
    return result;
  }

  async benchmarkParsing(): Promise<void> {
    console.log('\n📊 Benchmarking Parsing Performance');

    // Test different sizes of content
    const testCases = [
      { name: 'Small (1KB)', size: 1024 },
      { name: 'Medium (10KB)', size: 10_240 },
      { name: 'Large (100KB)', size: 102_400 },
      { name: 'XLarge (1MB)', size: 1_048_576 },
    ];

    for (const testCase of testCases) {
      const content = this.generateTestContent(testCase.size);

      await this.measureOperation(`Parse ${testCase.name}`, async () => {
        return parse(content);
      });

      // Test multiple iterations for small content
      if (testCase.size <= 10_240) {
        await this.measureOperation(`Parse ${testCase.name} x100`, async () => {
          const promises = Array.from({ length: 100 }, () => parse(content));
          return Promise.all(promises);
        });
      }
    }
  }

  async benchmarkCompilation(): Promise<void> {
    console.log('\n🔧 Benchmarking Compilation Performance');

    const content = this.generateTestContent(10_240);
    const parsedDoc = await parse(content);

    // Test compilation for different destinations
    const destinations = ['cursor', 'claude-code', 'windsurf'];

    for (const dest of destinations) {
      await this.measureOperation(`Compile for ${dest}`, () => {
        return compile(parsedDoc, dest);
      });
    }

    // Test bulk compilation
    await this.measureOperation('Compile all destinations', () => {
      return destinations.map((dest) => compile(parsedDoc, dest));
    });
  }

  async benchmarkLinting(): Promise<void> {
    console.log('\n🔍 Benchmarking Linting Performance');

    const content = this.generateTestContent(10_240);
    const parsedDoc = await parse(content);

    await this.measureOperation('Lint document', () => {
      return lint(parsedDoc);
    });

    // Test linting with different configurations
    await this.measureOperation('Lint with strict config', () => {
      return lint(parsedDoc, {
        requireRulesetsVersion: true,
        allowedDestinations: ['cursor', 'claude-code', 'windsurf'],
      });
    });
  }

  async benchmarkFullPipeline(): Promise<void> {
    console.log('\n🚀 Benchmarking Full Pipeline Performance');

    const testFile = '/tmp/rulesets-benchmark.rule.md';
    const content = this.generateTestRuleset(50_000); // 50KB test file

    await fs.writeFile(testFile, content);

    try {
      await this.measureOperation('Full pipeline (50KB file)', async () => {
        return runRulesetsV0(testFile, new ConsoleLogger());
      });
    } catch (error) {
      console.warn('Full pipeline test failed:', error);
    } finally {
      await fs.unlink(testFile).catch(() => {});
    }
  }

  async benchmarkConcurrency(): Promise<void> {
    console.log('\n⚡ Benchmarking Concurrent Processing');

    const content = this.generateTestContent(5000);

    // Test concurrent parsing
    await this.measureOperation('Parse 10 files concurrently', async () => {
      const promises = Array.from({ length: 10 }, () => parse(content));
      return Promise.all(promises);
    });

    // Test concurrent compilation
    const parsedDoc = await parse(content);
    await this.measureOperation('Compile 10 docs concurrently', async () => {
      const promises = Array.from({ length: 10 }, () =>
        compile(parsedDoc, 'cursor')
      );
      return Promise.all(promises);
    });
  }

  async benchmarkMemoryUsage(): Promise<void> {
    console.log('\n🧠 Benchmarking Memory Usage Patterns');

    // Test memory usage with increasing file sizes
    const sizes = [1000, 10_000, 100_000, 500_000];

    for (const size of sizes) {
      const content = this.generateTestContent(size);

      await this.measureOperation(
        `Memory test ${Math.round(size / 1000)}KB`,
        async () => {
          const parsed = await parse(content);
          const compiled = compile(parsed, 'cursor');
          await lint(parsed);

          // Simulate some processing time
          await new Promise((resolve) => setTimeout(resolve, 10));

          return compiled;
        }
      );
    }
  }

  generateTestContent(size: number): string {
    const frontmatter = `---
ruleset:
  version: "0.1.0"
title: "Performance Test Rules"
description: "Generated content for performance testing"
destinations:
  cursor:
    outputPath: ".cursor/rules/perf-test.mdc"
  claude-code:
    outputPath: "./CLAUDE.md#perf-test"
---

`;

    const baseContent = `# Performance Test Rules

This is a generated file for performance testing purposes.

## Instructions

- Follow these coding standards
- Maintain high performance
- Optimize for readability

## Code Examples

\`\`\`typescript
interface Example {
  id: string;
  data: unknown;
}
\`\`\`

`;

    let content = frontmatter;
    const remainingSize = size - frontmatter.length;
    const repetitions = Math.ceil(remainingSize / baseContent.length);

    for (let i = 0; i < repetitions; i++) {
      content += baseContent;
      if (content.length >= size) break;
    }

    return content.slice(0, size);
  }

  generateTestRuleset(size: number): string {
    return this.generateTestContent(size);
  }

  generateReport(): void {
    console.log('\n📈 Performance Analysis Report');
    console.log('=====================================');

    // Group results by operation type
    const groups = this.results.reduce(
      (acc, result) => {
        const category = result.operation.split(' ')[0] || 'unknown';
        if (!acc[category]) acc[category] = [];
        acc[category].push(result);
        return acc;
      },
      {} as Record<string, BenchmarkResult[]>
    );

    for (const [category, results] of Object.entries(groups)) {
      console.log(`\n${category.toUpperCase()} OPERATIONS:`);
      console.log('-'.repeat(40));

      for (const result of results) {
        const memMB = (result.memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
        console.log(
          `  ${result.operation}: ${result.duration.toFixed(2)}ms (${memMB}MB heap)`
        );
      }

      const avgDuration =
        results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const avgMemory =
        results.reduce((sum, r) => sum + r.memoryUsage.heapUsed, 0) /
        results.length /
        1024 /
        1024;
      console.log(
        `  Average: ${avgDuration.toFixed(2)}ms (${avgMemory.toFixed(2)}MB heap)`
      );
    }

    // Identify bottlenecks
    console.log('\n🚨 PERFORMANCE BOTTLENECKS:');
    console.log('-'.repeat(40));

    const slowOperations = this.results
      .filter((r) => r.duration > 50)
      .sort((a, b) => b.duration - a.duration);

    if (slowOperations.length === 0) {
      console.log(
        '  ✓ No significant bottlenecks detected (all operations < 50ms)'
      );
    } else {
      slowOperations.forEach((op) => {
        console.log(`  ⚠️  ${op.operation}: ${op.duration.toFixed(2)}ms`);
      });
    }

    // Memory analysis
    console.log('\n🧠 MEMORY ANALYSIS:');
    console.log('-'.repeat(40));

    const highMemoryOps = this.results
      .filter((r) => r.memoryUsage.heapUsed > 10 * 1024 * 1024) // > 10MB
      .sort((a, b) => b.memoryUsage.heapUsed - a.memoryUsage.heapUsed);

    if (highMemoryOps.length === 0) {
      console.log('  ✓ No high memory operations detected (all < 10MB heap)');
    } else {
      highMemoryOps.forEach((op) => {
        const memMB = (op.memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
        console.log(`  ⚠️  ${op.operation}: ${memMB}MB heap usage`);
      });
    }

    // Performance recommendations
    this.generateRecommendations();
  }

  generateRecommendations(): void {
    console.log('\n💡 OPTIMIZATION RECOMMENDATIONS:');
    console.log('-'.repeat(40));

    const recommendations = [];

    // Check for slow parsing
    const parseOps = this.results.filter((r) => r.operation.includes('Parse'));
    const avgParseTime =
      parseOps.reduce((sum, r) => sum + r.duration, 0) / parseOps.length;

    if (avgParseTime > 20) {
      recommendations.push(
        'Consider caching parsed documents for repeated operations'
      );
      recommendations.push('Implement streaming parsing for large files');
    }

    // Check for compilation bottlenecks
    const compileOps = this.results.filter((r) =>
      r.operation.includes('Compile')
    );
    const avgCompileTime =
      compileOps.reduce((sum, r) => sum + r.duration, 0) / compileOps.length;

    if (avgCompileTime > 10) {
      recommendations.push(
        'Optimize compilation by pre-computing destination mappings'
      );
      recommendations.push(
        'Consider parallel compilation for multiple destinations'
      );
    }

    // Check for memory issues
    const maxHeapUsed = Math.max(
      ...this.results.map((r) => r.memoryUsage.heapUsed)
    );
    if (maxHeapUsed > 50 * 1024 * 1024) {
      // > 50MB
      recommendations.push(
        'Implement memory pooling for large file processing'
      );
      recommendations.push(
        'Add incremental processing for very large rulesets'
      );
    }

    if (recommendations.length === 0) {
      console.log('  ✓ No immediate optimization recommendations');
      console.log(
        '  ✓ Current performance appears to be within acceptable bounds'
      );
    } else {
      recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }
  }
}

// Run benchmarks
async function main() {
  console.log('🔬 Rulesets Performance Benchmark Suite');
  console.log('=========================================');

  const benchmarker = new PerformanceBenchmarker();

  try {
    await benchmarker.benchmarkParsing();
    await benchmarker.benchmarkCompilation();
    await benchmarker.benchmarkLinting();
    await benchmarker.benchmarkConcurrency();
    await benchmarker.benchmarkMemoryUsage();
    await benchmarker.benchmarkFullPipeline();

    benchmarker.generateReport();
  } catch (error) {
    console.error('Benchmark failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
