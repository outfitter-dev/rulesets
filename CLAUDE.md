# CLAUDE.md

## File Purpose

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Overview
Mixdown is a CommonMark-compliant rules compiler that lets you author a single Source Rules file in Markdown and compile it into destination-specific rules files (.cursor/rules.mdc, ./CLAUDE.md, .roo/rules.md, and more). Think of it as Terraform for AI rules: write once, compile for many destinations, your agents, no matter the tool, on the (literal) same page.

Critical Instructions
✅ Always follow the language spec (mixdown/spec/language.md)
✅ Always ensure the .gitignore file is updated to exclude potentially sensitive information
✅ Unless otherwise directed by the user, always work within the dev branch, or a feature branch off of dev
✅ Commit regularly, group commits logically, and use conventional commit messages. When committing, check to see if any files need to be staged.
✅ When writing code, follow the SOLID principles, DRY principles, KISS principle, and include descriptive inline comments for future developers
Key Concepts
Source Rules
Source files defining rules, written in 100% previewable Markdown.
Written in Mixdown Notation and use {{...}} notation markers to direct the compiler.
Compiled into destination-specific rules files:
./mixdown/src/my-rule.md → .cursor/rules/my-rule.mdc
Destination
A supported tool, such as cursor, windsurf, or claude-code.
Defines tool-specific criteria for compiling Source Rules to Compiled Rules files.
Provided through plugins.
Compiled Rules
Destination-specific (tool) rules files, rendered from the Source Rules.
Examples for a Source Rules file called project-conventions.md:
Cursor → .cursor/rules/project-conventions.mdc
Claude Code → ./CLAUDE.md#project-conventions
OpenAI Codex → ./conventions.md.
When placed in tool directories, referred to as "tool-ready rules".
Notation Marker
Syntax: {{...}}
Fundamental building block of Mixdown Notation
Used to direct the compiler for various purposes (stems, imports, variables)
All Mixdown directives use marker notation, but serve different functions
Similar to <xml-tags>, but fully Markdown-previewable.
Stem
Syntax: {{stem-name}}...{{/stem-name}}
A specific application of notation markers that creates delimited content blocks
Translates directly to XML tags in compiled output: <stem_name>...</stem_name>
Has opening and closing notation markers that surround content
Can contain properties that control rendering behavior
Example: {{instructions}}This is instruction content{{/instructions}}
Import
Syntax: {{> my-rule }}
Embed content from another Source Rules file, stem, mixin, or template.
Variable
Syntax: {{$key}} or $key if used within a {{...}} marker.
Dynamic values replaced inline at compile time.
Examples: {{$destination}}, {{$.frontmatter.key}}, {{$alias}}
Project Structure
project/
├── .mixdown/
│   ├── dist/
│   │   └── latest/         # compiled rules
│   ├── src/                # Source Rules files (*.md)
│   │   └── _mixins/        # reusable content modules
│   └── mixdown.config.json # Mixdown config file
content_copy
download
Use code with caution.
Text
| Goal | Description |
|------|-------------|
| ✨ **Simplicity** | Reduce bespoke format/structure for each tool to just one. |
| 🧹 **Lintability** | Files must pass standard markdown-lint without hacks. |
| 👀 **Previewability** | Render legibly in GitHub, VS Code, Obsidian, etc. |
| 🧩 **Extensibility** | Advanced behaviors declared via attributes instead of new notation. |

## Destination Providers

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
{{> @legal}}  <!-- Embeds `/_mixins/legal.md` -->
{{> conventions#stem-name}}  <!-- Embed a specific stem -->
{{> my-rules stems="important-considerations,!less-important-considerations"}}  <!-- Filter stems -->
```

### Variables

```markdown
Alias: {{$alias}}
Source Rules file version: {{$file.version}}
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
# .mixdown/src/my-rule.md
mixdown:
  version: 0.1.0 # version number for the Mixdown format used
description: "Rules for this project" # useful for tools that use descriptions
globs: ["**/*.{txt,md,mdc}"] # globs re-written based on destination-specific needs
# Destination filter examples:
destination:
  include: ["cursor", "windsurf"]
  exclude: ["claude-code"]
  path: "./custom/output/path"
# Destination-specific frontmatter:
cursor:
  alwaysApply: false
  destination:
    path: "./custom/.cursor/rules"
# Additional metadata:
name: my-rule # defaults to filename
version: 2.0 # version number for this file
---
```

## Naming Conventions

- Source Rules files: `kebab-case.md` (e.g., `coding-standards.md`)
- Directories: `kebab-case` (e.g., `_mixins`)
- Config files: `kebab-case.config.json` (e.g., `mixdown.config.json`)
- Stem names: `kebab-case` (e.g., `{{user-instructions}}`)
- XML output tags: `snake_case` (e.g., `<user_instructions>`)

## Contributing Guidelines

When contributing to this project:

1. Follow the naming conventions and terminology outlined in the language spec
2. Be consistent with the musical theme alignment in feature naming
3. Ensure all documentation uses clear, specific terminology over vague descriptions
4. Write mixes using Markdown ATX-style headers and proper code blocks with language identifiers