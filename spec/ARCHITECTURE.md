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
       - *Faster to process but less useful for error reporting*
       - *Cannot preserve formatting details for roundtrip processing*
       - *Would require additional context for target-specific transformations*
     - B) Complex tree with source positions and formatting details
       - *Better error messages with exact source location*
       - *Preserves formatting for potential roundtrip editing*
       - *Increases memory usage and complexity*
     - C) Hybrid approach with node types for different Mixdown constructs
       - *Balances detail and performance with specialized nodes*
       - *Provides context-aware processing without excessive metadata*
       - *More maintainable than generic AST when adding new features*
   - **Decision:** C - Hybrid approach is most appropriate for a domain-specific compiler like Mixdown
     - Provides necessary detail for error reporting and preservation of important context
     - Allows for specialized handling of different Mixdown constructs (tracks, imports, etc.)
     - More maintainable as the notation evolves

2. **Plugin System Architecture**
   - How should plugins integrate with the core?
   - Options:
     - A) Class-based with inheritance hierarchy
       - *Clear structure with well-defined extension points*
       - *Can be rigid and difficult to adapt to varied plugin needs*
       - *More traditional OOP approach that may limit composition*
     - B) Function-based with composition
       - *Lightweight and flexible*
       - *Easy to add new capabilities without changing interfaces*
       - *Can be harder to enforce consistency across plugins*
     - C) Interface-based with dependency injection
       - *Flexible yet structured approach*
       - *Promotes loose coupling between components*
       - *Natural fit for TypeScript's type system*
   - **Decision:** C - Interface-based with dependency injection
     - Offers best balance of structure and flexibility
     - Enables plugins to be composed of multiple independent capabilities
     - Works well with TypeScript's type system for clear interfaces
     - Makes testing easier through mock implementations

3. **Error Handling Strategy**
   - How should errors be reported and handled?
   - Options:
     - A) Throw exceptions with descriptive messages
       - *Traditional approach familiar to most developers*
       - *Simple implementation and clear execution flow*
       - *Can lead to many try/catch blocks*
     - B) Return Result objects (success/failure)
       - *More functional approach that clearly signals error conditions*
       - *Avoids exceptions for expected error cases*
       - *Can make function signatures more complex*
     - C) Collect errors and report at the end of processing
       - *Allows finding multiple errors in a single pass*
       - *Better user experience for complex compilations*
       - *More complex to implement and maintain*
   - **Decision:** C - Collect errors and report at the end of processing
     - Most user-friendly approach for a compiler
     - Allows identifying multiple issues before halting
     - Can still throw exceptions for truly unexpected errors
     - Provides better feedback for complex mix files

4. **Configuration Management**
   - How should configuration be loaded and validated?
   - Options:
     - A) JSON Schema validation
       - *Self-documenting via schema*
       - *Can generate TypeScript types from schema*
       - *Strong validation but additional dependency*
     - B) TypeScript types and manual validation
       - *Lightweight with no extra dependencies*
       - *More flexible but requires more manual code*
       - *Type safety at compile time only*
     - C) Both with additional runtime checks
       - *Most comprehensive approach*
       - *Schema for documentation and validation*
       - *TypeScript types for dev experience*
   - **Decision:** C - Both with additional runtime checks
     - JSON Schema provides strong validation and documentation
     - TypeScript types give excellent IDE support
     - Runtime checks handle dynamic configurations
     - Worth the setup cost for a robust configuration system

5. **Logging and Debug Information**
   - What logging strategy should be used?
   - Options:
     - A) Minimal logging with errors only
       - *Simplest approach with lowest overhead*
       - *Insufficient for troubleshooting complex issues*
       - *Requires less code to implement*
     - B) Verbose logging with detailed process information
       - *Helps with debugging but can be noisy*
       - *May impact performance*
       - *Hard to filter for specific information*
     - C) Configurable logging levels
       - *Flexible for different usage scenarios*
       - *Can be minimal in production, verbose in development*
       - *More complex to implement*
   - **Decision:** C - Configurable logging levels
     - Balances performance and debuggability
     - Enables detailed logs when needed without compromising normal usage
     - Essential for a complex compiler with multiple processing stages
     - Helps users and developers troubleshoot issues

