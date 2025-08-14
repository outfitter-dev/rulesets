# Rulesets Configuration System

The Rulesets configuration system provides flexible, hierarchical configuration management with support for multiple formats and comprehensive validation.

## Features

- **Multi-Format Support**: JSONC (with comments) and TOML configuration files
- **Hierarchical Discovery**: Automatic discovery from project → parent directories → global config
- **Schema Validation**: Comprehensive JSON Schema validation with detailed error reporting
- **Environment Overrides**: Support for `RULESETS_*` environment variables
- **Provider Management**: Enable/disable providers with custom settings
- **Gitignore Integration**: Automatic .gitignore management with configuration control

## Configuration Files

Configuration files are discovered in order of precedence (highest first):

1. `ruleset.config.jsonc` (preferred - supports comments)
2. `ruleset.config.json`
3. `ruleset.config.toml`
4. `.rulesetrc.jsonc`
5. `.rulesetrc.json`
6. `.rulesetrc.toml`

## Configuration Schema

### Basic Structure

```jsonc
{
  // Global settings
  "strict": true,
  "defaultProviders": ["cursor", "claude-code"],
  "outputDirectory": ".ruleset/dist",
  
  // Provider configurations
  "providers": {
    "cursor": {
      "enabled": true,
      "outputPath": ".cursor/rules/"
    }
  },
  
  // Gitignore management
  "gitignore": {
    "enabled": true,
    "keep": ["important.md"],
    "ignore": ["*.backup"]
  }
}
```

### Provider Configuration

```jsonc
{
  "providers": {
    "cursor": {
      "enabled": true,                    // Whether provider is enabled
      "outputPath": ".cursor/rules/",     // Custom output path
      "options": {                        // Provider-specific options
        "alwaysApply": false,
        "priority": "high"
      }
    }
  }
}
```

### Gitignore Configuration

```jsonc
{
  "gitignore": {
    "enabled": true,                      // Enable/disable gitignore management
    "keep": ["docs/manual.md"],           // Files to keep despite being generated
    "ignore": ["*.backup", "*.tmp"],      // Additional patterns to ignore
    "options": {
      "comment": "Generated Files",       // Custom comment for managed block
      "sort": true                        // Sort entries alphabetically
    }
  }
}
```

## Environment Variable Overrides

Override configuration using environment variables with the `RULESETS_` prefix:

```bash
# Global settings
export RULESETS_STRICT=true
export RULESETS_OUTPUT_DIRECTORY="/custom/output"

# Provider settings
export RULESETS_PROVIDERS_CURSOR_ENABLED=true
export RULESETS_PROVIDERS_CLAUDE_CODE_OUTPUT_PATH="AI_RULES.md"

# Gitignore settings
export RULESETS_GITIGNORE_ENABLED=false
```

## Usage Examples

### Minimal Configuration

```jsonc
{
  "providers": {
    "cursor": { "enabled": true },
    "claude-code": { "enabled": true }
  }
}
```

### Team Configuration

```toml
# Team-wide settings
strict = true
defaultProviders = ["cursor", "claude-code"]

[gitignore]
enabled = true
keep = ["docs/manual-rules.md"]
ignore = ["*.backup", "*.tmp"]

[providers.cursor]
enabled = true
outputPath = ".cursor/rules/"

[providers."claude-code"]
enabled = true
outputPath = "CLAUDE.md"
```

### Project Override

```jsonc
{
  // Override team settings for this project
  "strict": false,
  "providers": {
    "windsurf": {
      "enabled": true,
      "outputPath": ".windsurf/rules/"
    }
  }
}
```

## Programmatic Usage

```typescript
import { loadConfig, ConfigLoader } from '@rulesets/core';

// Load configuration for a project
const result = await loadConfig('/path/to/project');

// Check for errors
if (result.errors) {
  console.error('Configuration errors:', result.errors);
}

// Use the configuration
const config = result.config;
console.log('Enabled providers:', 
  Object.entries(config.providers || {})
    .filter(([_, cfg]) => cfg.enabled !== false)
    .map(([id]) => id)
);

// Create custom loader
const loader = new ConfigLoader(logger);
const customResult = await loader.loadConfig({
  projectPath: '/path/to/project',
  env: process.env
});
```

## Known Providers

The configuration system recognizes these providers:

- `cursor` - Cursor IDE
- `claude-code` - Claude Code CLI
- `windsurf` - Windsurf IDE
- `roo-code` - Roo Code VS Code Extension
- `cline` - Cline VS Code Extension
- `codex-cli` - OpenAI Codex CLI
- `codex-agent` - OpenAI Codex Agent

## Integration with Orchestration

The configuration system is automatically integrated into the main `runRulesetsV0` function:

1. **Configuration Loading**: Automatically discovers and loads configuration files
2. **Provider Selection**: Uses configuration to determine which providers to enable
3. **Output Paths**: Respects custom output paths from configuration
4. **Gitignore Management**: Uses gitignore settings for automatic file management
5. **Error Handling**: Validates configuration and reports errors/warnings

## Configuration Precedence

Configuration values are merged in this order (later values override earlier ones):

1. **Default Configuration**: Built-in defaults
2. **Global Configuration**: User's global config directory
3. **Project Configuration**: Project-specific config files
4. **Environment Variables**: `RULESETS_*` environment variables
5. **Runtime Overrides**: Programmatic overrides passed to `runRulesetsV0`

This flexible system allows for team-wide defaults, project-specific customizations, and individual developer preferences.
