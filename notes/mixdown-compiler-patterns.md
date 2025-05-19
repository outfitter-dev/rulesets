# Mixdown Compiler Implementation Patterns

TLDR: Essential patterns and structures needed for the mixdown compiler implementation
TLDR: Guidelines for transforming mix files into target-specific outputs

This document outlines key implementation patterns that the Mixdown compiler needs to handle based on analysis of various target systems. These patterns represent the diverse ways AI assistants manage rules and memory across different tools.

The Mixdown compiler needs to convert a single source format (mixdown files) into tool-specific instruction files for different AI assistant platforms. Each target has unique requirements for file location, format, activation mechanisms, and content organization that must be handled appropriately.

## File Location and Loading Patterns

### Hierarchical Loading
**Tools**: Claude Code, Cursor, Windsurf

Claude Code implements a sophisticated hierarchical loading system:
```text
$HOME/.claude/CLAUDE.md                   # Global user preferences
<repo-root>/CLAUDE.md                     # Project-wide rules
<current-directory>/CLAUDE.md             # Directory-specific rules
<parent-directories>/CLAUDE.md            # Parent directory rules (if navigating deeper)
```

Claude Code's unique `@file` syntax resolves paths relative to the current file location and processes imports recursively.

Cursor (v0.50+) supports nested rule directories with automatic scoping:
```text
project/
├── .cursor/                       # Project root rules
│   └── rules/
│       ├── always-style.mdc        
│       └── api-conventions.mdc     
├── frontend/
│   ├── .cursor/                  # Subdirectory-specific rules
│   │   └── rules/
│   │       └── react-standards.mdc  # Only loaded when working in frontend/
```

### Mode-Specific Organization 
**Tools**: Roo Code

Roo Code organizes rules by AI operational mode:
```text
<repo-root>/.roo/rules/                   # Common rules (all modes)
<repo-root>/.roo/rules-{mode}/            # Mode-specific rules (architect, debug, etc.)
```

Specific modes include architect, debug, and docs-writer, with each having specialized content tailored to the AI's behavior in that mode. Content is loaded based on which mode is currently active.

### Manual Loading
**Tools**: Aider

Aider requires explicit inclusion at startup:
```bash
aider --memory-file .aider.memory.md
```

## Content Organization Patterns

### Import Mechanisms
**Tools**: Claude Code

Claude Code's `@file` syntax for modular content:
```markdown
# Project Guidelines
See @docs/ARCHITECTURE.md for the system overview.
```

### Front-matter Control
**Tools**: Cursor

Cursor uses YAML front-matter for rule behavior:
```yaml
---
description: React Component Standards  
globs: ["**/components/**/*.tsx"]
alwaysApply: false
---
```

## Activation Mechanisms

### Always Apply
**Tools**: Cursor, Windsurf

Cursor example:
```yaml
---
alwaysApply: true
---
```

### Pattern-Based (Glob) Activation
**Tools**: Cursor, Windsurf

Cursor example:
```yaml
---
globs: ["**/*.py", "**/*.ipynb"]
---
```

Windsurf supports file pattern matching to apply rules only to relevant files.

### Model Decision Activation
**Tools**: Windsurf

Windsurf allows the AI to decide whether to include a rule based on relevance.

### Manual Activation
**Tools**: Windsurf, Aider, Cursor

Rules that are only applied when explicitly selected by the user.

## Resource Management

### Character Limits
**Tools**: Windsurf

Windsurf implements strict character limits:
- 6K characters per rule file
- 12K characters total across all rules

## File Formats

### Standard Markdown (.md)
**Tools**: Claude Code, Roo Code, Aider, Windsurf

Example from Aider:
```markdown
# Project Context
This project is a React application with a Node.js backend.

# Coding Standards
- Use functional components for all new React code
- Follow ESLint rules in .eslintrc
```

### Markdown with Front-matter (.mdc)
**Tools**: Cursor

```markdown
---
description: "Database Schema"
---
# Database Structure
Tables and relationships...
```

## Target-Specific Requirements

