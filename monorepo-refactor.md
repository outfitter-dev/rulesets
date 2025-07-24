# Monorepo Refactor Plan

## Overview

This document outlines a phased approach to standardize the Rulesets monorepo on Bun + Biome toolchain while maintaining compatibility and stability. Each phase includes specific tasks with checkpoints to ensure progress is validated before moving forward.

## Guiding Principles

1. **Incremental Migration** - Make changes in small, testable chunks
2. **Maintain Functionality** - Ensure everything works at each checkpoint
3. **Tool Clarity** - Each tool has a specific, non-overlapping purpose
4. **Performance Focus** - Leverage Bun's speed while keeping build reliability

## Tool Responsibilities

| Tool                  | Purpose                            | File Types                                      |
| --------------------- | ---------------------------------- | ----------------------------------------------- |
| **Bun**               | Package manager, script runner, bundling | All                                             |
| **Biome 2.1.2**       | Linting & formatting               | `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.jsonc` |
| **Prettier**          | Formatting only                    | `.md`, `.yml`, `.yaml`                          |
| **markdownlint-cli2** | Linting only                       | `.md`                                           |
| **TypeScript**        | Type declaration generation        | `.d.ts` files                                   |
| **tsup**              | Building packages (fallback)      | Complex bundling cases only                     |

## Build Pipeline Strategy

**Primary Approach** (per package):

| Stage                 | Command                                                        | Output             |
| --------------------- | -------------------------------------------------------------- | ------------------ |
| **Bundle**            | `bun build src/index.ts --outdir dist --target bun --minify`   | ESM `.js`          |
| **Declarations**      | `tsc -p tsconfig.build.json --emitDeclarationOnly`             | `.d.ts`            |
| **Watch**             | `bun build --watch & tsc --watch --emitDeclarationOnly`        | live reload        |
| **Binary (CLI only)** | `bun build src/index.ts --compile --outfile dist/ruleset-<os>` | single-file native |

**Fallback**: Keep `tsup` for packages requiring complex bundling with one-shot type generation.

## Phase 1: Foundation Cleanup

### Objectives

Clean up package manager artifacts and establish Bun as the sole package manager.

### Tasks

- [ ] Remove `yarn.lock` file
- [ ] Remove `~` directory from project root
- [ ] Update `.gitignore` to include:
  ```
  yarn.lock
  pnpm-lock.yaml
  package-lock.json
  ```
- [ ] Verify `bun.lock` is present and up to date
- [ ] Update package.json `packageManager` field to latest Bun:
  ```json
  "packageManager": "bun@1.2.19"
  ```
- [ ] Create/update `bunfig.toml`:
  ```toml
  [install]
  frozenLockfile = true
  linker = "isolated"
  ```
- [ ] Add `"type": "module"` to root package.json for pure ESM
- [ ] Run `bun install` to ensure clean install

### Checkpoint 1

- [ ] No package manager artifacts remain
- [ ] `bun install` runs without errors
- [ ] All existing scripts still work with `bun run`

## Phase 2: Linting & Formatting Migration

### Objectives

Establish Biome as the primary linter/formatter for code files while keeping Prettier for prose.

### Tasks

- [ ] Install Biome 2.1.2 and ultracite:
  ```bash
  bun add -D @biomejs/biome@2.1.2 @ultracite/biome-config
  ```
- [ ] Create/update `biome.json`:

  ```json
  {
    "$schema": "https://biomejs.dev/schemas/2.1.2/schema.json",
    "extends": ["@ultracite/biome-config"],
    "files": {
      "include": ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.json", "**/*.jsonc"],
      "ignore": [
        "**/dist/**",
        "**/node_modules/**",
        "**/.turbo/**",
        "**/*.md",
        "**/*.yml",
        "**/*.yaml"
      ]
    },
    "formatter": {
      "enabled": true,
      "indentStyle": "space",
      "indentWidth": 2
    },
    "linter": {
      "enabled": true
    }
  }
  ```

