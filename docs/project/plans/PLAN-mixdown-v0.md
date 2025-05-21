# Mixdown v0 Implementation Plan

## Overview

Mixdown is a Markdown-previewable rules compiler that allows authoring a single source rules file (source rules) in Markdown and compiling it into compiled rules for various destinations (e.g., AI assistants, IDEs). Mixdown v0 aims to establish a production-ready monorepo, ship the initial `@mixdown/core` package (including a basic parser, a pass-through compiler, and a frontmatter linter), and prove the end-to-end flow by processing a `my-rules.mix.md` file, writing compiled rules to `.mixdown/dist/`, and invoking stubbed destination plugins for Cursor and Windsurf.

While v0 will not process Mixdown notation markers (`{{...}}`) within the content body, the architecture will be laid to easily incorporate this functionality in subsequent v0.x releases (e.g., v0.1 for `{{stem}}` parsing, v0.2 for variables, etc.).

## Implementation Checklist

### Phase 1: Repository & Core Package Foundation (Toolchain & Structure)

- [ ] **Task 1: Setup Monorepo with pnpm and Turborepo**
  - Initialize pnpm workspace.
  - Configure Turborepo with `turbo.json`.
  - Set up root `package.json` with workspace scripts.
  - Initialize Git repository with a `.gitignore` file.
  - **Acceptance Criteria**: `pnpm install` succeeds; `turbo build`, `turbo lint`, `turbo test` commands are runnable.
  - **Dependencies**: None.
- [ ] **Task 2: Create `@mixdown/core` Package**
  - Create `packages/core` directory.
  - Initialize `packages/core/package.json`.
  - Add `tsup.config.ts` for building ESM, CJS, and d.ts files.
  - Add `vitest.config.ts` for unit testing.
  - Set up `tsconfig.json` for the core package, extending `tsconfig.base.json`.
  - **Acceptance Criteria**: `@mixdown/core` can be built and tested independently.
  - **Dependencies**: Task 1.
- [ ] **Task 3: Implement Basic TypeScript Configuration**
  - Create `tsconfig.base.json` in the root with strict TypeScript 5.x settings.
  - Ensure all packages will inherit from this base configuration.
  - **Acceptance Criteria**: TypeScript compiles successfully with strict mode.
  - **Dependencies**: Task 1.
- [ ] **Task 4: Setup CI/CD with GitHub Actions**
  - Create `.github/workflows/ci.yml`.
  - Configure CI to install dependencies, lint, test, and build on push/PR to `main` and `next` branches.
  - Integrate Changesets for release automation.
  - **Acceptance Criteria**: CI pipeline runs successfully on GitHub for PRs.
  - **Dependencies**: Task 1, Task 2.
- [ ] **Task 5: Setup Linting and Formatting**
  - Configure ESLint with shareable configs (e.g., Airbnb, Standard, or similar, plus TypeScript support).
  - Configure Prettier to work with ESLint.
  - Add `markdownlint` configuration.
  - Add linting scripts to `package.json` files.
  - **Acceptance Criteria**: `pnpm turbo lint` runs successfully across the monorepo.
  - **Dependencies**: Task 1.
- [ ] **Task 6: Setup Release Management with Changesets**
  - Initialize Changesets with `pnpm changeset init`.
  - Configure `.changeset/config.json`.
  - Add `pnpm changeset version` and `pnpm release` scripts.
  - Ensure CI workflow can publish packages.
  - **Acceptance Criteria**: Changesets can version packages and prepare releases; CI can publish.
  - **Dependencies**: Task 4.

### Phase 2: `@mixdown/core` - Initial Implementation (Parser, Compiler, Linter Stubs)

- [ ] **Task 1: Define Core Interfaces**
  - Define `CompiledDoc` interface in `packages/core/src/interfaces/compiled-doc.ts`.
  - Define `DestinationPlugin` interface in `packages/core/src/interfaces/destination-plugin.ts`.
  - Define a basic `Logger` interface (e.g., `packages/core/src/interfaces/logger.ts`).
  - **Acceptance Criteria**: Interfaces are defined and exported.
  - **Dependencies**: Phase 1/Task 2.
