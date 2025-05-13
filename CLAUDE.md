# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Mixdown is a **CommonMark-compliant prompt compiler** that lets you author a single *mix* file in Markdown and compile it into tool-specific instruction files (`.cursor/rules.mdc`, `./CLAUDE.md`, `.roo/rules.md`, and more). Think of it as **Terraform for AI prompts**: write once, target many, keeping agents across different tools on the same page.

## Key Concepts

- **Mix**: Source instruction files, written in 100% previewable Markdown
- **Target**: A supported tool, such as `cursor`, `windsurf`, or `claude-code`
- **Record**: Target-specific output files, rendered from the source mix
- **Section**: Delimited blocks of content with optional attributes (`{{instructions}}...{{/instructions}}`)
- **Remix**: Embed content from another mix, section, stem, or template (`{{> my-rule }}`)
- **Insertion**: Dynamic values replaced inline at build time (`{{$key}}`)
- **Stem**: Modular, reusable content components

## Development Commands

```bash
# Installation
npm install -g @mixdown/cli        # global CLI
npm install --save-dev @mixdown    # project-local
npx @mixdown/cli init              # initialize with CLI

# Core Commands
mixdown init      # scaffolds .mixdown/ directory structure
mixdown import    # imports existing rules files into the mixdown format
mixdown build     # writes records to .mixdown/records/
```

## Project Structure

```
project/
├── .mixdown/
│   ├── records/
│   │   └── builds/         # compiled outputs
│   ├── instructions/       # Mix files (*.md)
│   │   └── _stems/         # reusable content modules
│   └── mixdown.config.json # compiler config
```

## Naming Conventions

- Mix files: `kebab-case.md` (e.g., `coding-standards.md`)
- Directories: `kebab-case` (e.g., `_samples`)
- Config files: `kebab-case.config.json` (e.g., `mixdown.config.json`)
- Section names: `kebab-case` (e.g., `{{user-instructions}}`)
- XML output tags: `snake_case` (e.g., `<user_instructions>`)

## Mixdown Syntax Examples

### Sections
```markdown
{{instructions +cursor -claude-code}}
- IMPORTANT: You must follow these coding standards...
{{/instructions}}
```

### Remixes
```markdown
{{> @legal}}  <!-- Embeds `/_stems/legal.md` -->
{{> conventions#section-name}}  <!-- Embed a specific section -->
```

### Insertions
```markdown
Project: {{$project}}
Version: {{$.version}}
```

### Target-scoped Attributes
```markdown
{{instructions cursor?name="cursor_instructions"}}
...
{{/instructions}}
```

## Contributing Guidelines

When contributing to this project:
1. Follow the naming conventions and terminology outlined in the styleguide
2. Be consistent with the musical theme alignment in feature naming
3. Ensure all documentation uses clear, specific terminology over vague descriptions
4. Write mixes using Markdown ATX-style headers and proper code blocks with language identifiers