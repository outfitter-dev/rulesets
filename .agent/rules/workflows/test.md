# Test Workflow

## Run All Tests

```bash
turbo test
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
bun test unit
```

## Run Integration Tests

```bash
bun test integration
```

## Test with Debug Output

```bash
DEBUG=* bun test
```

## Update Test Snapshots

```bash
bun test --update-snapshots
```
