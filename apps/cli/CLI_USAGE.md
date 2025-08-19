# Rulesets CLI Usage Guide

## Overview

The Rulesets CLI provides auto-discovery and compilation of `.rule.md` files. It automatically finds rule files in your project and compiles them for different providers (Cursor, Claude Code, etc.).

## Installation

```bash
# From the CLI directory
bun install
bun run build

# Or use directly with bun
bun src/index.ts
```

## Commands

### Auto-Discovery (Default)

Automatically discover and compile all rule files:

```bash
# Auto-discover all .rule.md files in .ruleset/src/
rulesets

# Filter by provider
rulesets --provider cursor
rulesets --provider typescript

# Specify search directory
rulesets --directory ./my-rules

# Verbose output
rulesets --verbose
```

### List Files

List all discoverable rule files without compiling:

```bash
# List all files
rulesets list

# List with provider filter
rulesets list --provider cursor

# List from specific directory
rulesets list --directory ./my-rules
```

### Compile Specific Files

Compile a specific file or directory:

```bash
# Compile single file
rulesets compile path/to/file.rule.md

# Compile all files in directory
rulesets compile ./rules-directory

# Compile with provider filter
rulesets compile ./rules-directory --provider cursor
```

## File Discovery Rules

### Priority Order

1. **Primary**: `.rule.md` files (preferred format)
2. **Fallback**: `.md` files (if no .rule.md found)

### Discovery Behavior

- **Search Location**: `.ruleset/src/` directory (or current directory if no .ruleset/src/)
- **Recursive**: Searches all subdirectories
- **Exclusions**: 
  - `_partials/` directory (always excluded)
  - `node_modules/`, `.git/`, `dist/` (excluded in fallback mode)

### Examples

```
project/
├── .ruleset/
│   └── src/
│       ├── basic-rules.rule.md     ✅ Discovered
│       ├── typescript.rule.md      ✅ Discovered  
│       ├── subdirectory/
│       │   └── nested.rule.md      ✅ Discovered (recursive)
│       └── _partials/
│           └── common.rule.md      ❌ Excluded
└── other-rules.md                  ❌ Not in search path
```

## Provider Filtering

Filter files by provider name (simple string matching):

```bash
# These will match files containing "cursor" in name or path
rulesets --provider cursor

# Examples of matching files:
# - cursor-rules.rule.md
# - providers/cursor/config.rule.md
# - my-cursor-setup.rule.md
```

## Error Handling

### Common Scenarios

- **No files found**: Shows helpful message with search criteria
- **Directory doesn't exist**: Clear error with path information
- **Compilation errors**: Individual file errors don't stop batch processing
- **Permission errors**: Graceful handling with error messages

### Exit Codes

- `0`: Success
- `1`: Error (no files found, compilation failures, etc.)

## Examples

### Basic Usage

```bash
# Auto-discover and compile all rules
rulesets

# Output:
# ℹ️  🔍 Auto-discovering rule files...
# ℹ️  📁 Found 3 rule file(s):
# ℹ️    • src/basic-rules.rule.md
# ℹ️    • src/typescript-rules.rule.md  
# ℹ️    • src/cursor-config.rule.md
# ℹ️  
# 🚀 Starting compilation...
# ℹ️  ✓ Successfully compiled: basic-rules
# ℹ️  ✓ Successfully compiled: typescript-rules
# ℹ️  ✓ Successfully compiled: cursor-config
# ℹ️  📊 Compilation complete:
# ℹ️    • Compiled: 3 files
```

### Provider Filtering

```bash
# Find only TypeScript-related rules
rulesets --provider typescript

# Output:
# ℹ️  🔍 Auto-discovering rule files...
# ℹ️  📁 Found 1 rule file(s):
# ℹ️    • src/typescript-rules.rule.md
# ℹ️  🎯 Filtering by provider: typescript
```

### Debugging

```bash
# List files to see what would be compiled
rulesets list

# Output:
# ℹ️  🔍 Discovering rule files...
# ℹ️  📁 Found 2 rule file(s):
# ℹ️    • basic-rules
# ℹ️      Path: src/basic-rules.rule.md
# ℹ️      Full: /full/path/to/src/basic-rules.rule.md
# ℹ️    • typescript-rules
# ℹ️      Path: src/typescript-rules.rule.md
# ℹ️      Full: /full/path/to/src/typescript-rules.rule.md
```

## Current Limitations

- **Mock Compilation**: Currently shows `[MOCK]` compilation - actual compilation pending core package dependency fixes
- **Simple Provider Filtering**: Based on filename/path matching, not frontmatter parsing
- **No Configuration**: Limited configuration options (future enhancement)

## Future Enhancements

- Full compilation integration with `@rulesets/core`
- Frontmatter-based provider filtering
- Configuration file support
- Watch mode for development
- Better error reporting with line numbers
- Integration with VS Code/Cursor extensions