# Global Rulesets Architecture

## Vision

Create a powerful, user-friendly system for managing and deploying AI coding assistant rules across projects, with intelligent detection, composability, and selective deployment.

## Core Concepts

### 1. Global Rulesets Directory

**Location Priority:**
1. `~/.rulesets/` (default)
2. `$XDG_CONFIG_HOME/rulesets/` (Linux/Unix standard)
3. `~/Library/Application Support/rulesets/` (macOS alternative)

**Directory Structure:**
```
~/.rulesets/
├── config.toml                 # Global configuration
├── sets/                        # Named rule sets
│   ├── typescript/
│   │   ├── rules.md
│   │   ├── meta.toml          # Set metadata & dependencies
│   │   └── commands/           # Slash commands for this set
│   ├── bun/
│   │   ├── rules.md
│   │   ├── meta.toml
│   │   └── extends: ["typescript"]  # Composition
│   ├── rust/
│   │   ├── rules.md
│   │   └── meta.toml
│   └── react/
│       ├── rules.md
│       ├── meta.toml
│       └── extends: ["typescript"]
├── packs/                       # Curated bundles
│   ├── fullstack-ts/
│   │   └── pack.toml           # References multiple sets
│   └── systems/
│       └── pack.toml
└── commands/                    # Global slash commands
    ├── commit.md
    └── review.md
```

### 2. Configuration System

**config.toml:**
```toml
[rulesets]
version = "1.0.0"
default_destination = "agents-md"  # Primary format

[defaults]
# Default settings for new projects
auto_detect = true
auto_suggest = true
install_location = "project"  # or "global"

[destinations]
# Override default paths for specific tools
claude_code_global = "~/.claude/CLAUDE.md"
claude_code_commands = "~/.claude/commands/"

[detection]
# File patterns that trigger set suggestions
[detection.patterns]
"package.json" = ["typescript", "node"]
"cargo.toml" = ["rust"]
"requirements.txt" = ["python"]
"go.mod" = ["go"]
"Gemfile" = ["ruby"]

[detection.dependencies]
# Package-specific rule suggestions
"@types/react" = ["react"]
"vitest" = ["testing-vitest"]
"jest" = ["testing-jest"]
"express" = ["express"]
"hono" = ["hono"]
```

### 3. Set Metadata

**sets/typescript/meta.toml:**
```toml
[set]
name = "TypeScript"
version = "1.0.0"
description = "TypeScript development rules with strict typing"
author = "@galligan"
tags = ["typescript", "javascript", "frontend", "backend"]

[extends]
# Inherit from other sets (composability)
sets = []

[requires]
# Dependencies that should also be installed
sets = ["eslint", "prettier"]
optional = ["react", "node"]

[detection]
# Additional detection patterns for this set
files = ["tsconfig.json", "*.ts", "*.tsx"]
packages = ["typescript", "@types/node"]

[destinations]
# Set-specific destination preferences
preferred = ["agents-md", "claude-code", "cursor"]
```

### 4. Composable Rules

**Composition Strategies:**
- **Inheritance**: Sets can extend other sets
- **Merging**: Multiple sets can be combined
- **Overrides**: Later sets override earlier ones
- **Conditional**: Rules can be conditionally included

**Example Composition:**
```toml
# bun/meta.toml
[extends]
sets = ["typescript", "node"]

[overrides]
# Override specific rules from parent sets
"typescript.strict" = false
"node.version" = "latest"

[additions]
# Add bun-specific rules on top
rules = """
- Use Bun.file() instead of fs.readFile()
- Prefer Bun.serve() over Express/Hono for simple servers
"""
```

### 5. CLI Commands

**Global Management:**
```bash
# Initialize global rulesets directory
rulesets init --global

# List available sets
rulesets list
rulesets list --global
rulesets list --packs

# Install a set globally (to ~/.rulesets/sets/)
rulesets install typescript --global
rulesets install @galligan/typescript  # From registry

# Create a new set
rulesets create my-rules --global
```

**Project Management:**
```bash
# Install sets to current project
rulesets install typescript
rulesets install typescript,bun,react  # Multiple at once
rulesets install fullstack-ts --pack  # Install a pack

# Auto-detect and suggest
rulesets detect
# Output: Detected: package.json, tsconfig.json
# Suggested sets: typescript, node, react

# Auto-install detected sets
rulesets detect --auto-install

# Update project rules from global
rulesets sync
rulesets sync typescript  # Specific set only

# Generate rules for specific destinations
rulesets generate --dest claude-code
rulesets generate --dest all
```

