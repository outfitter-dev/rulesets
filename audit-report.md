# Rulesets Monorepo Audit Report

## Executive Summary

This audit reveals a monorepo that is already using Bun but has inconsistent tooling across packages. The main issues are:

1. **Mixed linting tools**: Some packages use ESLint while others use Biome
2. **Inconsistent testing**: Mix of Vitest and Bun test references
3. **Remnants of other package managers**: yarn.lock file exists despite using Bun
4. **Outdated Biome version**: Currently at 1.9.4, needs update to 2.1.2
5. **Build tooling**: Using tsup when Bun's built-in bundler could suffice for many cases
6. **Accidental directory**: A directory named `~` exists in the project root (should be removed)

## Directory Structure

```
.
├── agent/                       # Agent prompts and decision logs
├── apps/
│   └── cli/                    # CLI application (rulesets-cli)
├── config/                     # Shared TypeScript configuration
├── docs/                       # Documentation
│   ├── agentic/               # Agent-specific documentation
│   ├── architecture/          # Architecture decisions
│   ├── plugins/               # Plugin documentation for various tools
│   └── project/               # Project documentation
├── docs_archive/              # Archived documentation
├── packages/                  # Monorepo packages
│   ├── compiler/             # Compiler package
│   ├── core/                 # Core functionality
│   ├── linter/               # Linting utilities
│   ├── parser/               # Parser utilities
│   ├── plugin-cursor/        # Cursor plugin
│   ├── testing/              # Testing utilities
│   └── types/                # Shared TypeScript types
├── scripts/                   # Build/utility scripts
├── test/                      # Root test setup
└── tests/                     # E2E and integration tests
```

## Current Configuration Analysis

### Root Package.json

```json
{
  "name": "@rulesets/monorepo",
  "packageManager": "bun@1.2.19",
  "workspaces": ["apps/*", "packages/*"]
}
```

**Key findings:**
- Already using Bun as package manager ✅
- Has yarn.lock file that should be removed ❌
- Scripts mix npm/bun commands inconsistently
- Turbo configuration exists but may not be necessary with Bun

### Package-Specific Issues

#### 1. ESLint Usage (Should be removed)
Found in the following packages:
- `@rulesets/compiler` - `"lint": "eslint . --ext .ts,.tsx"`
- `@rulesets/linter` - `"lint": "eslint . --ext .ts,.tsx"`
- `@rulesets/testing` - `"lint": "eslint . --ext .ts,.tsx"`
- `@rulesets/plugin-cursor` - `"lint": "eslint . --ext .ts,.tsx"`
- `rulesets-cli` - `"lint": "eslint . --ext .ts,.tsx"`

#### 2. Vitest Usage (Should migrate to Bun test)
Found in:
- `@rulesets/core` - Has vitest.config.ts and uses `"test": "vitest run"`
- Multiple packages reference vitest in test scripts

#### 3. Build Configuration
- Most packages use `tsup` for building
- Could potentially use Bun's built-in bundler for simpler packages

### Linting/Formatting Tools

**Current state:**
- **Biome**: v1.9.4 (needs update to 2.1.2)
- **Prettier**: Used for Markdown/YAML files
- **ESLint**: Still referenced in multiple packages
- **Markdownlint**: For Markdown linting
- **Commitlint**: For commit message linting

### Dependencies to Remove

1. **ESLint and related packages:**
   - `eslint`
   - `@typescript-eslint/eslint-plugin`
   - `@typescript-eslint/parser`
   - Any other eslint plugins

2. **Vitest and related packages:**
   - `vitest`
   - `@vitest/ui`
   - Any vitest plugins

3. **Package manager artifacts:**
   - `yarn.lock` file
   - Any pnpm references in scripts or documentation
   - The accidental `~` directory in the project root

## Recommended Configuration Structure

### 1. Biome Configuration (biome.jsonc)
```jsonc
{
  "$schema": "https://biomejs.dev/schemas/2.1.2/schema.json",
  "extends": ["@ultracite/biome-config"],
  "files": {
    "include": ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.json", "**/*.jsonc"],
    "ignore": ["**/dist/**", "**/node_modules/**", "**/.turbo/**"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  }
}
```

### 2. Shared TypeScript Configuration
Move to `config/tsconfig.base.json` and have all packages extend from it.

### 3. Unified Scripts Pattern
All packages should use consistent script names:
```json
{
  "scripts": {
    "build": "bun build ./src/index.ts --outdir=dist --target=node",
    "test": "bun test",
    "lint": "biome check --write .",
    "format": "biome format --write .",
    "typecheck": "tsc --noEmit"
  }
}
```

## Migration Priority

### High Priority
1. Update Biome to 2.1.2 with ultracite config
2. Remove ESLint from all packages
3. Update all lint scripts to use Biome

### Medium Priority
4. Migrate tests from Vitest to Bun test
5. Clean up all dependencies
6. Remove yarn.lock and any pnpm references

### Low Priority
7. Evaluate replacing tsup with Bun build
8. Optimize root scripts
9. Consider removing Turbo if Bun's performance is sufficient

## Benefits After Migration

1. **Consistency**: Single linting tool (Biome) across all packages
2. **Performance**: Biome is 20-40x faster than ESLint+Prettier
3. **Simplicity**: Fewer dependencies and configuration files
4. **Native Bun**: Full utilization of Bun's built-in features
5. **Type Safety**: Ultracite config enforces strict TypeScript rules

## Next Steps

1. Create a feature branch for this migration
2. Update Biome and configure with ultracite
3. Remove ESLint package by package
4. Migrate tests to Bun test
5. Clean up dependencies and lock files
6. Update documentation
7. Test all packages thoroughly
8. Create PR with migration changes

---

Generated on: 2025-01-24