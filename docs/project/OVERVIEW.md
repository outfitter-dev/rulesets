# 📏 Rulesets v0.2 – Handlebars-Powered Overview

> _Write once, build for many providers, zero drift._

## Table of Contents

- [Purpose & Vision](#purpose--vision)
- [Core Concepts](#core-concepts)
- [Key Features](#key-features)
- [Getting Started](#getting-started)
- [Handlebars Templating](#handlebars-templating)
- [Partials System](#partials-system)
- [Project Structure](#project-structure)
- [CLI Reference](#cli-reference)
- [API Reference](#api-reference)
- [Providers](#providers)

## Purpose & Vision

### Overview

Rulesets is a **Handlebars-powered rules compiler** that lets you author AI assistant rules once in `.ruleset/src/` and build them for multiple providers automatically. Think of it as **Terraform for AI rules**: write once, build for many tools, keep everyone on the same page.

### The Problem

- AI rules are **fragmented** across different tools with incompatible formats
- Manual copy-paste workflows create **drift** and maintenance overhead
- Switching tools means **rewriting** all your carefully crafted rules
- No **single source of truth** for your team's AI guidelines

### Our Solution

Rulesets provides:

1. **Single Source**: Author rules once in Handlebars-enhanced Markdown
2. **Auto-Discovery**: Automatic detection and processing of source files
3. **Provider-Aware**: Tool-specific optimization and format conversion
4. **Zero Drift**: Generated files stay in sync with your source rules

## Core Concepts

**Source Rules**
: Handlebars-enhanced Markdown files in `.ruleset/src/` using modern templating features

**Built Rules**
: Provider-specific output files automatically generated (`.cursor/rules/*.mdc`, `CLAUDE.md`, etc.)

**Auto-Discovery**
: Automatic detection of `.rule.md` files without manual configuration

**Handlebars Templates**
: Modern templating with variables, conditionals, partials, and provider-specific logic

**Providers**
: Supported AI tools with automatic format conversion and optimization

## Key Features

### Modern Templating

- **Handlebars.js Integration**: Battle-tested templating engine with full ecosystem support
- **IDE Support**: Full IntelliSense and syntax highlighting in VS Code and other editors
- **Variables & Logic**: Rich templating with conditionals, loops, and custom helpers
- **Type Safety**: Template validation and error reporting

### Auto-Discovery

- **Zero Configuration**: Works out of the box with `.ruleset/src/` files
- **Recursive Search**: Finds all `.rule.md` files in subdirectories
- **Provider Filtering**: Build for specific providers with `--provider` flag

### Provider System

- **Plugin Architecture**: Easy addition of new AI tools
- **Format Optimization**: Provider-specific post-processing and formatting
- **Smart Defaults**: Sensible output paths for each tool

## Getting Started

### Installation

```bash
npm install -g @rulesets/cli
```

### Quick Start

```bash
# Initialize new project
rulesets init

# Build all rules for all providers
rulesets

# Build for specific providers
rulesets --provider cursor,claude-code
```

### Basic Example

Create `.ruleset/src/coding-standards.rule.md`:

```handlebars
--- title: Coding Standards providers: cursor: outputPath: '.cursor/rules/standards.mdc'
claude-code: outputPath: 'CLAUDE.md' ---

{{#instructions}}
  #
  {{title}}

  ## TypeScript Guidelines - Always use strict mode - Prefer functional programming patterns

  {{#if-provider 'cursor'}}
    ## Cursor-Specific - Use Composer for complex changes
  {{/if-provider}}

  {{#if-provider 'claude-code'}}
    ## Claude Code Guidelines - Break down complex tasks
  {{/if-provider}}
{{/instructions}}
```

## Handlebars Templating

### Variables

```handlebars
{{! Project data }}
Project:
{{project.name}}
Language:
{{project.language}}

{{! Provider information }}
Building for:
{{provider.name}}
Provider type:
{{provider.type}}

{{! Front matter data }}
Title:
{{title}}
Version:
{{version}}
```

### Conditionals

```handlebars
{{! Provider-specific content }}
{{#if-provider 'cursor'}}
  This content appears only in Cursor rules
{{/if-provider}}

{{#unless-provider 'claude-code'}}
  This appears in all providers except Claude Code
{{/unless-provider}}

{{! Complex conditions }}
{{#if (eq provider.type 'ide')}}
  IDE-specific configuration here
{{/if}}

{{#if (and (eq provider.type 'ide') (has-capability 'workspaces'))}}
  Advanced workspace features available
{{/if}}
```

### Switch Logic

```handlebars
{{#switch-provider}}
  {{#case 'cursor,windsurf'}}
    IDE-specific configuration
  {{/case}}
  {{#case 'claude-code'}}
    CLI-specific setup
  {{/case}}
  {{#default}}
    Generic configuration
  {{/default}}
{{/switch-provider}}
```

### Auto-Generated Section Helpers

Rulesets automatically creates section helpers for semantic naming:

```handlebars
{{#instructions}}
  Main instructions content
{{/instructions}}

{{#examples}}
  Code examples
{{/examples}}

{{#troubleshooting}}
  Common issues and solutions
{{/troubleshooting}}
```

These compile to XML tags: `<instructions>`, `<examples>`, `<troubleshooting>`

## Partials System

### Using Partials

Store reusable content in `.ruleset/src/_partials/`:

```handlebars
{{!-- Include TypeScript standards --}}
{{> @typescript-rules}}

{{!-- Include security checklist --}}
{{> @security-checklist}}

{{!-- Include with context --}}
{{> @provider-config provider=provider}}
```

### Creating Partials

Create `.ruleset/src/_partials/typescript-rules.md`:

```handlebars
--- description: TypeScript coding standards --- ## TypeScript Standards - Use strict mode:
`"strict": true` - Prefer `interface` over `type` for object shapes - Use `readonly` arrays:
`readonly string[]` - Enable all strict flags in tsconfig.json

{{#if (eq provider.type 'ide')}}
  ### IDE Configuration - Install TypeScript extension - Enable format on save
{{/if}}
```

## Project Structure

```text
project/
├── .ruleset/
│   ├── src/                      # Source rules
│   │   ├── coding-standards.rule.md
│   │   ├── project-setup.rule.md
│   │   └── _partials/            # Reusable components
│   │       ├── typescript-rules.md
│   │       ├── testing-guidelines.md
│   │       └── security-checklist.md
│   └── dist/                     # Build output
│       ├── cursor/
│       ├── claude-code/
│       └── windsurf/
├── .cursor/rules/                # Generated Cursor rules
├── CLAUDE.md                     # Generated Claude Code rules
├── .windsurf/rules/              # Generated Windsurf rules
└── ruleset.config.json           # Configuration
```

## CLI Reference

### Commands

```bash
rulesets                    # Auto-discover and build all
rulesets build              # Explicit build command
rulesets init               # Initialize new project
rulesets migrate            # Import existing scattered rules
```

### Options

```bash
--provider <providers>      # Comma-separated provider list
--dev                      # Development mode with debugging
--no-cache                 # Disable template caching
```

### Examples

```bash
# Build for all providers
rulesets

# Build for specific providers
rulesets --provider cursor
rulesets --provider cursor,windsurf,claude-code

# Development build with enhanced logging
rulesets --dev

# Build without caching (useful for debugging)
rulesets --no-cache
```

## API Reference

### Basic Usage

```typescript
import { runRulesets, ConsoleLogger } from '@rulesets/core';

const logger = new ConsoleLogger();

// Build single file
await runRulesets('./ruleset/src/my-rules.rule.md', logger);

// Build with options
await runRulesets('./ruleset/src/my-rules.rule.md', logger, {
  providers: ['cursor', 'claude-code'],
  developmentMode: true,
  cacheTemplates: false,
});
```

### Options Interface

```typescript
interface RulesetsOptions {
  providers?: string[]; // Limit to specific providers
  developmentMode?: boolean; // Enhanced debugging
  cacheTemplates?: boolean; // Template caching (default: true)
  partialOptions?: PartialResolverOptions;
  configOverride?: Partial<RulesetConfig>;
}
```

## Providers

| ID            | Tool        | Type        | Status       |
| ------------- | ----------- | ----------- | ------------ |
| `cursor`      | Cursor      | IDE         | ✅ Supported |
| `claude-code` | Claude Code | CLI         | ✅ Supported |
| `windsurf`    | Windsurf    | IDE         | ✅ Supported |
| `roo-code`    | Roo Code    | VS Code Ext | 🟡 Planned   |
| `cline`       | Cline       | VS Code Ext | 🟡 Planned   |
| `aider`       | Aider       | CLI         | 🟡 Planned   |

### Provider Configuration

```yaml
---
providers:
  cursor:
    outputPath: '.cursor/rules/standards.mdc'
    enabled: true
  claude-code:
    outputPath: 'CLAUDE.md'
    enabled: true
  windsurf:
    outputPath: '.windsurf/rules/standards.md'
    enabled: false # Disable this provider
---
```

### Adding New Providers

Implement the `RulesetProvider` interface:

```typescript
interface RulesetProvider {
  id: string;
  name: string;
  type: 'ide' | 'cli' | 'extension';
  capabilities: string[];
  config?: {
    outputPath?: string;
    postProcessor?: string;
  };
}
```

---

_Rulesets v0.2 – Handlebars-powered AI rules compilation_  
_Clean, simple, powerful_
