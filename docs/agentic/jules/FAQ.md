# Jules Agent FAQ for Mixdown

## Implementation Questions

### Q: What is the current implementation scope?
**A:** You are implementing **Mixdown v0** with these limitations:
- Parser: Extract frontmatter and raw body only (no `{{...}}` processing)
- Compiler: Pass-through implementation (no marker processing)
- Linter: Basic frontmatter schema validation only
- Plugins: Stub implementations that log output

### Q: Which markers should I use in code comments?
**A:** Always use these patterns:
```typescript
// TLDR: Function description and scope (mixd-v0)
// TODO (mixd-v0.1): Future enhancement description
```

Available markers:
- `mixd-v0` - Current implementation level
- `mixd-v0.1` - Planned for next version
- `mixd-sec` - Security-sensitive code
- `mixd-perf` - Performance bottlenecks
- `mixd-temp` - Temporary code needing cleanup

### Q: What testing is required?
**A:** Every function must have:
- Unit tests in `__tests__/` directories
- Tests must follow existing patterns
- All tests must pass: `pnpm turbo test`
- Include edge cases and error scenarios

### Q: Where should I focus implementation work?
**A:** Primary focus areas:
- `/packages/core/src/parser/` - Frontmatter extraction
- `/packages/core/src/compiler/` - Pass-through compilation  
- `/packages/core/src/linter/` - Basic validation
- `/packages/core/src/destinations/` - Stub plugins

## Technical Questions

### Q: What TypeScript standards should I follow?
**A:** 
- Use strict TypeScript settings
- Follow SOLID, DRY, and KISS principles
- Add comprehensive type annotations
- Include JSDoc comments with version markers

### Q: What are the monorepo commands?
**A:** Essential commands you should use:
- Test: `pnpm turbo test`
- Lint: `pnpm turbo lint`  
- Build: `pnpm turbo build`
- Type check: `pnpm turbo typecheck`

### Q: Which documentation should I reference?
**A:** Critical references:
- `docs/project/GREPABLE.md` - Marker system guide
- `docs/project/LANGUAGE.md` - Terminology specifications
- `docs/project/plans/PLAN-mixdown-v0.md` - Implementation requirements
- `AGENTS.md` - AI agent conventions

### Q: How should I handle errors?
**A:** 
- Add try/catch blocks for file operations
- Create descriptive error messages with context
- Mark security-sensitive error handling with `(mixd-sec)`
- Test error scenarios in unit tests

## Project Terminology

### Q: What are "source rules"?
**A:** Markdown files with Mixdown notation (`.mix.md` extension) that get compiled into destination-specific rules files.

### Q: What are "compiled rules"?
**A:** The output files generated for specific destinations (e.g., `.cursor/rules.mdc`, `CLAUDE.md`).

### Q: What is a "destination"?
**A:** A target tool/IDE like Cursor, Claude Code, or Windsurf that has specific formatting requirements.

### Q: What are "stems"?
**A:** Content blocks marked with `{{stem-name}}...{{/stem-name}}` - NOT processed in v0.

## Implementation Patterns

### Q: How should I structure a new module?
**A:** Follow this pattern:
```typescript
// TLDR: Module purpose description (mixd-v0)
// TODO (mixd-v0.1): Future enhancement plans

export interface ModuleInterface {
  // Interface definition
}

// TLDR: Function purpose (mixd-v0)
export function mainFunction(): ReturnType {
  // Implementation
}
```

### Q: What commit message format should I use?
**A:** Use conventional commits:
- `feat(scope): add new feature`
- `fix(scope): resolve bug`
- `docs(scope): update documentation`
- `test(scope): add tests`

Always include descriptive commit messages that explain the "why" not just the "what".

## Quality Standards

### Q: What makes a good implementation?
**A:**
- Includes proper TLDR comments with version markers
- Has comprehensive unit tests
- Follows TypeScript strict mode
- Uses descriptive variable/function names
- Includes TODO markers for future enhancements
- Passes all linting and type checking

### Q: How do I ensure my code is discoverable?
**A:** Use the grepable marker system consistently:
- Current work gets `(mixd-v0)` markers
- Future plans get `TODO (mixd-v0.1):` comments
- Security code gets `(mixd-sec)` markers
- Performance code gets `(mixd-perf)` markers