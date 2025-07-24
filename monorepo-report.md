# Monorepo Report

## 1. Guiding Principles

- **Exploit Bun‑native speed everywhere** – use its bundler (`bun build`), test runner (`bun test`), and isolated installs to minimise node_modules churn. ([bun.sh][1], [Socket][2])
- **Let Turborepo orchestrate only what Bun can’t** – parallel task graphs, remote caching, and CI/local parity.
- **Keep surface area tiny** – one linter ⁄ formatter (Biome 2 + Ultracite), one test runner (Bun), one package manager (Bun).
- **Ship TypeScript → ESM only** – Node ≥ 20 and Bun both load it natively; no dual CJS/MJS.

---

## 2. Proposed Build Architecture

| Layer                | Tool                              | Rationale                                                                                                                                     |
| -------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Bundler / transpiler | **`bun build`**                   | SIMD‑accelerated bundling, tree‑shaking, CSS import support; no extra dep like `tsup`. ([bun.sh][1])                                          |
| Task graph & caching | **Turborepo** (`turbo run build`) | Fine‑grained pipeline + Cloudflare remote cache (KV or R2). ([GitHub][3], [adirishi.github.io][4])                                            |
| Package manager      | **Bun v1.2+**                     | Isolated installs give Hermetic workspaces & \~30‑50 % faster CI. ([Socket][2])                                                               |
| Lint / format        | **Biome 2 + Ultracite preset**    | Single Rust binary, 20‑40× faster than ESLint/Prettier; zero‑config with `npx ultracite init`. ([ultracite.ai][5], [GitHub][6], [YouTube][7]) |
| Tests                | **`bun test`**                    | JSDOM built‑in, snapshots, watch mode; removes Vitest.                                                                                        |

### Minimal root scripts

```jsonc
{
  "scripts": {
    "preinstall": "bun pm unhoist", // ensures isolated installs
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "biome check .",
    "format": "biome format --write .",
    "release": "turbo run build && changeset publish",
  },
}
```

### `.turbo/config.json` sketch

```json
{
  "$schema": "https://turborepo.org/schema.json",
  "globalDependencies": ["./bun.lockb", "./packages/**/bun.lockb"],
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test": { "dependsOn": ["build"], "outputs": [] },
    "lint": { "outputs": [] }
  },
  "remoteCache": {
    "signature": "rulesets-build-v1",
    "url": "https://<your-worker>.workers.dev"
  }
}
```

- **Local dev**: `CACHE_DISABLED=1 turbo run dev` for instant feedback.
- **CI**: pass Cloudflare‑specific env vars (`CF_ACCOUNT_ID`, `CF_API_TOKEN`) so the remote cache is read/write; set `--team` if isolating PR caches.

---

## 3. Package‑Level Conventions

| Package kind                                 | Build command                                       | Output         | Notes                                                              |
| -------------------------------------------- | --------------------------------------------------- | -------------- | ------------------------------------------------------------------ |
| **Libraries** (`compiler`, `parser`, `core`) | `bun build src/index.ts --outdir dist --target bun` | ESM            | Ship `.d.ts` via `emitDeclarationOnly`.                            |
| **Type‑only** (`types`)                      | none                                                | n/a            | Publish `"types"` only, mark `"sideEffects": false`.               |
| **CLI** (`apps/cli`)                         | Same as libs, plus `#! /usr/bin/env bun`            | `dist/cli.mjs` | Use `bunx pkg-up` to find nearest `package.json` for version flag. |
| **No‑code** (`docs`, `agent`)                | remove `build`                                      | n/a            | Prevent them from entering the pipeline.                           |

---

## 4. Linting & Formatting Setup

1. `bun add -D @biomejs/biome ultracite`
2. `npx ultracite@latest init` → generates `biome.json` extending `@ultracite/biome-config`.
3. Delete `.eslintrc*`, prettier configs, stylelint (Biome handles CSS‑in‑JS) – except keep **markdownlint‑cli2** for prose where you want rules distinct from code.
4. Hook **lefthook** for `pre-commit`:

```yaml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: '*.{ts,tsx,js,jsx,md}'
      run: bun run lint {staged_files}
    test:
      run: bun test --runInBand --bail
```

---

## 5. Testing Strategy

| Scope              | Runner            | Notes                                                                                |
| ------------------ | ----------------- | ------------------------------------------------------------------------------------ |
| Unit + integration | `bun test`        | JSDOM for React/Node APIs; use `--coverage`.                                         |
| E2E CLI smoke      | `bunx zx` scripts | Invoke the built CLI in a temp dir.                                                  |
| Cross‑version      | matrix in CI      | `bun test` against Node LTS via `npx vitest` fallback if Bun unavailable (optional). |

