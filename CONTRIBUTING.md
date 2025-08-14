# Contributing to Rulesets

Welcome! We're excited you're interested in contributing to Rulesets. This guide will help you get set up and understand our development workflow.

## Development Setup

### Prerequisites

- **Bun** 1.2+ (recommended) or Node.js 18+
- **Git** for version control

### Getting Started

1. **Fork and Clone**:

   ```bash
   git clone https://github.com/your-username/rulesets.git
   cd rulesets
   ```

2. **Install Dependencies**:

   ```bash
   bun install  # Installs all dependencies (~300ms)
   ```

3. **Verify Setup**:

   ```bash
   bun run build     # Build all packages
   bun run test      # Run all tests
   bun run lint      # Check code quality
   ```

## Development Workflow

### Available Commands

```bash
# Development
bun run dev          # Start development mode (watch + rebuild)
bun run build        # Build all packages
bun run clean        # Clean all build artifacts

# Testing
bun run test         # Run all tests (hybrid: Bun test + Vitest)
bun run test:watch   # Run tests in watch mode
bun run test:coverage # Run tests with coverage

# Code Quality
bun run lint         # Lint with Biome + markdownlint
bun run lint:fix     # Auto-fix linting issues
bun run format       # Format code with Biome + Prettier
bun run typecheck    # TypeScript type checking

# Versioning
bun changeset add    # Add a changeset for version bump
bun run release      # Publish new versions
```

### Our Toolchain

| Tool                  | Purpose                                  | File Types                                      |
| --------------------- | ---------------------------------------- | ----------------------------------------------- |
| **Bun**               | Package manager, script runner, bundling | All                                             |
| **Biome 2.1.2**       | Linting & formatting                     | `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.jsonc` |
| **Prettier**          | Formatting only                          | `.md`, `.yml`, `.yaml`                          |
| **markdownlint-cli2** | Linting only                             | `.md`                                           |
| **TypeScript**        | Type checking & declaration generation   | `.d.ts` files                                   |

### Testing Strategy

We use a **hybrid testing approach**:

- **Bun test**: For simple unit tests (fast, ~7-81ms)
- **Vitest**: For complex tests requiring mocking (advanced features)

**Examples:**

- Simple function tests → Bun test
- E2E tests with filesystem mocking → Vitest

## Making Changes

### 1. Create a Feature Branch

```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Make Your Changes

- Follow existing code patterns and conventions
- Add tests for new functionality
- Update documentation if needed

### 3. Test Your Changes

```bash
bun run test        # Run all tests
bun run lint:fix    # Fix any linting issues
bun run typecheck   # Ensure TypeScript is happy
bun run build       # Verify everything builds
```

### 4. Add a Changeset

For changes that affect version numbers (new features, bug fixes, breaking changes):

```bash
bun changeset add
```

Follow the prompts to:

- Select affected packages
- Choose version bump type (patch/minor/major)
- Write a clear changelog entry

### 5. Commit Your Changes

We use [Conventional Commits](https://conventionalcommits.org/):

```bash
git commit -m "feat: add new destination plugin for VS Code"
git commit -m "fix: resolve compilation issue with imports"
git commit -m "docs: update README with new setup instructions"
```

### 6. Submit a Pull Request

1. Push your branch to your fork
2. Open a PR against the `main` branch
3. Fill out the PR template
4. Ensure CI passes

## Project Structure

```text
rulesets/
├── apps/
│   └── cli/              # CLI application
├── packages/
│   ├── core/            # Core orchestration (Vitest - complex e2e)
│   ├── compiler/        # Compilation logic (Bun test - simple)
│   ├── parser/          # Markdown parsing (Bun test - simple)
│   ├── linter/          # Rule validation (Bun test - simple)
│   ├── types/           # Shared TypeScript types
│   └── testing/         # Testing utilities
├── docs/                # Documentation
├── scripts/            # Build and utility scripts
└── test/               # Global test setup
```

### Package Development

Each package follows the same structure:

```text
packages/example/
├── src/
│   ├── __tests__/      # Tests (if any)
│   └── index.ts        # Main entry point
├── dist/               # Built output (.js + .d.ts)
├── package.json        # Package config
└── tsconfig.json       # TypeScript config
```

### Build System

All packages use a **two-step build process**:

1. **Bundle**: `bun build src/index.ts --outdir dist --target node --minify`
2. **Types**: `tsc --declaration --emitDeclarationOnly --outDir dist --skipLibCheck src/index.ts`

## Code Style

### Formatting

Code is automatically formatted with:

- **Biome** for JavaScript/TypeScript/JSON
- **Prettier** for Markdown/YAML

Run `bun run format` to format all files.

### Linting

We use Biome with the [ultracite](https://github.com/outfitter-dev/ultracite) preset for consistent, high-quality code.

### TypeScript

- **Strict mode** is enabled
- All exports must have proper type definitions
- Prefer explicit types over `any`

## Dependencies

### Adding Dependencies

- **Runtime dependencies**: Add to individual package `dependencies`
- **Build tools**: Add to root `devDependencies` (shared across workspace)
- **Package-specific types**: Add to package `devDependencies` (e.g., `@types/js-yaml`)

```bash
# Add runtime dependency to specific package
cd packages/parser
bun add js-yaml

# Add dev dependency to root (shared)
bun add -D @types/new-tool
```

### Dependency Guidelines

- Prefer lightweight, well-maintained packages
- Avoid duplicating functionality across packages
- Keep bundle sizes reasonable
- Document why new dependencies are needed

## Documentation

### Types of Documentation

- **README.md**: Project overview and quick start
- **docs/**: Detailed documentation and specifications
- **Code comments**: For complex logic and public APIs
- **Changesets**: For version history

### Writing Documentation

- Use clear, concise language
- Provide working code examples
- Update docs when changing behavior
- Follow existing documentation patterns

## Release Process

We use [Changesets](https://github.com/changesets/changesets) for versioning:

1. **Add changesets** during development (`bun changeset add`)
2. **Version packages** when ready to release (`bun changeset version`)
3. **Publish** new versions (`bun run release`)

Only maintainers can publish releases.

## Getting Help

- **Questions**: Open a GitHub discussion
- **Bugs**: Open a GitHub issue with reproduction steps
- **Feature requests**: Open a GitHub issue with use case details

## Code of Conduct

Be respectful, inclusive, and collaborative. We want everyone to feel welcome contributing to Rulesets.

---

Thank you for contributing to Rulesets! 🎉
