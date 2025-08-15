# Migration Guide: Bun + Biome Toolchain

This guide helps existing contributors migrate from the previous toolchain to our new Bun + Biome setup.

## Overview of Changes

We've migrated from a Node.js + ESLint + Prettier setup to a modern Bun + Biome toolchain for better performance and developer experience.

### What Changed

| Before                 | After                           | Improvement                 |
| ---------------------- | ------------------------------- | --------------------------- |
| `npm install`          | `bun install`                   | ~10x faster                 |
| ESLint + Prettier      | Biome (code) + Prettier (prose) | ~100x faster linting        |
| Jest/Vitest only       | Bun test + Vitest hybrid        | 10-100x faster simple tests |
| `npm run`              | `bun run`                       | Faster script execution     |
| Complex shared configs | Explicit per-package builds     | Simpler, more reliable      |

## Migration Steps

### 1. Update Your Local Environment

#### Install Bun

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# Verify installation
bun --version  # Should be 1.2+
```

#### Clean Your Local Repository

```bash
# Remove old artifacts
rm -rf node_modules package-lock.json yarn.lock

# Install with Bun
bun install
```

### 2. Update Your Workflows

#### Development Commands

**Old workflow**:

```bash
npm install
npm run dev
npm run lint
npm run test
```

**New workflow**:

```bash
bun install        # ~300ms vs ~3s
bun run dev        # Start development mode
bun run lint       # Biome + markdownlint
bun run test       # Hybrid test runner
```

#### Code Quality Commands

**Old workflow**:

```bash
npm run lint       # ESLint + Prettier
npm run lint:fix   # Fix linting issues
```

**New workflow**:

```bash
bun run lint       # Biome + markdownlint (check only)
bun run lint:fix   # Auto-fix all issues
bun run format     # Format code + prose
```

### 3. Update Your IDE Configuration

#### VS Code / Cursor

**Remove old extensions**:

- ESLint extension (if not used elsewhere)
- Prettier extension (keep for other projects)

**Install new extensions**:

- [Biome](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)

**Update settings.json**:

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": true
  },
  "[markdown]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[yaml]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### 4. Update Your Scripts and Automation

#### Shell Scripts

**Before**:

```bash
npm ci
npm run build
npm run test
```

**After**:

```bash
bun install --frozen-lockfile
bun run build
bun run test
```

#### Package.json Scripts

If you have custom scripts in your fork, update them:

**Before**:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run build:watch\" \"npm run test:watch\"",
    "lint": "eslint . && prettier --check ."
  }
}
```

**After**:

```json
{
  "scripts": {
    "dev": "bun run --filter='*' dev",
    "lint": "biome check . && markdownlint-cli2 '**/*.md'"
  }
}
```

### 5. Understanding the New Testing Strategy

We now use a **hybrid testing approach**:

#### When to Use Bun Test

**Good for**:

- Simple unit tests
- Pure function testing
- No mocking required
- Fast feedback loops

**Example migration**:

```typescript
// Before (Jest/Vitest)
import { describe, expect, it } from 'vitest';

// After (Bun test)
import { describe, expect, it } from 'bun:test';

// Test logic stays the same
describe('parser', () => {
  it('should parse front matter', () => {
    expect(parse('---\ntitle: test\n---')).toEqual({ title: 'test' });
  });
});
```

#### When to Keep Vitest

**Keep Vitest for**:

- E2E integration tests
- Complex mocking (`vi.mock()`)
- Setup/teardown requirements
- Module-level mocking

**No migration needed** - these tests continue using Vitest.

### 6. New File Organization

#### Configuration Files

**Removed**:

- `.eslintrc.js` - Replaced by `biome.jsonc`
- `.prettierrc` - Updated to only handle Markdown/YAML

**Added**:

- `biome.jsonc` - Biome configuration with ultracite preset
- `bunfig.toml` - Bun configuration for monorepo
- `docs/TOOLCHAIN.md` - Tool responsibilities guide

#### Dependencies

**Root level now includes**:

- All common devDependencies (TypeScript, Biome, etc.)
- Shared testing tools (Vitest for complex tests)

