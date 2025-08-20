# Rulesets v0.2 Architecture

> Handlebars-powered AI rules compilation

## Overview

Rulesets v0.2 is a Handlebars-powered compiler that transforms source rules files into provider-specific rules files for various AI tools & coding agents. It follows the "write once, compile for many providers" philosophy, similar to how Terraform manages infrastructure across multiple cloud providers.

The v0.2 architecture is built around auto-discovery, Handlebars templating, and clean provider-specific compilation without legacy compatibility layers.

```text
+-----------------+      +-------------------+      +----------------------+
| Source rules    | ---> | Handlebars        | ---> | Provider-specific    |
| (.rule.md)      |      | Compiler          |      | rules files          |
+-----------------+      +-------------------+      +----------------------+
                              ^
                              |
                       +-----------------+
                       | Provider System |
                       | (Plugins)       |
                       +-----------------+
```

## Project Structure

The Rulesets project is organized as a monorepo using bun workspaces:

```text
rulesets/
├── packages/
│   ├── core/                 # Core orchestration engine
│   ├── compiler/             # Handlebars compiler
│   ├── cli/                  # Command-line interface
│   ├── mcp/                  # MCP server implementation
│   ├── plugins/              # Provider plugin directory
│   │   ├── cursor/           # Cursor provider implementation
│   │   ├── claude-code/      # Claude Code provider implementation
│   │   ├── windsurf/         # Windsurf provider implementation
│   │   └── ...               # Other provider implementations
│   ├── parser/               # Source file parsing
│   ├── linter/               # Rule validation
│   ├── types/                # Shared TypeScript types
│   └── utils/                # Shared utilities
├── apps/
│   ├── cli/                  # CLI application
│   └── sandbox/              # Development sandbox
├── examples/                 # Example source rules files and configurations
├── docs/                     # Documentation
├── tests/                    # Integration tests
└── templates/                # Default source rules file templates
```

## Core Components

### Orchestration

- **packages/core/src/orchestration.ts** - Main entry point for compilation
- Single `runRulesets()` function with clean, modern API
- Auto-discovery of `.rule.md` files in `.ruleset/src/`
- Provider filtering and parallel compilation
- No legacy v0.1 compatibility layers

### Handlebars Compiler

