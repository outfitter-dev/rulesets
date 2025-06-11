# Jules Agent Instructions for Rulesets

## Core Requirements for Jules

**You are working on the Rulesets codebase.** Always use our grepable marker system and follow our established conventions.

## Essential Marker System

**Use Cairns markers (`:M:`) in all code comments:**
- `:M: tldr:` - Brief description of what the code does
- `:M: v0.1.0:` - Version-specific implementation details
- `:M: todo(v0.2.0):` - Future work planned for specific versions
- `:M: sec:` - Security-sensitive code
- `:M: perf:` - Performance-critical paths
- `:M: temp:` - Temporary code needing cleanup
- `:M: test:` - Testing-related annotations

**Comment Format:**
```typescript
// :M: tldr: Function purpose and implementation scope
// :M: v0.1.0: Basic implementation without advanced features
// :M: todo(v0.2.0): Add support for stem processing
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