**Slash Command Management:**
```bash
# Install slash commands
rulesets commands install commit
rulesets commands install --all
rulesets commands list

# Create custom command
rulesets commands create my-command
```

### 6. Project Detection

**Auto-Detection Flow:**
1. Scan project for marker files
2. Parse package.json/cargo.toml/etc for dependencies
3. Match against detection patterns
4. Suggest relevant sets
5. Show installation options

**Smart Detection Examples:**
- Sees `package.json` + `@types/react` → Suggests: typescript, react
- Sees `cargo.toml` + `tokio` → Suggests: rust, async-rust
- Sees `Dockerfile` + `docker-compose.yml` → Suggests: docker, containers
- Sees `.github/workflows/` → Suggests: github-actions

### 7. Installation Strategies

**Non-Symlink Management:**
- Rules are copied, not symlinked
- Tracked in `.rulesets/installed.toml`
- Can be synced/updated from global
- Supports version pinning

**.rulesets/installed.toml:**
```toml
[installed]
typescript = { version = "1.0.0", source = "global" }
bun = { version = "1.2.0", source = "global" }
react = { version = "2.0.0", source = "@galligan/react" }

[modified]
# Track which rules have been locally modified
"typescript/rules.md" = true
```

### 8. Registry Integration (Future)

**NPM-style Registry:**
```bash
# Publish a ruleset
rulesets publish typescript

# Install from registry
rulesets install @galligan/typescript
rulesets install @tanstack/react-query-rules

# Search registry
rulesets search react
```

### 9. Pack System

**packs/fullstack-ts/pack.toml:**
```toml
[pack]
name = "Full-Stack TypeScript"
version = "1.0.0"
description = "Complete setup for TypeScript full-stack development"

[includes]
sets = [
  "typescript",
  "node",
  "react",
  "next",
  "tailwind",
  "postgres",
  "testing-vitest"
]

[commands]
# Slash commands to include
commands = [
  "commit",
  "review",
  "test",
  "deploy"
]

[configuration]
# Override configurations for this pack
typescript.strict = true
react.version = "18"
```

### 10. Integration with AI Tools

**Claude Code Integration:**
- Deploy to `~/.claude/CLAUDE.md` for global rules
- Deploy to `.claude/commands/` for slash commands
- Support project-specific overrides

**Multi-Tool Deployment:**
```bash
# Generate for all tools
rulesets generate --all

# Selective generation
rulesets generate --tools claude-code,cursor,github-copilot
```

## Implementation Phases

### Phase 1: Foundation
- [x] Document architecture
- [ ] Implement global directory detection
- [ ] Create config.toml parser
- [ ] Build basic CLI structure

### Phase 2: Core Features
- [ ] Implement set management
- [ ] Add project detection
- [ ] Build installation system
- [ ] Create sync mechanism

### Phase 3: Advanced Features
- [ ] Add composability/inheritance
- [ ] Implement pack system
- [ ] Build slash command management
- [ ] Add auto-detection

### Phase 4: Ecosystem
- [ ] Create registry system
- [ ] Add publishing mechanism
- [ ] Build community features
- [ ] Implement versioning

## Benefits

1. **Reduced Context Bloat**: Only install relevant rules per project
2. **Consistency**: Maintain standard rulesets across projects
3. **Composability**: Mix and match rules as needed
4. **Discoverability**: Auto-detect and suggest appropriate rules
5. **Maintainability**: Update global rules and sync to projects
6. **Community**: Share and discover rulesets

## Example Workflows

### New Project Setup
```bash
$ cd my-new-project
$ rulesets detect
> Detected: package.json (React, TypeScript, Vitest)
> Suggested sets: typescript, react, testing-vitest
> Install suggested sets? [Y/n] y
> Installing to: .claude/CLAUDE.md, .cursor/rules/, AGENTS.md
> ✓ Installed 3 sets successfully
```

### Global Rule Update
```bash
$ rulesets update typescript --global
> Updated TypeScript rules to v1.2.0
$ rulesets sync typescript --all-projects
> Found 12 projects using TypeScript rules
> Sync to all projects? [Y/n] y
> ✓ Synced to 12 projects
```

### Custom Pack Creation
```bash
$ rulesets pack create my-stack
> Creating pack: my-stack
> Select sets to include:
  [x] typescript
  [x] bun
  [x] hono
  [ ] react
> Pack created: ~/.rulesets/packs/my-stack/
```

## Technical Considerations

1. **File Watching**: Watch for changes in global rules
2. **Diff Management**: Show diffs when syncing
3. **Conflict Resolution**: Handle modified local rules
4. **Performance**: Cache detection results
5. **Compatibility**: Support multiple OS paths
6. **Security**: Validate rules before installation