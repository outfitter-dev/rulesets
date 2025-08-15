# Rulesets Sandbox

Interactive environment for testing and exploring Rulesets compilation in a **realistic project structure**. This sandbox mirrors how Rulesets would be used in actual projects with proper `.agent/` directories and provider-specific output locations.

## 🏗️ Project Structure

This sandbox demonstrates a realistic monorepo setup:

```
📁 sandbox/
├── 🤖 .agent/                    # Rulesets configuration
│   ├── 📝 src/                   # Source rulesets (.rule.md files)
│   └── ⚙️  ruleset.config.jsonc  # Configuration
├── 📱 apps/                      # Applications
│   ├── web/ (Next.js)            # Frontend app
│   └── api/ (Fastify)            # Backend API
├── 📦 packages/                  # Shared packages
│   ├── ui/ (React components)
│   └── utils/ (Shared utilities)
└── Generated files:
    ├── 🎯 .cursor/rules/         # Cursor IDE rules
    ├── 🌊 .windsurf/rules.md     # Windsurf IDE rules
    ├── 📄 CLAUDE.md              # Claude Code rules
    ├── 📄 AMP.md                 # AMP rules
    └── 📄 CODEX.md               # Codex rules
```

## Quick Start

```bash
# Navigate to sandbox
cd apps/sandbox

# Install dependencies
bun install

# Show project structure
bun run start structure

# List available rulesets
bun run start examples

# Compile TypeScript standards to all providers
bun run start run .agent/src/typescript-standards.rule.md

# Create your own ruleset
bun run start init my-team-standards

# Clean generated files
bun run start clean
```

## Commands

### `run <file>`

Compile a ruleset file and generate output for all providers.

```bash
bun run start run examples/typescript-rules.ruleset.md
bun run start run examples/react-guidelines.ruleset.md --output ./custom-output
```

### `examples`

List all available example files.

```bash
bun run start examples
```

### `init [name]`

Create a new example ruleset file.

```bash
bun run start init my-team-rules
# Creates examples/my-team-rules.ruleset.md
```

### `clean`

Remove all generated output files.

```bash
bun run start clean
```

## Available Examples

### `basic-rules.ruleset.md`

Simple example showing fundamental Rulesets features like instructions and examples blocks.

### `typescript-rules.ruleset.md`

Professional TypeScript coding standards including:

- Type safety requirements
- Error handling patterns
- Code organization guidelines
- Configuration recommendations

### `react-guidelines.ruleset.md`

Modern React development best practices covering:

- Component architecture
- Performance optimization
- State management patterns
- Testing strategies

### `complete-example.ruleset.md`

Comprehensive showcase of all Rulesets v0.1 features including:

- Multiple block types
- Provider-specific configuration
- Anti-patterns to avoid
- Design patterns and references

## Output Structure

After running examples, check the `output/` directory:

```
output/
├── cursor/           # Cursor IDE rules (.mdc)
├── claude-code/      # Claude Code rules (.md)
├── windsurf/         # Windsurf IDE rules  
├── amp/              # AMP rules
└── codex/            # OpenAI Codex rules
```

## Creating Custom Examples

1. **Start with a template:**

   ```bash
   bun run start init my-experiment
   ```

2. **Edit the generated file:**

   ```bash
   # Edit examples/my-experiment.ruleset.md
   # Add your own rules, examples, and configuration
   ```

3. **Test compilation:**

   ```bash
   bun run start run examples/my-experiment.ruleset.md
   ```

4. **Check the output:**

   ```bash
   ls output/*/
   ```

## Sandbox Benefits

- **Isolated Environment** - Won't affect your main project
- **No Gitignore Changes** - Sandbox doesn't modify .gitignore files
- **Multiple Providers** - Test output across all supported tools
- **Instant Feedback** - See compilation results immediately
- **Easy Cleanup** - Reset to clean state anytime

## Development Workflow

Perfect for:

- **Testing new ruleset ideas** before adding them to your project
- **Learning Rulesets syntax** with immediate feedback
- **Demonstrating features** to team members
- **Debugging ruleset compilation** issues
- **Exploring provider differences** side-by-side

## Next Steps

Once you're happy with a ruleset in the sandbox:

1. Copy it to your project's `.ruleset/src/` directory
2. Add it to your project's compilation pipeline
3. Configure providers as needed for your project

The sandbox is your playground - experiment freely!
