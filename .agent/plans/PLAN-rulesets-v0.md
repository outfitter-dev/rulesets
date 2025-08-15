# Rulesets v0 Implementation Plan

> [!NOTE]
> When implementing code based on this plan, include version marker comments to identify code with limited implementation that will be expanded in future versions. For example:
>
> ```typescript
> : Simple pass-through implementation that doesn't process markers
> // TODO (ruleset-v0.1-beta): Add support for block parsing
> function parseContent(content: string) {
>   // Simple implementation for v0
>   return { body: content };
> }
> ```
>
> This makes version-specific code easily greppable and helps future developers (both human and AI) identify components scheduled for enhancement.

## Overview

Rulesets is a Markdown-previewable rules compiler that allows authoring a single source rules file (source rules) in Markdown and compiling it into compiled rules for various destinations (e.g., AI assistants, IDEs). Rulesets v0 aims to establish a production-ready monorepo, ship the initial `@rulesets/core` package (including a basic parser, a pass-through compiler, and a front matter linter), and prove the end-to-end flow by processing a `my-rules.rule.md` file, writing compiled rules to `.ruleset/dist/`, and invoking stubbed destination plugins for Cursor and Windsurf.

While v0 will not process Rulesets notation markers (`{{...}}`) within the content body, the architecture will be laid to easily incorporate this functionality in subsequent v0.x releases (e.g., ruleset-v0.1-beta for `{{block}}` parsing, ruleset-v0.2-beta for variables, etc.).

## Implementation Checklist

### Phase 1: Repository & Core Package Foundation (Toolchain & Structure)

- [ ] **Task 1: Setup Monorepo with Bun and Turborepo**
  - Initialize Bun workspace.
  - Configure Turborepo with `turbo.json`.
  - Set up root `package.json` with workspace scripts.
  - Initialize Git repository with a `.gitignore` file.
  - **Acceptance Criteria**: `bun install` succeeds; `turbo build`, `turbo test`, `turbo typecheck` commands are runnable; `bun run lint` works at root.
  - **Dependencies**: None.
- [ ] **Task 2: Create `@rulesets/core` Package**
  - Create `packages/core` directory.
  - Initialize `packages/core/package.json`.
  - Add `tsup.config.ts` for building ESM, CJS, and d.ts files.
  - Add `vitest.config.ts` for unit testing.
  - Set up `tsconfig.json` for the core package, extending `tsconfig.base.json`.
  - **Acceptance Criteria**: `@rulesets/core` can be built and tested independently.
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
  - Configure Biome for TypeScript linting and formatting.
  - Add `markdownlint` configuration.
  - Add linting scripts to `package.json` files.
  - **Acceptance Criteria**: `bun run lint` runs successfully across the monorepo.
  - **Dependencies**: Task 1.
- [ ] **Task 6: Setup Release Management with Changesets**
  - Initialize Changesets with `bun run changeset init`.
  - Configure `.changeset/config.json`.
  - Add `bun run version-packages` and `bun run release` scripts.
  - Ensure CI workflow can publish packages.
  - **Acceptance Criteria**: Changesets can version packages and prepare releases; CI can publish.
  - **Dependencies**: Task 4.

### Phase 2: `@rulesets/core` - Initial Implementation (Parser, Compiler, Linter Stubs)

- [ ] **Task 1: Define Core Interfaces**
  - Define `CompiledDoc` interface in `packages/core/src/interfaces/compiled-doc.ts`.
  - Define `DestinationPlugin` interface in `packages/core/src/interfaces/destination-plugin.ts`.
  - Define a basic `Logger` interface (e.g., `packages/core/src/interfaces/logger.ts`).
  - **Acceptance Criteria**: Interfaces are defined and exported.
  - **Dependencies**: Phase 1/Task 2.