### Target Handling

6. **Target Plugin Interface**
   - What should the plugin interface look like?
   - Options:
     - A) Single-function transform interface
       - *Simple API with a clear responsibility*
       - *Limited flexibility for complex transformations*
       - *Easy to implement but may not cover all cases*
     - B) Multiple lifecycle hooks
       - *Provides control over different stages of compilation*
       - *Allows plugins to modify processing at specific points*
       - *More complex but highly adaptable*
     - C) Event-based processing pipeline
       - *Loose coupling between processing stages*
       - *Easy to extend without changing existing code*
       - *Can be harder to reason about the execution flow*
   - **Decision:** B - Multiple lifecycle hooks
     - Provides clear entry points for plugins to integrate
     - Explicit stage-based processing makes the pipeline easier to understand
     - Balances flexibility and clarity
     - Allows plugins to participate only in relevant stages

7. **Target-Specific Features**
   - How should target-specific features be handled?
   - Options:
     - A) Common subset of features only
       - *Ensures consistency across all targets*
       - *Simplifies implementation and testing*
       - *Limits expressiveness and target-specific optimizations*
     - B) Target-specific extensions via plugins
       - *Allows each target to implement unique features*
       - *More complex system with potential feature fragmentation*
       - *Better for supporting diverse target requirements*
     - C) Dynamic feature detection and fallbacks
       - *Tries to adapt features to each target's capabilities*
       - *Complex to implement correctly*
       - *May lead to unexpected behavior*
   - **Decision:** B - Target-specific extensions via plugins
     - Most flexible approach that accommodates varied target requirements
     - Allows leveraging unique features of each target platform
     - Avoids lowest-common-denominator limitations
     - Can be combined with sensible defaults for common patterns

8. **Output File Strategy**
   - How should output files be organized?
   - Options:
     - A) One output file per input mix for each target
       - *Clear one-to-one mapping between mixes and outputs*
       - *Simple to implement and reason about*
       - *May not work well for targets with different file structures*
     - B) Target-specific aggregation (e.g., all mixes in one CLAUDE.md)
       - *Better for targets that expect a single file*
       - *More complex merging logic*
       - *Harder to track which mixes contribute to which outputs*
     - C) Mixed approach based on target requirements
       - *Most flexible to match each target's expectations*
       - *Complex implementation with target-specific logic*
       - *Best user experience but highest development cost*
   - **Decision:** C - Mixed approach based on target requirements
     - Most pragmatic solution given the diversity of target systems
     - Honors each target's preferred file structure
     - Essential for targets like Claude Code with single-file expectations
     - More complex but delivers best user experience

9. **Character/Token Limits**
   - How should character/token limits be handled?
   - Options:
     - A) Strict enforcement with errors
       - *Prevents invalid outputs that would be rejected by targets*
       - *May block compilation unnecessarily*
       - *Clear feedback but potentially frustrating*
     - B) Warnings with automatic truncation
       - *More forgiving approach*
       - *Might lead to unexpected content loss*
       - *Requires clear warning messages about truncated content*
     - C) Target-specific strategies
       - *Adapts to each target's requirements*
       - *Most flexible but more complex to implement*
       - *Best user experience with appropriate behaviors per target*
   - **Decision:** C - Target-specific strategies
     - Different targets have vastly different approaches to limits
     - Some targets need strict enforcement (like Windsurf's 6K limit)
     - Others may benefit from smarter strategies
     - Providing target-specific behavior delivers best user experience

### Mixdown Notation Processing

10. **Variable Scope**
    - How should variable scope be determined?
    - Options:
      - A) Global only
        - *Simplest implementation*
        - *Variables are consistent throughout all files*
        - *Limited flexibility for component-specific values*
      - B) Mix file scopes with inheritance
        - *Variables defined at mix file level*
        - *Supports inheritance from parent to imported files*
        - *Balance of flexibility and simplicity*
      - C) Track-level scoping
        - *Most granular control*
        - *Allows track-specific variable definitions*
        - *Complex to implement and reason about*
    - **Decision:** B - Mix file scopes with inheritance
      - Provides good balance of flexibility and predictability
      - Variables naturally scope to the file where they're defined
      - Inheritance allows for sensible defaults with local overrides
      - Simpler to understand than track-level scoping

