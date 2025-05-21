# Mixdown Architecture

> A CommonMark-compliant rules compiler for AI assistants

(Note: Some file paths in this document are placeholders and will be updated as the codebase evolves.)

## Overview

Mixdown is a compiler that transforms *source rules* files into destination-specific rules files for various AI tools & coding agents. It follows the "write once, compile for many destinations" philosophy, similar to how Terraform manages infrastructure across multiple cloud providers.

The compiler processes multiple source files simultaneously and can output to multiple destinations in a single compilation run, ensuring that all source rules files are consistently applied across all enabled destinations.

```text
+-----------------+      +----------------+      +----------------------+
| Source rules    | ---> | Mixdown Core   | ---> | Destination-specific |
| (.md files)     |      | Compiler       |      | rules files          |
+-----------------+      +----------------+      +----------------------+
                              ^
                              |
                       +-----------------+
                       | Plugin System   |
                       | (Destination Defs)|
                       +-----------------+
```

## Project Structure

The Mixdown project is organized as a monorepo using pnpm workspaces:

```text
mixdown/
├── packages/
│   ├── core/                 # Core compiler engine
│   ├── cli/                  # Command-line interface
│   ├── mcp/                  # MCP server implementation
│   ├── plugins/              # Destination plugin directory
│   │   ├── cursor/           # Cursor destination implementation
│   │   ├── claude-code/      # Claude Code destination implementation
│   │   ├── windsurf/         # Windsurf destination implementation
│   │   └── ...               # Other destination implementations
│   └── utils/                # Shared utilities
├── examples/                 # Example source rules files and configurations
├── docs/                     # Documentation
├── tests/                    # Integration tests
└── templates/                # Default source rules file templates
```

## Core Components

### Parser

- [packages/core/src/parser.ts](placeholder)
- Responsible for parsing source rules files into an AST (Abstract Syntax Tree)
- Uses a hybrid approach with specialized nodes for different Mixdown constructs
- Preserves necessary source positions for error reporting while avoiding excessive metadata
- Handles Mixdown notation markers, stems, imports, and variables

### Compiler

- [packages/core/src/compiler.ts](placeholder)
- Processes the AST and transforms it for target-specific output
- Resolves imports and variables
- Applies stem filtering and other transformations
- Collects errors during processing to report them all at once

### Renderer

- [packages/core/src/renderer.ts](placeholder)
- Generates the destination-specific rules files for each destination
- Handles different output formats (XML, markdown, etc.)
- Adapts to each destination's preferred file structure

### Plugin System

- [packages/core/src/plugin.ts](placeholder)
- Manages destination plugins that define how source rules files are compiled for specific tools
- Built on an interface-based architecture with dependency injection
- Uses multiple lifecycle hooks to allow plugins to integrate at various stages
- Provides plugin registration and discovery

### Configuration

- [packages/core/src/config.ts](placeholder)
- Loads and validates configuration from mixdown.config.json
- Uses both JSON Schema validation and TypeScript types
- Manages project-level settings
- Provides runtime validation for dynamic configurations

### CLI

- [packages/cli/src/index.ts](placeholder)
- Provides command-line interface for building, validating, and initializing
- Features configurable logging levels for debugging

### MCP Server

- [packages/mcp/src/server.ts](placeholder)
- Full API with caching and persistence for server-side usage
- Exposes an API endpoint for remote compilation
- Optimized for server deployment patterns

## Source Rules File Processing

```text
                +--------------------+
                | Source rules file  |
                +--------+-----------+
                         |
                         v
                +-------------+
                |    Parse    |
                +------+------+
                         |
                         v
+------------+  +-------------+  +------------+
| Frontmatter|->|  Process    |<-| Variables  |
+------------+  |  Directives |  +------------+
                +------+------+
                         |
                         v
+------------+  +-------------+  +------------+
|  Imports   |->| Compile AST |<-|   Stems    |
+------------+  +------+------+  +------------+
                         |
                         v
                +-------------+
                | Destination |
                |  Renderers  |
                +------+------+
                         |
                         v
                +--------------------+
                | destination-specific|
                | rules files         |
                +--------------------+
```

### AST Structure

The compiler uses a hybrid AST structure that:

- Provides necessary detail for error reporting and context preservation
- Contains specialized nodes for different Mixdown constructs (stems, imports, etc.)
- Balances detail and performance by avoiding excessive metadata
- Maintains source positions for accurate error reporting

### Imports and References

- Resolution of relative paths in imports
- Source-rules-file-relative, project-relative, and absolute paths support
- Prevention of circular dependencies
- Tracking files for incremental rebuilding when dependencies change

### Stem Filtering

