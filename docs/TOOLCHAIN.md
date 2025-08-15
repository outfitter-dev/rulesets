# Rulesets Toolchain Guide

This document outlines the tools used in the Rulesets monorepo and their specific responsibilities.

## Overview

Rulesets uses a modern, fast toolchain centered around **Bun** with clear separation of concerns. Each tool has a specific, non-overlapping purpose to ensure consistency and avoid conflicts.

> Project scripts wrap these tools for daily use. Prefer the root scripts in README → Developer Scripts (bun run build/test/typecheck/lint/format) rather than calling individual CLIs directly.

## Tool Responsibilities

| Tool                  | Purpose                                  | File Types                                      | Notes                           |
| --------------------- | ---------------------------------------- | ----------------------------------------------- | ------------------------------- |
| **Bun**               | Package manager, script runner, bundling | All                                             | Primary tool for all operations |
| **Biome 2.1.2**       | Linting & formatting                     | `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.jsonc` | Code quality and style          |
| **Prettier**          | Formatting only                          | `.md`, `.yml`, `.yaml`                          | Prose formatting                |
| **markdownlint-cli2** | Linting only                             | `.md`                                           | Markdown quality checks         |
| **TypeScript**        | Type checking & declaration generation   | `.d.ts` files                                   | Compile-time type safety        |
| **Bun test**          | Testing (simple)                         | Test files                                      | Fast unit tests                 |
| **Vitest**            | Testing (complex)                        | Test files                                      | Advanced mocking capabilities   |

## Detailed Tool Configuration

### Bun

**Purpose**: Primary package manager, script runner, and JavaScript bundler

**Configuration**: `bunfig.toml`

```toml
[install]
linkWorkspacePackages = true
frozenLockfile = true
exact = false
cache = true

[test]
preload = ["./test/setup.ts"]
coverage = true
timeout = 10000
```

**Key Features**:

- **Package Management**: Installs dependencies ~10x faster than npm
- **Workspace Support**: Proper monorepo package linking
- **Bundle Creation**: Produces minified ES modules for production
- **Script Running**: Executes package.json scripts with `bun run`

**When to Use**:

- Installing dependencies: `bun install`
- Running scripts: `bun run dev`, `bun run build`
- Building packages: `bun build src/index.ts --outdir dist`
- Simple testing: `bun test` (for packages without complex mocking)

### Biome

**Purpose**: Primary linter and formatter for code files

**Configuration**: `biome.jsonc`

```jsonc
{
  "$schema": "https://biomejs.dev/schemas/2.1.2/schema.json",
  "extends": ["@ultracite/biome-config"],
  "files": {
    "include": ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.json", "**/*.jsonc"],
    "ignore": ["**/dist/**", "**/node_modules/**", "**/.turbo/**"],
  },
}
```

**Key Features**:

- **Ultra-fast**: Faster than traditional ESLint-based toolchains
- **All-in-one**: Combines linting + formatting in one tool
- **ultracite preset**: Enforces consistent, high-quality standards
- **IDE Integration**: Works with VS Code, Cursor, etc.

**When to Use**:

- Linting: `bun run lint` (check only)
- Auto-fixing: `bun run lint:fix` (check + fix)
- Formatting: `biome format .` (format only)

**File Coverage**: Handles all JavaScript, TypeScript, and JSON files

### Prettier

**Purpose**: Formatting for prose and configuration files

**Configuration**: `.prettierrc.json`

```json
{
  "proseWrap": "preserve",
  "overrides": [
    {
      "files": ["*.md", "*.yml", "*.yaml"],
      "options": {
        "tabWidth": 2,
        "useTabs": false
      }
    }
  ]
}
```

**Key Features**:

- **Prose-focused**: Optimized for Markdown and YAML
- **Non-overlapping**: Ignores files handled by Biome
- **Preserve formatting**: Maintains intentional line breaks in prose

**When to Use**:

- Format Markdown/YAML: `bun run format`
- Check formatting: `bun run format:check`

**File Coverage**: Only handles `.md`, `.yml`, `.yaml` files

### markdownlint-cli2

**Purpose**: Linting for Markdown files

**Configuration**: `.markdownlint-cli2.jsonc`

```jsonc
{
  "config": {
    "MD013": { "line_length": 120 },
    "MD033": false,
  },
  "globs": ["**/*.md"],
  "ignores": ["node_modules", "dist"],
}
```

**Key Features**:

- **Markdown-specific**: Checks for consistency, broken links, etc.
- **Complementary**: Works alongside Prettier (linting vs formatting)
- **Configurable**: Tailored rules for documentation quality

**When to Use**:

- Lint markdown: `markdownlint-cli2 '**/*.md'`
- Auto-fix: `markdownlint-cli2 --fix '**/*.md'`

### TypeScript

**Purpose**: Type checking and declaration file generation

**Configuration**: `tsconfig.json` (per package)

```json
{
  "extends": "../../config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "declarationDir": "dist"
  },
  "include": ["src/**/*"]
}
```

**Key Features**:

- **Type Safety**: Compile-time error detection
- **Declaration Generation**: Produces `.d.ts` files for consumers
- **IDE Integration**: Powers IntelliSense and refactoring
- **Strict Mode**: Enforces high code quality standards

**When to Use**:

- Type checking: `bun run typecheck`
- Declaration generation: `tsc --declaration --emitDeclarationOnly`

## Build Pipeline

Our **two-step build process** combines the strengths of multiple tools:

### Step 1: Bundle with Bun

```bash
bun build src/index.ts --outdir dist --target node --minify
```

- **Input**: TypeScript source files
- **Output**: Minified JavaScript ESM modules
- **Features**: Fast bundling, tree-shaking, minification