- [ ] Update `.prettierrc.json` to only handle non-code files:
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
- [ ] Update `.prettierignore`:

  ```
  # Biome handles these
  *.ts
  *.tsx
  *.js
  *.jsx
  *.json
  *.jsonc

  # Standard ignores
  dist/
  node_modules/
  .turbo/
  coverage/
  ```

- [ ] **DECISION: Lock in 2-spaces indentation** (confirmed in review)
- [ ] **DECISION: Drop Stylelint** (no frontend currently)
- [ ] Remove ESLint from all packages:
  - [ ] `@rulesets/compiler`
  - [ ] `@rulesets/linter`
  - [ ] `@rulesets/testing`
  - [ ] `@rulesets/plugin-cursor`
  - [ ] `rulesets-cli`
- [ ] Update lint scripts in all package.json files:
  ```json
  "lint": "biome check .",
  "lint:fix": "biome check --write ."
  ```
- [ ] Remove ESLint dependencies from all package.json files
- [ ] Delete `.eslintrc.js` and any other ESLint config files
- [ ] Run format/lint on entire codebase:
  ```bash
  bun run biome check --write .
  bun run prettier --write "**/*.{md,yml,yaml}"
  ```

### Checkpoint 2

- [ ] No ESLint references remain in the codebase
- [ ] `bun run lint` works in all packages using Biome
- [ ] Prettier only formats Markdown and YAML files
- [ ] No formatting conflicts between tools
- [ ] CI passes with new linting setup

## Phase 3: Build System Optimization

### Objectives

Implement two-step build process (Bun build + TypeScript declarations) as the primary approach.

### Tasks

- [ ] Create shared `tsconfig.build.json` template:
  ```jsonc
  {
    "extends": "../../config/tsconfig.base.json",
    "compilerOptions": {
      "module": "ESNext",
      "declaration": true,
      "emitDeclarationOnly": true,
      "declarationDir": "dist",
      "outDir": "dist",
      "strict": true
    },
    "include": ["src/**/*"]
  }
  ```
- [ ] Update root `package.json` scripts:
  ```json
  {
    "scripts": {
      "dev": "bun run --filter='*' dev",
      "build": "bun run --filter='*' build",
      "test": "bun run --filter='*' test",
      "lint": "biome check . && markdownlint-cli2 '**/*.md'",
      "format": "biome check --write . && prettier --write '**/*.{md,yml,yaml}'",
      "typecheck": "tsc --noEmit"
    }
  }
  ```
- [ ] Standardize package-level scripts (two-step build):
  ```json
  {
    "scripts": {
      "build": "bun build src/index.ts --outdir dist --target node --minify && tsc -p tsconfig.build.json --emitDeclarationOnly",
      "dev": "bun build src/index.ts --outdir dist --target node --watch & tsc -p tsconfig.build.json --watch --emitDeclarationOnly",
      "test": "vitest run",
      "test:watch": "vitest",
      "lint": "biome check .",
      "typecheck": "tsc --noEmit"
    }
  }
  ```
- [ ] Replace tsup with two-step build in all packages (keep tsup.config.ts as fallback)
- [ ] Ensure `"type": "module"` in all package.json files
- [ ] Verify build outputs contain both `.js` and `.d.ts` files
- [ ] Update CI to use new scripts

### Checkpoint 3

- [ ] All packages build successfully with two-step process
- [ ] `dist/` contains both `.js` and `.d.ts` files (no `.cjs`)
- [ ] `import { compile } from "@rulesets/compiler"` gives IntelliSense in VS Code
- [ ] `node -e "import('@rulesets/compiler')"` works on Node 18+
- [ ] Development workflow (`bun run dev`) works smoothly
- [ ] CI build times are acceptable

## Phase 4: Testing Infrastructure

### Objectives

Evaluate test migration path and implement where beneficial.

### Tasks

