# 📏 Rulesets: Modern AI Rules Compilation

> **🚀 v0.2 Now Available!** Clean, simple, Handlebars-powered AI rules compilation. See [Quick Start](#quick-start) to get started.

Rulesets simplifies rules management for AI coding tools like Cursor, Claude Code, Windsurf, and more. Author rules once in Handlebars-enhanced Markdown and build them for multiple providers automatically. Think of it as **Terraform for AI rules**: write once, build for many tools, keep everyone on the same page.

## What is Rulesets?

If you're reading this, you're probably already familiar with at least one of the AI coding tools that Rulesets is [designed to work with](#supported-providers). Each tool has its own unique way of being provided context, guidance, and operational instructions for your projects e.g. Cursor's rules (`.cursor/rules`), OpenAI Codex instructions (`AGENTS.md`), Claude Code's instructions (`CLAUDE.md`), etc.

The problem is, they all have different formats, behavior, and capabilities, which can become a huge pain to manage. This can be frustrating, and might even lead you to just sticking to one tool. But that's no fun, and you'll be missing out on all the awesome capabilities and differences each tool has to offer! That's where Rulesets comes in…

### The Problem Rulesets Solves

- Agentic rules files are **fragmented** across IDEs and agentic tools, following different formats, and in disparate locations, leading to duplication and drift.
- Manual copy-paste workflows break **source-of-truth** guarantees and slow (or halt) experimentation with new agentic tools (that might even be better suited for the task).
- Lack of a **cohesive format for rules** hinders creation, testing, versioning, and overall management.

### Our Solution: What Rulesets Does

Rulesets is "Terraform for AI rules": declare your ideal rules once, compile for dozens of coding agents, and guarantee every teammate (human or bot) runs with the same authoritative rules—no copy‑paste, no drift, just high‑quality, version-controlled context.

With Rulesets, you can apply the "Don't Repeat Yourself" principle to your agentic coding tools. Instead of writing slightly different versions of the same instructions for each tool, you create a single source rules file (`.rule.md`). This source rules file is the "gold master" for your instructions, from which individual compiled rules are created for each destination and sent to the right places.

The app consists of:

1. A Node.js app with a compiler (featuring a plugin architecture for different tools), an API, CLI, and Model Context Protocol implementation for managing prompts and instructions.
2. A CommonMark-compliant markup specification for creating effective and reusable rules, processed by the compiler to generate destination-specific rules files.

Result: _author once, distribute everywhere, zero drift._

## What's with the name?

We chose "Rulesets" because it captures the essence of what this tool does: organizing and compiling rule collections for AI assistants. Rulesets takes your various rule definitions and compiles them into the perfect format for each destination tool like Cursor, Windsurf, Claude Code, and beyond.

## Core Concepts

**Source Rules**
: Markdown files (`.rule.md`) authored in `.ruleset/src/` using Handlebars templating. 100% previewable and version-controllable.

**Built Rules**
: Provider-specific output files generated from source rules (e.g., `.cursor/rules/foo.mdc`, `./CLAUDE.md`).

**Templates**
: Handlebars-powered templating with blocks (`{{#instructions}}...{{/instructions}}`), variables (`{{project.name}}`), and conditionals (`{{#if-provider "cursor"}}`).

**Partials**
: Reusable components stored in `.ruleset/src/_partials/` and included with `{{> @partial-name}}`.

**Providers** 
: Supported AI tools (Cursor, Claude Code, Windsurf, etc.) with automatic format conversion and optimization.

**Auto-Discovery**
: Automatic detection and processing of source rules without manual file specification.

## Supported Providers

| ID             | Tool                                                                                    | Type        | Status         |
| -------------- | --------------------------------------------------------------------------------------- | ----------- | -------------- |
| `cursor`       | [Cursor](https://www.cursor.com/)                                                       | IDE         | ✅ Supported   |
| `claude-code`  | [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) | CLI         | 🟡 In Progress |
| `roo-code`     | [Roo Code](https://roocode.dev/)                                                        | VS Code Ext | 🟡 In Progress |
| `cline`        | [Cline](https://cline.dev/)                                                             | VS Code Ext | 🟡 In Progress |
| `aider`        | [Aider](https://aider.chat/)                                                            | CLI         | 🔵 Planned     |
| `openai-codex` | [OpenAI Codex](https://github.com/openai/codex)                                         | CLI         | 🔵 Planned     |
| `windsurf`     | [Windsurf](https://windsurf.dev/)                                                       | IDE         | 🟡 In Progress |

_Want a new provider? Implement `RulesetProvider` and publish `@rulesets/plugin-<your-tool>`. See existing plugin examples and general development guidelines._

## Key Features

### Rulesets Syntax

- **100% Preview-able Markdown** – Renders cleanly in GitHub, VS Code, etc.; passes markdown-lint.
- **Granular Blocks** – Filter blocks within a single source rules file for per-provider inclusion/exclusion.
- **Build-time Variables** – Aliases and front matter data injection.

### Compiler & Integration

- **Plugin Architecture** – Add new providers via `RulesetProvider` without touching core.
- **CLI & API** – `rulesets build`, `rulesets validate`, and `POST /compile` endpoint.

## Installation

```bash
# Install CLI globally
npm install -g @rulesets/cli

# Or use directly with npx
npx @rulesets/cli --help
```

## Quick Start

### 1. Initialize a new project

```bash
rulesets init
```

### 2. Create source rules in `.ruleset/src/coding-standards.rule.md`

```handlebars
---
title: Coding Standards
providers:
  cursor:
    outputPath: '.cursor/rules/standards.mdc'
  claude-code:
    outputPath: 'CLAUDE.md'
  windsurf:
    outputPath: '.windsurf/rules/standards.md'
---

{{#instructions}}
# {{title}}

## TypeScript Standards
- Always use strict mode
- Prefer functional programming patterns
- {{> @typescript-config}}

{{#if-provider "cursor"}}
## Cursor-Specific Rules
- Use Composer for complex changes
- Leverage Cursor's autocomplete
{{/if-provider}}

{{#if-provider "claude-code"}}
## Claude Code Guidelines  
- Break down complex tasks
- Use clear, specific prompts
{{/if-provider}}
{{/instructions}}
```

### 3. Build for all providers

```bash
rulesets            # Auto-discover and build all
rulesets build       # Explicit build command
```

### 4. Build for specific providers

```bash
rulesets --provider cursor
rulesets --provider cursor,windsurf
```

### 5. Find your built rules at:

- `.cursor/rules/standards.mdc`
- `CLAUDE.md` 
- `.windsurf/rules/standards.md`

## Advanced Features

### Handlebars Templating

```handlebars
{{!-- Variables --}}
Project: {{project.name}}
Language: {{project.language}}

{{!-- Conditionals --}}
{{#if-provider "cursor"}}
Cursor-specific content here
{{/if-provider}}

{{!-- Switch statements --}}
{{#switch-provider}}
  {{#case "cursor,windsurf"}}
    IDE-specific configuration
  {{/case}}
  {{#case "claude-code"}}
    CLI-specific setup
  {{/case}}
  {{#default}}
    Generic configuration
  {{/default}}
{{/switch-provider}}

{{!-- Complex logic --}}
{{#if (and (eq provider.type "ide") (has-capability "workspaces"))}}
Advanced IDE features available
{{/if}}
```

### Reusable Partials

Store common content in `.ruleset/src/_partials/`:

```handlebars
{{!-- Include TypeScript rules --}}
{{> @typescript-rules}}

{{!-- Include with context --}}
{{> @provider-config provider=provider}}
```

## Directory Structure

```text
project/
├── .ruleset/
│   ├── src/                      # Source rules files
│   │   ├── coding-standards.rule.md
│   │   ├── project-setup.rule.md
│   │   └── _partials/            # Reusable components
│   │       ├── typescript-rules.md
│   │       └── security-checklist.md
│   └── dist/                     # Built rules output
│       ├── cursor/
│       ├── claude-code/
│       └── windsurf/
├── .cursor/rules/                # Generated Cursor rules
├── CLAUDE.md                     # Generated Claude Code rules
├── .windsurf/rules/              # Generated Windsurf rules
└── ruleset.config.json           # Configuration
```

## Developer Scripts

Common development scripts at the repo root:

- Install deps: `bun install`
- Build all: `bun run build` (or `bun run build:clean` first)
- Dev mode: `bun run dev` (Turbo)
- Test suite: `bun run test` | watch: `bun run test:watch` | coverage: `bun run test:coverage`
- Typecheck: `bun run typecheck` | watch: `bun run typecheck:watch` | turbo: `bun run typecheck:turbo`
- Lint: `bun run lint` | fix: `bun run lint:fix`
- Format prose: `bun run format` | check: `bun run format:check`
- Update lockfile: `bun run lockfile:update`
- Git hooks: `bun run pre:commit` | `bun run pre:push` (installed via `prepare`)

## API Usage

```typescript
import { runRulesets, ConsoleLogger } from '@rulesets/core';

async function buildMyRules() {
  const logger = new ConsoleLogger();

  try {
    // Build single file
    await runRulesets('./ruleset/src/my-rules.rule.md', logger);

    // Build with options
    await runRulesets('./ruleset/src/my-rules.rule.md', logger, {
      providers: ['cursor', 'claude-code'],  // Only build for these
      developmentMode: true,                 // Enhanced debugging
      cacheTemplates: false,                 // Disable caching
    });

    console.log('Rules built successfully!');
  } catch (error) {
    console.error('Build failed:', error);
  }
}
```

## CLI Commands

```bash
rulesets                           # Auto-discover and build all
rulesets build                     # Explicit build command  
rulesets --provider cursor         # Build for specific provider
rulesets --provider cursor,windsurf # Build for multiple providers
rulesets --dev                     # Development mode with debugging
rulesets --no-cache                # Disable template caching

rulesets init                      # Initialize new project
rulesets migrate                   # Import existing scattered rules
```

## Versioning and Changelog

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and changelog management.

### Adding a Changeset

When making changes that should be reflected in the version number and changelog, create a changeset:

```bash
bun changeset add
```

Follow the prompts to:

1. Select the appropriate version bump (patch, minor, major)
2. Write a description of the change for the changelog

### For Contributors

Please refer to our general contributing guidelines for information on how to contribute to the project, including our commit conventions and testing requirements.

## Development Setup

### Prerequisites

- **Bun** 1.2+ (recommended) or Node.js 18+
- **Git** for version control

### Quick Start

1. **Clone and Install**:

   ```bash
   git clone https://github.com/your-org/rulesets.git
   cd rulesets
   bun install  # Installs all dependencies in ~300ms
   ```

2. **Development Commands**:

   ```bash
   bun run dev        # Start development mode (watch + rebuild)
   bun run build      # Build all packages
   bun run test       # Run all tests (Bun test + Vitest hybrid)
   bun run lint       # Lint with Biome + markdownlint
   bun run typecheck  # TypeScript type checking
   ```

3. **Toolchain Overview**:
   - **Package Manager**: Bun (with workspace support)
   - **Code Linting/Formatting**: Biome 2.1.2 (JS/TS/JSON)
   - **Prose Formatting**: Prettier (Markdown/YAML only)
   - **Testing**: Bun test (simple) + Vitest (complex mocking)
   - **Build System**: Bun build + TypeScript declarations

### Contributing

1. **Fork → `bun install` → `bun run dev`**
2. **Follow conventional commits**; run `bun changeset add` for version bumps
3. **Add tests** for new features (see hybrid testing strategy)
4. **Lint before PR**: `bun run lint:fix` to auto-fix formatting
5. **Submit PR** — CI must pass all checks

For detailed contributing guidelines, see our development documentation.

## References

- `docs/project/OVERVIEW.md` – Full Rulesets syntax specification.
- `docs/architecture/DECISIONS.md` – Design rationale & deep-dive.