11. **Import Resolution**
    - How should imports be resolved?
    - Options:
      - A) Relative to current mix file only
        - *Simple and predictable*
        - *Works like standard imports in many languages*
        - *Limited flexibility for complex projects*
      - B) Configurable lookup paths
        - *More powerful for shared components*
        - *Can define search paths for snippets and common files*
        - *More complex configuration*
      - C) Mix-relative, project-relative, and absolute paths
        - *Most flexible approach*
        - *Supports different path types for different needs*
        - *Clear syntax for each path type*
    - **Decision:** C - Mix-relative, project-relative, and absolute paths
      - Most flexible and intuitive approach
      - Familiar to developers (similar to module resolution in many systems)
      - Supports both simple local imports and complex project structures
      - Essential for reusable components and templates

12. **Track Filtering Precedence**
    - How should conflicting track filters be resolved?
    - Options:
      - A) Last filter wins
        - *Simple rule that's easy to implement*
        - *Might lead to unexpected behavior*
        - *Order-dependent which can be confusing*
      - B) Explicit over implicit (e.g., +cursor overrides +ide)
        - *More intuitive behavior*
        - *Specific filters take precedence over group filters*
        - *Requires understanding filter hierarchy*
      - C) Configurable precedence rules
        - *Most flexible but complex*
        - *Can be tailored to specific needs*
        - *Harder to predict without understanding configuration*
    - **Decision:** B - Explicit over implicit
      - More intuitive than simple last-wins
      - Specific target filters should override group-based ones
      - Follows principle of least surprise
      - Clear precedence rules make behavior predictable

13. **Option Extension**
    - How should option extension work?
    - Options:
      - A) Simple string-based options only
        - *Easiest to implement and use*
        - *Limited expressiveness*
        - *May lead to many similar options*
      - B) Structured options with inheritance
        - *More powerful with hierarchical options*
        - *Can express complex configurations concisely*
        - *More complex parsing and processing*
      - C) Plugin-defined option processors
        - *Most flexible approach*
        - *Plugins can define custom option formats*
        - *Potential consistency issues across plugins*
    - **Decision:** B - Structured options with inheritance
      - Good balance of power and consistency
      - Supports hierarchical option structures
      - More maintainable than simple strings for complex options
      - Common syntax across all targets with plugin-specific semantics

### Build and Runtime

14. **Build Process**
    - How should the build process work?
    - Options:
      - A) Full rebuild every time
        - *Simplest approach with predictable results*
        - *Inefficient for large projects*
        - *Easier to implement and debug*
      - B) Incremental builds based on file changes
        - *More efficient for repeated builds*
        - *Requires tracking file dependencies*
        - *Can be tricky with imports and variables*
      - C) On-demand compilation with caching
        - *Most efficient for interactive use*
        - *Complex caching and invalidation logic*
        - *Best for integration with IDEs and tools*
    - **Decision:** B - Incremental builds based on file changes
      - Good balance of performance and predictability
      - Essential for larger projects with many files
      - Can fall back to full rebuild when needed
      - Reasonable complexity for the benefits provided

15. **Dependency Tracking**
    - How should file dependencies be tracked?
    - Options:
      - A) Simple import graph
        - *Tracks direct imports between files*
        - *Easier to implement and maintain*
        - *May miss some dependencies (variables, etc.)*
      - B) Detailed dependency records with timestamps
        - *More precise tracking for incremental builds*
        - *Includes import and variable dependencies*
        - *Complex to maintain correctly*
      - C) Hash-based content tracking
        - *Most accurate change detection*
        - *Handles any type of dependency*
        - *Higher performance cost for large files*
    - **Decision:** B - Detailed dependency records with timestamps
      - More complete than simple import graph
      - Handles both direct and indirect dependencies
      - Better for incremental builds
      - More maintainable than pure hash-based approach

