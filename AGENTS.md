# Project Agents.md Guide for AI Assistants

This Agents.md file provides comprehensive guidance for AI agents working with the Mixdown codebase.

## Project Structure for AI Agent Navigation

- `/docs`: Project documentation that AI agents should consult
  - `/project/GREPABLE.md`: Essential guide for using `mixd-*` markers and grep-based navigation
  - `/project/LANGUAGE.md`: Terminology and language spec for consistent communication
  - `/project/plans/`: Implementation plans that AI agents should follow
- `/packages`: Monorepo packages where AI agents will implement code
  - `/core`: Core Mixdown library that AI agents should enhance iteratively
- `.mixdown/`: Mixdown-specific configurations and compiled rules

## Coding Conventions for AI Agents

### General Conventions for Agents.md Implementation

- Use TypeScript for all new code generated by AI agents
- AI agents should follow the existing code style in each file
- Agents.md requires meaningful variable and function names in AI agent output
- AI agents should add comments with `mixd-*` markers for version tracking
- Use single TLDR comments: `// TLDR: Description of function purpose (mixd-v0)`

### Grepable Marker System for AI Agents

AI agents must extensively use the `mixd-*` marker system for efficient code navigation:

```bash
# Find version-specific code
grep -r "mixd-v0" . --include="*.ts"

# Locate security-sensitive areas
grep -r "mixd-sec" . --include="*.ts"

# Find performance bottlenecks
grep -r "mixd-perf" . --include="*.ts"

# Track temporary code
grep -r "mixd-temp" . --include="*.ts"
```

### Marker Usage Guidelines for AI Agents

- **Version markers**: Use `mixd-v{version}` for version-specific implementations
- **Security markers**: Use `mixd-sec` for security-sensitive code requiring extra review
- **Performance markers**: Use `mixd-perf` for performance-critical code paths
- **Temporary markers**: Use `mixd-temp` for temporary code that needs cleanup
- **API markers**: Use `mixd-api` for breaking changes or deprecated functionality

### Code Quality Standards for AI Agents

- AI agents should follow SOLID, DRY, and KISS principles as specified in Agents.md
- Keep functions small and focused in all AI agent implementations
- Agents.md requires proper TypeScript typing in all AI agent code
- AI agents must include descriptive inline comments for future developers

## Testing Requirements for AI Agents

AI agents should run tests with the following commands:

```bash
# Run all tests in the monorepo
pnpm turbo test

# Run tests for specific package
pnpm test --filter=@mixdown/core

# Run tests with coverage
pnpm test --coverage

# Lint all packages
pnpm turbo lint

# Type check all packages
pnpm turbo typecheck
```

## Development Workflow for AI Agents

### Branch Management for AI Agents

- AI agents should work from feature branches off `main`
- Use conventional commit messages for all AI agent commits
- Agents.md requires checking for unstaged changes before committing
- AI agents should commit regularly with logical groupings

### Pull Request Guidelines for AI Agents

When AI agents help create a PR, please ensure it:

1. Includes a clear description of changes as guided by Agents.md
2. References any related issues that AI agents are addressing
3. Ensures all tests pass for code generated by AI agents
4. Follows the PR template in `.claude/commands/create-pr.md`
5. Keeps PRs focused on a single concern as specified in Agents.md
6. Never automatically creates PRs without explicit user direction

## Grepable Navigation for AI Agents

AI agents should use grep extensively instead of traditional file browsing:

### Quick Discovery Commands

```bash
# Find all TODO items for next version
grep -r "TODO (mixd-v0.1)" . --include="*.ts"

# Locate external dependencies
grep -r "mixd-external" . --include="*.ts"

# Find debugging points
grep -r "mixd-debug" . --include="*.ts"

# Track configuration-dependent code
grep -r "mixd-config" . --include="*.ts"
```

### Code Quality Checks for AI Agents

```bash
# Find potentially unsafe operations
grep -r "mixd-unsafe" . --include="*.ts"

# Locate test-related annotations
grep -r "mixd-test" . --include="*.ts"

# Count version-specific implementations
grep -c "mixd-v0" **/*.ts | grep -v ":0"
```

## Programmatic Checks for AI Agents

Before submitting changes generated by AI agents, run:

```bash
# Lint check for AI agent code
pnpm turbo lint

# Type check for AI agent TypeScript
pnpm turbo typecheck

# Build check for AI agent implementations
pnpm turbo build

# Test all AI agent changes
pnpm turbo test
```

All checks must pass before AI agent generated code can be merged. Agents.md helps ensure AI agents follow these requirements.

## Essential Documentation for AI Agents

AI agents must consult these documents regularly:

- `@docs/project/GREPABLE.md`: Master guide for marker system and grep navigation
- `@docs/project/LANGUAGE.md`: Terminology spec for consistent communication
- `@docs/project/plans/PLAN-mixdown-v0.md`: Current implementation plan and scope
- `CLAUDE.md`: Project-specific guidance and concepts
- `@docs/agentic/`: Agentic development coordination and agent-specific guides
- `@docs/agentic/jules/`: Google Jules integration guides and prompts

This structured approach ensures AI agents can efficiently navigate, understand, and contribute to the Mixdown codebase while maintaining consistency and quality.