- [ ] **Task 2: Implement v0 Parser Module**

  - Create `packages/core/src/parser/index.ts`.
  - Implement `parse(content: string): Promise<ParsedDoc>` function.
    - For v0, `ParsedDoc` will be a simplified version of `CompiledDoc.source` and `CompiledDoc.ast` (primarily front matter and raw body).
    - It should parse YAML front matter from a Markdown string.
    - It should separate the raw Markdown body.
    - `ParsedDoc.ast` will be minimal for v0 (e.g., `blocks: [], imports: [], variables: [], markers: []`).
  - Add unit tests for front matter parsing and body extraction (including edge cases like missing front matter).
  - **File Structure**:

  ```text
  packages/core/src/parser/
  ├─ index.ts
  └─ __tests__/
     └─ parser.spec.ts
  ```

  - **Acceptance Criteria**: Parser correctly extracts front matter and raw body. All unit tests pass.
  - **Dependencies**: Phase 2/Task 1.

- [ ] **Task 3: Implement v0 Linter Module**

  - Create `packages/core/src/linter/index.ts`.
  - Implement `lint(parsedDoc: ParsedDoc, config?: LinterConfig): Promise<LintResult[]>`.
    - For v0, it validates the parsed front matter against a basic schema (e.g., presence of a `ruleset` key or specific expected fields).
    - `LintResult` should define structure for errors (e.g., `message`, `line`, `column`, `severity`).
  - Add unit tests for front matter validation.
  - **File Structure**:

  ```text
  packages/core/src/linter/
  ├─ index.ts
  └─ __tests__/
     └─ linter.spec.ts
  ```

  - **Acceptance Criteria**: Linter correctly validates front matter based on a predefined schema. All unit tests pass.
  - **Dependencies**: Phase 2/Task 2.

- [ ] **Task 4: Implement v0 Compiler Module**

  - Create `packages/core/src/compiler/index.ts`.
  - Implement `compile(parsedDoc: ParsedDoc, destinationId: string, projectConfig?: any): Promise<CompiledDoc>`.
    - For v0, this function will be a pass-through for the body content.
    - `CompiledDoc.source` will be populated from `ParsedDoc`.
    - `CompiledDoc.ast` will be populated from `ParsedDoc.ast` (which is minimal in v0).
    - `CompiledDoc.output.content` will be the raw Markdown body from `ParsedDoc`.
    - `CompiledDoc.output.metadata` can be empty or include basic source front matter.
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

- [ ] **Task 1: Create Main CLI Orchestration Logic (within `@rulesets/core`)**
  - Create `packages/core/src/index.ts` (if not already the main entry) or a `cli.ts`.
  - This will be a simple function/script that: 1. Reads a sample `my-rules.rule.md` file from a predefined location (e.g., project root or a `./test-data/` directory). 2. Instantiates a basic logger. 3. Invokes the `Parser` with the file content. 4. Invokes the `Linter` with the parsed document. Logs linting results. 5. If linting passes (or only warnings), invokes the `Compiler` for "cursor" and "windsurf" destinations. 6. For each compiled document, instantiates the respective destination plugin. 7. Calls the `write()` method of each plugin, providing necessary context (e.g., output path like `.ruleset/dist/cursor/my-rules.md` and `.ruleset/dist/windsurf/my-rules.md`).
  - **Acceptance Criteria**: A Node.js script can execute the parse -> lint -> compile -> write (stubbed) flow. Compiled rules (raw body) are written to the specified output directory.
  - **Dependencies**: Phase 2 (all tasks).
- [ ] **Task 2: Create Sample `my-rules.rule.md`**

  - Create a file named `my-rules.rule.md` in the project root or a test directory.
  - Content:

  ```markdown
  ---
  ruleset: v0
  title: My First Rulesets Rule
  description: A simple rule for testing v0.
  destinations:
    cursor:
      outputPath: '.cursor/rules/my-first-rule.mdc'
    windsurf:
      outputPath: '.windsurf/rules/my-first-rule.md'
  ---

  # This is the main content

  This is a paragraph of the rule. In v0, this content will be passed through as-is.
  `{{blocks}}`, `{{$variables}}`, and `{{>imports}}` will be ignored by the v0 parser and compiler.
  ```

  - **Acceptance Criteria**: Sample file is created and available for testing.
  - **Dependencies**: None.

- [ ] **Task 3: Basic Integration Testing**
  - Write an integration test in `packages/core/tests/integration/e2e.spec.ts` that runs the CLI orchestration logic from Phase 3/Task 1.
  - Verify that the output files are created in `.ruleset/dist/` with the expected raw content.
  - Verify that plugin `write` methods are called.
  - **Acceptance Criteria**: End-to-end flow is verified by an automated test.
  - **Dependencies**: Phase 3/Task 1, Phase 3/Task 2.