- [ ] **Task 2: Implement v0 Parser Module**
  - Create `packages/core/src/parser/index.ts`.
  - Implement `parse(content: string): Promise<ParsedDoc>` function.
    - For v0, `ParsedDoc` will be a simplified version of `CompiledDoc.source` and `CompiledDoc.ast` (primarily frontmatter and raw body).
    - It should parse YAML frontmatter from a Markdown string.
    - It should separate the raw Markdown body.
    - `ParsedDoc.ast` will be minimal for v0 (e.g., `stems: [], imports: [], variables: [], markers: []`).
  - Add unit tests for frontmatter parsing and body extraction (including edge cases like missing frontmatter).
  - **File Structure**:

  ```text
  packages/core/src/parser/
  ├─ index.ts
  └─ __tests__/
     └─ parser.spec.ts
  ```

  - **Acceptance Criteria**: Parser correctly extracts frontmatter and raw body. All unit tests pass.
  - **Dependencies**: Phase 2/Task 1.
- [ ] **Task 3: Implement v0 Linter Module**
  - Create `packages/core/src/linter/index.ts`.
  - Implement `lint(parsedDoc: ParsedDoc, config?: LinterConfig): Promise<LintResult[]>`.
    - For v0, it validates the parsed frontmatter against a basic schema (e.g., presence of a `mixdown` key or specific expected fields if any defined for v0).
    - `LintResult` should define structure for errors (e.g., `message`, `line`, `column`, `severity`).
  - Add unit tests for frontmatter validation.
  - **File Structure**:

  ```text
  packages/core/src/linter/
  ├─ index.ts
  └─ __tests__/
     └─ linter.spec.ts
  ```

  - **Acceptance Criteria**: Linter correctly validates frontmatter based on a predefined schema. All unit tests pass.
  - **Dependencies**: Phase 2/Task 2.
- [ ] **Task 4: Implement v0 Compiler Module**
  - Create `packages/core/src/compiler/index.ts`.
  - Implement `compile(parsedDoc: ParsedDoc, destinationId: string, projectConfig?: any): Promise<CompiledDoc>`.
    - For v0, this function will be a pass-through for the body content.
    - `CompiledDoc.source` will be populated from `ParsedDoc`.
    - `CompiledDoc.ast` will be populated from `ParsedDoc.ast` (which is minimal in v0).
    - `CompiledDoc.output.content` will be the raw Markdown body from `ParsedDoc`.
    - `CompiledDoc.output.metadata` can be empty or include basic source frontmatter.
    - `CompiledDoc.context` will include `destinationId` and any relevant `projectConfig`.
  - Add unit tests to verify the pass-through behavior.
  - **File Structure**:

  ```text
  packages/core/src/compiler/
  ├─ index.ts
  └─ __tests__/
     └─ compiler.spec.ts
  ```

  - **Acceptance Criteria**: Compiler correctly populates `CompiledDoc` with raw body content in `output.content`. All unit tests pass.
  - **Dependencies**: Phase 2/Task 2.
- [ ] **Task 5: Implement Stub Destination Plugins (Cursor & Windsurf)**
  - Create `packages/core/src/destinations/cursor-plugin.ts` and `packages/core/src/destinations/windsurf-plugin.ts`.
  - Implement the `DestinationPlugin` interface for each.
    - `name`: "cursor" or "windsurf".
    - `configSchema()`: Return a basic JSON schema (can be an empty object schema for v0).
    - `write()`: For v0, this function can simply log the `compiled.output.content` and `destPath` to the console using the provided logger, or write it to a mock file path. It should not perform any complex transformations.
  - Create `packages/core/src/destinations/index.ts` to export the plugin instances.
  - Add basic unit tests to ensure plugins conform to the interface and `write` can be called.
  - **File Structure**:

  ```text
  packages/core/src/destinations/
  ├─ cursor-plugin.ts
  ├─ windsurf-plugin.ts
  ├─ index.ts
  └─ __tests__/
     ├─ cursor-plugin.spec.ts
     └─ windsurf-plugin.spec.ts
  ```

  - **Acceptance Criteria**: Stub plugins for Cursor and Windsurf are implemented and can be invoked.
  - **Dependencies**: Phase 2/Task 1.

