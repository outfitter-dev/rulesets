# Test Workflow

## Run All Tests

```bash
bunx turbo run test
```

## Run Tests in Watch Mode

```bash
bun test --watch
```

## Run Tests with Coverage

```bash
bun test --coverage
```

## Test Specific Package

```bash
cd packages/[package-name] && bun test
```

## Test Only Selected Workspaces

```bash
bunx turbo run test --filter=@scope/[package-name]
```

## Test Specific File

```bash
bun test [path/to/file.test.ts]
```

## Test with Pattern Matching

```bash
bun test --grep "pattern"
```

## Run Unit Tests Only

```bash
# by directory convention
bun test "packages/**/__tests__/unit/**/*.test.ts"

# or by grep tag in test titles
bun test --grep "@unit"
```

## Run Integration Tests

```bash
# by directory convention
bun test "packages/**/__tests__/integration/**/*.test.ts"

# or by grep tag in test titles
bun test --grep "@integration"
```

## Test with Debug Output

```bash
# macOS/Linux
DEBUG=* bun test

# Windows (PowerShell)
$env:DEBUG="*"; bun test

# Cross-platform
bunx cross-env DEBUG=* bun test
```

## Update Test Snapshots

```bash
bun test --update-snapshots
```