### Phase 4: Documentation & Initial Release Preparation

- [ ] **Task 1: Draft Initial `README.md` for `@rulesets/core`**
  - Include basic usage, purpose, and how to contribute.
  - Explain the v0 limitations (no marker processing) and the roadmap for ruleset-v0.1-beta.
  - **Acceptance Criteria**: `README.md` for `@rulesets/core` is created.
  - **Dependencies**: None.
- [ ] **Task 2: Draft Root `README.md`**
  - Describe the Rulesets project, its goals, and the monorepo structure.
  - **Acceptance Criteria**: Root `README.md` is created.
  - **Dependencies**: None.
- [ ] **Task 3: Prepare `PLAN-rulesets-v0.md` (this document)**
  - Ensure it's up-to-date and accurately reflects all tasks.
  - Place it in `docs/project/plans/PLAN-rulesets-v0.md`.
  - **Acceptance Criteria**: Planning document is finalized.
  - **Dependencies**: All previous tasks.
- [ ] **Task 4: Prepare `docs/project/plans/REVIEW-rulesets-v0.md`**
  - Create the review document as specified in the prompt.
  - **Acceptance Criteria**: Review document is created.
  - **Dependencies**: None.
- [ ] **Task 5: Prepare for First Release (`@rulesets/core@0.0.1` or `0.1.0-alpha.1`)**
  - Ensure all tests pass.
  - Ensure `pnpm changeset version` and `pnpm release` (or CI equivalent) function correctly.
  - Manually test installing `@rulesets/core` in a new dummy project.
  - **Acceptance Criteria**: Package is ready for a pre-release/initial release.
  - **Dependencies**: All previous tasks.

### Phase 5: Final Review & v0 Completion

- [ ] **Task 1: Execute `docs/project/plans/REVIEW-rulesets-v0.md`**
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
- Use Rulesets terminology consistently according to the Language spec.
- Practice full **TDD**: red → green → refactor; unit + integration + e2e.
- If any test type is believed unnecessary, the human must say
  `I AUTHORIZE YOU TO SKIP WRITING TESTS THIS TIME`.

## Implementation Details

### Repository Structure

```text
rulesets/
├─ .changeset/
│  └─ config.json
├─ .github/
│  └─ workflows/ci.yml
├─ docs/
│  ├─ project/
│  │  ├─ plans/
│  │  │  └─ PLAN-rulesets-v0.md
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
├─ my-rules.rule.md             # Sample source rules file for v0 testing
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
└─ turbo.json
```

### Configuration Files

#### Root `package.json`

```jsonc
{
  "name": "rulesets",
  "private": true,
  "packageManager": "bun@1",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "typecheck": "turbo typecheck",
    "lint": "ultracite lint",
    "lint:fix": "ultracite format",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "bun run build:clean && changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.1", // Example version, use latest
    "turbo": "^2.0.6", // Example version, use latest ^2
    "typescript": "^5.4.5", // Example version, use latest 5.x
    "@biomejs/biome": "^2.2.0", // Example version, use latest
    "prettier": "^3.2.5", // Example version, use latest
    "markdownlint-cli2": "^0.18.1", // Example version, use latest
  },
}
```

#### `bunfig.toml`

```toml
[install]
linkWorkspacePackages = true
frozenLockfile = true
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
    "types": ["node", "vitest/globals"],
  },
  "exclude": ["node_modules", "**/dist", "**/coverage"],
}
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

#### `packages/core/package.json`

```json
{
  "name": "@rulesets/core",
  "version": "0.0.0",
  "description": "Core parsing, compiling, and destination plugins for Rulesets",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "lint": "biome check src",
    "typecheck": "tsc --noEmit"
  },
  "keywords": ["rulesets", "markdown", "rules", "compiler"],
  "license": "MIT",
  "dependencies": {
    "gray-matter": "^4.0.3",
    "ajv": "^8.12.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.30",
    "tsup": "^8.0.2",
    "vitest": "^1.4.0",
    "typescript": "^5.4.5",
    "@biomejs/biome": "^2.2.0"
  }
}
```

#### `packages/core/tsup.config.ts`

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false, // Keep it simple for now (ruleset-v0.1-beta)
});
```