Migrating Vitest specs: rename `.spec.ts` ➜ `.test.ts`; remove Vitest globals (`vi` ➜ `bun.jest` polyfill) or add tiny shim.

---

## 6. CI Blueprint (GitHub Actions)

```yaml
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        bun-version: [1.2.19]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
        with: { bun-version: ${{ matrix.bun-version }} }
      - run: bun install --frozen-lockfile
      - run: turbo run build --cache-dir=".turbo"
      - run: turbo run test --cache-dir=".turbo"
      - run: bun run lint
```

Add a second job for **publish** that triggers only on `main` + tag, executes `turbo run build` (reads cache), then `changeset publish`.

---

## 7. Critique of Non‑Build Aspects

1. **Docs sprawl** – `docs/`, `docs_archive/`, and nested topic folders dilute signal. Consider a single `/docs` with versioned subdirs and archive everything else in a GitHub PR tag.
2. **`agent/` & `tests/` duplication** – root‑level `test/` _and_ `tests/` plus package‑local tests cause churn in Turbo graphs. Pick one (`packages/*/__tests__` is conventional).
3. **Scripts folder vs package.json tasks** – shell scripts in `/scripts` often duplicate Bun scripts; migrate to npm‑style tasks where possible for portability.
4. **Dead packages** – `plugin-cursor`, `linter`, `testing` overlap core functionality. Retire them or mark `"private": true` so they never publish.
5. **Config leakage** – top‑level `.env` checked into repo with dummy vars is fine, but ensure no secret defaults; CI should inject at runtime.
6. **Yarn artefacts** – stale `yarn.lock`, `.yarnrc.yml` and docs referencing `npm run` erode newcomer confidence; delete and document Bun install process clearly.
7. **Architecture decision records** – good, but ADRs belong in `/docs/architecture/adr-YYYY-MM-DD-<slug>.md`, not mixed with design notes.

---

## 8. Edge‑Case Watch‑list

- **Non‑TypeScript assets** (e.g., WASM, CSS): ensure `bun build` handles or use `turbo run build --filter @rulesets/web` to call `vite build` where needed.
- **Cross‑platform CLIs**: Bun runtime is fine on Linux/macOS; Windows users still experimental, provide fallback Node CLI wrapper.
- **Node‑specific APIs**: verify Bun parity (worker_threads, `fs/promises` edge cases) and gate with `process.versions.bun`.

---

## 9. Next Actions Checklist

1. **Branch `feat/bun‑turbo‑refactor`**
2. Implement **lint/format** migration → validate on CI.
3. Swap **build/test** scripts package‑by‑package; commit after each logical step.
4. Stand‑up **Cloudflare cache Worker** (wrangler deploy).
5. Remove deprecated packages & scripts; cut **0.2.0‑beta** tag.
6. Run a cold CI build → capture timings; compare delta after cache warm‑up.
7. Update README + contribution guide to reflect new workflow.

> **Reflection prompt:** After step 6, decide whether Turborepo still delivers enough value over pure Bun workspaces; if cache hit ratio < 70 %, consider dropping Turbo to further simplify.

---

A streamlined toolchain centred on Bun’s native speed and Turborepo’s caching gives you sub‑10 s incremental builds locally, < 1 min CI builds, and a dramatically leaner dependency graph—all without the CJS/MJS headache.

[1]: https://bun.sh/docs/bundler?utm_source=chatgpt.com 'Bun.build – Bundler | Bun Docs'
[2]: https://socket.dev/blog/bun-1-2-19-adds-isolated-installs-for-better-monorepo-support?utm_source=chatgpt.com 'Bun 1.2.19 Adds Isolated Installs for Better Monorepo Support'
[3]: https://github.com/AdiRishi/turborepo-remote-cache-cloudflare?utm_source=chatgpt.com 'AdiRishi/turborepo-remote-cache-cloudflare - GitHub'
[4]: https://adirishi.github.io/turborepo-remote-cache-cloudflare/introduction/getting-started?utm_source=chatgpt.com 'Getting Started | Turborepo Remote Cache - GitHub Pages'
[5]: https://www.ultracite.ai/?utm_source=chatgpt.com 'Ultracite: The AI-ready formatter that helps you write and generate ...'
[6]: https://github.com/haydenbleasel/ultracite?utm_source=chatgpt.com 'haydenbleasel/ultracite: The AI-ready formatter that helps ... - GitHub'
[7]: https://www.youtube.com/watch?v=lEkXbneUnWg&utm_source=chatgpt.com 'The EASIEST Way To Switch From ESLint & Prettier to Biome'
