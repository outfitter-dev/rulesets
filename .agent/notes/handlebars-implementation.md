# Handlebars Implementation Notes

_Implementation guide for Rulesets v0.2 Handlebars architecture_

## Overview

This document outlines the complete Handlebars implementation work done to transition Rulesets from v0.1 custom notation to v0.2 Handlebars-powered templating. The implementation represents a complete architectural shift toward modern, maintainable, and user-friendly template compilation.

## Executive Summary

### What Was Built

- **Clean Architecture**: Removed all v0.1 legacy code and backwards compatibility
- **Handlebars Engine**: Integrated official Handlebars.js with custom helpers
- **Auto-Discovery**: Automatic detection of `.rule.md` files without manual configuration
- **Provider System**: Simplified provider-aware compilation with filtering
- **Modern CLI**: Streamlined command interface with intuitive defaults

### Key Decisions

1. **No Backwards Compatibility**: Complete break from v0.1 for cleaner codebase
2. **Handlebars Standard**: Use official Handlebars.js instead of custom syntax
3. **Auto-Discovery**: Remove manual file specification requirements
4. **Provider Terminology**: Migrate from "destinations" to "providers"
5. **Single Orchestration**: Eliminate dual v0.1/v0.2 compilation paths

## Technical Implementation

### 1. Core Orchestration (packages/core/src/orchestration.ts)

**Replaced**: Complex dual-path v0.1/v0.2 orchestration
**With**: Clean, single-path Handlebars compilation

```typescript
// New clean API
export async function runRulesets(
  sourceFilePath: string,
  logger: Logger = new ConsoleLogger(),
  options: RulesetsOptions = {}
): Promise<void>;
```

**Key Features**:

- Single compilation path through Handlebars
- Provider filtering with `--provider` CLI flag
- Parallel compilation for multiple providers
- Enhanced debugging in development mode
- Automatic gitignore management

**Implementation Steps**:

1. Load and validate project configuration
2. Initialize Handlebars compiler with all providers
3. Parse source file (front matter + Markdown)
4. Perform linting and validation
5. Determine target providers (front matter → config → defaults → CLI filter)
6. Compile in parallel for each provider
7. Write output files via provider plugins
8. Update .gitignore with generated paths

### 2. Handlebars Integration (packages/compiler/)

**New Component**: HandlebarsRulesetCompiler
**Purpose**: Modern templating engine with provider awareness

**Custom Helpers Implemented**:

```handlebars
{{#if-provider 'cursor'}}Cursor-specific content{{/if-provider}}
{{#unless-provider 'claude-code'}}Non-Claude content{{/unless-provider}}
{{#switch-provider}}
  {{#case 'cursor,windsurf'}}IDE content{{/case}}
  {{#default}}Generic content{{/default}}
{{/switch-provider}}
```

**Context Variables Available**:

```handlebars
{{provider.id}}
# Current provider ID
{{provider.name}}
# Human-readable name
{{provider.type}}
# Provider type (ide, cli, extension)
{{project.name}}
# Project configuration
{{compilation.timestamp}}
# Build timestamp
{{title}}
# Front matter data
```

**Section Helpers**: Auto-generated helpers for semantic markup

```handlebars
{{#instructions}}...{{/instructions}}
→
<instructions>...</instructions>
{{#examples}}...{{/examples}}
→
<examples>...</examples>
```

### 3. CLI Simplification (apps/cli/src/index.ts)

**Removed**: `--handlebars` flag and dual compilation modes
**Added**: Auto-discovery with provider filtering

**New Command Structure**:

```bash
rulesets                    # Auto-discover and build all
rulesets --provider cursor  # Build for specific provider
rulesets --dev              # Development mode with debugging
```

**Auto-Discovery Implementation**:

```typescript
async function discoverSourceFiles(): Promise<string[]> {
  const sourceDir = '.ruleset/src';
  // Recursively find .rule.md files
  return glob(`${sourceDir}/**/*.rule.md`);
}
```

### 4. Provider System Refactoring

**Migration**: "Destinations" → "Providers" terminology throughout codebase
**Benefits**: Clearer naming, consistent with industry standards

**Provider Interface**:

```typescript
interface RulesetProvider {
  id: string;
  name: string;
  type: 'ide' | 'cli' | 'extension';
  capabilities: string[];
  config?: {
    outputPath?: string;
    postProcessor?: string;
  };
}
```