- Implementing destination-specific stem inclusion/exclusion
- Processing of destination groups (e.g., `+ide`)
- Explicit destination declarations take precedence over group-based ones

### Activation/Trigger Mapping

Different AI assistants use different terminology and mechanisms for when rules should be applied:

```text
Mixdown "Activation" Abstraction
           +
           |
           v
+----------+----------+----------+----------+
|          |          |          |          |
v          v          v          v          v
Cursor   Windsurf  Claude     Roo      GitHub
(types)  (trigger) (imports) (folders) (scopes)
```
<!-- TODO: If GitHub is a planned destination, consider adding it to the destination tables in README.md and spec/OVERVIEW.md for consistency. -->

- Creates an abstraction layer for activation mechanisms
- Maps common patterns to tool-specific implementations
- Allows destination plugins to define their own activation logic

### Target Output Generation

- Converting Mixdown notation into tool-specific formats
- Handling front-matter requirements
- Output file naming conventions and paths
- Destination-specific strategies for handling character/token limits

## Build Process and Workflow

### Batch Compilation

- Processes multiple source files in a single compilation run
- Handles dependencies between source files
- Applies changes consistently across all enabled destinations
- Optimizes compilation by sharing common resources and processing steps
- Ensures consistency across all destination outputs

### Incremental Builds

- Build process is based on file changes rather than full rebuilds
- Uses detailed dependency records with timestamps for tracking
- Handles both direct and indirect dependencies
- Can fall back to full rebuild when needed
- Standard approach in most modern build tools

### Dependency Tracking

- Maintains detailed dependency records with timestamps
- Handles both direct imports and variable dependencies
- Properly tracks file dependencies for accurate incremental builds
- Balances accuracy and performance

### Logging System

- Implements configurable logging levels for different usage scenarios
- Can be minimal in production, verbose in development
- Users can adjust detail level as needed
- Essential for a complex compiler with multiple processing stages

### Event System

- Simple event emitter for core processes
- Allows plugins to monitor the compilation process
- Doesn't affect main execution flow
- Provides good balance of simplicity and extensibility

## Error Handling

- Collects errors during processing and reports them all at once
- Allows identifying multiple issues in a single pass
- Provides better user experience for complex compilations
- Still throws exceptions for truly unexpected errors
- Essential for multi-file projects where multiple errors may be related

## Template System

The architecture supports a system for content reusability (Mixins). Internally, this system is designed to be flexible, potentially allowing for future enhancements like template inheritance where mixins could extend and override others. Currently, user-facing features for content reuse are primarily documented as Imports and Mixins in `spec/OVERVIEW.md`.

## Standard Project Structure

A typical project using Mixdown would have this structure:

```text
project/
├── .mixdown/
│   ├── dist/
│   │   └── latest/         # compiled rules
│   ├── src/                # source rules files (*.md)
│   │   └── _mixins/        # reusable content modules
│   └── mixdown.config.json # compiler config
```

## Configuration Format

A stub for `mixdown.config.json`:

```json
{
  "version": "0.1.0",
  "projects": {
    "default": {
      "sources": {
        "sourceRules": ".mixdown/src",
        "mixins": ".mixdown/src/_mixins"
      },
      "dist": ".mixdown/dist",
      "allow-bare-xml-tags": false,
      "destinations": {
        "include": ["cursor", "claude-code", "windsurf"],
        "exclude": []
      },
      "aliases": {
        "project": "Mixdown",
        "author": "Maybe Good"
      },
      "destinationOptions": {
        "cursor": {
          "output": {
            "path": ".cursor/rules"
          }
        },
        "claude-code": {
          "output": {
            "path": "./CLAUDE.md"
          }
        }
      },
      "destinationGroups": {
        "ide": ["cursor", "windsurf"],
        "cli": ["claude-code", "codex-cli"]
      },
      "compile": {
        "batchSize": 10,
        "parallelism": 4
      }
    }
  }
}
```
Note: Paths in `sources` (like `sourceRules` and `mixins`) and `dist` are typically relative to the project root directory (i.e., the directory containing the `.mixdown` folder itself).

## Extension Points

- Hooks at key processing stages allow extension of core functionality
- More flexible than plugins alone
- Supports monitoring and modifying the compilation process
- Destination plugins can implement destination-specific validators
- Core provides abstraction and simplification for plugin authors

## Compiled Rules Validation

- Each destination plugin handles its own validation
- Better guarantees of compatibility
- Leverages destination-specific knowledge
- Core provides abstractions to simplify validation implementation

## Next Steps

1. Finalize architecture details
2. Create detailed component specifications
3. Implement core parsing and AST
4. Build initial plugin system
5. Develop basic destination implementations
6. Create CLI and build process
7. Add MCP server integration
8. Establish test framework