# CLAUDE.md

## File Purpose

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Rulesets is a CommonMark-compliant rules compiler that lets you author a single source rules file in Markdown and compile it into destination-specific rules files (`.cursor/rules.mdc`, `./CLAUDE.md`, `.roo/rules.md`, and more). Think of it as Terraform for AI rules: write once, compile for many destinations, your agents, no matter the tool, on the (literal) same page.

## Critical Instructions

✅ Always follow the language spec @docs/project/LANGUAGE.md
✅ Always ensure the `.gitignore` file is updated to exclude potentially sensitive information  
✅ Always work from a feature branch off of `main` or a `fix/` branch off of a target feature branch
✅ Commit regularly, group commits logically, and use conventional commit messages. When committing, always check to see if there are unstaged changes.
✅ When writing code, follow the SOLID principles, DRY principles, KISS principle, and include descriptive inline comments for future developers
❌ Never automatically create a PR for a feature branch without explicit user direction
✅ When creating PRs follow the instructions in `.claude/commands/create-pr.md`

## Key Concepts

### Source rules

- Source files defining rules, written in 100% previewable Markdown.
- Use `.ruleset.md` extension (preferred) or `.md` extension.
- Written in Ruleset syntax and use `{{...}}` notation markers to direct the compiler.
- Compiled into destination-specific rules files:
  - `./ruleset/src/my-rule.ruleset.md` → `.cursor/rules/my-rule.mdc`

### Destination

- A supported tool, such as cursor, windsurf, or claude-code.
- Defines tool-specific criteria for compiling source rules to compiled rules files.
- Provided through plugins.

### Compiled rules

- Destination-specific (tool) rules files, rendered from the source rules.
- Examples for a source rules file called `project-conventions.md`:
  - Cursor → `.cursor/rules/project-conventions.mdc`
  - Claude Code → `./CLAUDE.md#project-conventions`
  - OpenAI Codex → `./conventions.md`.
- When placed in tool directories, referred to as "tool-ready rules".

### Notation Marker

- Syntax: `{{...}}`
- Fundamental building block of Ruleset syntax
- Used to direct the compiler for various purposes (blocks, imports, variables)
- All Ruleset directives use marker notation, but serve different functions
- Similar to `<xml-tags>`, but fully Markdown-previewable.

### Block

- Syntax: `{{block-name}}...{{/block-name}}`
- A specific application of notation markers that creates delimited content blocks
- Translates directly to XML tags in compiled output: `<block_name>...</block_name>`
- Has opening and closing notation markers that surround content
- Can contain properties that control rendering behavior
- Example: `{{instructions}}This is instruction content{{/instructions}}`

### Import

- Syntax: `{{> my-rule }}`
- Embed content from another source rules file, block, partial, or template.

### Variable

- Syntax: `{{$key}}` or `$key` if used within a `{{...}}` marker.
- Dynamic values replaced inline at compile time.
- Examples: `{{$destination}}`, `{{$.frontmatter.key}}`, `{{$alias}}`

## Project Structure

```text
project/
├── .ruleset/
│   ├── dist/
│   │   └── latest/         # compiled rules
│   ├── src/                # source rules files (*.ruleset.md, *.md)
│   │   └── _partials/      # reusable content modules
│   └── ruleset.config.json # Ruleset config file
```

## Goals

| Goal                  | Description                                                         |
| --------------------- | ------------------------------------------------------------------- |
| ✨ **Simplicity**     | Reduce bespoke format/structure for each tool to just one.          |
| 🧹 **Lintability**    | Files must pass standard markdown-lint without hacks.               |
| 👀 **Previewability** | Render legibly in GitHub, VS Code, Obsidian, etc.                   |
| 🧩 **Extensibility**  | Advanced behaviors declared via attributes instead of new notation. |

## Destination Providers

| ID            | Tool               | Type              |
| ------------- | ------------------ | ----------------- |
| `cursor`      | Cursor             | IDE               |
| `windsurf`    | Windsurf           | IDE               |
| `claude-code` | Claude Code        | CLI               |
| `roo-code`    | Roo Code           | VS Code Extension |
| `cline`       | Cline              | VS Code Extension |
| `codex-cli`   | OpenAI Codex CLI   | CLI               |
| `codex-agent` | OpenAI Codex Agent | Web agent         |

## Ruleset Syntax

### Example

```markdown
{{instructions +cursor -claude-code}}

- IMPORTANT: You must follow these coding standards...
  {{/instructions}}
```

### Imports

```markdown
{{> @legal}} <!-- Embeds `/_partials/legal.md` -->
{{> conventions#block-name}} <!-- Embed a specific block -->
{{> my-rules blocks="important-considerations,!less-important-considerations"}} <!-- Filter blocks -->
```

### Variables

```markdown
Alias: {{$alias}}
Source rules file version: {{$file.version}}
Current destination: {{$destination}}
Destination ID: {{$destination.id}}
```

### Destination Scoped Properties

```markdown
{{instructions cursor?name="cursor_instructions"}}
...
{{/instructions}}
```

### Output Options

```markdown
{{instructions output="tag:omit"}}
Content without surrounding XML tags
{{/instructions}}

{{> @code-example output="code:javascript"}}
```

### Raw Notation

```markdown
{{{examples}}} <!-- Triple braces preserve Ruleset syntax -->
{{example}}

- Instructions
- Rules
  {{/example}}
  {{{/examples}}}
```

### Placeholders

```markdown
[requirements] <!-- Instruction placeholder for AI to fill -->
{requirements} <!-- Alternative placeholder notation -->
```

## Frontmatter Example

```yaml
---
# .ruleset/src/my-rule.md
ruleset:
  version: 0.1.0 # version number for the Ruleset format used
description: 'Rules for this project' # useful for tools that use descriptions
globs: ['**/*.{txt,md,mdc}'] # globs re-written based on destination-specific needs
# Destination filter examples:
destination:
  include: ['cursor', 'windsurf']
  exclude: ['claude-code']
  path: './custom/output/path'
# Destination-specific frontmatter:
cursor:
  alwaysApply: false
  destination:
    path: './custom/.cursor/rules'
# Additional metadata:
name: my-rule # defaults to filename
version: 2.0 # version number for this file
---
```

## Naming Conventions

- Source rules files: `kebab-case.ruleset.md` (preferred) (e.g., `coding-standards.ruleset.md`)
- Directories: `kebab-case` (e.g., `_partials`)
- Config files: `kebab-case.config.json` (e.g., `ruleset.config.json`)
- Block names: `kebab-case` (e.g., `{{user-instructions}}`)
- XML output tags: `snake_case` (e.g., `<user_instructions>`)

## Contributing Guidelines

When contributing to this project:

1. Follow the naming conventions and terminology outlined in the language spec
2. Ensure all documentation uses clear, specific terminology over vague descriptions
3. Write rulesets using Markdown ATX-style headers and proper code blocks with language identifiers

## Package Management

- As a monorepo, we use bun for everything

## Workflow Guidance

- Each time after writing a major feature, module, function, etc. you should commit.
