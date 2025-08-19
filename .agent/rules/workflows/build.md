# Build Workflow

## Quick Build

```bash
turbo build
```

## Full Build Pipeline

```bash
bun install && turbo build
```

## Clean Build

```bash
turbo clean && turbo build
```

## Build Specific Package

```bash
cd packages/[package-name] && bun run build
```

## Build with Cache Disabled

```bash
turbo build --force
```

## Build in Production Mode

```bash
NODE_ENV=production turbo build
```

## Watch Mode Build

```bash
turbo build --watch
```

## Build with Source Maps

```bash
turbo build --source-maps
```

## Verify Build Output

```bash
turbo build && ls -la packages/*/dist/
```