### GitHub Copilot
- Repository-level instructions at `.github/copilot-instructions.md`
- Task-specific prompt files (`*.prompt.md`) inserted on reference
- Personal rules configured in GitHub UI (not local files)
- Plain Markdown with no special syntax or frontmatter
- Each line treated as discrete instruction
- Deduplicates identical lines
- Later scopes override earlier ones in conflicts
- Rules get automatic hot-reload when instructions file is saved

### Cursor
- Supports nested rules in subdirectories
- Uses .mdc files with YAML front-matter
- Supports glob patterns for file matching
- Has "Always Apply" capability
- Four rule types: Always Apply, Auto-Attached, Agent-Requested, Manual
- Shows which rules are active in the context panel
- UI integration for rule management

### Claude Code
- Hierarchical loading from multiple directories
- Import mechanism with @file syntax for modular organization
- Plain markdown format (.md)
- Combines global + project + directory-specific rules
- Path resolution for imports relative to current file
- Processes imports recursively
- Uses clear heading structure for organization

### Windsurf
- Multiple activation modes (Always On, Manual, Model Decision, Glob)
- Character limits (6K per file, 12K total across all rules)
- UI integration for toggling and editing rules
- Dedicated UI with visual indicators for active rules
- Global rules at `$HOME/.codeium/windsurf/memories/global_rules.md`
- Project rules at `<repo-root>/.windsurf/rules/*.md`
- File prefixes (e.g., `01-basics.md`) to control loading order

### Roo Code
- Mode-specific rules folders (.roo/rules-{mode}/)
- Common rules for all modes (.roo/rules/)
- One folder per AI operational mode (architect, debug, docs-writer, etc.)
- No global user file for personal preferences
- Mode selection determines which rules are loaded
- Clear heading structure and section organization

### Aider
- Manual inclusion via command-line flag
- Session-based persistence
- No built-in scoping

## Compiler Implementation Considerations

### Path Resolution
The compiler must handle:
- Relative paths for imports
- Path mapping for different target output locations
- Hierarchical directory structures

### Content Transformation
The compiler must support:
- Converting Mixdown notation to target-specific formats
- Generating appropriate YAML front-matter for targets that require it
- Preserving plain markdown content for most targets

### Target Configuration
Each target needs configuration for:
- Output location and file naming conventions
- Format requirements (plain .md vs .mdc with front-matter)
- Character or token limitations
- Activation mechanism support

### Track Handling
Tracks must be appropriately processed for:
- Tools that use XML-like formats (wrapping with appropriate tags)
- Tools that use heading-based organization (converting to headings)
- Tools that require specific activation modes (adding appropriate attributes)

### Variable Substitution
Variables need to handle:
- Target-specific values (`{{$target}}`, `{{$target.id}}`)
- Path-related values
- Front-matter values

### Import Processing
The compiler must process imports:
- Resolving paths correctly
- Filtering tracks as specified
- Handling nested imports
- Managing circular references

## Example Files

### Cursor (.mdc)

```yaml
---
description: React Component Standards  
globs: ["**/components/**/*.tsx"]
alwaysApply: false
---
# React Component Guidelines
- Use functional components with hooks
- Follow naming pattern: ComponentName.tsx
```

### Claude Code (@file syntax)

```markdown
# Project Guidelines
See @docs/ARCHITECTURE.md for the system overview.

# Coding Standards
- Follow RESTful principles for API endpoints
- Document all functions with JSDoc comments
```

### Windsurf (.md)

```markdown
# TypeScript Best Practices

## Typing
- Always use explicit return types for functions
- Prefer interfaces over types for objects
- Use union types for values with finite potential values

## Error Handling
- Use specific error types instead of generic Error
- Implement proper error boundaries
- Always type error objects
```

### Roo Code (mode-specific .md)

```markdown
# Debugging Guidelines

## Common Error Patterns
- Description of error pattern 1 and how to fix
- Description of error pattern 2 and how to fix

## Debugging Process
1. Step 1 of the debugging process
2. Step 2 of the debugging process
3. Step 3 of the debugging process

## Testing Recommendations
- Unit test guidelines
- Integration test guidelines
```

### GitHub Copilot (.md)

```markdown
# Repository Custom Instructions

Use Bazel for Java dependencies.  
Always format JavaScript with double quotes and tabs.  
Reference Jira issue keys (e.g., JIRA-123) in commit messages.
```