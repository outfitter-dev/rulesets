# Monorepo Report Review

1. **Purpose of This Memo**
Provide a single, self‑contained review of your **Monorepo Refactor Plan** that folds in _all_ feedback we’ve discussed—including the move to `tsc --emitDeclarationOnly`, ESM‑only builds, CLI/binary distribution, and minor tooling tweaks. You can hand it straight to the teammate who authored the original report.

---

2. **High‑Level Alignment**

| Decision                | Final Stance                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Runtime floor**       | Node 18 + Bun 1.2 (no CommonJS, no Node ≤ 16 support)                                                              |
| **Module format**       | Pure ESM (`"type": "module"`)                                                                                      |
| **Type declarations**   | Generated per‑package via `tsc --emitDeclarationOnly`; shipped in `dist/`                                          |
| **Bundler**             | `bun build` for JS bundles; no `tsup` except where _both_ bundling _and_ `.d.ts` generation in one step is handy   |
| **CLI distribution**    | npm (`bunx ruleset`), Homebrew/winget binaries via `bun build --compile`                                           |
| **Lint / format stack** | Biome 2 + Ultracite for code; Prettier (temporary) + markdownlint‑cli2 for prose; Stylelint optional               |
| **Task orchestrator**   | Turborepo with Cloudflare remote cache (added last)                                                                |
| **Indent style**        | **Choose now**: repo currently 2‑space; Biome can switch to tabs but creates a noisy diff—lock this before Phase 2 |

---

3. **Revised Build Pipeline (per package)**

| Stage                 | Command                                                        | Output             |
| --------------------- | -------------------------------------------------------------- | ------------------ |
| **Bundle**            | `bun build src/index.ts --outdir dist --target bun --minify`   | ESM `.js`          |
| **Declarations**      | `tsc -p tsconfig.build.json --emitDeclarationOnly`             | `.d.ts`            |
| **Watch**             | `bun build --watch & tsc --watch --emitDeclarationOnly`        | live reload        |
| **Binary (CLI only)** | `bun build src/index.ts --compile --outfile dist/ruleset‑<os>` | single‑file native |

`tsconfig.build.json`:

```jsonc
{
  "extends": "../../config/tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "declaration": true,
    "emitDeclarationOnly": true,
    "declarationDir": "dist",
    "outDir": "dist",
    "strict": true,
  },
  "include": ["src/**/*"],
}
```

---

4. **Phase‑by‑Phase Amendments**

| Phase                     | Key Additions / Changes                                                                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Foundation Cleanup** | Add `bunfig.toml`:<br>`[install]\nfrozenLockfile = true\nlinker = "isolated"` (guard with env flag for Windows users).                                                                          |
| **2. Lint & Format**      | Decide tabs vs spaces first; consider dropping Prettier once Biome adds Markdown/YAML support (Q4 roadmap).                                                                                     |
| **3. Build Optimisation** | Replace `tsup` with the two‑step build everywhere **unless** a package truly benefits from tsup’s one‑shot bundle+types; delete legacy configs. Update Turborepo `outputs` to include `*.d.ts`. |
| **4. Testing**            | Migrate simple suites (<10 tests, no heavy mocking) to `bun test`; keep Vitest temporarily for complex React/JSDOM specs; document rationale in each README.                                    |
| **5. Dependency Sweep**   | Remove `tsup`, ESLint stack, unused Vitest deps after migration; run `bun pm dedupe`.                                                                                                           |
| **6. Docs & Scripts**     | README **TL;DR** section:<br>`bun install && bun run build` ; provide “What’s new in vNext” for contributors.                                                                                   |
| **7. Performance Prep**   | Capture cold/warm metrics _before_ Turborepo; ensure isolated linker isn’t breaking Windows.                                                                                                    |
| **8. Turborepo**          | Add `biome.json`, `turbo.json`, and `bun.lock` to `globalDependencies`; pin Cloudflare cache Worker SHA; target ≥70 % cache hit.                                                                |

---

5. **CLI & Binary Distribution Workflow**

1. **npm publish**
   - Package name: `@rulesets/cli`; entry `bin: { "ruleset": "./dist/index.js" }`.
   - Users run: `bunx ruleset init` or `npx ruleset init`.

2. **Native binaries**
   - `bun build src/index.ts --compile --minify --outfile dist/ruleset‑macos‑arm64`.
   - Create GitHub release with tarballs (`ruleset‑<os>-<arch>.tar.gz`) and SHA‑256.

3. **Homebrew tap**
   - `Formula/ruleset.rb` installing the right binary per architecture.
   - Usage: `brew tap your-org/rulesets && brew install ruleset`.

---

6. **Open Decisions for the Team**

| Topic            | Options                                            | Recommend                                                |
| ---------------- | -------------------------------------------------- | -------------------------------------------------------- |
| Indentation      | keep 2‑spaces (status quo) or switch to tabs       | **Lock 2‑spaces** unless strong tab preference           |
| Stylelint        | Keep (with `stylelint‑config‑tailwindcss`) or drop | Drop if CSS lives almost entirely in Tailwind classnames |
| `tsup` retention | Keep for all packages vs limit to special cases    | **Limit to edge cases**—prefer Bun + `tsc` two‑step      |

**MY DECISIONS:**

1. Let's lock in 2-spaces
2. Let's drop Stylelint since we have no front-end right now.
3. Let's retain `tsup` for now.

---

7. **Validation Checklist (supersedes prior list)**

- [ ] `dist/` contains `.js` + `.d.ts`, _no_ `.cjs`.
- [ ] `import { compile } from "@rulesets/compiler"` gives IntelliSense in VS Code.
- [ ] `bun run build` passes; `node -e "import('@rulesets/compiler')"` works on Node 18.
- [ ] Binary runs on fresh macOS/Linux box without Node/Bun installed.
- [ ] Turborepo cache hit ≥ 70 % on repeat CI builds.
- [ ] Cold vs warm build/test metrics recorded in `/docs/perf/2025‑benchmarks.md`.

---

8. **Roll‑Forward / Roll‑Back Guidance**

- Use a _phase‑branch_ strategy (`feat/phase‑3-build‑refactor`) so a failed phase can be reverted with one PR revert.
- If binary build or Turborepo cache fails, fall back to npm publish path only—CLI still works everywhere.

---

9. **Final Takeaway**
With `bun build` + `tsc --emitDeclarationOnly`, you get **fast ESM bundles, full editor typings, and zero CommonJS baggage**—perfect for a Node 18+/Bun future. The remaining tweaks (indent style, Stylelint scope, limited `tsup`) are small but worth settling now so the migration lands cleanly. Hand this memo to the original author and treat it as the definitive refinement of the refactor plan.
