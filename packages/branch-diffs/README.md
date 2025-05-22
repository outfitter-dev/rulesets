# Branch Diffs

A CLI tool for comparing git branches and generating comprehensive diff reports. Perfect for evaluating multiple implementations or reviewing feature branches against a target.

## Overview

Branch Diffs creates markdown reports that compare multiple branches against a target branch (typically `main`). Each comparison includes both summary statistics and full patch details in a clean, readable format.

## What it does

- Compares multiple branches against a target branch
- Generates reports in multiple formats:
  - **JSON format** - structured data with metadata, statistics, and full patch content
  - **Markdown format** - human-readable with collapsible sections and proper code fencing
- Advanced branch discovery:
  - **Named patterns** - predefined groups like `agents`, `features`, `fixes`
  - **Manual patterns** - ad-hoc matching with include/exclude syntax (`codex/*,!*/old-*`)
  - **Version-aware matching** - semantic version patterns (`v0`, `0.1.x`, `1.2.3`)
  - **Scope control** - filter local, remote, or all branches
- Flexible formatting system:
  - **Format levels** - summary (overview) or detailed (full patches)
  - **Grouping options** - by branch, file, directory, type, or size
  - **Output styles** - compact or full metadata for JSON/Markdown
  - **Named templates** - predefined combinations for common workflows
  - **Configurable limits** - control file counts, patch sizes, and content length
- Features include:
  - Compact file change summaries (`git diff --stat --compact-summary`)
  - Full patch diffs with configurable context
  - Smart exclusions for build artifacts and snapshots
  - Timestamped filenames with customizable formats
  - Configurable output directories and delimiters
- Outputs consolidated reports perfect for AI agent evaluation

## Current Implementation

Based on a simple TypeScript script that:

```typescript
// Takes target branch (defaults to "main") and comparison branches
const target = process.argv[2] || "main";
const branches = process.argv.slice(3);

// Generates markdown with stats and full patches
// Excludes dist/** and *.snap files
// Outputs to branch-diffs.md
```

**Strengths:**
- Simple, focused functionality
- Clean markdown output with proper code fencing
- Smart file exclusions
- Collapsible patch details for readability

**Enhanced Features:**
- **Flexible configuration** via `branch-diffs.config.json`
- **Dual output formats** - JSON and Markdown with style controls
- **Advanced formatting system** with templates, grouping, and limits
- **Timestamped filenames** with customizable formats and delimiters
- **Configurable exclusion patterns** and diff options
- **Structured data types** for programmatic consumption
- **Advanced pattern matching** with named patterns, manual patterns, and version-aware filtering
- **Comprehensive branch discovery** across local and remote branches

**Current Limitations:**
- Report generation not yet implemented (CLI framework ready)
- No interactive branch selection (planned for future)
- No git command validation or error recovery

## Installation

```bash
# From monorepo root
pnpm install

# Build the package
cd packages/branch-diffs
pnpm build
```

## Usage

### Branch Discovery

```bash
# Compare specific branches against default target (from config)
pnpm run feature/branch-1 feature/branch-2

# Compare against different target
pnpm run --target dev hotfix/critical-bug

# Filter all branches (local + remote) containing "v0" - uses default target
pnpm run --filter v0

# Use named pattern from config
pnpm run --pattern agents

# Manual pattern matching with include/exclude syntax
pnpm run --match "codex/*,jules/*,!*/old-*"

# Version-aware pattern matching
pnpm run --version v0
pnpm run --version 0.1
pnpm run --version 1.2.x

# Filter only local branches
pnpm run --filter v0 --scope local

# Filter only remote branches  
pnpm run --filter agent --scope remote
```

### Output Formatting

```bash
# Use predefined templates
pnpm run --template agent-review --version v0
pnpm run --template ci-summary --pattern agents

# Control format and grouping
pnpm run --format summary --group file --version v0
pnpm run --format detailed --group size --pattern agents

# Specify output styles
pnpm run --json compact --markdown full --version v0
pnpm run --json full --group directory --pattern features

# Set limits
pnpm run --max-files 20 --max-branches 5 --version v0
pnpm run --template agent-review --max-lines 500

# Combine all options
pnpm run --target dev --version v0 --scope remote --format summary --group file --json compact

# Or run directly after building
node dist/cli.js --target main --match "copilot/*,!*/deprecated" --template ci-summary
```

## Future

### Interactive CLI Tool

Plan to build a rich interactive CLI using **Ink** (React for CLI) with:

#### Branch Selection Interface
- **Multi-select branch picker** - checkbox interface for selecting comparison branches
- **Target branch selector** - dropdown or autocomplete for target branch
- **Remote branch support** - option to include origin/* branches
- **Branch filtering** - search/filter branches by pattern (e.g., `feature/*`, `agent/*`)

#### Enhanced Configuration
- **Custom exclusion patterns** - interactive setup for ignore rules
- **Output customization** - choose filename, format options
- **Diff context controls** - adjust context lines, word-diff options
- **Report templates** - predefined formats for different use cases

#### Smart Features
- **Branch validation** - check branch existence before processing
- **Progress indicators** - show current processing status
- **Real-time preview** - preview report structure before generation
- **Batch operations** - save/load branch selection sets

#### Advanced Diff Options
- **Multiple output formats** - markdown, HTML, JSON
- **Selective file diffing** - include/exclude specific file patterns
- **Diff algorithms** - choose between different git diff strategies
- **Side-by-side comparisons** - alternative diff presentation

#### Integration Features
- **Git hooks integration** - auto-generate reports on branch events
- **CI/CD integration** - export for automated review processes
- **Template customization** - user-defined markdown templates
- **Report archiving** - maintain history of comparison reports

### Technical Architecture

```
src/
├── cli/
│   ├── app.tsx           # Main Ink app component
│   ├── components/       # UI components (branch selector, progress, etc.)
│   └── hooks/           # Custom hooks for git operations
├── core/
│   ├── git.ts           # Git command wrappers
│   ├── diff.ts          # Diff processing logic
│   └── report.ts        # Report generation
├── config/
│   └── settings.ts      # User configuration management
└── types/
    └── index.ts         # TypeScript definitions
```

This interactive approach will make the tool much more user-friendly for complex branch comparison scenarios, especially when evaluating multiple AI agent implementations or reviewing large feature sets.