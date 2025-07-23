# Jules Agent - Rulesets Development Context

## Your Role in Rulesets

**You are implementing Rulesets v0** - a CommonMark-compliant rules compiler. Focus on the core functionality in `/packages/core/`.

## Implementation Scope

- **Parser:** Handle frontmatter and raw body only (no marker processing yet)
- **Compiler:** Pass-through implementation (no `{{...}}` notation processing)
- **Linter:** Basic frontmatter schema validation
- **Plugins:** Stub implementations for cursor and windsurf destinations

## Required Code Patterns

```typescript
// TLDR: Simple parser implementation that extracts frontmatter
// TODO: Add support for block parsing
export function parse(content: string): ParsedDoc {
  // Implementation...
}
```

## Monorepo Commands

- **Test:** `bun turbo test`
- **Lint:** `bun turbo lint`
- **Build:** `bun turbo build`
- **Type check:** `bun turbo typecheck`

## Critical Documentation

Always reference these when implementing:

- `docs/project/LANGUAGE.md` - Terminology specifications
- `docs/project/plans/PLAN-rulesets-v0.md` - Implementation requirements
- `AGENTS.md` - AI agent conventions

## Test Requirements

Every function must have corresponding tests. Follow existing patterns in `__tests__/` directories.

## Code Documentation

Document your code clearly:

- Current implementation scope
- Future enhancement plans
- Security considerations
- Performance-critical sections