**Provider Registration**: Auto-discovery and registration system
**Provider Filtering**: CLI support for comma-separated provider lists

### 5. Partial System (packages/compiler/src/partials/)

**Feature**: `@` syntax for clean partial inclusion
**Example**: `{{> @typescript-rules}}` includes `.ruleset/src/_partials/typescript-rules.md`

**Implementation**:

- **PartialResolver**: Caching resolver for performance
- **Context Passing**: Variables passed to partial templates
- **Nested Support**: Partials can include other partials
- **Error Handling**: Clear error messages for missing partials

### 6. Configuration Modernization

**New Format**: Simplified `ruleset.config.json` for v0.2

```json
{
  "version": "0.2.0",
  "sourceDirectory": ".ruleset/src",
  "defaultProviders": ["cursor", "claude-code", "windsurf"],
  "providers": {
    "cursor": { "enabled": true, "outputPath": ".cursor/rules" }
  },
  "handlebars": { "cacheTemplates": true }
}
```

**Hierarchy**: Front matter > config file > CLI options > defaults

## Files Modified/Created

### Core Implementation Files

| File                                 | Status          | Purpose                                   |
| ------------------------------------ | --------------- | ----------------------------------------- |
| `packages/core/src/orchestration.ts` | **Created**     | Clean, single-path orchestration          |
| `packages/core/src/index.ts`         | **Rewritten**   | Removed legacy exports, clean API         |
| `apps/cli/src/index.ts`              | **Refactored**  | Auto-discovery, removed --handlebars flag |
| `packages/compiler/`                 | **New Package** | Handlebars compilation engine             |

### Deleted Legacy Files

- `packages/core/src/handlebars-orchestration.ts` (consolidated into orchestration.ts)
- `packages/core/src/migration.ts` (syntax conversion no longer needed)
- All v0.1 compilation paths and backwards compatibility code

### Documentation Updates

| File                           | Changes                                        |
| ------------------------------ | ---------------------------------------------- |
| `README.md`                    | Updated to v0.2 messaging, Handlebars examples |
| `docs/project/OVERVIEW.md`     | Complete rewrite: 1196 lines → 383 lines       |
| `docs/project/ARCHITECTURE.md` | Updated for v0.2 Handlebars architecture       |
| `docs/index.md`                | Modernized for v0.2 with quick start examples  |

## User Experience Improvements

### Before (v0.1)

```bash
# Complex dual compilation
rulesets build --handlebars file1.rule.md
rulesets build --v1 file2.md  # Legacy syntax
```

### After (v0.2)

```bash
# Simple auto-discovery
rulesets                      # Build everything
rulesets --provider cursor    # Build for specific provider
```

### Template Authoring

**Before (v0.1 Custom Syntax)**:

```markdown
{{instructions +cursor -claude-code}}
Content for cursor only
{{/instructions}}
```

**After (v0.2 Handlebars)**:

```handlebars
{{#instructions}}
  {{#if-provider 'cursor'}}
    Content for cursor only
  {{/if-provider}}
{{/instructions}}
```

## Development Workflow

### New Development Commands

```bash
rulesets --dev           # Enhanced debugging
rulesets --no-cache      # Disable template caching
rulesets init            # Initialize new project
rulesets migrate         # Import scattered rules
```

### Performance Features

- **Template Caching**: Compiled Handlebars templates cached for performance
- **Parallel Compilation**: Multiple providers built simultaneously
- **Development Metrics**: Performance timing in development mode

## Migration Strategy

### Breaking Changes

1. **No v0.1 syntax support**: Complete migration to Handlebars required
2. **Configuration format**: New `ruleset.config.json` structure
3. **Terminology**: "destinations" → "providers" throughout
4. **Auto-discovery**: Manual file specification removed

### Migration Command

```bash
rulesets migrate  # Import existing scattered rules into Rulesets format
```

**Note**: Migration concept changed from syntax conversion to importing scattered rule files from various tools.

## Architecture Benefits

### Maintainability

- **Single Code Path**: No legacy compatibility layers
- **Standard Templates**: Official Handlebars.js with full ecosystem
- **Clear Separation**: Orchestration, compilation, and provider logic separated

### Performance

