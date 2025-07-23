# Jules Agent Instructions for Rulesets

## Core Requirements for Jules

**You are working on the Rulesets codebase.** Follow our established conventions and documentation standards.

## Documentation Standards

**Write clear and descriptive comments:**

```typescript
// TLDR: Function purpose and implementation scope
// TODO: Future enhancement description
```

## Project Context

- **Monorepo Structure:** Focus work in `/packages/core/` for v0 implementation
- **Testing:** Always run `bun turbo test && bun turbo lint` before completing
- **Documentation:** Reference `docs/project/LANGUAGE.md` and `AGENTS.md`
- **Scope:** Follow v0 limitations defined in `docs/project/plans/PLAN-rulesets-v0.md`

## Code Standards

- Use TypeScript with strict settings
- Follow SOLID, DRY, and KISS principles
- Include TLDR comments on all functions
- Add descriptive inline comments for complex logic
- Use conventional commit messages: `type(scope): description`
