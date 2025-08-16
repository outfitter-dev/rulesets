---
title: Advanced Handlebars Features Demo
version: 2.0.0
project:
  name: Rulesets
  language: TypeScript
  framework: Bun
  features:
    testing: vitest
    linting: biome
    formatting: prettier
variables:
  strictMode: true
  maxFileSize: "100kb"
  codeStyle: "functional"
custom:
  team: "Outfitter Dev Team"
  priority: "high"
  reviewRequired: true
---

# {{file.name}} v{{file.version}}

> Advanced Handlebars templating demonstration for {{project.name}}

## Provider-Specific Configuration

{{#switch-provider}}
  {{#case "cursor,windsurf"}}
    {{#ide-configuration}}
    ### IDE Configuration for {{provider.name}}
    
    {{#has-capability "workspaces"}}
    #### Workspace Settings
    - Enable format on save
    - Configure workspace-level settings
    - Set up project-specific extensions
    {{/has-capability}}
    
    {{#has-capability "debugging"}}
    #### Debug Configuration
    - Set breakpoint preferences
    - Configure launch configurations
    - Enable inline debugging
    {{/has-capability}}
    
    {{#if (eq provider.id "cursor")}}
    #### Cursor-Specific Features
    - Enable AI pair programming
    - Configure custom keybindings
    - Set up Composer workflows
    {{/if}}
    {{/ide-configuration}}
  {{/case}}
  
  {{#case "claude-code"}}
    {{#cli-configuration}}
    ### CLI Configuration for {{provider.name}}
    
    {{#has-capability "scripting"}}
    #### Script Automation
    - Set up pre-commit hooks
    - Configure build scripts
    - Enable watch mode for development
    {{/has-capability}}
    
    {{#has-capability "automation"}}
    #### Workflow Automation
    - Configure CI/CD integration
    - Set up automated testing
    - Enable deployment pipelines
    {{/has-capability}}
    {{/cli-configuration}}
  {{/case}}
  
  {{#default}}
    {{#generic-configuration}}
    ### Generic Configuration
    
    Basic setup for {{provider.name}} ({{provider.type}})
    
    Available capabilities:
    {{#each provider.capabilities}}
    - {{this}}
    {{/each}}
    {{/generic-configuration}}
  {{/default}}
{{/switch-provider}}

## Project Standards

{{#coding-standards}}
### {{project.name}} Coding Standards

**Language**: {{project.language}}  
**Framework**: {{project.framework}}  
**Code Style**: {{variables.codeStyle}}

{{#if (and variables.strictMode (eq project.language "TypeScript"))}}
#### Strict TypeScript Configuration
- Enable `strictNullChecks`
- Use `noImplicitAny`
- Enforce branded types
- Maximum function length: 50 lines
{{/if}}

{{#if (or (eq project.framework "React") (eq project.framework "Vue"))}}
#### Frontend Framework Guidelines
- Use functional components
- Implement proper error boundaries
- Follow accessibility standards (WCAG AA)
- Optimize for performance
{{/if}}

#### Testing Requirements
{{#if project.features.testing}}
- Testing framework: {{project.features.testing}}
- Minimum coverage: 80%
- Test all exported functions
- Write integration tests for critical paths
{{/if}}

#### Code Quality Tools
{{#if (and project.features.linting project.features.formatting)}}
- Linting: {{project.features.linting}}
- Formatting: {{project.features.formatting}}
- Pre-commit hooks enabled
- Automated quality checks in CI
{{/if}}
{{/coding-standards}}

## File Size and Performance

{{#performance-guidelines}}
### Performance Guidelines

{{#if variables.maxFileSize}}
**Maximum file size**: {{variables.maxFileSize}}
{{/if}}

{{#if (eq variables.codeStyle "functional")}}
#### Functional Programming Guidelines
- Prefer pure functions
- Avoid mutable state
- Use immutable data structures
- Implement proper error handling with Result types
{{/if}}

{{#has-capability "workspaces"}}
#### Workspace Performance
- Configure workspace indexing
- Optimize file watching
- Set up efficient search patterns
{{/has-capability}}
{{/performance-guidelines}}

## Team Configuration

{{#team-guidelines}}
### Team Guidelines

**Team**: {{custom.team}}  
**Priority Level**: {{custom.priority}}

{{#if custom.reviewRequired}}
#### Code Review Requirements
- All PRs require review
- Use conventional commit messages
- Include comprehensive test coverage
- Update documentation for API changes
{{/if}}

{{#if (eq custom.priority "high")}}
#### High Priority Project Requirements
- Daily standups required
- Weekly progress reports
- Immediate response to critical issues
- Continuous integration monitoring
{{/if}}
{{/team-guidelines}}

## Advanced Conditional Logic

{{#advanced-examples}}
### Complex Template Logic Examples

{{#if (or (eq provider.type "ide") (and (eq provider.type "cli") (has-capability "automation")))}}
#### Advanced Tooling Available
This provider supports advanced development workflows.
{{/if}}

{{#if (and variables.strictMode (or (eq project.language "TypeScript") (eq project.language "Rust")))}}
#### Type-Safe Development
Strong typing is enforced for this project configuration.
{{/if}}

{{#unless (eq provider.id "generic")}}
#### Provider-Specific Optimizations
Optimizations available for {{provider.name}}.
{{/unless}}
{{/advanced-examples}}

---

*Generated by Handlebars Rulesets v{{rulesetVersion}} at {{timestamp}}*  
*Provider: {{provider.name}} ({{provider.id}})*  
*Configuration: {{file.path}}*