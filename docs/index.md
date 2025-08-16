# Rulesets v0.2 Documentation

> Handlebars-powered AI rules compilation – write once, build for many providers

## Quick Navigation

- **[Overview](./project/OVERVIEW.md)** – Complete feature guide and examples
- **[Architecture](./project/ARCHITECTURE.md)** – Technical design and implementation
- **[Language Spec](./project/LANGUAGE.md)** – Terminology and conventions

## Core Documentation

### Project Documentation

- **[Overview](./project/OVERVIEW.md)** – Comprehensive feature documentation with Handlebars examples
- **[Architecture](./project/ARCHITECTURE.md)** – v0.2 technical architecture and design decisions
- **[Language Specification](./project/LANGUAGE.md)** – Terminology, conventions, and language guidelines

### Provider Documentation

Documentation for supported AI tools and their rule systems:

#### IDE Integrations

- [Cursor Rules System](./plugins/cursor/rules-use.md) - Multi-file system with YAML front-matter and nested rules
- [Windsurf Rules System](./plugins/windsurf/rules-use.md) - Multiple files with activation modes
- [Roo Code Rules System](./plugins/roo-code/rules-use.md) - Mode-specific directories

#### CLI Tools

- [Claude Code Memory System](./plugins/claude-code/rules-use.md) - Hierarchical with @file imports
- [OpenAI Codex System](./plugins/openai-codex/rules-use.md) - Layered instructions with hierarchical loading

#### Other Implementations

- [Cline Rules System](./plugins/cline/rules-use.md) - Single file approach with plain text format
- [Aider Memory System](./plugins/aider/rules-use.md) - Manual memory inclusion with session persistence

## Getting Started

### Quick Start

```bash
# Install CLI
npm install -g @rulesets/cli

# Initialize project
rulesets init

# Build for all providers
rulesets

# Build for specific providers
rulesets --provider cursor,claude-code
```

### Example Source Rule

```handlebars
---
title: Coding Standards
providers:
  cursor:
    outputPath: '.cursor/rules/standards.mdc'
  claude-code:
    outputPath: 'CLAUDE.md'
---

{{#instructions}}
# {{title}}

## TypeScript Guidelines
- Always use strict mode
- {{> @typescript-config}}

{{#if-provider "cursor"}}
### Cursor-Specific
- Use Composer for complex changes
{{/if-provider}}
{{/instructions}}
```

---

_This documentation covers Rulesets v0.2 – the modern, Handlebars-powered AI rules compiler_