### Phase 3: End-to-End Flow & CLI Proof of Concept

- [ ] **Task 1: Create Main CLI Orchestration Logic (within `@mixdown/core`)**
  - Create `packages/core/src/index.ts` (if not already the main entry) or a `cli.ts`.
  - This will be a simple function/script that:
        1. Reads a sample `my-rules.mix.md` file from a predefined location (e.g., project root or a `./test-data/` directory).
        2. Instantiates a basic logger.
        3. Invokes the `Parser` with the file content.
        4. Invokes the `Linter` with the parsed document. Logs linting results.
        5. If linting passes (or only warnings), invokes the `Compiler` for "cursor" and "windsurf" destinations.
        6. For each compiled document, instantiates the respective destination plugin.
        7. Calls the `write()` method of each plugin, providing necessary context (e.g., output path like `.mixdown/dist/cursor/my-rules.md` and `.mixdown/dist/windsurf/my-rules.md`).
  - **Acceptance Criteria**: A Node.js script can execute the parse -> lint -> compile -> write (stubbed) flow. Compiled rules (raw body) are written to the specified output directory.
  - **Dependencies**: Phase 2 (all tasks).
- [ ] **Task 2: Create Sample `my-rules.mix.md`**
  - Create a file named `my-rules.mix.md` in the project root or a test directory.
  - Content:

  ```markdown
  ---
  mixdown: v0
  title: My First Mixdown Rule
  description: A simple rule for testing v0.
  destinations:
    cursor:
      outputPath: ".cursor/rules/my-first-rule.mdc"
    windsurf:
      outputPath: ".windsurf/rules/my-first-rule.md"
  ---

  # This is the main content

  This is a paragraph of the rule. In v0, this content will be passed through as-is.
  `{{stems}}`, `{{$variables}}`, and `{{>imports}}` will be ignored by the v0 parser and compiler.
  ```

  - **Acceptance Criteria**: Sample file is created and available for testing.
  - **Dependencies**: None.
- [ ] **Task 3: Basic Integration Testing**
  - Write an integration test in `packages/core/tests/integration/e2e.spec.ts` that runs the CLI orchestration logic from Phase 3/Task 1.
  - Verify that the output files are created in `.mixdown/dist/` with the expected raw content.
  - Verify that plugin `write` methods are called.
  - **Acceptance Criteria**: End-to-end flow is verified by an automated test.
  - **Dependencies**: Phase 3/Task 1, Phase 3/Task 2.

### Phase 4: Documentation & Initial Release Preparation

- [ ] **Task 1: Draft Initial `README.md` for `@mixdown/core`**
  - Include basic usage, purpose, and how to contribute.
  - Explain the v0 limitations (no marker processing) and the roadmap for v0.1.
  - **Acceptance Criteria**: `README.md` for `@mixdown/core` is created.
  - **Dependencies**: None.
- [ ] **Task 2: Draft Root `README.md`**
  - Describe the Mixdown project, its goals, and the monorepo structure.
  - **Acceptance Criteria**: Root `README.md` is created.
  - **Dependencies**: None.
- [ ] **Task 3: Prepare `PLAN-mixdown-v0.md` (this document)**
  - Ensure it's up-to-date and accurately reflects all tasks.
  - Place it in `docs/project/plans/PLAN-mixdown-v0.md`.
  - **Acceptance Criteria**: Planning document is finalized.
  - **Dependencies**: All previous tasks.
- [ ] **Task 4: Prepare `docs/project/plans/REVIEW-mixdown-v0.md`**
  - Create the review document as specified in the prompt.
  - **Acceptance Criteria**: Review document is created.
  - **Dependencies**: None.
- [ ] **Task 5: Prepare for First Release (`@mixdown/core@0.0.1` or `0.1.0-alpha.1`)**
  - Ensure all tests pass.
  - Ensure `pnpm changeset version` and `pnpm release` (or CI equivalent) function correctly.
  - Manually test installing `@mixdown/core` in a new dummy project.
  - **Acceptance Criteria**: Package is ready for a pre-release/initial release.
  - **Dependencies**: All previous tasks.