**Package level only includes**:

- Runtime dependencies (`js-yaml`, `commander`, etc.)
- Package-specific type definitions

### 7. Common Migration Issues

#### Issue: Command Not Found

**Problem**: `bun: command not found`

**Solution**:

```bash
# Restart your terminal after Bun installation
# Or source your shell profile
source ~/.bashrc  # or ~/.zshrc
```

#### Issue: Linting Errors

**Problem**: New linting rules from Biome/ultracite

**Solution**:

```bash
# Auto-fix most issues
bun run lint:fix

# Review remaining issues manually
bun run lint
```

#### Issue: Test Failures

**Problem**: Tests fail after migration

**Solutions**:

1. **Import errors**: Update test imports

   ```typescript
   // Change this
   import { describe, expect, it } from 'vitest';

   // To this (for simple tests)
   import { describe, expect, it } from 'bun:test';
   ```

2. **Mocking needed**: Keep complex tests on Vitest

   ```bash
   # These stay on Vitest
   vi.mock('fs')  # Module mocking
   vi.spyOn()     # Function spying
   ```

#### Issue: Build Errors

**Problem**: TypeScript compilation issues

**Solution**:

```bash
# Check TypeScript directly
bun run typecheck

# Clean and rebuild
bun run clean
bun run build
```

### 8. Performance Expectations

You should see significant improvements:

#### Installation

- **Before**: 3-5 seconds for `npm install`
- **After**: ~300ms for `bun install`

#### Linting

- **Before**: 2-3 seconds for ESLint + Prettier
- **After**: ~28ms for Biome check

#### Testing

- **Before**: 500ms-2s for simple tests
- **After**: 7-81ms for Bun test (simple tests)

#### Building

- **Before**: Variable (depended on tsup configuration)
- **After**: ~2-5 seconds for all packages (consistent)

### 9. Troubleshooting

#### Clear Everything and Start Fresh

```bash
# Nuclear option - clean everything
rm -rf node_modules bun.lock dist .turbo
bun install
bun run build
bun run test
```

#### Check Tool Versions

```bash
bun --version    # Should be 1.2+
node --version   # Should be 18+ (for compatibility)
```

#### Verify Configuration

```bash
# Test linting
bun run lint

# Test building
bun run build

# Test both test runners
bun run test
```

## Benefits of the New Toolchain

### Developer Experience

- **Faster feedback loops**: Immediate linting, fast tests
- **Simplified mental model**: Clear tool responsibilities
- **Better IDE integration**: Biome provides excellent VS Code support
- **Consistent formatting**: No more formatting wars

### Performance

- **Installation**: 10x faster dependency installation
- **Linting**: 100x faster code quality checks
- **Testing**: 10-100x faster for simple tests
- **Building**: Consistent, predictable build times

### Maintainability

- **Fewer dependencies**: Consolidated toolchain
- **Clear responsibilities**: Each tool has one job
- **Modern standards**: Latest tooling with active development
- **Monorepo optimized**: Built for workspace management

## Getting Help

### Documentation

- [TOOLCHAIN.md](./TOOLCHAIN.md) - Detailed tool responsibilities
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Development workflow
- [Biome docs](https://biomejs.dev/) - Biome configuration and usage
- [Bun docs](https://bun.sh/docs) - Bun package manager and runtime

### Common Questions

**Q: Can I still use npm/yarn for other projects?**
A: Yes! This only affects the Rulesets project. Other projects continue using their existing tools.

**Q: Do I need to learn new testing APIs?**
A: No! Bun test uses the same APIs as Jest/Vitest. Only imports change for simple tests.

**Q: What if I prefer ESLint?**
A: Biome is designed to be a drop-in replacement with better performance. Most ESLint rules have Biome equivalents.

**Q: Is this change permanent?**
A: We're committed to this toolchain for the foreseeable future. It provides significant benefits with minimal migration cost.

## Support

If you encounter issues during migration:

1. **Check this guide** for common solutions
2. **Search existing issues** on GitHub
3. **Open a new issue** with your specific problem
4. **Include details**: OS, Bun version, error messages

We're here to help make the migration smooth! 🚀
