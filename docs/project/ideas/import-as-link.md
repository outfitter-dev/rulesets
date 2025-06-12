# Import as Link

This document outlines the design for an "import as link" feature in Mixdown, allowing imports to be rendered as inline content in some destinations and as links in others.

## Overview

Currently, imports using `{{> file-name }}` always include the complete content of the referenced file or stem. This proposal introduces a way to render imports as links in specific destinations, providing flexibility in how reference materials are presented.

## Use Cases

1. **Documentation Hub**: Reference the same guidelines from multiple source rules files, with some destinations showing full content and others showing links.
2. **Cross-References**: Create references between related rules files without duplicating content.
3. **Space Optimization**: Keep compiled rules concise by linking to detailed content rather than including it inline.

## Syntax

The feature uses the `inline-link` property, which can be destination-scoped:

```markdown
{{> conventions cursor:inline-link}}
{{> conventions cursor:inline-link("Coding Standards")}}
{{> conventions +cursor:inline-link}}
```

### Behavior

- Without the `inline-link` property, imports behave as they do today, including the full content
- With `inline-link`, content is replaced with a link formatted according to destination conventions
- Optional parameter in parentheses provides custom link text

## Destination-Specific Rendering

Each destination would have a default link format template:

| Destination | Default Link Format | Example Output |
|-------------|---------------------|----------------|
| Cursor | `[{filename}]({prefix}:{path})` | `[conventions.mdc](mdc:path/to/conventions.mdc)` |
| Claude Code | `@{path}` | `@path/to/conventions.md` |
| Windsurf | `[{filename}]({path})` | `[conventions.md](path/to/conventions.md)` |

With custom link text:

| Destination | With Custom Text | Example Output |
|-------------|------------------|----------------|
| Cursor | `[{text}]({prefix}:{path})` | `[Coding Standards](mdc:path/to/conventions.mdc)` |
| Claude Code | `@{text} <{path}>` | `@Coding Standards <path/to/conventions.md>` |
| Windsurf | `[{text}]({path})` | `[Coding Standards](path/to/conventions.md)` |

## Configuration

Destination plugins define link format templates in their configuration:

```json
{
  "destinations": {
    "cursor": {
      "linkFormat": {
        "default": "[{filename}](mdc:{path})",
        "custom": "[{text}](mdc:{path})"
      }
    },
    "claude-code": {
      "linkFormat": {
        "default": "@{path}",
        "custom": "@{text} <{path}>"
      }
    }
  }
}
```

## Variables Available in Link Templates

| Variable | Description | Example |
|----------|-------------|---------|
| `{filename}` | Name of the referenced file with extension | `conventions.mdc` |
| `{basename}` | Name of the referenced file without extension | `conventions` |
| `{path}` | Full path to the referenced file | `path/to/conventions.mdc` |
| `{relativePath}` | Path relative to current file | `../rules/conventions.mdc` |
| `{text}` | Custom link text (if provided) | `Coding Standards` |
| `{prefix}` | Destination-specific prefix | `mdc` |

## Implementation Considerations

1. **Path Resolution**: When compiling to different destinations, paths need to be adjusted to reflect the compiled location.
2. **Stem References**: For imports referencing specific stems (`{{> file#stem-name}}`), link should point to the file but potentially include an anchor/fragment.
3. **File Existence**: Compiler should validate that referenced files exist during compilation.
4. **Variable Expansion**: Variables in link text should be expanded (`{{> file inline-link("Guidelines for {{$destination}}")}}`)

## Benefits

- Maintains clear, consistent notation using the existing property system
- Provides fine-grained control over content rendering by destination
- Enables better organization of rules without content duplication
- Leverages destination knowledge to create properly formatted links

## Limitations

- Links may break if file paths change
- Users navigating via links need a way to return to the original context
- Some destinations may not support link navigation

## Next Steps

1. Define the specific link format for each supported destination
2. Implement path resolution for compiled destinations
3. Add configuration options to the destination plugin system
4. Document the feature in the main Mixdown documentation