### Phase 5: Final Review & v0 Completion

- [ ] **Task 1: Execute `docs/project/plans/REVIEW-mixdown-v0.md`**
  - Perform all end-to-end test cases manually.
  - Conduct a code quality review.
  - Verify release readiness.
  - **Acceptance Criteria**: All checklist items in the review document are successfully completed.
  - **Dependencies**: All previous tasks.
- [ ] **Task 2: Sign off on v0 Completion**
  - Human review and approval.
  - **Acceptance Criteria**: v0 is declared complete.
  - **Dependencies**: Phase 5/Task 1.

## Engineering Conventions

- **No `--no-verify`** when committing.
- Prefer simple, readable code; smallest reasonable diffs.
- Ask explicit permission before nuking/refactoring large sections.
- Preserve comments unless factually wrong; never use temporal phrasing.
- No mock modes—tests hit real APIs/files where feasible.
- Never name things "new", "improved", etc.
- All files start with a `TLDR:` comment line describing purpose (single line, ok if it wraps). This enables easy grepping for file descriptions and improves AI agent code comprehension.
- Every function should start with a `<!-- TLDR: description of what this function does -->` comment (single line). These function descriptions help AI agents understand code purpose without reading implementations.
- Code must be extremely well-documented for AI agent readability.
- Use Mixdown terminology consistently according to the Language spec.
- Practice full **TDD**: red → green → refactor; unit + integration + e2e.
- If any test type is believed unnecessary, the human must say
  `I AUTHORIZE YOU TO SKIP WRITING TESTS THIS TIME`.

## Implementation Details

### Repository Structure

```text
mixdown/
├─ .changeset/
│  └─ config.json
├─ .github/
│  └─ workflows/ci.yml
├─ docs/
│  ├─ project/
│  │  ├─ plans/
│  │  │  └─ PLAN-mixdown-v0.md
│  │  └─ testing/
│  │     └─ v0-implementation-review.md
│  └─ ... (other existing docs)
├─ packages/
│  └─ core/
│     ├─ src/
│     │  ├─ compiler/
│     │  │  ├─ __tests__/
│     │  │  │  └─ compiler.spec.ts
│     │  │  └─ index.ts
│     │  ├─ destinations/
│     │  │  ├─ __tests__/
│     │  │  │  ├─ cursor-plugin.spec.ts
│     │  │  │  └─ windsurf-plugin.spec.ts
│     │  │  ├─ cursor-plugin.ts
│     │  │  ├─ index.ts
│     │  │  └─ windsurf-plugin.ts
│     │  ├─ interfaces/
│     │  │  ├─ compiled-doc.ts
│     │  │  ├─ destination-plugin.ts
│     │  │  └─ logger.ts
│     │  ├─ linter/
│     │  │  ├─ __tests__/
│     │  │  │  └─ linter.spec.ts
│     │  │  └─ index.ts
│     │  ├─ parser/
│     │  │  ├─ __tests__/
│     │  │  │  └─ parser.spec.ts
│     │  │  └─ index.ts
│     │  └─ index.ts              # Main CLI/orchestration logic for v0 PoC
│     ├─ tests/
│     │  └─ integration/
│     │     └─ e2e.spec.ts
│     ├─ package.json
│     ├─ tsconfig.json
│     ├─ tsup.config.ts
│     └─ vitest.config.ts
├─ my-rules.mix.md             # Sample source rules file for v0 testing
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
└─ turbo.json
```

### Configuration Files

#### Root `package.json`

```jsonc
{
  "name": "mixdown",
  "private": true,
  "packageManager": "pnpm@8",
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "turbo build --filter=@mixdown/core && changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.1", // Example version, use latest
    "turbo": "^2.0.6", // Example version, use latest ^2
    "typescript": "^5.4.5", // Example version, use latest 5.x
    "eslint": "^8.57.0", // Example version, use latest
    "prettier": "^3.2.5", // Example version, use latest
    "markdownlint-cli": "^0.41.0" // Example version, use latest
  }
}
```