- [ ] Audit current test suites for complexity
- [ ] For simple test suites (< 10 tests, no mocking):
  - [ ] Migrate from Vitest to Bun test
  - [ ] Update imports from `vitest` to `bun:test`
  - [ ] Update test scripts to `bun test`
- [ ] For complex test suites:
  - [ ] Keep Vitest for now
  - [ ] Document why Vitest is retained (in package README)
- [ ] Ensure test coverage reporting still works
- [ ] Update CI test commands

### Checkpoint 4

- [ ] All tests pass
- [ ] Test coverage is maintained
- [ ] CI test stage completes successfully
- [ ] Developer experience is not degraded

## Phase 5: Dependency Cleanup

### Objectives

Remove unnecessary dependencies and optimize the dependency tree.

### Tasks

- [ ] Run dependency audit:
  ```bash
  bun pm ls
  ```
- [ ] Remove unused dependencies from each package
- [ ] Update to latest versions of critical dependencies
- [ ] Consolidate duplicate dependencies to root where possible
- [ ] Clean up devDependencies vs dependencies
- [ ] Remove any remaining Vitest dependencies from migrated packages

### Checkpoint 5

- [ ] No unused dependencies remain
- [ ] `bun install` is faster
- [ ] Bundle sizes are reduced (if applicable)
- [ ] No security vulnerabilities in dependencies

## Phase 6: Documentation & Scripts

### Objectives

Update all documentation and utility scripts to reflect new toolchain.

### Tasks

- [ ] Update README.md with new development setup
- [ ] Update CONTRIBUTING.md with new commands
- [ ] Document tool responsibilities clearly
- [ ] Update any setup scripts to use Bun
- [ ] Create migration guide for contributors
- [ ] Update GitHub Actions workflows
- [ ] Ensure all documentation uses correct commands

### Checkpoint 6

- [ ] New contributors can onboard easily
- [ ] All documentation is accurate
- [ ] No references to old tools remain
- [ ] CI/CD pipelines work correctly

## Phase 7: Performance Optimization

### Objectives

Leverage Bun's isolated installs and prepare for Turborepo.

### Tasks

- [ ] Verify Bun isolated installs are working (configured in Phase 1)
- [ ] Capture cold/warm build metrics BEFORE Turborepo:
  ```bash
  # Document in docs/perf/2025-benchmarks.md
  time bun run build  # cold build
  time bun run build  # warm build
  ```
