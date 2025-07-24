# Decision Log

## Format

- Current timestamp: use the command `date +"%Y-%m-%d %H:%M"`
- Wrap filenames in `backticks`
- Follow the format below, adding entries in chronological order:

  ```markdown
  ## YYYY-MM-DD

  - HH:mm » [Decision summary]: [Context] → [Rationale]
    - [Additional details if needed]
  ```

## 2025-07-23

- 12:45 » Decision log created: Need decision tracking → Centralized history
- 13:00 » Standardize on `AGENT.md` as universal source with filename-driven outputs: Single-file rules need consistent standard and remove `name` property → `AGENT.md` compiles to destination-specific names (`.cursor/rules/AGENT.mdc`, `CLAUDE.md`, `AGENTS.md`, etc.) keeping consistent naming
  - CONTEXT: Inspired by [AGENT.md](https://ampcode.com/AGENT.md) for the naming, but not taking the symlink approach
- 13:27 » Restructure to standard monorepo layout: Current structure mixes concerns → Split CLI to `apps/`, extract modules to scoped packages, reorganize docs, use `@rulesets/` prefix
  - Move CLI from core → `apps/cli/`
  - Extract parser, linter, destinations → separate `@rulesets/*` packages
  - Relocate decision log → `docs/decisions/`
  - Add dedicated `tests/` for cross-package testing

## 2025-07-24

- 09:56 » Consider dual installation options for Ruleset configuration: Need flexibility for future agent tooling → Primary: `.ruleset/config.json`, Alternative: `.agent/ruleset/ruleset.config.json` allowing `.agent` directory to host multiple tools and enable imports from `.agent` directory content
  - Primary option keeps current structure with `.ruleset` directory
  - Alternative consolidates under `.agent` for unified agent tooling location
  - Important: Allow importing content from `.agent` directory, not just `.ruleset/src`
  - Enables future expansion of `.agent` directory for other agent-related tools
- 09:57 » Standardize on Bun + Biome toolchain: Mixed tooling (ESLint/Biome, Vitest/Bun test) causes inconsistency → Migrate fully to Bun package manager with Biome 2.1.2 (ultracite config) for linting/formatting
  - Remove all ESLint dependencies and configurations
  - Migrate from Vitest to Bun's built-in test runner
  - Update Biome from 1.9.4 to 2.1.2 with ultracite config
  - Clean up remnants: `yarn.lock`, accidental `~` directory
  - Consider replacing tsup with Bun's bundler where appropriate
