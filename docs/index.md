# AI Rules Documentation

This documentation provides comprehensive information about how different AI coding assistants use rule files to maintain consistent behavior across sessions.

## Core Concepts

- [Rules Overview](./rules-overview.md) - Core concepts and comparison of different approaches

## Tool-Specific Documentation

### IDE Integrations

- [Cursor Rules System](./plugins/cursor/rules-use.md) - Multi-file system with YAML front-matter and nested rules
- [Windsurf Rules System](./plugins/windsurf/rules-use.md) - Multiple files with activation modes
- [Roo Code Rules System](./plugins/roo-code/rules-use.md) - Mode-specific directories

### CLI Tools

- [Claude Code Memory System](./plugins/claude-code/rules-use.md) - Hierarchical with @file imports
- [OpenAI Codex CLI System](./plugins/codex-cli/rules-use.md) - Layered instructions for terminal use
- [OpenAI Codex AGENTS System](./plugins/codex-agent/rules-use.md) - Section-based merging with hierarchical loading

### Other Implementations

- [Cline Rules System](./plugins/cline/rules-use.md) - Single file approach with plain text format
- [Aider Memory System](./plugins/aider/rules-use.md) - Manual memory inclusion with session persistence