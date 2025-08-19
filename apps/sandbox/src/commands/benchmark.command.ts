/**

- @fileoverview Benchmark Command
-
- CLI command for running comprehensive performance benchmarks
- and validating system performance against targets.
 */

import { Command } from 'commander';
import {
  PerformanceBenchmarks,
  runPerformanceBenchmarks,
  validatePerformance,
} from '../infrastructure/performance/benchmarks/performance.benchmarks';

interface BenchmarkOptions {
  quick?: boolean;
  iterations?: string;
  warmup?: string;
  timeout?: string;
  verbose?: boolean;
  json?: boolean;
  output?: string;
  targets?: boolean;
  memory?: boolean;
  categories?: string;
}

/**

- Create benchmark command
 */
export function createBenchmarkCommand(): Command {
  const command = new Command('benchmark');

  command
    .description('Run performance benchmarks and validation')
    .option('-q, --quick', 'Run quick validation only (10 iterations)')
    .option(
      '-i, --iterations <count>',
      'Number of iterations per benchmark',
      '100'
    )
    .option('-w, --warmup <count>', 'Number of warmup iterations', '10')
    .option(
      '-t, --timeout <ms>',
      'Timeout per benchmark in milliseconds',
      '30000'
    )
    .option('-v, --verbose', 'Enable verbose output with progress')
    .option('-j, --json', 'Output results in JSON format')
    .option('-o, --output <file>', 'Write results to file')
    .option('--targets', 'Show performance targets and exit')
    .option('--memory', 'Include memory usage analysis')
    .option(
      '--categories <list>',
      'Run specific categories (filesystem,cache,queue,streaming,compilation)'
    )
    .action(async (options: BenchmarkOptions) => {
      await handleBenchmarkCommand(options);
    });

  return command;
}

/**

- Handle benchmark command execution
 */