#### `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
```

#### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "lint": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "tsconfig.tsbuildinfo"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "release": {
      "dependsOn": ["build", "lint", "test"]
    }
  }
}
```

#### `tsconfig.base.json`

```jsonc
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ESNext",
    "lib": ["ES2021", "DOM"],
    "moduleResolution": "node",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true, // Base config should not emit, individual packages will.
    "types": ["node", "vitest/globals"]
  },
  "exclude": ["node_modules", "**/dist", "**/coverage"]
}
```

#### `packages/core/package.json` (Initial)

```jsonc
// TLDR: Package definition for @mixdown/core. Contains the parser, compiler, linter, and plugin interfaces.
{
  "name": "@mixdown/core",
  "version": "0.0.0", // Will be updated by Changesets
  "private": false,
  "description": "Core library for Mixdown: parser, compiler, linter, and plugins.",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "js-yaml": "^4.1.0" // For parsing frontmatter
    // Add other dependencies as needed
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^18.19.31", // Match Node 18 LTS
    "tsup": "^8.0.2",
    "typescript": "^5.4.5",
    "vitest": "^1.6.0",
    "eslint": "^8.57.0",
    // Add local eslint/prettier configs or inherit from root
  },
  "publishConfig": {
    "access": "public"
  },
  "license": "MIT" // Or your chosen license
}
```

#### `packages/core/tsconfig.json`

```jsonc
// TLDR: TypeScript configuration for the @mixdown/core package. Extends the base tsconfig.json for specific package settings.
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false, // Allow emitting files for this package
    "declarationMap": true, // Optional: for better source mapping of declaration files
    "composite": true // If other packages in monorepo depend on this
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "src/**/*.spec.ts", "src/**/__tests__"]
}
```

#### `packages/core/tsup.config.ts`

```typescript
// TLDR: Build configuration for the @mixdown/core package using tsup. Defines entry points, output formats (ESM, CJS), and d.ts generation.
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'], // Adjust if your main CLI entry is elsewhere e.g. src/cli.ts
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false, // For v0, keep it simple. Can enable later if needed.
  shims: true, // If using features that need shimming for CJS/ESM interop
});
```

#### `packages/core/vitest.config.ts`

```typescript
// TLDR: Test configuration for the @mixdown/core package using Vitest. Enables global test utilities and coverage reporting.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Explicitly set environment
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/interfaces/**', 'src/**/__tests__/**', 'src/**/*.spec.ts'],
    },
  },
});
```

#### `.github/workflows/ci.yml`

```yaml
# TLDR: GitHub Actions workflow for Continuous Integration. Runs on push/PR, installs, lints, tests, builds, and handles releases.
name: CI

on:
  push:
    branches: [main, next] # Adjust as per your branching strategy
  pull_request:
    branches: [main, next]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build_and_test:
    name: Build and Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repo
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Required for Changesets versioning

      - name: Setup pnpm
        uses: pnpm/action-setup@v3 # Updated to v3
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18.x # LTS
          cache: 'pnpm'

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm turbo lint

      - name: Test
        run: pnpm turbo test

      - name: Build
        run: pnpm turbo build

  release:
    name: Release
    runs-on: ubuntu-latest
    needs: build_and_test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push' # Only release from main branch on push
    steps:
      - name: Checkout Repo
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Required for Changesets versioning

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18.x
          cache: 'pnpm'

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      # Re-run build, lint, test in release job to ensure integrity before publishing
      # This is a safeguard, though `turbo` caching should make it fast.
      - name: Lint
        run: pnpm turbo lint
      - name: Test
        run: pnpm turbo test
      - name: Build
        run: pnpm turbo build

      - name: Create Release Pull Request or Publish
        id: changesets
        uses: changesets/action@v1
        with:
          # For publishing to npm:
          publish: pnpm run release # This script should call `changeset publish`
          # For creating a PR with version bumps:
          # version: pnpm run version-packages # This script should call `changeset version`
          # commit: "chore: update package versions"
          # title: "chore: version packages"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }} # Required if publishing to npm
```

#### `.changeset/config.json`

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### Core Interfaces

