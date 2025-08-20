# Provider Plugin Development Workflow

## Create New Provider Plugin

### 1. Create Plugin File

```bash
touch packages/core/src/providers/[provider-name].ts
```

### 2. Create Test File

```bash
touch packages/core/src/providers/[provider-name].test.ts
```

### 3. Create Plugin Type Definition

```bash
touch packages/types/src/providers/[provider-name].ts
```

## Develop Provider Plugin

### Run Tests in Watch Mode

```bash
bun test --watch packages/core/src/providers/[provider-name].test.ts
```

### Test Plugin Compilation

```bash
bun run compile --provider [provider-name] --debug
```

### Validate Plugin Output

```bash
bun run compile --provider [provider-name] --validate
```

### Test with Sample Rules

```bash
echo "{{instructions}}Test content{{/instructions}}" | \
  bun run compile --provider [provider-name] --stdin
```

## Debug Provider Plugin

### Enable Debug Logging

```bash
DEBUG=ruleset:provider:* bun run compile --provider [provider-name]
```

### Inspect Compiled Output

```bash
bun run compile --provider [provider-name] && \
  cat .ruleset/dist/latest/[provider-name]/*
```

### Profile Plugin Performance

```bash
bun run compile --provider [provider-name] --profile
```
