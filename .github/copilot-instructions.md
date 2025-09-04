# GitHub Copilot Instructions for Mixdown

## Project Overview

Mixdown is a CommonMark-compliant rules compiler that lets you author a single source rules file in Markdown and compile it into destination-specific rules files for various AI tools and IDEs. Think of it as Terraform for AI rules: write once, compile for many destinations.

## Essential Navigation Strategy

**Use grep extensively for code discovery instead of browsing files.** This codebase uses a comprehensive `mixd-*` marker system for rapid navigation:

```bash
# Find version-specific code
grep -r "mixd-v0" . --include="*.ts"

# Find security-sensitive areas  
grep -r "mixd-sec" . --include="*.ts"

# Find performance bottlenecks
grep -r "mixd-perf" . --include="*.ts"

# Find temporary code needing cleanup
grep -r "mixd-temp" . --include="*.ts"
```

Consult `docs/project/GREPABLE.md` for the complete marker system and navigation guide.

## Code Standards

### Comment Format
- Start all files with: `// TLDR: File purpose description (mixd-v0)`
- Add function comments: `// TLDR: Function purpose (mixd-v0)`
- Use TODO format: `// TODO (mixd-v0.1): Future enhancement description`

### Markers to Use
- `mixd-v{version}` - Version-specific implementations
- `mixd-sec` - Security-sensitive code
- `mixd-perf` - Performance-critical paths
- `mixd-unsafe` - Potentially dangerous operations
- `mixd-api` - API changes or deprecations
- `mixd-config` - Environment-dependent behavior
- `mixd-external` - External service dependencies
- `mixd-debug` - Debugging/troubleshooting points
- `mixd-test` - Testing-related annotations
- `mixd-temp` - Temporary code needing cleanup

### TypeScript Conventions
- Use strict TypeScript settings
- Follow SOLID, DRY, and KISS principles
- Add descriptive inline comments for complex logic
- Use meaningful variable and function names

## Project Structure

- `/docs/project/` - Essential documentation
  - `GREPABLE.md` - Marker system and navigation guide
  - `LANGUAGE.md` - Terminology and language specifications
  - `plans/` - Implementation plans and reviews
- `/packages/core/` - Core Mixdown library (main implementation area)
- `.mixdown/` - Mixdown-specific configurations

## Key Terminology (from LANGUAGE.md)

- **Source rules** - Markdown files with Mixdown notation (`*.mix.md`)
- **Compiled rules** - Generated files for specific destinations
- **Destination** - Target tool (Cursor, Claude Code, etc.)
- **Stem** - Content blocks marked with `{{stem-name}}...{{/stem-name}}`
- **Marker** - Elements using `{{...}}` notation
- **Mixin** - Reusable components in `_mixins/`

## Current Implementation Status

We're implementing **Mixdown v0** with these limitations:
- Parser handles frontmatter and raw body only
- Compiler is pass-through (no marker processing)
- Linter validates basic frontmatter schema
- Architecture designed for easy v0.1+ enhancement

Reference `docs/project/plans/PLAN-mixdown-v0.md` for complete implementation details.

## Development Workflow

### Branch Strategy
- Work from feature branches off `main`
- Use conventional commit messages: `type(scope): description`
- Commit regularly with logical groupings

### Testing Requirements
```bash
pnpm turbo test    # Run all tests
pnpm turbo lint    # Lint all packages
pnpm turbo build   # Build all packages
```

### Before Submitting Code
1. Run all checks: `pnpm turbo lint && pnpm turbo test && pnpm turbo build`
2. Ensure proper `mixd-*` markers are included
3. Verify terminology follows `LANGUAGE.md` spec
4. Check that comments use TLDR format

## Quality Standards

- All functions must have TLDR comments with version markers
- Use grep to find related code before implementing new features
- Mark temporary solutions with `mixd-temp`
- Document security-sensitive areas with `mixd-sec`
- Follow the monorepo structure with proper package organization

## Resources

- `AGENTS.md` - Comprehensive AI agent guidance
- `CLAUDE.md` - Project-specific concepts and workflows  
- `docs/project/GREPABLE.md` - Master navigation guide
- `docs/project/LANGUAGE.md` - Terminology specification
- `docs/project/plans/PLAN-mixdown-v0.md` - Current implementation plan

Remember: Use grep first, browse files second. The marker system is designed to make code discovery fast and precise.