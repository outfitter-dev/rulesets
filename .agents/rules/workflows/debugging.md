# Debugging Workflow

## Enable Debug Output

### Debug All Modules

```bash
# macOS/Linux
DEBUG=* bun run dev

# Windows (PowerShell)
$env:DEBUG="*"; bun run dev

# Cross-platform
bunx cross-env DEBUG=* bun run dev
```

### Debug Specific Module

```bash
DEBUG=ruleset:* bun run compile
DEBUG=ruleset:compiler:* bun run compile
DEBUG=ruleset:provider:* bun run compile
```

### Debug with Verbose Output

```bash
bun run compile --verbose --debug
```

## Node.js Debugging

### Enable Inspector

```bash
bun --inspect run dev
```

### Enable Inspector with Break

```bash
bun --inspect-brk run dev
```

### Memory Debugging

```bash
NODE_OPTIONS="--expose-gc --trace-gc" bun run dev
```

### Trace Warnings

```bash
NODE_OPTIONS="--trace-warnings" bun run dev
```

### Trace Deprecations

```bash
NODE_OPTIONS="--trace-deprecation" bun run dev
```

## Performance Profiling

### CPU Profile

```bash
bun --cpu-prof run compile
```

### Heap Snapshot

```bash
bun --heap-prof run compile
```

> Note: `--cpu-prof`/`--heap-prof` require Bun v1.0.0 or newer and write `CPU.0.json` / `Heap.0.heapsnapshot` to your current working directory by default.

### Time Execution

```bash
time bun run compile
```

### Profile with Debug

```bash
DEBUG=ruleset:perf:* bun run compile --profile
```

## Test Debugging

### Debug Single Test

```bash
bun test --inspect-brk [test-file]
```

### Test with Console Output

```bash
bun test --verbose --no-coverage
```

### Test with Timeout

```bash
bun test --timeout 10000
```

### Test with Bail on First Failure

```bash
bun test --bail
```

## Error Investigation

### Stack Trace

```bash
NODE_OPTIONS="--stack-trace-limit=100" bun run dev
```

### Async Stack Traces

```bash
NODE_OPTIONS="--async-stack-traces" bun run dev
```

### Source Map Support

```bash
NODE_OPTIONS="--enable-source-maps" bun run dev
```

## Logging

### Log to File

```bash
bun run compile 2>&1 | tee debug.log
```

### Structured Logging

```bash
# macOS/Linux
LOG_LEVEL=debug bun run dev
# Windows (PowerShell)
$env:LOG_LEVEL="debug"; bun run dev
# Cross-platform
bunx cross-env LOG_LEVEL=debug bun run dev
```

### JSON Logging

```bash
# macOS/Linux
LOG_FORMAT=json bun run dev
# Windows (PowerShell)
$env:LOG_FORMAT="json"; bun run dev
# Cross-platform
bunx cross-env LOG_FORMAT=json bun run dev
```
