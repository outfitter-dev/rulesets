---
title: Phase 3 Partial System Demo
version: 3.0.0
project:
  name: Advanced Rulesets
  language: TypeScript
  type: library
variables:
  enableSecurity: true
  testingRequired: true
  strictMode: true
custom:
  maintainer: 'Rulesets Team'
  reviewLevel: 'comprehensive'
---

# {{file.name}} v{{file.version}}

> Demonstration of Handlebars Phase 3 Features: Partial Resolution and File Inclusion

## Project Overview

**Project**: {{project.name}}  
**Language**: {{project.language}}  
**Type**: {{project.type}}  
**Maintainer**: {{custom.maintainer}}

## Language-Specific Standards

{{#if (eq project.language "TypeScript")}}
{{#typescript-standards}}

### TypeScript Development Standards

{{> @typescript-rules}}

{{#if variables.strictMode}}

#### Additional Strict Mode Requirements

- Enable all strict compiler options
- Use branded types for domain modeling
- Implement exhaustive pattern matching
- Zero tolerance for `any` types
  {{/if}}
  {{/typescript-standards}}
  {{/if}}

## Quality Assurance

{{#if variables.testingRequired}}
{{#testing-requirements}}

### Testing Requirements

{{> @testing-guidelines}}

#### Project-Specific Testing Rules

- Test coverage must exceed 90% for {{project.type}} projects
- All public APIs require integration tests
- Performance tests for critical paths
- Security tests for input validation
  {{/testing-requirements}}
  {{/if}}

## Security Requirements

{{#if variables.enableSecurity}}
{{#security-standards}}

### Security Standards

{{> @security-checklist}}

{{#if (eq custom.reviewLevel "comprehensive")}}

#### Comprehensive Security Review Process

1. Automated security scanning in CI/CD
2. Manual security review for all changes
3. Penetration testing for major releases
4. Regular dependency vulnerability audits
5. Security training for all team members
   {{/if}}
   {{/security-standards}}
   {{/if}}

## Provider-Specific Configuration

{{#switch-provider}}
{{#case "cursor"}}
{{#cursor-configuration}} ### Cursor IDE Configuration

    #### File Associations
    - `.rule.md` files open with Markdown preview
    - Auto-format on save enabled
    - Handlebars syntax highlighting configured

    #### Extensions Required
    - Handlebars Language Server
    - Markdown All in One
    - TypeScript Hero (for TS projects)

    #### Workspace Settings
    ```json
    {
      "files.associations": {
        "*.rule.md": "handlebars"
      },
      "handlebars.suggest.html": false,
      "editor.formatOnSave": true
    }
    ```
    {{/cursor-configuration}}

{{/case}}

{{#case "claude-code"}}
{{#claude-configuration}} ### Claude Code CLI Configuration

    #### Build Integration
    - Compile rulesets before each commit
    - Validate all partials exist and compile
    - Check for circular dependencies

    #### Automation Scripts
    ```bash
    # Validate all rulesets
    claude-code compile --validate-only

    # Watch mode for development
    claude-code compile --watch --partial-dir=_partials

    # Production build with optimization
    claude-code compile --optimize --minify
    ```
    {{/claude-configuration}}

{{/case}}

{{#default}}
{{#generic-configuration}} ### Generic Configuration

    Basic partial resolution setup for {{provider.name}}:

    1. Configure partial directory: `.ruleset/src/_partials/`
    2. Enable file watching for partial changes
    3. Set up compilation pipeline with post-processing
    4. Implement caching for performance
    {{/generic-configuration}}

{{/default}}
{{/switch-provider}}

## Advanced Partial Features

{{#advanced-partials}}

### Dynamic Partial Inclusion

{{#if (has-capability "file-system")}}

#### File System Integration

The current provider supports file system operations, enabling:

- Dynamic partial discovery
- Recursive partial inclusion
- Real-time partial updates
- Dependency tracking between partials
  {{/if}}

{{#if (and variables.testingRequired (eq project.language "TypeScript"))}}

#### Conditional Partial Loading

```handlebars
{{!-- Include TypeScript-specific testing rules --}}
{{> @typescript-testing}}

{{!-- Include general testing guidelines --}}
{{> @testing-guidelines}}

{{!-- Conditionally include security testing --}}
{{#if variables.enableSecurity}}
{{> @security-testing}}
{{/if}}
```

{{/if}}

### Partial Composition Patterns

#### Layered Configuration

```handlebars
{{!-- Base layer --}}
{{> @base-standards}}

{{!-- Language layer --}}
{{> @{{project.language}}-rules}}

{{!-- Project type layer --}}
{{> @{{project.type}}-guidelines}}

{{!-- Custom overrides --}}
{{#if custom.hasCustomRules}}
{{> @custom-rules}}
{{/if}}
```

#### Context-Aware Partials

```handlebars
{{!-- Partials can access the full context --}}
{{> @provider-specific/{{provider.id}}-config}}

{{!-- Partials with parameters --}}
{{> @component-template language=project.language version=file.version}}
```

{{/advanced-partials}}

## Post-Processing Examples

{{#post-processing-demo}}

### Provider-Specific Post-Processing

{{#if (eq provider.id "cursor")}}

#### Cursor (.mdc) Post-Processing

- Convert `[link](file.md)` → `[link](file.mdc)`
- Ensure relative paths start with `./`
- Optimize for Cursor's markdown rendering
  {{/if}}

{{#if (eq provider.id "claude-code")}}

#### Claude Code Post-Processing

- Add file reference comments for debugging
- Limit heading depth to 6 levels maximum
- Include compilation timestamp and metadata
  {{/if}}

#### Custom Post-Processing

Providers can implement custom post-processors for:

- Link rewriting and path resolution
- Content optimization and minification
- Provider-specific formatting rules
- Integration with external tools
  {{/post-processing-demo}}

## Performance Considerations

{{#performance-notes}}

### Partial Resolution Performance

#### Caching Strategy

- Partials are cached after first resolution
- Cache keys include context for context-sensitive partials
- Cache invalidation on file system changes
- Memory-efficient LRU cache implementation

#### Optimization Tips

1. Use `@partial` syntax for partials in `_partials/`
2. Avoid deep nesting of partial includes
3. Consider partial precompilation for production
4. Monitor cache hit rates in development

#### Performance Metrics

- Partial resolution: ~1ms per cached partial
- File system lookup: ~5ms per uncached partial
- Template compilation: ~10ms per template
- Post-processing: ~2ms per provider
  {{/performance-notes}}

---

## Summary

This demonstration showcases the complete Phase 3 implementation:

✅ **Partial Resolution**: `@syntax` for \_partials/ directory  
✅ **File Inclusion**: `{{> path/to/file.md}}` with context  
✅ **Post-Processing**: Provider-specific content optimization  
✅ **Caching**: Performance-optimized partial loading  
✅ **Error Handling**: Graceful fallbacks for missing partials

The partial system enables:

- **Modular Content**: Reusable components across rulesets
- **Context Awareness**: Partials can access full template context
- **Provider Optimization**: Content tailored for each tool
- **Performance**: Intelligent caching and optimization
- **Flexibility**: Multiple resolution strategies

_Generated by Handlebars Rulesets v{{rulesetVersion}} at {{timestamp}}_  
_Partials resolved from: {{file.path}}\_partials/_  
_Post-processed for: {{provider.name}} ({{provider.id}})_
