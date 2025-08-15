---
name: handlebars-demo
version: 1.0.0
description: Demo of Handlebars-based Rulesets
project:
  name: Rulesets
  language: TypeScript
  framework: Node.js
---

# {{file.name}} v{{file.version}}

This is a demo of the new Handlebars-based Rulesets compiler for **{{project.name}}**.

{{#instructions}}

## General Guidelines

Follow these coding standards for {{project.language}} development:

- Use strict TypeScript settings
- Write comprehensive tests
- Follow existing patterns in the {{project.framework}} ecosystem

{{#if-provider "cursor,windsurf"}}

### IDE Configuration

Configure your IDE with these settings:

- Enable format on save
- Install recommended extensions
- Use the project's TypeScript configuration
  {{/if-provider}}

{{#if-provider "claude-code"}}

### CLI Workflow

When using Claude Code:

- Commit frequently with clear messages
- Use feature branches for all changes
- Run `bun test` before pushing
  {{/if-provider}}
  {{/instructions}}

{{#unless-provider "claude-code"}}
{{#ide-specific}}

## IDE-Specific Settings

Configure your development environment:

1. Open the project in your IDE
2. Install workspace recommendations
3. Configure debugging settings

For {{provider.name}}, refer to the official documentation.
{{/ide-specific}}
{{/unless-provider}}

{{#examples format="heading"}}
Here are some examples of good {{project.language}} code:

```typescript
// Type-safe function example
function processData<T>(data: T[]): T[] {
  return data.filter(Boolean);
}
```

This approach ensures type safety and follows {{project.language}} best practices.
{{/examples}}

{{#project-info format="raw"}}
Project: {{project.name}}
Language: {{project.language}}
Framework: {{project.framework}}
Provider: {{provider.id}} ({{provider.name}})
Compiled: {{timestamp}}
{{/project-info}}
