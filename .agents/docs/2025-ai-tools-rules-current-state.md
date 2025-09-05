# AI Coding Assistant Rules Files - Current State (2025)

## Overview
As of late 2025, the AI coding assistant ecosystem has evolved significantly with most tools adopting file-based, version-controlled configuration systems. This document reflects the verified current state of how various tools handle rules and instructions.

## Universal Standard

### AGENTS.md
- **Status**: Emerging universal standard, formalized August 2025
- **Adoption**: 20,000+ GitHub projects
- **Location**: Project root
- **Support**: 15+ tools including OpenAI Codex, Cursor, Cline, Roo Code, and others
- **Repository**: github.com/openai/agents.md
- **Description**: "README for agents" - a predictable location for AI-specific instructions

## Tool-Specific Implementations

### Claude Code
- **Primary Format**: `CLAUDE.md` (project root)
- **Slash Commands**: `.claude/commands/` directory
  - Project-scoped: `.claude/commands/`
  - User-scoped: `~/.claude/commands/`
  - Format: Markdown files with frontmatter support
  - Features: Arguments, bash integration, extended thinking
- **Global Config**: `~/.claude/CLAUDE.md`
- **Status**: Fully implemented with rich slash command system

### Cursor
- **Current Format**: `.cursorrules` (deprecated but supported)
- **New Format**: `.cursor/rules/` directory
  - File format: `.mdc` (MDC format with metadata)
  - Features: Path scoping, manual/auto inclusion
  - Nested rules in subdirectories
- **Migration Status**: In progress, recommending migration to new system
- **Note**: New rules only active in Agent mode currently

### Windsurf
- **Format**: `.windsurf/rules/` directory
- **Limitations**: 
  - 6,000 characters per file
  - 12,000 total characters (global + local)
- **Activation Modes**: Manual, Always On, Model Decision
- **Features**: Workspace-specific and global rules

### Cline
- **Format**: `.clinerules` file or `.clinerules/` directory
- **Structure**: Multiple markdown files for organization
- **Features**: 
  - Version-controlled
  - AI-editable
  - VSCode extension support ("Cline Rules")
- **Status**: Deprecated text box UI in favor of file-based system (June 2025)

### Roo Code (Codeium)
- **Format**: `.roo/rules/` directory
- **Mode-specific**: `.roo/rules-{modeSlug}/` directories
- **Features**: 
  - Recursive file reading
  - Alphabetical ordering
  - AGENTS.md support
- **Release**: v3.11.9 (April 2025)

### GitHub Copilot
- **Primary**: `.github/copilot-instructions.md`
- **Extended**: `.github/instructions/*.instructions.md`
- **Features**: 
  - YAML frontmatter for file/directory scoping
  - Repository-level configuration
  - Code review integration (GA August 2025)
- **Also Supports**: AGENTS.md, CLAUDE.md, GEMINI.md

### Zed Editor
- **Format**: `.rules` file (project root)
- **Library**: Rules Library (replaced Prompt Library)
- **Limitations**: 
  - Single file only (no granularity)
  - Manual rule selection from library
  - No @-mentions support yet
- **Status**: Functional but less flexible than other implementations

### OpenAI Codex CLI
- **Tool Type**: Terminal-based coding agent (not just rules support)
- **Installation**: `npm install -g @openai/codex`
- **Config**: `~/.codex/config.toml`
- **Features**: 
  - MCP server support
  - Local execution
  - Multimodal inputs
  - Zero source code transmission
- **Release**: April 2025

## Common Patterns

### File Organization Trends
1. **Directory-based**: Most tools moving to directories over single files
2. **Markdown format**: Universal preference for `.md` files
3. **Frontmatter**: YAML metadata for configuration
4. **Hierarchical**: Support for nested/scoped rules

### Version Control Benefits
- Git trackable
- History and rollback capability
- PR review for rule changes
- Team collaboration

### AI Integration Features
- Rules are AI-editable (Cline, others)
- Slash command support (Claude Code)
- Dynamic inclusion based on context
- Model decision-based activation (Windsurf)

## Migration Trends

### From Single Files to Directories
- Cursor: `.cursorrules` → `.cursor/rules/`
- Cline: Custom text box → `.clinerules/`

### Toward Universal Standards
- Many tools adding AGENTS.md support alongside proprietary formats
- GitHub Copilot supporting multiple formats
- Roo Code explicitly supporting both `.roo/rules/` and AGENTS.md

## Implementation Priorities for Rulesets Project

Based on current adoption patterns:

1. **AGENTS.md** - Primary universal format (highest priority)
2. **CLAUDE.md** - Claude Code with slash commands
3. **GitHub Copilot** - `.github/copilot-instructions.md`
4. **Cursor** - Both `.cursorrules` and `.cursor/rules/`
5. **Windsurf** - `.windsurf/rules/`
6. **Cline** - `.clinerules`
7. **Roo Code** - `.roo/rules/`
8. **Zed** - `.rules`

## Key Considerations

### Character/Size Limits
- Windsurf: 6k per file, 12k total
- Others: Generally unlimited or unspecified

### Activation Methods
- Always active (most tools)
- Manual selection (Zed Library)
- Model decision (Windsurf)
- Path-based scoping (Cursor, Copilot)

### Format Requirements
- Markdown (universal)
- MDC format (Cursor)
- YAML frontmatter (optional but common)

---

*Last Updated: December 2025*
*Based on verified documentation and official sources*