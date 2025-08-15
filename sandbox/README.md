# Rulesets Sandbox

This sandbox provides a safe environment to experiment with Rulesets compilation and explore different examples.

## Quick Start

```bash
# Try a basic example
bun sandbox/run.ts examples/basic-rules.ruleset.md

# Try the complete example
bun sandbox/run.ts examples/complete-example.ruleset.md

# Try the TypeScript coding standards
bun sandbox/run.ts examples/typescript-rules.ruleset.md

# Try the React component guidelines
bun sandbox/run.ts examples/react-guidelines.ruleset.md
```

## How It Works

1. **Source files** (`examples/`) contain your ruleset definitions
2. **Run script** (`run.ts`) processes them with the Rulesets core
3. **Output** goes to `sandbox/output/` (automatically cleaned)
4. **Configuration** can be customized in `sandbox.config.jsonc`

## Available Examples

### `basic-rules.ruleset.md`

Simple example with instructions and examples blocks.

### `complete-example.ruleset.md`

Comprehensive example showing all Rulesets features including:

- Multiple block types
- Provider-specific configuration
- Variable usage
- Import statements

### `typescript-rules.ruleset.md`

Real-world TypeScript coding standards for development teams.

### `react-guidelines.ruleset.md`

React component development guidelines with examples.

## Sandbox Configuration

Edit `sandbox.config.jsonc` to customize:

- Enabled providers
- Output directory
- Gitignore behavior
- Debug logging

## Output Structure

```
sandbox/output/
├── cursor/           # Cursor IDE rules
├── claude-code/      # Claude Code rules  
├── windsurf/         # Windsurf IDE rules
├── amp/              # AMP rules
└── codex/            # OpenAI Codex rules
```

## Cleaning Up

```bash
# Clean sandbox output
bun sandbox/clean.ts

# Reset to fresh state
bun sandbox/reset.ts
```

## Experimenting

1. Copy an example: `cp examples/basic-rules.ruleset.md examples/my-experiment.ruleset.md`
2. Edit your copy with your own rules
3. Run it: `bun sandbox/run.ts examples/my-experiment.ruleset.md`
4. Check the output in `sandbox/output/`

The sandbox is completely isolated and won't affect your main project!