### Step 2: Generate Types with TypeScript

```bash
tsc --declaration --emitDeclarationOnly --outDir dist --skipLibCheck src/index.ts
```

- **Input**: TypeScript source files
- **Output**: Declaration files (`.d.ts`)
- **Features**: Type information for consumers

### Result

Each package produces:

- `dist/index.js` - Runtime code (minified ESM)
- `dist/index.d.ts` - Type definitions
- Additional files as needed

## Testing Strategy

We use a **hybrid testing approach** based on test complexity:

### Bun Test (Simple Tests)

**Use for**:

- Pure function testing
- Simple unit tests
- No mocking required
- Fast feedback loops

**Packages using Bun test**:

- `@rulesets/parser` (7 tests, 79ms)
- `@rulesets/compiler` (6 tests, 7ms)
- `@rulesets/linter` (8 tests, 7ms)

**Example**:

```typescript
import { describe, expect, it } from 'bun:test';

describe('parser', () => {
  it('should parse front matter', () => {
    expect(parse('---\ntitle: test\n---')).toEqual({ title: 'test' });
  });
});
```

### Vitest (Complex Tests)

**Use for**:

- E2E integration tests
- Complex mocking (`vi.mock()`, `vi.spyOn()`)
- Setup/teardown requirements
- Module-level mocking

**Packages using Vitest**:

- `@rulesets/core` (45 tests with filesystem mocking)

**Example**:

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('fs');

describe('core integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should compile rules to filesystem', async () => {
    // Complex e2e test with mocked filesystem
  });
});
```

## Dependency Management

### Workspace Architecture

```text
root/
├── package.json          # Shared devDependencies
├── packages/
│   ├── core/
│   │   └── package.json   # Package-specific dependencies only
│   └── parser/
│       └── package.json   # Package-specific dependencies only
```

### Dependency Categories

**Root devDependencies** (shared):

- `@types/node`, `typescript`, `@biomejs/biome`
- `vitest`, `prettier`, `markdownlint-cli2`
- Build tools and common type definitions

**Package dependencies** (runtime only):

- `js-yaml` (parser needs YAML parsing)
- `commander`, `chalk` (CLI needs command parsing)
- `@rulesets/*` workspace packages

**Package devDependencies** (specific types only):

- `@types/js-yaml` (parser-specific types)
- `@types/json-schema` (core-specific types)

### Adding Dependencies

```bash
# Runtime dependency (specific package)
cd packages/parser
bun add js-yaml

# Build tool (shared across workspace)
bun add -D @biomejs/biome  # Would go to root package.json

# Package-specific types
cd packages/parser
bun add -D @types/js-yaml
```

## Performance Characteristics

### Installation

- **Bun**: ~300ms for complete monorepo install
- **npm**: ~3-5 seconds for same install
- **Improvement**: ~10-15x faster

### Linting

- **Biome**: ~28ms for entire codebase
- **Traditional ESLint**: ~2-3 seconds for same codebase
- **Improvement**: ~100x faster

### Testing

- **Bun test**: 7-81ms for simple tests
- **Vitest**: ~200-500ms for complex tests (with mocking overhead)
- **Strategy**: Use right tool for right job

### Building

- **Two-step process**: ~2-5 seconds for all packages
- **Parallel execution**: All packages build concurrently
- **Output**: Both runtime code and type definitions

## IDE Integration

### VS Code / Cursor

```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": true
  }
}
```

### Extensions

- **Biome**: Official VS Code extension for linting/formatting
- **TypeScript**: Built-in support for type checking
- **Prettier**: For Markdown files (complementary to Biome)

## Migration Guide

### From ESLint + Prettier (Legacy)

1. **Remove**: `.eslintrc.js`, ESLint dependencies
2. **Add**: `biome.jsonc` with ultracite preset
3. **Update scripts**: `eslint` → `biome check`
4. **Configure IDE**: Switch default formatter to Biome

### From npm/yarn to Bun

1. **Remove**: `package-lock.json`, `yarn.lock`
2. **Install Bun**: Follow official installation guide
3. **Update scripts**: `npm run` → `bun run`
4. **Configure**: Add `bunfig.toml` for monorepo settings

### From Jest/Vitest to Hybrid

1. **Keep Vitest**: For complex tests with mocking
2. **Migrate simple tests**: Update imports to `bun:test`
3. **Update scripts**: Conditional test commands per package
4. **Benefits**: 10-100x faster feedback for simple tests

## Troubleshooting

### Common Issues

**Build failures**:

- Check TypeScript errors: `bun run typecheck`
- Verify dependencies: `bun install`
- Clean and rebuild: `bun run clean && bun run build`

**Linting conflicts**:

- Biome and Prettier overlap: Check `.prettierignore`
- IDE formatting conflicts: Set Biome as default formatter
- File not being linted: Check `biome.jsonc` includes/excludes

**Test issues**:

- Simple test failing: May need Vitest for mocking
- Vitest slow: Consider migrating simple tests to Bun test
- Import errors: Check test setup files and mocking configuration

**Dependency problems**:

- Missing types: Add to package-specific devDependencies
- Version conflicts: Use exact versions in workspace
- Install errors: Clear `node_modules` and reinstall

### Getting Help

1. **Check logs**: Most tools provide detailed error messages
2. **Verify configuration**: Ensure config files match examples
3. **Test isolation**: Try reproducing issues in minimal setup
4. **Documentation**: Refer to official tool documentation
5. **Ask for help**: Open GitHub issue with reproduction steps

---

This toolchain is designed for **speed**, **consistency**, and **developer experience**. Each tool has a clear purpose, and they work together seamlessly to provide a productive development environment.
