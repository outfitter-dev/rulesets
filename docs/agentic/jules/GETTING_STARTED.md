# Jules Agent - Rulesets Development Context

## Your Role in Rulesets

**You are implementing Rulesets v0** - a CommonMark-compliant rules compiler. Focus on the core functionality in `/packages/core/`.

## Implementation Scope (rset-v0)

- **Parser:** Handle frontmatter and raw body only (no marker processing yet)
- **Compiler:** Pass-through implementation (no `{{...}}` notation processing)
- **Linter:** Basic frontmatter schema validation
- **Plugins:** Stub implementations for cursor and windsurf destinations

## Required Code Patterns

```typescript
// TLDR: Simple parser implementation that extracts frontmatter (rset-v0)
// TODO (rset-v0.1): Add support for stem parsing
export function parse(content: string): ParsedDoc {
  // Implementation...
}
```

## Monorepo Commands

- **Test:** `pnpm turbo test`
- **Lint:** `pnpm turbo lint`
- **Build:** `pnpm turbo build`
- **Type check:** `pnpm turbo typecheck`

## Critical Documentation

Always reference these when implementing:
- `docs/project/GREPABLE.md` - Marker system guide
- `docs/project/LANGUAGE.md` - Terminology specifications
- `docs/project/plans/PLAN-mixdown-v0.md` - Implementation requirements
- `AGENTS.md` - AI agent conventions

## Test Requirements

Every function must have corresponding tests. Follow existing patterns in `__tests__/` directories.

## Marker Usage in Code

Use markers to indicate implementation level and future plans:
- Current work: `(rset-v0)`
- Future enhancements: `TODO (rset-v0.1):`
- Security concerns: `(rset-sec)`
- Performance notes: `(rset-perf)`