#### `packages/core/src/interfaces/logger.ts`

```typescript
// TLDR: Defines the Logger interface for Mixdown. Provides a simple contract for logging messages at different levels.
export interface Logger {
  // <!-- TLDR: Logs a debug message. -->
  debug(message: string, ...args: any[]): void;
  // <!-- TLDR: Logs an informational message. -->
  info(message: string, ...args: any[]): void;
  // <!-- TLDR: Logs a warning message. -->
  warn(message: string, ...args: any[]): void;
  // <!-- TLDR: Logs an error message. -->
  error(message: string | Error, ...args: any[]): void;
}

// Basic console logger implementation for v0
export class ConsoleLogger implements Logger {
  // <!-- TLDR: Logs a debug message to the console. -->
  public debug(message: string, ...args: any[]): void {
    console.debug(`[DEBUG] ${message}`, ...args);
  }
  // <!-- TLDR: Logs an informational message to the console. -->
  public info(message: string, ...args: any[]): void {
    console.info(`[INFO] ${message}`, ...args);
  }
  // <!-- TLDR: Logs a warning message to the console. -->
  public warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }
  // <!-- TLDR: Logs an error message to the console. -->
  public error(message: string | Error, ...args: any[]): void {
    if (message instanceof Error) {
      console.error(`[ERROR] ${message.message}`, message.stack, ...args);
    } else {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}
```

#### `packages/core/src/interfaces/compiled-doc.ts`

```typescript
// TLDR: Defines the CompiledDoc interface for Mixdown. Represents the result of compiling a source rules file for a specific destination.

/**
 * Represents the structure of a parsed Mixdown stem.
 * For v0, this will be minimal as stems are not processed from the body.
 */
export interface Stem {
  name: string;
  // properties: Record<string, any>; // To be detailed in v0.1+
  // content: string; // To be detailed in v0.1+
  // rawMarker: string; // To be detailed in v0.1+
}

/**
 * Represents the structure of a parsed Mixdown import.
 * For v0, this will be minimal.
 */
export interface Import {
  path: string;
  // properties: Record<string, any>; // To be detailed in v0.1+
  // rawMarker: string; // To be detailed in v0.1+
}

/**
 * Represents the structure of a parsed Mixdown variable.
 * For v0, this will be minimal.
 */
export interface Variable {
  name: string;
  // rawMarker: string; // To be detailed in v0.1+
}

/**
 * Represents the structure of a generic Mixdown marker.
 * For v0, this will be minimal.
 */
export interface Marker {
  type: 'stem' | 'import' | 'variable' | 'unknown';
  // rawMarker: string; // To be detailed in v0.1+
  // position: { line: number, column: number }; // To be detailed in v0.1+
}


/**
 * Represents a document that has been parsed by the Mixdown parser.
 * This is an intermediate representation before full compilation.
 */
export interface ParsedDoc {
  source: {
    path?: string; // Original source file path, if applicable
    content: string; // Raw source content
    frontmatter?: Record<string, any>; // Parsed frontmatter data
  };
  ast: { // Abstract Syntax Tree - minimal for v0
    stems: Stem[];
    imports: Import[];
    variables: Variable[];
    markers: Marker[]; // All markers found - empty for v0 body processing
  };
  errors?: Array<{ message: string; line?: number; column?: number }>; // Parsing errors
}

/**
 * Represents a document that has been compiled for a specific destination.
 * This is the primary data structure passed to destination plugins.
 */
export interface CompiledDoc {
  /** Original source content and metadata */
  source: {
    path?: string;          // Original source file path, if applicable
    content: string;       // Raw source content
    frontmatter?: Record<string, any>;     // Parsed frontmatter data
  };

  /**
   * Parsed representation of the source document.
   * For v0, `stems`, `imports`, `variables`, and `markers` will be empty
   * or reflect only what might be in frontmatter if we decide to parse that deep.
   * The primary focus for v0 body content is that it's not processed for markers.
   */
  ast: {
    stems: Stem[];         // Array of parsed stems (empty for v0 body)
    imports: Import[];     // Array of parsed imports (empty for v0 body)
    variables: Variable[]; // Array of parsed variables (empty for v0 body)
    markers: Marker[];     // All markers found in the document (empty for v0 body)
  };

  /** Destination-specific output */
  output: {
    content: string;       // Transformed content for the destination (raw body for v0)
    metadata?: Record<string, any>; // Any metadata needed by the destination (e.g., derived from frontmatter)
  };

  /** Additional context for the compilation */
  context: {
    destinationId: string; // Current destination being compiled for
    config: Record<string, any>; // Resolved configuration for this compilation (e.g., project config, destination-specific config)
  };
}
```

