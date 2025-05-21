# 💽 Mixdown: A CommonMark-Compliant Prompt Compiler

Mixdown is a **CommonMark-compliant prompt compiler** that lets you author a single *mix* file in Markdown and compile it into tool-specific instruction files (`.cursor/rules.mdc`, `./CLAUDE.md`, `.roo/rules.md`, and more). Think of it as **Terraform for AI prompts**: write once, target many, your agents, no matter the tool, on the (literal) same page.

## What is Mixdown?

If you're reading this, you're probably already familiar with at least one of the AI coding tools that Mixdown is [designed to work with](#supported-target-tools). Each tool has its own unique way of being provided context, guidance, and operational instructions for your projects e.g. Cursor's rules (`.cursor/rules`), OpenAI Codex instructions (`codex.md`), Claude Code's instructions (`CLAUDE.md`), etc.

The problem is, they all have different formats, behavior, and capabilities, which can become a huge pain to manage. This can be frustrating, and might even lead you to just sticking to one tool. But that's no fun, and you'll be missing out on all the awesome capabilities and differences each tool has to offer! That's where Mixdown comes in…

### The Problem Mixdown Solves

- Agentic rules files are **fragmented** across IDEs and agentic tools, following different formats, and in disparate locations, leading to duplication and drift.
- Manual copy-paste workflows break **source-of-truth** guarantees and slow (or halt) experimentation with new agentic tools (that might even be better suited for the task).
- Lack of a **cohesive format for rules** hinders creation, testing, versioning, and overall management.

### Our Solution: What Mixdown Does

Mixdown is "Terraform for AI prompts": declare your ideal prompt rules once, target dozens of coding agents, and guarantee every teammate (human or bot) runs with the same authoritative instructions—no copy‑paste, no drift, just high‑quality, version-controlled context.

With Mixdown, you can apply the "Don't Repeat Yourself" principle to your agentic coding tools. Instead of writing slightly different versions of the same instructions for each tool, you create a single "mix" file (`.mix.md`). This mix is the "gold master" for your instructions, from which individual target-specific outputs are created in their respective format and sent to the right places.

The app consists of:

1. A Node.js app with a compiler (featuring a plugin architecture for different tools), an API, CLI, and Model Context Protocol implementation for managing prompts and instructions.
2. A CommonMark-compliant markup specification for creating effective and reusable prompts, processed by the compiler to generate tool-specific outputs.

Result: *author once, distribute everywhere, zero drift.*

## What's with the name?

We borrowed "Mixdown" from the music product world because it nails the vibe so well. Think of a mixdown as the moment a song stops being a pile of takes and starts being the version everyone hears. That's what this toolbox does for prompt engineering: it fuses disparate rules into one golden master, then automatically generates the perfect format for Cursor, Windsurf, Claude Code, and beyond.

## Core Concepts

**Mix**
: Source instruction files, written in 100% previewable Markdown. Written in Mixdown Notation and use `{{...}}` notation markers to direct the compiler. Mix files use the `.mix.md` extension to make them easily identifiable and distinguish them from regular Markdown files.

**Output**
: Target-specific output files (e.g., `.cursor/rules/foo.mdc`, `./CLAUDE.md#project-conventions`). When placed in their target tool directories, these are referred to as "tool-ready outputs".

**Track**
: Delimited, reusable blocks of content using notation like `{{instructions}}...{{/instructions}}` with optional attributes. They are 1:1 translations of XML tags (e.g., `{{instructions}}` → `<instructions>`), but readable in Markdown previewers.

**Import**
: A reference to another mix file, track, snippet, or template (`{{> my-rule}}`). Embeds content from another source.

**Variable**
: Dynamic value replaced inline at build time (e.g., `{{$key}}` for aliases, `{{$.frontmatter.key}}` for frontmatter data, `{{$target}}` for the current target name).

**Notation Marker**
: Element using `{{...}}` notation, used throughout Mixdown to direct the compiler. Similar to `<xml-tags>`, but fully Markdown-previewable.

**Snippet**
: Modular, reusable content component stored in `/_snippets`.

**Target**
: A supported tool (Cursor, Roo Code, etc.) identified by a `kebab-case` ID (e.g., `cursor`, `roo-code`). Defines tool-specific criteria for compiling mixes to rules files and is provided through plugins.

**Target Group**
: Named set of targets (`@cursor`, `@ide`, `@cli`) for attribute filtering (a planned feature for easier filtering).

## Supported Target Tools

| ID | Tool | Type | Status |
|----|------|------|--------|
| `cursor` | [Cursor](https://www.cursor.com/) | IDE | ✅ Supported |
| `claude-code` | [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) | CLI | 🟡 In Progress |
| `roo-code` | [Roo Code](https://roocode.dev/) | VS Code Ext | 🟡 In Progress |
| `cline` | [Cline](https://cline.dev/) | VS Code Ext | 🟡 In Progress |
| `aider` | [Aider](https://aider.chat/) | CLI | 🔵 Planned |
| `openai-codex` | [OpenAI Codex](https://github.com/openai/codex) | CLI | 🔵 Planned |
| `windsurf` | [Windsurf](https://windsurf.dev/) | IDE | 🔵 Planned |

*Want a new target? Implement `toolProvider` and publish `@mixdown/plugin-<your-tool>`. See `docs/developer/plugin-development.md`.*

## Key Features

### Mixdown Notation

- **100% Preview-able Markdown** – Renders cleanly in GitHub, VS Code, etc.; passes markdown-lint.
- **Granular Sections** – Filter sections within a single mix for per-target inclusion/exclusion.
- **Build-time Variables** – Aliases and frontmatter data injection.

### Compiler & Integration

- **Plugin Architecture** – Add new targets via `MixdownPluginProvider` without touching core.
- **CLI & API** – `mixdown build`, `mixdown validate`, and `POST /compile` endpoint.

## Installation

```bash
npm install -g @mixdown/cli        # global CLI
# project-local
npm install --save-dev @mixdown
# or with the CLI
npx @mixdown/cli init
```

## Quick Start

```bash
mixdown init      # scaffolds .mixdown/ directory structure

mixdown import    # imports existing rules files into the mixdown format

mixdown build     # writes outputs to .mixdown/outputs/
```

## Directory Structure

```
project/
├── .mixdown/
│   ├── outputs/
│   │   └── builds/         # compiled outputs
│   ├── mixes/       # Mix files (*.mix.md)
│   │   └── _snippets/         # reusable content modules
│   └── mixdown.config.json # compiler config
```

## Notation Cheatsheet

| Token / Feature | Example | Notes |
|-----------------|---------|-------|
| **Track** | `{{instructions name="Rules" +cli}}...{{/instructions}}` | Attributes control name & export. |
| **Front-matter** | `---\nname: foo\n---` | YAML at file top. |
| **Import** | `{{> legal}}` | Embed content from another mix. |
| **Import Track** | `{{> conventions#track-name}}` | Embed a specific track. |
| **Internal Link** | `[Read more](rules.md)` | Standard Markdown links. |
| **Absolute Link** | `{{link [\"Link Title\"] /path/to/file.ts}}` | Links to project files. |
| **Alias Variable** | `{{$project}}` | Resolved via `aliases` in config. |
| **Data Variable** | `{{$.frontmatter.key}}` | Injects YAML frontmatter data. |
| **Target Variable** | `{{$target}}` / `{{$target.id}}` | Injects current target name/ID. |
| **Instruction Placeholder** | `[fill this in]` | Marker for LLM to complete. |

Full spec lives in `docs/spec/mixdown-notation.md`.

## Versioning and Changelog

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and changelog management.

### Adding a Changeset

When making changes that should be reflected in the version number and changelog, create a changeset:

```bash
pnpm changeset add
```

Follow the prompts to:

1. Select the appropriate version bump (patch, minor, major)
2. Write a description of the change for the changelog

### For Contributors

For more detailed information on using Changesets in this project, see [docs/contributing/CHANGESETS.md](/docs/contributing/CHANGESETS.md).

## Contributing & Community

1. **Fork → `pnpm i` → `pnpm dev`**.
2. Follow conventional commits; run `pnpm changeset add` for version bumps.
3. Add unit & contract tests for new features.
4. Submit PR—CI must pass snapshot tests.

See [`docs/contributing/DEVELOPMENT.md`](docs/contributing/DEVELOPMENT.md) for full guidelines.

## References

- `docs/spec/mixdown-notation.md` – Full notation specification.
- `docs/developer/plugin-development.md` – Build a new plugin provider.
- `docs/architecture/design-decisions.md` – Design rationale & deep-dive.