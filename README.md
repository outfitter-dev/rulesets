# 📏 Rulesets: A Compiler for AI Rules Files

> **🚀 v0 Release Now Available!** The initial implementation of Rulesets is ready for testing. See [Installation](#installation) to get started.

Rulesets simplifies rules management for tools like Cursor, Claude Code, Codex, etc. With Rulesets, you author rules (called "source rules") in previewable Markdown and compile them into compiled rules for each provider (`.cursor/rules.mdc`, `./CLAUDE.md`, `.roo/rules.md`, and more). Think of it as **Terraform for AI rules**: write once, compile for many providers, your agents, no matter the tool, on the (literal) same page.

## What is Rulesets?

If you're reading this, you're probably already familiar with at least one of the AI coding tools that Rulesets is [designed to work with](#supported-providers). Each tool has its own unique way of being provided context, guidance, and operational instructions for your projects e.g. Cursor's rules (`.cursor/rules`), OpenAI Codex instructions (`codex.md`), Claude Code's instructions (`CLAUDE.md`), etc.

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

**source rules**
: source rules files, written in 100% previewable Markdown with `.rule.md` extension. Written in Rulesets notation and use `{{...}}` notation markers to direct the compiler.

**compiled rules**
: Provider-specific compiled files (e.g., `.cursor/rules/foo.mdc`, `./CLAUDE.md#project-conventions`). When placed in their provider directories, these are referred to as "tool-ready rules".

**Block**
: Delimited, reusable blocks of content using notation like `{{instructions}}...{{/instructions}}` with optional properties. They are 1:1 translations of XML tags (e.g., `{{instructions}}` → `<instructions>`), but readable in Markdown previewers.

**Import**
: A reference to another source rules file, block, partial, or template (`{{> my-rule}}`). Embeds content from another source.

**Variable**
: Dynamic value replaced inline at compile time (e.g., `{{$key}}` for aliases, `{{$.frontmatter.key}}` for frontmatter data, `{{$provider}}` for the current provider name).

**Notation Marker**
: Element using `{{...}}` notation, used throughout Rulesets to direct the compiler. Similar to `<xml-tags>`, but fully Markdown-previewable.

**Partial**
: Modular, reusable content component stored in `/_partials`.

**Provider**
: A supported tool (Cursor, Roo Code, etc.) identified by a `kebab-case` ID (e.g., `cursor`, `roo-code`). Defines provider-specific criteria for compiling source rules into compiled rules and is provided through plugins.

**Provider Group**
: Named set of providers (`@cursor`, `@ide`, `@cli`) for property filtering (a planned feature for easier filtering).

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
- **Build-time Variables** – Aliases and frontmatter data injection.

### Compiler & Integration

- **Plugin Architecture** – Add new providers via `RulesetProvider` without touching core.
- **CLI & API** – `rulesets build`, `rulesets validate`, and `POST /compile` endpoint.

## CLI Installation

```bash
npm install -g @rulesets/cli        # global CLI
npx @rulesets/cli init              # quick project bootstrap
```

## Library Installation

```bash
# Using npm
npm install @rulesets/core

# Using bun (recommended)
bun add @rulesets/core

# Using yarn
yarn add @rulesets/core
```

## Quick Start

### 1. Create a source rules file (`my-rules.rule.md`)

```markdown
---
ruleset: { version: '0.1.0' }
title: My Coding Standards
description: Rules for AI coding assistants
providers:
  cursor:
    outputPath: '.cursor/rules/standards.mdc'
  windsurf:
    outputPath: '.windsurf/rules/standards.md'
---

# Coding Standards

Always use TypeScript with strict mode enabled.
Prefer functional programming patterns.
Write comprehensive tests for all features.
```

### 2. Use the API to process your rules

```typescript
import { runRulesetsV0, ConsoleLogger } from '@rulesets/core';

async function main() {
  const logger = new ConsoleLogger();

  try {
    await runRulesetsV0('./my-rules.rule.md', logger);
    console.log('Rules compiled successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
```

### 3. Find your compiled rules at:

- `.cursor/rules/standards.mdc` (for Cursor)
- `.windsurf/rules/standards.md` (for Windsurf)

## V0 Limitations

The current v0 release provides foundational functionality:

- ✅ Frontmatter parsing and validation
- ✅ Basic file compilation and writing
- ✅ Destination plugin architecture
- ❌ Rulesets syntax markers (`{{...}}`) are not processed (passed through as-is)
- ❌ No block/import/variable support yet

These advanced features are planned for v0.x releases leading to v1.0.

## Directory Structure

```text
project/
├── .ruleset/
│   ├── dist/              # Compiled rules output
│   │   ├── cursor/        # Cursor-specific rules
│   │   └── windsurf/      # Windsurf-specific rules
│   └── src/               # Source rules files (*.rule.md, *.md)
│       └── _partials/     # Reusable content modules (future)
├── my-rules.rule.md      # Your source rules file
└── package.json
```

## Notation Cheatsheet

| Token / Feature             | Example                                                    | Notes                                             |
| --------------------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| **Block**                   | `{{instructions name-("Rules") +cli}}...{{/instructions}}` | Properties control name & export.                 |
| **Front-matter**            | `---\nname: foo\n---`                                      | YAML at file top.                                 |
| **Import**                  | `{{> legal}}`                                              | Embed content from another source rules file.     |
| **Import Block**            | `{{> conventions#(block-name)}}`                           | Embed a specific block.                           |
| **Internal Link**           | `[Read more](rules.md)`                                    | Standard Markdown links.                          |
| **Project File Link**       | `@path/to/file.txt` or `@path/to/file.txt("Custom Title")` | Links to project files, optionally with an alias. |
| **Alias Variable**          | `{{$project}}`                                             | Resolved via `aliases` in config.                 |
| **Data Variable**           | `{{$.key}}`                                                | Injects YAML frontmatter data.                    |
| **Provider Variable**       | `{{$provider}}` / `{{$provider.id}}`                       | Injects current provider name/ID.                 |
| **Instruction Placeholder** | `[fill this in]`                                           | Marker for LLM to complete.                       |

The full Rulesets syntax specification can be found in `docs/project/OVERVIEW.md`.

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
