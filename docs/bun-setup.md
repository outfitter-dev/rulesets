# Bun Configuration for Rulesets

This document outlines the Bun optimizations implemented in the Rulesets monorepo.

## Configuration Files

### bunfig.toml

The `bunfig.toml` file contains comprehensive Bun runtime and tooling configuration:

- **Runtime settings**: Log levels, memory optimization (`smol` mode), console output depth
- **Install settings**: Workspace linking, concurrent scripts, dependency management
- **Test configuration**: Coverage thresholds, test roots, preload scripts
- **Development server**: HMR and console output settings

### package.json

Key optimizations in `package.json`:

- Added `"type": "module"` for ESM support
- Native Bun test commands (`bun test`, `bun test --watch`, `bun test --coverage`)
- Added `trustedDependencies` for packages that run postinstall scripts
- Clean scripts that handle Bun-specific files (`bun.lockb`)

### tsconfig.json

TypeScript configuration optimized for Bun:

- `"module": "ESNext"` and `"moduleResolution": "bundler"`
- `"allowImportingTsExtensions": true` for importing `.ts` files directly
- `"types": ["bun-types"]` for Bun's global types
- Strict type checking enabled

## Native Bun Features

### Test Runner

Bun includes a built-in test runner that's significantly faster than Jest/Vitest:

```bash
# Run tests
bun test

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

### Script Execution

Run TypeScript files directly without compilation:

```bash
# Instead of: tsx script.ts or ts-node script.ts
bun script.ts

# Or use the shebang in scripts
#!/usr/bin/env bun
```

### Bundler

Bun includes a built-in bundler accessible via `Bun.build()`:

```typescript
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  minify: true,
  sourcemap: 'external',
});
```

### Shell Commands

Use Bun's shell for better performance:

```typescript
import { $ } from 'bun';

// Instead of execa or child_process
await $`ls -la`;
```

## Performance Optimizations

1. **Package Installation**: Bun installs packages 10-100x faster than npm/yarn/pnpm
2. **Script Execution**: Native TypeScript execution without transpilation overhead
3. **Test Running**: Built-in test runner is significantly faster than Jest
4. **File Operations**: Optimized file APIs using system calls like `copy_file_range`

## Migration Notes

When migrating from Node.js/pnpm:

1. Replace `node` with `bun` in scripts
2. Replace `tsx`/`ts-node` with direct `bun` execution
3. Consider replacing Vitest with Bun's test runner
4. Use `bun install` instead of `pnpm install`
5. Binary lock file (`bun.lockb`) replaces text-based `pnpm-lock.yaml`

## Environment Variables

Bun automatically loads `.env` files without needing `dotenv`:

```typescript
// No need for: import 'dotenv/config'
// Just use: process.env.MY_VAR
```

## Workspace Commands

```bash
# Install dependencies for all workspaces
bun install

# Run command in specific workspace
bun --filter '@rulesets/core' test

# Run command in all workspaces
bun --filter '*' build
```

## Debugging

Set log level in `bunfig.toml` or use environment variable:

```bash
# Via bunfig.toml
logLevel = "debug"

# Via environment
BUN_CONFIG_LOG_LEVEL=debug bun run dev
```
