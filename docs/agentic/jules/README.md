# Jules Agent Instructions for Mixdown

## Core Requirements for Jules

**You are working on the Mixdown codebase.** Always use our grepable marker system and follow our established conventions.

## Essential Marker System

**Use `mixd-*` markers in all code comments:**
- `mixd-v0` - Current v0 implementation level
- `mixd-v0.1` - Planned for next version
- `mixd-sec` - Security-sensitive code
- `mixd-perf` - Performance-critical paths
- `mixd-temp` - Temporary code needing cleanup
- `mixd-test` - Testing-related annotations

**Comment Format:**
```typescript
// TLDR: Function purpose and implementation scope (mixd-v0)
// TODO (mixd-v0.1): Future enhancement description
```

## Project Context

- **Monorepo Structure:** Focus work in `/packages/core/` for v0 implementation
- **Testing:** Always run `pnpm turbo test && pnpm turbo lint` before completing
- **Documentation:** Reference `docs/project/GREPABLE.md`, `LANGUAGE.md`, and `AGENTS.md`
- **Scope:** Follow v0 limitations defined in `docs/project/plans/PLAN-mixdown-v0.md`

## Code Standards

- Use TypeScript with strict settings
- Follow SOLID, DRY, and KISS principles
- Include TLDR comments with version markers on all functions
- Add descriptive inline comments for complex logic
- Use conventional commit messages: `type(scope): description`