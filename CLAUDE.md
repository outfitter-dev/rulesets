# CLAUDE.md

## File Purpose

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Mixdown is a **CommonMark-compliant rules compiler** that lets you author a single *mix* file in Markdown and compile it into tool-specific rules files (`.cursor/rules.mdc`, `./CLAUDE.md`, `.roo/rules.md`, and more). Think of it as **Terraform for AI rules**: write once, target many, your agents, no matter the tool, on the (literal) same page.

## Critical Instructions

1. ✅ Always follow the language spec (mixdown/spec/language.md)
2. ✅ Always ensure the `.gitignore` file is updated to exclude potentially sensitive information
3. ✅ Unless otherwise directed by the user, always work within the `dev` branch, or a feature branch off of `dev`
4. ✅ Commit regularly, group commits logically, and use conventional commit messages. When committing, check to see if any files need to be staged.
5. ✅ When writing code, follow the SOLID principles, DRY principles, KISS principle, and include descriptive inline comments for future developers

## Key Concepts

- **Mix**
  - Source rules files, written in 100% previewable Markdown.
  - Written in Mixdown Notation and use `{{...}}` notation markers to direct the compiler.
  - Compiled into tool-specific rules files:
    - `./mixdown/mixes/my-rule.md` → `.cursor/rules/my-rule.mdc`
- **Target**
  - A supported tool, such as `cursor`, `windsurf`, or `claude-code`.
  - Defines tool-specific criteria for compiling mixes to rules files.
  - Provided through plugins.
- **Output**
  - Target-specific (tool) rules files, rendered from the source mix.
  - Examples for a mix called `project-conventions.md`:
    - Cursor → `.cursor/rules/project-conventions.mdc`
    - Claude Code → `./CLAUDE.md#project-conventions`
    - OpenAI Codex → `./conventions.md`.
  - When placed in tool directories, referred to as "tool-ready rules".
- **Notation Marker**
  - Syntax: `{{...}}`
  - Fundamental building block of Mixdown Notation
  - Used to direct the compiler for various purposes (tracks, imports, variables)
  - All Mixdown directives use marker notation, but serve different functions
  - Similar to `<xml-tags>`, but fully Markdown-previewable.
- **Track**
  - Syntax: `{{track-name}}...{{/track-name}}`
  - A specific application of notation markers that creates delimited content blocks
  - Translates directly to XML tags in output: `<track_name>...</track_name>`
  - Has opening and closing notation markers that surround content
  - Can contain attributes that control rendering behavior
  - Example: `{{instructions}}This is instruction content{{/instructions}}`
- **Import**
  - Syntax: `{{> my-rule }}`
  - Embed content from another mix, track, snippet, or template.
- **Variable**
  - Syntax: `{{$key}}` or `$key` if used within a `{{...}}` marker.
  - Dynamic values replaced inline at build time.
  - Examples: `{{$target}}`, `{{$.frontmatter.key}}`, `{{$alias}}`

## Project Structure

```text
project/
├── .mixdown/
│   ├── output/
│   │   └── builds/         # compiled output
│   ├── mixes/              # Mix files (*.md)
│   │   └── _snippets/      # reusable content modules
│   └── mixdown.config.json # Mixdown config file
```

## Design Goals

| Goal | Description |
|------|-------------|
| ✨ **Simplicity** | Reduce bespoke format/structure for each tool to just one. |
| 🧹 **Lintability** | Files must pass standard markdown-lint without hacks. |
| 👀 **Previewability** | Render legibly in GitHub, VS Code, Obsidian, etc. |
| 🧩 **Extensibility** | Advanced behaviors declared via attributes instead of new notation. |

## Target Providers

| ID | Tool | Type |
|----|------|------|
| `cursor` | Cursor | IDE |
| `windsurf` | Windsurf | IDE |
| `claude-code` | Claude Code | CLI |
| `roo-code` | Roo Code | VS Code Extension |
| `cline` | Cline | VS Code Extension |
| `codex-cli` | OpenAI Codex CLI | CLI |
| `codex-agent` | OpenAI Codex Agent | Web agent |

## Mixdown Notation

### Example

```markdown
{{instructions +cursor -claude-code}}
- IMPORTANT: You must follow these coding standards...
{{/instructions}}
```

### Imports

```markdown
{{> @legal}}  <!-- Embeds `/_snippets/legal.md` -->
{{> conventions#track-name}}  <!-- Embed a specific track -->
{{> my-rules tracks="important-considerations,!less-important-considerations"}}  <!-- Filter tracks -->
```

### Variables

```markdown
Alias: {{$alias}}
Mix file version: {{$file.version}}
Current target: {{$target}}
Target ID: {{$target.id}}
```

### Target Scoped Attributes

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
{{{examples}}}  <!-- Triple braces preserve Mixdown notation -->
{{example}}
- Instructions
- Rules
{{/example}}
{{{/examples}}}
```

### Placeholders

```markdown
[requirements]  <!-- Instruction placeholder for AI to fill -->
{requirements}  <!-- Alternative placeholder notation -->
```

## Frontmatter Example

```yaml
---
# .mixdown/mixes/my-rule.md
mixdown:
  version: 0.1.0 # version number for the Mixdown format used
description: "Rules for this project" # useful for tools that use descriptions
globs: ["**/*.{txt,md,mdc}"] # globs re-written based on target-specific needs
# Target filter examples:
target:
  include: ["cursor", "windsurf"]
  exclude: ["claude-code"]
  path: "./custom/output/path"
# Target-specific frontmatter:
cursor:
  alwaysApply: false
  target:
    path: "./custom/.cursor/rules"
# Additional metadata:
name: my-rule # defaults to filename
version: 2.0 # version number for this file
---
```

## Naming Conventions

- Mix files: `kebab-case.md` (e.g., `coding-standards.md`)
- Directories: `kebab-case` (e.g., `_samples`)
- Config files: `kebab-case.config.json` (e.g., `mixdown.config.json`)
- Track names: `kebab-case` (e.g., `{{user-instructions}}`)
- XML output tags: `snake_case` (e.g., `<user_instructions>`)

## Contributing Guidelines

When contributing to this project:

1. Follow the naming conventions and terminology outlined in the language spec
2. Be consistent with the musical theme alignment in feature naming
3. Ensure all documentation uses clear, specific terminology over vague descriptions
4. Write mixes using Markdown ATX-style headers and proper code blocks with language identifiers