16. **Template System**
    - How should templates be implemented?
    - Options:
      - A) Basic starter templates only
        - *Simple predefined templates for common use cases*
        - *Limited customization*
        - *Easy to implement and maintain*
      - B) Template inheritance system
        - *Templates can extend and override other templates*
        - *Powerful for complex template hierarchies*
        - *Familiar concept from many template systems*
      - C) Customizable template functions
        - *Templates can include dynamic content*
        - *Most flexible but more complex*
        - *Requires template function execution environment*
    - **Decision:** B - Template inheritance system
      - Powerful without excessive complexity
      - Supports reusable components with customization
      - Familiar pattern from template engines
      - Good balance of flexibility and maintainability

### Integration and Extensibility

17. **MCP Integration**
    - How should the MCP server integrate with the core?
    - Options:
      - A) Thin wrapper around core functions
        - *Minimal additional code*
        - *Direct mapping of core functionality*
        - *Limited MCP-specific features*
      - B) Full API with caching and persistence
        - *Optimized for server-side usage*
        - *Session management and caching*
        - *More complex but better performance*
      - C) Extensible plugin system for MCP-specific features
        - *Allows adding MCP-specific capabilities*
        - *Most flexible but most complex*
        - *Potential fragmentation of features*
    - **Decision:** B - Full API with caching and persistence
      - Better performance for server use cases
      - Adds important MCP-specific features
      - Reasonable complexity for the benefits
      - Maintains clear relationship with core functionality

18. **Event System**
    - Should Mixdown have an event system?
    - Options:
      - A) No events, direct function calls only
        - *Simplest implementation*
        - *Clearest execution flow*
        - *Limited extensibility*
      - B) Simple event emitter for core processes
        - *Allows plugins to monitor the compilation process*
        - *Lightweight extension mechanism*
        - *Doesn't affect main processing flow*
      - C) Comprehensive event system with middleware
        - *Most powerful extension mechanism*
        - *Allows modifying behavior at multiple points*
        - *Complex to implement and reason about*
    - **Decision:** B - Simple event emitter for core processes
      - Provides useful hooks for plugins and extensions
      - Doesn't over-complicate the architecture
      - Good balance of extensibility and simplicity
      - Can evolve to more comprehensive system if needed

19. **Extension Points**
    - Where should extension points be placed?
    - Options:
      - A) Plugin system only
        - *Single clear extension mechanism*
        - *Focused on target implementations*
        - *Limited extensibility for core processes*
      - B) Hooks at key processing stages
        - *Allows extending core processing*
        - *More granular control points*
        - *Can lead to complex interactions*
      - C) Both plugins and a middleware system
        - *Most comprehensive extension options*
        - *Combines benefits of both approaches*
        - *Most complex to implement and document*
    - **Decision:** B - Hooks at key processing stages
      - More flexible than plugins alone
      - Clearer than a full middleware system
      - Allows extending core functionality
      - Supports monitoring and modifying the compilation process

20. **Output Validation**
    - How should output validation work?
    - Options:
      - A) Basic format checks only
        - *Simple validation of output structure*
        - *Limited guarantees about target compatibility*
        - *Easier to implement*
      - B) Target-specific validators
        - *Each target plugin handles its own validation*
        - *Better guarantees of compatibility*
        - *More complex with distributed responsibility*
      - C) Schema-based validation with custom rules
        - *Formal validation against defined schemas*
        - *Clear feedback on validation errors*
        - *Most comprehensive but most complex*
    - **Decision:** B - Target-specific validators
      - Each target knows its requirements best
      - Allows specialized validation logic
      - Fits with plugin architecture
      - Balance of thoroughness and maintainability

## Next Steps

1. Finalize architecture decisions
2. Create detailed component specifications
3. Implement core parsing and AST
4. Build initial plugin system
5. Develop basic target implementations
6. Create CLI and build process
7. Add MCP server integration
8. Establish test framework