- **packages/compiler/** - Modern Handlebars-powered templating engine
- `HandlebarsRulesetCompiler` class with provider-aware compilation
- Built-in helpers: `if-provider`, `unless-provider`, `switch-provider`
- Template caching for performance
- Partial resolution with `@` syntax for `_partials/` directory

### Parser

- **packages/parser/** - Front matter and Markdown parsing
- CommonMark-compliant Markdown processing
- YAML/JSON front matter extraction
- Error collection and reporting
- Source position tracking for debugging

### Linter

- **packages/linter/** - Source file validation
- Front matter schema validation
- Provider configuration checks
- Rule naming and structure validation
- Comprehensive error reporting with line numbers

### Provider System

- **packages/plugins/** - Provider-specific implementations
- `RulesetProvider` interface for consistent plugin architecture
- Auto-registration and discovery
- Provider-specific post-processing and optimization
- Output path management and file writing

### Configuration

- **packages/core/src/config.ts** - Project configuration management
- `ruleset.config.json` loading and validation
- Provider-specific configuration merging
- Default values and fallback handling
- Environment-based overrides

### CLI

- **apps/cli/src/index.ts** - Command-line interface
- Auto-discovery mode as default behavior
- Provider filtering with `--provider` flag
- Development mode with enhanced debugging
- Simple, clean command structure

### MCP Server

- **packages/mcp/** - Model Context Protocol integration
- API endpoints for remote compilation
- Caching and persistence for server deployment
- RESTful interface for external integrations

## Source Rules File Processing

```text
                +--------------------+
                | Source rules file  |
                | (.rule.md)         |
                +--------+-----------+
                         |
                         v
                +-------------+
                |    Parse    |
                | (Markdown + |
                | Front matter)|
                +------+------+
                         |
                         v
                +-------------+
                | Handlebars  |
                | Compilation |
                +------+------+
                         |
                         v
+------------+  +-------------+  +------------+
| Partials   |->| Template    |<-| Variables  |
| (@syntax)  |  | Resolution  |  | & Helpers  |
+------------+  +------+------+  +------------+
                         |
                         v
                +-------------+
                | Provider    |
                | Processing  |
                +------+------+
                         |
                         v
                +--------------------+
                | Provider-specific  |
                | rules files        |
                +--------------------+
```

### Handlebars Template Structure

The v0.2 architecture uses standard Handlebars templates with:

- **Front matter parsing**: YAML/JSON extraction for metadata
- **Template compilation**: Standard Handlebars.js engine
- **Custom helpers**: Provider-specific template helpers (`if-provider`, etc.)
- **Partial resolution**: `@` syntax for `_partials/` directory references
- **Error tracking**: Source position preservation for debugging

### Partial System

- **Partial discovery**: Auto-discovery in `.ruleset/src/_partials/`
- **Resolver caching**: Performance optimization for repeated includes
- **Context passing**: Template variables passed to partials
- **Nested partials**: Support for partials including other partials
- **@-syntax**: Clean `{{> @partial-name}}` syntax for includes

### Provider Processing

- **Auto-discovery**: Detection of available providers
- **Filter processing**: `--provider` CLI flag handling
- **Parallel compilation**: Multiple providers built simultaneously
- **Output path resolution**: Front matter, config, and default path handling
- **Post-processing**: Provider-specific formatting and optimization

### Template Helpers

Built-in Handlebars helpers for provider-aware compilation:

```handlebars
{{#if-provider 'cursor'}}Cursor-specific content{{/if-provider}}
{{#unless-provider 'claude-code'}}Non-Claude content{{/unless-provider}}
{{#switch-provider}}
  {{#case 'cursor,windsurf'}}IDE content{{/case}}
  {{#default}}Other content{{/default}}
{{/switch-provider}}
```

### Configuration Resolution

- **Hierarchy**: Front matter > config file > defaults
- **Provider-specific**: Individual provider configuration blocks
- **Output paths**: Flexible path resolution with fallbacks
- **Environment overrides**: Runtime configuration modifications

## Build Process and Workflow

### Auto-Discovery

- **File scanning**: Automatic detection of `.rule.md` files in `.ruleset/src/`
- **Recursive search**: Traverses subdirectories for source files
- **Provider filtering**: CLI `--provider` flag for selective builds
- **Default behavior**: No manual file specification required

### Single-Pass Compilation

- **Simplified flow**: No incremental builds or complex dependency tracking
- **Clean execution**: Linear processing from source to output
- **Error collection**: Comprehensive error reporting across all stages
- **Performance focus**: Fast compilation with Handlebars caching

### Provider Orchestration

- **Parallel processing**: Multiple providers built simultaneously
- **Output coordination**: Consistent file paths and structure
- **Error isolation**: Provider failures don't affect others
- **Resource sharing**: Shared template compilation and caching

### Development Mode

- **Enhanced logging**: Detailed debugging information
- **Performance metrics**: Compilation timing and cache statistics
- **Template debugging**: Handlebars template resolution details
- **Error context**: Enhanced error messages with line numbers

### Gitignore Management

- **Automatic updates**: Generated files added to `.gitignore`
- **Pattern management**: Intelligent pattern detection and sorting
- **Configuration**: User control over gitignore behavior
- **Safety**: Never removes manually added entries

## Error Handling

### Comprehensive Error Collection

- **Multi-stage collection**: Errors from parsing, compilation, and writing phases
- **Source tracking**: Line numbers and file paths for debugging
- **Graceful degradation**: Continue processing other files when one fails
- **Detailed reporting**: Context-aware error messages with suggestions

### Error Categories

- **Parse errors**: Front matter and Markdown syntax issues
- **Template errors**: Handlebars compilation and helper failures
- **Provider errors**: Plugin-specific output and validation failures
- **Configuration errors**: Invalid settings and missing dependencies

### Development Debugging

- **Enhanced context**: Full stack traces in development mode
- **Template debugging**: Handlebars template resolution and variable context
- **Performance warnings**: Slow compilation detection and reporting
- **Suggestion engine**: Automated fixes for common issues

## Handlebars Integration

### Template Processing

- **Standard engine**: Uses official Handlebars.js with full feature support
- **Custom helpers**: Provider-aware helpers for conditional content
- **Partial resolution**: `@` syntax for clean partial inclusion
- **Caching layer**: Compiled template caching for performance

### Context Variables

Available in all templates:

```handlebars
{{provider.id}}
<!-- Current provider ID -->
{{provider.name}}
<!-- Human-readable provider name -->
{{provider.type}}
<!-- Provider type (ide, cli, extension) -->
{{project.name}}
<!-- Project name from config -->
{{compilation.timestamp}}
<!-- Build timestamp -->
```

### Section Helpers

Auto-generated section helpers for semantic markup:

```handlebars
{{#instructions}}...{{/instructions}}
<!-- <instructions>...</instructions> -->
{{#examples}}...{{/examples}}
<!-- <examples>...</examples> -->
{{#troubleshooting}}...{{/troubleshooting}}
<!-- <troubleshooting>...</troubleshooting> -->
```

## Standard Project Structure

A typical project using Rulesets would have this structure:

```text
project/
├── .ruleset/
│   ├── dist/
│   │   └── latest/         # Compiled rules output
│   ├── src/                # Source rules files (*.rule.md)
│   │   ├── coding-standards.rule.md
│   │   ├── project-setup.rule.md
│   │   └── _partials/      # Reusable components
│   │       ├── typescript-rules.md
│   │       └── security-checklist.md
│   └── ruleset.config.json # Configuration
├── .cursor/rules/          # Generated Cursor rules
├── CLAUDE.md               # Generated Claude Code rules
├── .windsurf/rules/        # Generated Windsurf rules
└── .gitignore              # Auto-updated with generated paths
```

## Configuration Format

Example `ruleset.config.json` for v0.2:

```json
{
  "version": "0.2.0",
  "sourceDirectory": ".ruleset/src",
  "outputDirectory": ".ruleset/dist",
  "defaultProviders": ["cursor", "claude-code", "windsurf"],
  "providers": {
    "cursor": {
      "enabled": true,
      "outputPath": ".cursor/rules"
    },
    "claude-code": {
      "enabled": true,
      "outputPath": "CLAUDE.md"
    },
    "windsurf": {
      "enabled": true,
      "outputPath": ".windsurf/rules"
    }
  },
  "handlebars": {
    "cacheTemplates": true,
    "partialsDirectory": "_partials"
  },
  "gitignore": {
    "enabled": true,
    "options": {
      "comment": "Rulesets Generated Files",
      "sort": true
    }
  },
  "development": {
    "logLevel": "info",
    "enablePerformanceMetrics": false
  }
}
```

### Configuration Hierarchy

1. **Front matter**: Provider-specific config in source files
2. **Config file**: Project-wide `ruleset.config.json`
3. **CLI options**: Runtime overrides (`--provider`, `--dev`)
4. **Defaults**: Built-in fallback values

## Extension Points

### Provider Plugin System

- **RulesetProvider interface**: Consistent plugin architecture
- **Auto-registration**: Automatic discovery of provider plugins
- **Lifecycle hooks**: Pre/post-processing capabilities
- **Custom validation**: Provider-specific rule validation
- **Output formatting**: Provider-specific post-processing

### Handlebars Extensions

- **Custom helpers**: Template helpers for specific providers
- **Context injection**: Additional variables for template compilation
- **Partial interceptors**: Custom partial resolution logic
- **Template validation**: Custom template syntax checking

## Provider Validation

### Built-in Validation

- **Front matter schema**: Provider configuration validation
- **Output path validation**: File system path checking
- **Template syntax**: Handlebars template validation
- **Circular dependency**: Partial inclusion loop detection

### Provider-Specific Validation

- **Cursor**: MDC format validation and rule structure checking
- **Claude Code**: CLAUDE.md format and content validation
- **Windsurf**: Rule format and activation mode validation
- **Custom providers**: Plugin-defined validation rules

## Migration from v0.1

### Breaking Changes

- **No backwards compatibility**: v0.1 syntax not supported
- **Handlebars required**: All templates must use Handlebars syntax
- **Provider terminology**: "Destinations" renamed to "Providers"
- **Auto-discovery**: Manual file specification removed

### Migration Path

1. **Analyze existing rules**: Use `rulesets migrate` to import scattered rules
2. **Convert syntax**: Manual conversion to Handlebars templates
3. **Update configuration**: New `ruleset.config.json` format
4. **Test compilation**: Verify output matches expectations
5. **Clean up legacy**: Remove old rule files and configuration

---

_Rulesets v0.2 Architecture – Clean, simple, Handlebars-powered_