#### `packages/core/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

#### `packages/core/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "coverage", "**/*.spec.ts", "**/*.test.ts"]
}
```

### Core Interfaces

#### `packages/core/src/interfaces/compiled-doc.ts`

```typescript
// TLDR: CompiledDoc interface representing the result of compilation
export interface CompiledDoc {
  source: {
    path: string;
    content: string;
    front matter: Record<string, any>;
  };
  ast: {
    blocks: any[]; // Empty for v0
    imports: any[]; // Empty for v0
    variables: any[]; // Empty for v0
    markers: any[]; // Empty for v0
  };
  output: {
    content: string;
    metadata: Record<string, any>;
  };
  context: {
    destinationId: string;
    projectConfig?: any;
  };
}
```

#### `packages/core/src/interfaces/destination-plugin.ts`

```typescript
// TLDR: DestinationPlugin interface for extensible destination support
import { CompiledDoc } from './compiled-doc';
import { Logger } from './logger';

export interface DestinationPlugin {
  name: string;
  configSchema(): any; // JSON Schema for validation
  write(compiled: CompiledDoc, destPath: string, logger: Logger): Promise<void>;
}
```

#### `packages/core/src/interfaces/logger.ts`

```typescript
// TLDR: Logger interface for consistent logging across modules
export interface Logger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}
```

### Sample Implementation (Parser Module)

#### `packages/core/src/parser/index.ts`

```typescript
// TLDR: Simple parser implementation that extracts front matter and body (ruleset-v0.1-beta)
// TODO (ruleset-v0.1-beta): Add support for block parsing
// TODO (ruleset-v0.2-beta): Add variable substitution

import matter from 'gray-matter';

export interface ParsedDoc {
  front matter: Record<string, any>;
  body: string;
  ast: {
    blocks: any[];
    imports: any[];
    variables: any[];
    markers: any[];
  };
}

// TLDR: Parse source rules file into structured document
export async function parse(content: string): Promise<ParsedDoc> {
  const { data: front matter, content: body } = matter(content);

  return {
    front matter,
    body,
    ast: {
      blocks: [], // Not implemented in v0
      imports: [], // Not implemented in v0
      variables: [], // Not implemented in v0
      markers: [], // Not implemented in v0
    },
  };
}
```

### Sample Test

#### `packages/core/src/parser/__tests__/parser.spec.ts`

```typescript
// TLDR: Unit tests for the v0 parser implementation
import { describe, it, expect } from 'vitest';
import { parse } from '../index';

describe('Parser', () => {
  it('should extract front matter and body', async () => {
    const content = `---
ruleset: v0
title: Test Rule
---

# Test Content

This is the body.`;

    const result = await parse(content);

    expect(result.front matter).toEqual({
      ruleset: 'v0',
      title: 'Test Rule',
    });
    expect(result.body).toBe('\n# Test Content\n\nThis is the body.');
    expect(result.ast.blocks).toEqual([]);
  });

  it('should handle missing front matter', async () => {
    const content = '# No Front matter\n\nJust content.';

    const result = await parse(content);

    expect(result.front matter).toEqual({});
    expect(result.body).toBe('# No Front matter\n\nJust content.');
  });
});
```

## v0 Acceptance Criteria Summary

1. **Monorepo Setup**: Functional pnpm workspace with Turborepo, TypeScript, linting, and testing configured.
2. **Core Package**: `@rulesets/core` package with parser, linter, compiler, and destination plugin modules.
3. **Basic Functionality**: Parse front matter, validate it, pass through body content, and invoke destination plugins.
4. **Testing**: Unit tests for all modules and integration test for end-to-end flow.
5. **Documentation**: README files for root and core package explaining the project and v0 limitations.
6. **Release Ready**: Changesets configured and package can be published to npm.

## Notes

- This plan establishes the foundation for Rulesets while keeping v0 scope minimal and achievable.
- The architecture is designed to easily accommodate v0.x enhancements (block parsing, variables, imports).
- All code includes `ruleset-v*` markers for tracking implementation maturity.