### Plugin Contract

#### `packages/core/src/interfaces/destination-plugin.ts`

```typescript
// TLDR: Defines the DestinationPlugin interface for Mixdown. Contract for plugins that write compiled rules to specific destinations.
import type { JSONSchema7 } from 'json-schema'; // Using JSONSchema7 type for configSchema
import type { CompiledDoc } from './compiled-doc';
import type { Logger } from './logger';

export { JSONSchema7 }; // Re-export for convenience

export interface DestinationPlugin {
  /**
   * Canonical ID for the destination plugin.
   * Should be unique, kebab-case. e.g., "cursor", "windsurf".
   * <!-- TLDR: Returns the canonical name of the plugin. -->
   */
  get name(): string;

  /**
   * Returns a JSON schema describing the configuration options specific to this plugin.
   * This schema is used for validating plugin configuration.
   * <!-- TLDR: Provides a JSON schema for the plugin's configuration. -->
   */
  configSchema(): JSONSchema7;

  /**
   * Writes the compiled document to the destination.
   * This method is responsible for handling file I/O and any final transformations
   * specific to the destination's format or requirements.
   * <!-- TLDR: Writes the compiled document to the target destination. -->
   *
   * @param ctx - The context object for the write operation.
   * @param ctx.compiled - The compiled document to write.
   * @param ctx.destPath - The target file path or directory for the output.
   *                       Plugins should resolve this path appropriately.
   * @param ctx.config - The validated plugin-specific configuration.
   * @param ctx.logger - A logger instance for outputting messages.
   * @returns A promise that resolves when the write operation is complete.
   */
  write(ctx: {
    compiled: CompiledDoc;
    destPath: string;
    config: Record<string, any>; // Validated via schema from configSchema()
    logger: Logger;
  }): Promise<void>;
}
```

## Technical Risks and Mitigations

- **Risk**: Over-complicating v0 by trying to anticipate too much of v0.1+.
  - **Impact**: Slower delivery of v0, potential for unnecessary abstractions.
  - **Mitigation**: Strictly adhere to the v0 scope (pass-through compiler for body). Design interfaces thoughtfully but implement only what's needed for v0. Clearly document what's deferred.
- **Risk**: Turborepo and pnpm workspace setup proves more complex than anticipated for new team members or AI agents.
  - **Impact**: Slower onboarding, build/CI issues.
  - **Mitigation**: Provide clear, step-by-step setup instructions in the root README. Ensure all scripts are well-defined and work consistently. Keep the setup as standard as possible.
- **Risk**: Defining a `CompiledDoc` AST structure that is too rigid or too loose for future marker processing.
  - **Impact**: Requires significant refactoring in v0.1 when marker processing is introduced.
  - **Mitigation**: For v0, the AST fields related to body content (`stems`, `imports`, `variables`, `markers`) will be empty or minimal. The focus is on the `source` and `output.content` (raw body). Review the AST design with v0.1 in mind before finalizing v0.
- **Risk**: CI/CD pipeline for Changesets and pnpm publishing is flaky or hard to debug.
  - **Impact**: Delays releases, frustrating developer experience.
  - **Mitigation**: Test the release process thoroughly with alpha/beta versions. Use existing robust GitHub Actions for Changesets. Ensure proper NPM_TOKEN and GITHUB_TOKEN setup.

## Testing Strategy

### Component Tests

Structure tests to mirror the implementation:

```text
packages/core/src/
├─ parser/
│  └─ __tests__/        # Parser component tests (frontmatter, raw body)
├─ compiler/
│  └─ __tests__/        # Compiler component tests (v0: pass-through verification)
├─ linter/
│  └─ __tests__/        # Linter component tests (v0: frontmatter schema validation)
└─ destinations/
   └─ __tests__/        # Destination plugins tests (v0: stub invocation)
```

Each module should have comprehensive tests covering:

- Unit tests for individual functions.
- Integration tests for module interactions (e.g., Parser output to Linter input).
- Edge case handling (e.g., empty files, missing frontmatter for parser; invalid frontmatter for linter).

### Integration Tests

Integration tests in `packages/core/tests/integration/` should verify that components work correctly together:

- **v0 Focus**:
  - Reading `my-rules.mix.md`.
  - Parser (frontmatter, raw body) → Linter (frontmatter validation).
  - Parser → Compiler (raw body pass-through) → Destination plugins (`write` method called with correct raw body).
  - End-to-end flow: source rules file (`my-rules.mix.md`) results in output files in `.mixdown/dist/` containing the raw body content.
  - Basic error reporting from Linter (e.g., invalid frontmatter).

### API Documentation Examples

All public APIs (especially in `@mixdown/core/src/index.ts` and interfaces) should be documented using TSDoc.

```typescript
// TLDR: Example of an API function. This function performs an example action.

/**
 * Orchestrates the Mixdown v0 build process for a single file.
 * Reads, parses, lints, compiles, and writes to destinations.
 *
 * @example
 * ```typescript
 * import { runMixdownV0 } from '@mixdown/core';
 * import { ConsoleLogger } from '@mixdown/core/interfaces/logger'; // Adjust path
 *
 * async function main() {
 *   const logger = new ConsoleLogger();
 *   try {
 *     await runMixdownV0('./my-rules.mix.md', logger);
 *     logger.info('Mixdown v0 process completed.');
 *   } catch (error) {
 *     logger.error('Mixdown v0 process failed:', error);
 *   }
 * }
 *
 * main();
 * ```
 *
 * @param sourceFilePath - The path to the source Mixdown file (e.g., my-rules.mix.md).
 * @param logger - An instance of the Logger interface.
 * @param projectConfig - Optional: The root Mixdown project configuration.
 * @returns A promise that resolves when the process is complete, or rejects on error.
 */
export async function runMixdownV0(
  sourceFilePath: string,
  logger: Logger,
  projectConfig?: any,
): Promise<void> {
  // <!-- TLDR: Main orchestration logic for reading, parsing, linting, compiling, and writing a Mixdown file. -->
  // Implementation details...
}
```

## Follow-up Actions

### For Me (AI Agent)

1. **Draft `docs/project/plans/REVIEW-mixdown-v0.md`**: Create this file based on the template provided in the user instructions.
2. **Refine Task Details**: Add more specific implementation notes or code snippets within each task in the checklist if helpful for the executing agent.
3. **Verify Consistency**: Ensure all file paths and naming conventions in this plan are consistent with the user instructions and best practices.
4. **Prepare for Phase 1**: Get ready to guide the execution of Phase 1 tasks.

### For the Human

1. **Review `PLAN-mixdown-v0.md`**: Please review this entire document for accuracy, completeness, and clarity.
2. **Confirm Scope**: Confirm that the v0 scope (especially the pass-through nature of the compiler for the body content and frontmatter-only linter) is correctly captured.
3. **Provide `JSONSchema7` type**: If a specific npm package is preferred for `JSONSchema7` type definition, please specify. Otherwise, I'll assume `json-schema` or a similar widely-used package.
4. **Clarify Initial `LinterConfig`**: For `packages/core/src/linter/index.ts`, what basic `LinterConfig` structure should be anticipated, if any, beyond just the `ParsedDoc` for v0? For now, I've assumed it might be optional or minimal.
5. **Confirm `ParsedDoc`**: The `ParsedDoc` interface has been introduced as an intermediate step between Parser and Compiler/Linter. Please confirm if this aligns with your vision or if Parser should directly output a structure closer to `CompiledDoc.source` & `CompiledDoc.ast`.
6. **Approve Plan**: Once satisfied, provide approval to proceed with implementation based on this plan.