- [ ] Configure workspace hoisting rules if needed
- [ ] Measure and document build times
- [ ] Identify bottlenecks in build process
- [ ] Prepare Turborepo configuration (but don't enable yet)

### Checkpoint 7

- [ ] Isolated installs working correctly
- [ ] Build times documented
- [ ] No regression in developer experience
- [ ] Ready for Turborepo integration

## Phase 8: Turborepo Integration

### Objectives

Add Turborepo for build orchestration and caching.

### Tasks

- [ ] Install Turborepo:
  ```bash
  bun add -D turbo
  ```
- [ ] Create `turbo.json`:
  ```json
  {
    "$schema": "https://turbo.build/schema.json",
    "globalDependencies": ["bun.lock", "biome.json", "turbo.json"],
    "pipeline": {
      "build": {
        "dependsOn": ["^build"],
        "outputs": ["dist/**", "*.tsbuildinfo", "**/*.d.ts"]
      },
      "test": {
        "dependsOn": ["build"],
        "outputs": ["coverage/**"]
      },
      "lint": {
        "outputs": []
      },
      "typecheck": {
        "outputs": []
      }
    }
  }
  ```
- [ ] Update root scripts to use Turbo:
  ```json
  {
    "scripts": {
      "dev": "turbo run dev --parallel",
      "build": "turbo run build",
      "test": "turbo run test",
      "lint": "turbo run lint",
      "typecheck": "turbo run typecheck"
    }
  }
  ```
- [ ] Configure Cloudflare remote cache worker
- [ ] Test local caching works
- [ ] Enable remote caching in CI
- [ ] Document cache hit rates

### Checkpoint 8

- [ ] Turborepo successfully orchestrates builds
- [ ] Cache hit rate ≥ 70% on repeat builds
- [ ] CI build times reduced by > 50%
- [ ] Remote caching works reliably

## CLI Binary Distribution

### Objectives

Implement multi-platform distribution strategy for the CLI.

### Tasks

#### npm Publishing
- [ ] Configure `@rulesets/cli` package:
  ```json
  {
    "name": "@rulesets/cli",
    "bin": {
      "ruleset": "./dist/index.js"
    },
    "type": "module"
  }
  ```
- [ ] Test `bunx ruleset init` and `npx ruleset init`

#### Native Binaries
- [ ] Create build script for native binaries:
  ```bash
  bun build src/index.ts --compile --minify --outfile dist/ruleset-macos-arm64
  bun build src/index.ts --compile --minify --outfile dist/ruleset-linux-x64
  bun build src/index.ts --compile --minify --outfile dist/ruleset-windows-x64.exe
  ```
- [ ] Create GitHub release workflow with tarballs and SHA-256 hashes
- [ ] Test binary runs on fresh system without Node/Bun installed

#### Homebrew Distribution (Future)
- [ ] Create `Formula/ruleset.rb` for Homebrew tap
- [ ] Setup `brew tap your-org/rulesets && brew install ruleset`

## Final Validation

### Success Criteria

- [ ] `dist/` contains `.js` + `.d.ts`, no `.cjs` files
- [ ] `import { compile } from "@rulesets/compiler"` gives IntelliSense in VS Code
- [ ] `node -e "import('@rulesets/compiler')"` works on Node 18+
- [ ] Binary runs on fresh macOS/Linux box without Node/Bun installed
- [ ] Turborepo cache hit ≥ 70% on repeat CI builds
- [ ] All packages build and test successfully
- [ ] Development experience is improved
- [ ] CI/CD times are reduced
- [ ] Tool responsibilities are clear and non-overlapping
- [ ] Documentation is complete and accurate
- [ ] No regressions in functionality

### Metrics to Track

**Record in `/docs/perf/2025-benchmarks.md`:**

- Local build time (cold): _____ seconds
- Local build time (cached): _____ seconds  
- CI build time (cold): _____ seconds
- CI build time (cached): _____ seconds
- Package install time: _____ seconds
- Test execution time: _____ seconds
- Turborepo cache hit rate: _____%

## Rollback Plan

**Phase-Branch Strategy**: Use feature branches for each phase (`feat/phase-3-build-refactor`) so failed phases can be reverted with one PR revert.

If any phase encounters critical issues:

1. **Revert phase branch** to last known good state
2. **Document issues** in the phase's GitHub issue
3. **Adjust plan** based on findings
4. **Re-attempt** with modifications

**Emergency Fallbacks**:
- If binary build fails: Fall back to npm publish path only
- If Turborepo cache fails: Disable remote caching, keep local only
- If two-step build fails: Revert to tsup for affected packages

## Technical Decisions

- **Build Strategy**: Prefer `bun build + tsc --emitDeclarationOnly` two-step process
- **Fallback**: Keep `tsup` available for complex bundling edge cases
- **Runtime Target**: Node 18+ and Bun 1.2+ (pure ESM, no CommonJS)
- **Indentation**: 2-spaces (locked decision)
- **Stylelint**: Dropped (no frontend currently)
- **Vitest Migration**: Optional based on test complexity (<10 tests = migrate to Bun test)
- **Package Manager**: Bun with isolated linker
- **Module Format**: Pure ESM (`"type": "module"`)
- **CLI Distribution**: npm + native binaries + Homebrew (future)

---

**Generated**: 2025-01-24  
**Updated**: Based on monorepo-report-review.md decisions  
**Runtime Target**: Node 18+ / Bun 1.2+  
**Module Format**: Pure ESM