async function handleBenchmarkCommand(
  options: BenchmarkOptions
): Promise<void> {
  try {
    // Show performance targets if requested
    if (options.targets) {
      showPerformanceTargets();
      return;
    }

    // Parse options
    const iterations = Number.parseInt(options.iterations || '100', 10);
    const warmupIterations = Number.parseInt(options.warmup || '10', 10);
    const timeout = Number.parseInt(options.timeout || '30000', 10);

    // Validate options
    if (isNaN(iterations) || iterations < 1) {
      console.error('❌ Invalid iterations count. Must be a positive number.');
      process.exit(1);
    }

    if (isNaN(warmupIterations) || warmupIterations < 0) {
      console.error(
        '❌ Invalid warmup iterations count. Must be a non-negative number.'
      );
      process.exit(1);
    }

    if (isNaN(timeout) || timeout < 1000) {
      console.error('❌ Invalid timeout. Must be at least 1000ms.');
      process.exit(1);
    }

    // Quick validation mode
    if (options.quick) {
      await runQuickValidation(options.verbose);
      return;
    }

    // Full benchmark suite
    await runFullBenchmarkSuite({
      iterations,
      warmupIterations,
      timeout,
      verbose: options.verbose,
      json: options.json,
      output: options.output,
      memory: options.memory,
      categories: options.categories?.split(',').map((c) => c.trim()),
    });
  } catch (error) {
    console.error('❌ Benchmark failed:', (error as Error).message);
    if (options.verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

/**

- Run quick performance validation
 */
async function runQuickValidation(verbose: boolean): Promise<void> {
  console.log('⚡ Running Quick Performance Validation\n');

  const startTime = Date.now();
  const passed = await validatePerformance();
  const duration = Date.now() - startTime;

  if (passed) {
    console.log(`✅ Quick validation passed in ${duration}ms`);
    console.log('🚀 System performance meets basic requirements\n');
  } else {
    console.log(`❌ Quick validation failed in ${duration}ms`);
    console.log('🐌 System performance issues detected\n');
    console.log('💡 Run full benchmarks with --verbose for detailed analysis');
    process.exit(1);
  }
}

/**

- Run full benchmark suite
 */
async function runFullBenchmarkSuite(config: {
  iterations: number;
  warmupIterations: number;
  timeout: number;
  verbose: boolean;
  json: boolean;
  output?: string;
  memory: boolean;
  categories?: string[];
}): Promise<void> {
  const benchmarkConfig = {
    iterations: config.iterations,
    warmupIterations: config.warmupIterations,
    timeout: config.timeout,
    enableDetailedMetrics: true,
    printProgress: config.verbose,
  };

  console.log('🏁 Starting Full Performance Benchmark Suite');
  console.log(
    `📊 Configuration: ${config.iterations} iterations, ${config.warmupIterations} warmup, ${config.timeout}ms timeout\n`
  );

  const startTime = Date.now();

  if (config.categories && config.categories.length > 0) {
    await runCategoryBenchmarks(config.categories, benchmarkConfig, config);
  } else {
    const results = await runPerformanceBenchmarks(benchmarkConfig);
    await processResults(results, config);
  }

  const totalDuration = Date.now() - startTime;
  console.log(`\n⏱️  Total benchmark time: ${totalDuration}ms`);
}

/**

- Run specific category benchmarks
 */
async function runCategoryBenchmarks(
  categories: string[],
  benchmarkConfig: any,
  config: any
): Promise<void> {
  const benchmarks = new PerformanceBenchmarks(benchmarkConfig);
  const validCategories = [
    'filesystem',
    'cache',
    'queue',
    'streaming',
    'compilation',
  ];

  // Validate categories
  const invalidCategories = categories.filter(
    (cat) => !validCategories.includes(cat)
  );
  if (invalidCategories.length > 0) {
    console.error(`❌ Invalid categories: ${invalidCategories.join(', ')}`);
    console.error(`✅ Valid categories: ${validCategories.join(', ')}`);
    process.exit(1);
  }

  console.log(
    `🎯 Running benchmarks for categories: ${categories.join(', ')}\n`
  );

  const allResults: any[] = [];

  for (const category of categories) {
    console.log(`\n📂 ${category.toUpperCase()} Benchmarks`);

    try {
      let categoryResults: any[] = [];

      switch (category) {
        case 'filesystem':
          categoryResults =
            (await benchmarks['runFileSystemBenchmarks']?.()) || [];
          break;
        case 'cache':
          categoryResults = (await benchmarks['runCacheBenchmarks']?.()) || [];
          break;
        case 'queue':
          categoryResults = (await benchmarks['runQueueBenchmarks']?.()) || [];
          break;
        case 'streaming':
          categoryResults =
            (await benchmarks['runStreamingBenchmarks']?.()) || [];
          break;
        case 'compilation':
          categoryResults =
            (await benchmarks['runCompilationBenchmarks']?.()) || [];
          break;
      }

      allResults.push(...categoryResults);
    } catch (error) {
      console.error(
        `❌ Error running ${category} benchmarks:`,
        (error as Error).message
      );
    }
  }

  // Create summary results object
  const summaryResults = {
    suiteName: `Category Benchmarks: ${categories.join(', ')}`,
    totalTime: 0, // Would be calculated
    benchmarks: allResults,
    passedCount: allResults.filter((r) => r.passed).length,
    failedCount: allResults.filter((r) => !r.passed).length,
    overallPassed: allResults.every((r) => r.passed),
    summary: 'Category-specific benchmark results',
  };

  await processResults(summaryResults, config);
}

/**

- Process and output benchmark results
 */
async function processResults(
  results: any,
  config: { json: boolean; output?: string; memory: boolean; verbose: boolean }
): Promise<void> {
  if (config.json) {
    const jsonOutput = JSON.stringify(results, null, 2);

    if (config.output) {
      const fs = await import('node:fs/promises');
      await fs.writeFile(config.output, jsonOutput);
      console.log(`📁 Results written to ${config.output}`);
    } else {
      console.log(jsonOutput);
    }
  } else {
    // Human-readable output
    console.log(results.summary);

    if (config.output) {
      const fs = await import('node:fs/promises');
      await fs.writeFile(config.output, results.summary);
      console.log(`📁 Results written to ${config.output}`);
    }
  }

  // Memory analysis if requested
  if (config.memory) {
    await performMemoryAnalysis();
  }

  // Exit with appropriate code
  if (results.overallPassed) {
    console.log('\n✅ All benchmarks passed performance targets');
    console.log('🚀 System performance is optimal');
  } else {
    console.log('\n❌ Some benchmarks failed to meet performance targets');
    console.log(
      '💡 Consider optimizing the failing components or adjusting targets'
    );
    process.exit(1);
  }
}

/**

- Perform memory analysis
 */
async function performMemoryAnalysis(): Promise<void> {
  console.log('\n🧠 Memory Analysis');
  console.log('='.repeat(40));

  const memoryUsage = process.memoryUsage();

  console.log(
    `📊 Heap Used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`
  );
  console.log(
    `📊 Heap Total: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`
  );
  console.log(
    `📊 External: ${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`
  );
  console.log(`📊 RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`);

  // Memory efficiency check
  const heapUtilization = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  console.log(`📊 Heap Utilization: ${heapUtilization.toFixed(1)}%`);

  if (heapUtilization > 80) {
    console.log('⚠️  High heap utilization detected');
  } else if (heapUtilization < 20) {
    console.log('💡 Low heap utilization - consider reducing heap size');
  } else {
    console.log('✅ Healthy heap utilization');
  }

  // Performance targets validation
  const MEMORY_TARGET_MB = 100; // 100MB target
  const currentMemoryMB = memoryUsage.heapUsed / 1024 / 1024;

  if (currentMemoryMB > MEMORY_TARGET_MB) {
    console.log(
      `❌ Memory usage (${currentMemoryMB.toFixed(2)}MB) exceeds target (${MEMORY_TARGET_MB}MB)`
    );
  } else {
    console.log(
      `✅ Memory usage (${currentMemoryMB.toFixed(2)}MB) within target (${MEMORY_TARGET_MB}MB)`
    );
  }
}

/**

- Show performance targets
 */
function showPerformanceTargets(): void {
  console.log('🎯 Performance Targets\n');

  const targets = [
    {
      category: 'File System Operations',
      items: [
        'File Read (Small): < 10ms',
        'File Read (Large): < 50ms',
        'File Write (Small): < 15ms',
        'File Write (Large): < 75ms',
        'File Metadata: < 5ms',
        'Directory Listing: < 20ms',
      ],
    },
    {
      category: 'Compilation Operations',
      items: [
        'Compilation (Small): < 100ms',
        'Compilation (Medium): < 500ms',
        'Compilation (Large): < 1000ms',
        'Batch Compilation: < 2000ms',
      ],
    },
    {
      category: 'Cache Operations',
      items: ['Cache Get: < 1ms', 'Cache Set: < 2ms', 'Cache Delete: < 1ms'],
    },
    {
      category: 'Queue Operations',
      items: ['Queue Enqueue: < 5ms', 'Task Processing: < 10ms'],
    },
    {
      category: 'Streaming Operations',
      items: ['Stream Copy: < 100ms', 'Stream Processing: < 150ms'],
    },
    {
      category: 'Memory Usage',
      items: ['Total Memory: < 100MB', 'Heap Utilization: 20-80%'],
    },
  ];

  targets.forEach(({ category, items }) => {
    console.log(`📂 ${category}:`);
    items.forEach((item) => console.log(`• ${item}`));
    console.log();
  });

  console.log('💡 Run benchmarks to validate your system meets these targets');
  console.log(
    '🚀 Use --quick for fast validation or full suite for comprehensive testing'
  );
}

/**

- Benchmark command help
 */
export function addBenchmarkExamples(command: Command): void {
  command.addHelpText(
    'after',
    `
Examples:
  $ rulesets-sandbox benchmark --quick                    # Quick validation
  $ rulesets-sandbox benchmark --verbose                  # Full benchmarks with progress
  $ rulesets-sandbox benchmark -i 50 -w 5                 # Custom iteration counts
  $ rulesets-sandbox benchmark --categories filesystem    # Test specific category
  $ rulesets-sandbox benchmark --json -o results.json     # JSON output to file
  $ rulesets-sandbox benchmark --targets                  # Show performance targets
  $ rulesets-sandbox benchmark --memory                   # Include memory analysis

Categories:
  filesystem    File system operations (read, write, metadata)
  cache         Caching operations (get, set, delete)
  queue         Async queue operations (enqueue, processing)
  streaming     Streaming operations (copy, processing)
  compilation   Compilation operations (small, medium, large, batch)

Performance Targets:
  File Operations:     < 50ms average
  Compilation:         < 1s for typical rulesets
  Memory Usage:        < 100MB total
  Cache Operations:    < 5ms average
  Queue Operations:    < 10ms average
`
  );
}
