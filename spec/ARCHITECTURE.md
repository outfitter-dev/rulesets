# Mixdown Architecture

> A CommonMark-compliant prompt compiler for AI assistants

## Overview

Mixdown is a compiler that transforms source "mix" files written in Markdown into tool-specific instruction files for various AI assistants. It follows the "write once, target many" philosophy, similar to how Terraform manages infrastructure across multiple cloud providers.

```
+---------------+      +----------------+      +------------------+
| Source Mixes  | ---> | Mixdown Core   | ---> | Target Outputs   |
| (.md files)   |      | Compiler       |      | (Various formats)|
+---------------+      +----------------+      +------------------+
                              ^
                              |
                       +------+--------+
                       | Plugin System |
                       | (Target Defs) |
                       +---------------+
```

## Project Structure

The Mixdown project is organized as a monorepo using pnpm workspaces:

```
mixdown/
├── packages/
│   ├── core/                 # Core compiler engine
│   ├── cli/                  # Command-line interface
│   ├── mcp/                  # MCP server implementation
│   ├── targets/              # Target plugins directory
│   │   ├── cursor/           # Cursor target implementation
│   │   ├── claude-code/      # Claude Code target implementation
│   │   ├── windsurf/         # Windsurf target implementation
│   │   └── ...               # Other target implementations
│   └── utils/                # Shared utilities
├── examples/                 # Example mix files and configurations
├── docs/                     # Documentation
├── tests/                    # Integration tests
└── templates/                # Default mix file templates
```

## Core Components

### Parser
- [packages/core/src/parser.ts](placeholder)
- Responsible for parsing mix files into an AST
- Handles Mixdown notation markers, tracks, imports, and variables

### Compiler
- [packages/core/src/compiler.ts](placeholder)
- Processes the AST and transforms it for target-specific output
- Resolves imports and variables
- Applies track filtering and other transformations

### Renderer
- [packages/core/src/renderer.ts](placeholder)
- Generates the final output files for each target
- Handles different output formats (XML, markdown, etc.)

### Plugin System
- [packages/core/src/plugin.ts](placeholder)
- Manages target plugins that define how mix files are compiled for specific tools
- Provides plugin registration and discovery

### Configuration
- [packages/core/src/config.ts](placeholder)
- Loads and validates configuration from mixdown.config.json
- Manages project-level settings

### CLI
- [packages/cli/src/index.ts](placeholder)
- Provides command-line interface for building, validating, and initializing

### MCP Server
- [packages/mcp/src/server.ts](placeholder)
- Exposes an API endpoint for remote compilation

## Key Concepts and Implementation Concerns

### Mix File Processing

```
               +-------------+
               |  Mix File   |
               +------+------+
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
|  Imports   |->| Compile AST |<-|   Tracks   |
+------------+  +------+------+  +------------+
                      |
                      v
               +-------------+
               |   Target    |
               |  Renderers  |
               +------+------+
                      |
                      v
               +-------------+
               |   Output    |
               |    Files    |
               +-------------+
```

#### Parsing and AST
- How to represent Mixdown notation markers in the AST
- Handling nested structures and track boundaries
- Preserving the original source positions for error reporting

#### Imports and References
- Resolution of relative paths in imports
- Handling circular dependencies
- Tracking files for rebuilding when dependencies change

#### Track Filtering
- Implementing target-specific track inclusion/exclusion
- Processing of target groups (e.g., `+ide`)
- Order and precedence of filtering rules

### Activation/Trigger Mapping

Different AI assistants use different terminology and mechanisms for when rules should be applied:

```
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

- Create an abstraction layer for activation mechanisms
- Map common patterns to tool-specific implementations
- Allow target plugins to define their own activation logic

### Target Output Generation

- Converting Mixdown notation into tool-specific formats
- Handling front-matter requirements
- Output file naming conventions and paths
- Character/token limits enforcement

### Configuration Format

A stub for `mixdown.config.json`:

```json
{
  "version": "0.1.0",
  "projects": {
    "default": {
      "sources": {
        "mixes": ".mixdown/mixes",
        "snippets": ".mixdown/mixes/_snippets"
      },
      "output": ".mixdown/outputs",
      "targets": {
        "include": ["cursor", "claude-code", "windsurf"],
        "exclude": []
      },
      "aliases": {
        "project": "Mixdown",
        "author": "Maybe Good"
      },
      "targetOptions": {
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
      "targetGroups": {
        "ide": ["cursor", "windsurf"],
        "cli": ["claude-code", "codex-cli"]
      }
    }
  }
}
```

## Open Questions and Decisions

### Core Architecture

1. **AST Structure**
   - How detailed should the AST representation be?
   - Options:
     - A) Simple tree structure with minimal metadata
     - B) Complex tree with source positions and formatting details
     - C) Hybrid approach with node types for different Mixdown constructs
   - **Decision:**

2. **Plugin System Architecture**
   - How should plugins integrate with the core?
   - Options:
     - A) Class-based with inheritance hierarchy
     - B) Function-based with composition
     - C) Interface-based with dependency injection
   - **Decision:**

3. **Error Handling Strategy**
   - How should errors be reported and handled?
   - Options:
     - A) Throw exceptions with descriptive messages
     - B) Return Result objects (success/failure)
     - C) Collect errors and report at the end of processing
   - **Decision:**

4. **Configuration Management**
   - How should configuration be loaded and validated?
   - Options:
     - A) JSON Schema validation
     - B) TypeScript types and manual validation
     - C) Both with additional runtime checks
   - **Decision:**

5. **Logging and Debug Information**
   - What logging strategy should be used?
   - Options:
     - A) Minimal logging with errors only
     - B) Verbose logging with detailed process information
     - C) Configurable logging levels
   - **Decision:**

### Target Handling

6. **Target Plugin Interface**
   - What should the plugin interface look like?
   - Options:
     - A) Single-function transform interface
     - B) Multiple lifecycle hooks
     - C) Event-based processing pipeline
   - **Decision:**

7. **Target-Specific Features**
   - How should target-specific features be handled?
   - Options:
     - A) Common subset of features only
     - B) Target-specific extensions via plugins
     - C) Dynamic feature detection and fallbacks
   - **Decision:**

8. **Output File Strategy**
   - How should output files be organized?
   - Options:
     - A) One output file per input mix for each target
     - B) Target-specific aggregation (e.g., all mixes in one CLAUDE.md)
     - C) Mixed approach based on target requirements
   - **Decision:**

9. **Character/Token Limits**
   - How should character/token limits be handled?
   - Options:
     - A) Strict enforcement with errors
     - B) Warnings with automatic truncation
     - C) Target-specific strategies
   - **Decision:**

### Mixdown Notation Processing

10. **Variable Scope**
    - How should variable scope be determined?
    - Options:
      - A) Global only
      - B) Mix file scopes with inheritance
      - C) Track-level scoping
    - **Decision:**

11. **Import Resolution**
    - How should imports be resolved?
    - Options:
      - A) Relative to current mix file only
      - B) Configurable lookup paths
      - C) Mix-relative, project-relative, and absolute paths
    - **Decision:**

12. **Track Filtering Precedence**
    - How should conflicting track filters be resolved?
    - Options:
      - A) Last filter wins
      - B) Explicit over implicit (e.g., +cursor overrides +ide)
      - C) Configurable precedence rules
    - **Decision:**

13. **Option Extension**
    - How should option extension work?
    - Options:
      - A) Simple string-based options only
      - B) Structured options with inheritance
      - C) Plugin-defined option processors
    - **Decision:**

### Build and Runtime

14. **Build Process**
    - How should the build process work?
    - Options:
      - A) Full rebuild every time
      - B) Incremental builds based on file changes
      - C) On-demand compilation with caching
    - **Decision:**

15. **Dependency Tracking**
    - How should file dependencies be tracked?
    - Options:
      - A) Simple import graph
      - B) Detailed dependency records with timestamps
      - C) Hash-based content tracking
    - **Decision:**

16. **Template System**
    - How should templates be implemented?
    - Options:
      - A) Basic starter templates only
      - B) Template inheritance system
      - C) Customizable template functions
    - **Decision:**

### Integration and Extensibility

17. **MCP Integration**
    - How should the MCP server integrate with the core?
    - Options:
      - A) Thin wrapper around core functions
      - B) Full API with caching and persistence
      - C) Extensible plugin system for MCP-specific features
    - **Decision:**

18. **Event System**
    - Should Mixdown have an event system?
    - Options:
      - A) No events, direct function calls only
      - B) Simple event emitter for core processes
      - C) Comprehensive event system with middleware
    - **Decision:**

19. **Extension Points**
    - Where should extension points be placed?
    - Options:
      - A) Plugin system only
      - B) Hooks at key processing stages
      - C) Both plugins and a middleware system
    - **Decision:**

20. **Output Validation**
    - How should output validation work?
    - Options:
      - A) Basic format checks only
      - B) Target-specific validators
      - C) Schema-based validation with custom rules
    - **Decision:**

## Next Steps

1. Finalize architecture decisions
2. Create detailed component specifications
3. Implement core parsing and AST
4. Build initial plugin system
5. Develop basic target implementations
6. Create CLI and build process
7. Add MCP server integration
8. Establish test framework