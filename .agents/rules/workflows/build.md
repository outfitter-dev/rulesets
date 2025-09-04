# Build Workflow

## Quick Build

```bash
turbo run build
```

## Full Build Pipeline

```bash
bun install && turbo run build
```

## Clean Build

```bash
turbo clean && turbo run build
```

## Build Specific Package

```bash
cd packages/[package-name] && bun run build
```

## Build Only Affected/Filtered Workspaces

```bash
# by workspace name
turbo run build --filter=@scope/[package-name]

# by path
turbo run build --filter=./packages/[package-name]

# only changed since main
turbo run build --filter=...[main]
```

## Build with Cache Disabled

```bash
turbo run build --force
```

## Build in Production Mode

```bash
NODE_ENV=production turbo run build
```

## Watch Mode Build

```bash
turbo run build --watch
```

## Build with Source Maps

```bash
turbo run build --source-maps
```

## Verify Build Output

```bash
turbo run build && ls -la packages/*/dist/
```