- **Template Caching**: Significant performance improvement for repeated builds
- **Parallel Processing**: Multiple providers built simultaneously
- **Auto-Discovery**: No manual configuration required

### Developer Experience

- **IDE Support**: Full Handlebars IntelliSense and syntax highlighting
- **Rich Templating**: Variables, conditionals, loops, and custom helpers
- **Clear Errors**: Enhanced error reporting with line numbers and context

## Testing Strategy

### Approach

- **Integration Tests**: Full compilation pipeline testing
- **Unit Tests**: Individual component testing (parser, compiler, providers)
- **Example Projects**: Real-world usage validation

### Test Coverage

- ✅ Handlebars compilation with all helpers
- ✅ Provider filtering and selection
- ✅ Partial resolution and caching
- ✅ Error handling and reporting
- ✅ Configuration loading and validation

## Future Considerations

### Extensibility

- **Custom Helpers**: Easy addition of provider-specific helpers
- **Plugin Architecture**: Clean provider plugin interface
- **Template Validation**: Enhanced template syntax checking

### Performance

- **Incremental Builds**: Future consideration for large projects
- **Worker Threads**: Parallel compilation scaling
- **Memory Optimization**: Template cache management

### Features

- **Watch Mode**: File watching for development
- **Language Server**: VS Code extension for enhanced authoring
- **Template Debugging**: Advanced debugging tools

## Lessons Learned

### What Worked Well

1. **Clean Break**: Removing backwards compatibility simplified codebase significantly
2. **Standard Tools**: Using Handlebars.js provided immediate ecosystem benefits
3. **Auto-Discovery**: Eliminated configuration complexity for users
4. **Provider Terminology**: Clearer naming improved understanding

### Challenges Overcome

1. **NPM Registry Issues**: Network connectivity problems during development
2. **Complex Migration**: Significant codebase changes required careful coordination
3. **Template Context**: Providing rich context while maintaining performance

### Key Insights

1. **Simplicity Wins**: Auto-discovery eliminated most configuration needs
2. **Standard > Custom**: Handlebars ecosystem benefits outweigh custom syntax
3. **Clear Breaks**: Clean architectural breaks better than gradual migration
4. **User Feedback**: Direct feedback led to better flag design (removing --handlebars)

## Implementation Timeline

### Phase 1: Foundation (Completed)

- ✅ Handlebars compiler integration
- ✅ Custom helper implementation
- ✅ Partial resolution system

### Phase 2: Orchestration (Completed)

- ✅ Clean orchestration without legacy code
- ✅ Provider filtering and selection
- ✅ Auto-discovery implementation

### Phase 3: CLI & UX (Completed)

- ✅ Simplified CLI interface
- ✅ Auto-discovery mode as default
- ✅ Enhanced development debugging

### Phase 4: Documentation (Completed)

- ✅ Complete documentation rewrite
- ✅ Architecture documentation update
- ✅ User guide with Handlebars examples

## Technical Debt Removed

### Legacy Code Elimination

- **v0.1 Orchestration**: Removed dual compilation paths
- **Custom Syntax Parser**: Replaced with standard Handlebars
- **Manual Configuration**: Replaced with auto-discovery
- **Destination Terminology**: Consistent provider naming

### Code Quality Improvements

- **Type Safety**: Enhanced TypeScript types throughout
- **Error Handling**: Comprehensive error collection and reporting
- **Performance**: Template caching and parallel processing
- **Maintainability**: Clear separation of concerns

---

## Conclusion

The Handlebars implementation represents a complete modernization of Rulesets, transitioning from a custom notation system to a mature, industry-standard templating engine. The implementation prioritized simplicity, performance, and developer experience, resulting in a cleaner codebase and significantly improved user experience.

Key achievements:

- ✅ **Clean Architecture**: No legacy cruft, single compilation path
- ✅ **Modern Templating**: Full Handlebars.js ecosystem support
- ✅ **Auto-Discovery**: Zero-configuration operation
- ✅ **Enhanced UX**: Intuitive CLI with sensible defaults
- ✅ **Complete Documentation**: Comprehensive guides and examples

The v0.2 implementation establishes a solid foundation for future development while providing immediate benefits to users through simplified authoring and enhanced capabilities.

---

_Rulesets v0.2 Handlebars Implementation Notes_  
_Documenting the transition to modern AI rules compilation_
