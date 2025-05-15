# Markdown Linting Integration

## Overview

This document outlines how Mixdown integrates with markdown linting tools (particularly markdownlint) and provides configuration options for controlling stylistic elements like line breaks after headings.

## Core Concepts

1. **Lint-aware transformations**: Mixdown's output format respects common markdown linting rules
2. **User-configurable options**: Provide user-friendly configuration that maps to underlying lint rules
3. **Override hierarchy**: Clear precedence for global, per-mix, and per-track settings

## Configuration Options

### Heading Style Options

```yaml
---
mixdown:
  markdown:
    style:
      heading_blank_lines: "after"   # Options: "none", "before", "after", "both"
      list_indentation: 2            # Number of spaces for list indentation (default: 2)
      code_block_style: "fenced"     # Options: "fenced", "indented"
      emphasis_style: "asterisk"     # Options: "asterisk", "underscore"
      strong_style: "asterisk"       # Options: "asterisk", "underscore"
---
```

These user-friendly options map to underlying markdownlint rules and are applied during transformation.

### Line Break Control Options

```yaml
---
mixdown:
  heading:
    line_breaks:
      before: true    # Insert blank line before heading (default: true)
      after: true      # Insert blank line after heading (default: true)
---
```

In context with other settings:

```yaml
---
mixdown:
  heading:
    level:
      min: 2
      max: 5
    case: "title"
    line_breaks:
      before: true
      after: true
  markdown:
    style:
      heading_blank_lines: "after"
---
```

### Global Configuration (mixdown.config.json)

```json
{
  "output": {
    "heading": {
      "level": {
        "min": 2,
        "max": 5
      },
      "case": "title",
      "line_breaks": {
        "before": false,
        "after": true
      }
    },
    "markdown": {
      "style": {
        "heading_blank_lines": "after",
        "list_indentation": 2
      },
      "lint": {
        "enabled": true,
        "rules": {
          "MD012": false,  // no-multiple-blanks
          "MD022": true,   // blanks-around-headings
          "MD023": true    // heading-start-left
        }
      }
    }
  }
}
```

## Relationship with markdownlint

Mixdown provides a simplified interface to common markdown style concerns, while also allowing direct control over specific markdownlint rules.

### Simplified-to-markdownlint Mapping

| Mixdown Setting | markdownlint Rule |
|-----------------|-------------------|
| `heading_blank_lines: "after"` | MD022 (blanks-around-headings) |
| `list_indentation: 2` | MD007 (ul-indent) |
| `code_block_style: "fenced"` | MD046 (code-block-style) |
| `emphasis_style: "asterisk"` | MD049 (emphasis-style) |
| `strong_style: "asterisk"` | MD050 (strong-style) |

### Precedence Rules

1. **Track-level settings**: Options specified directly in track notation
2. **Mix-level settings**: Frontmatter settings for the specific mix file
3. **Global settings**: Project-wide settings in mixdown.config.json
4. **Defaults**: Built-in defaults designed to follow common markdown conventions

## Implementation Considerations

### Line Break Handling

When generating output with headings, the processor must respect line break settings:

```markdown
# With line_breaks.after: true (default)

## Heading

Content starts here.

# With line_breaks.after: false

## Heading
Content starts here.
```

### Example Implementations

**Default Implementation (line_breaks.after: true)**:

```markdown
{{instructions output="heading"}}
- Follow these guidelines
- Use consistent formatting
{{/instructions}}
```

Renders as:

```markdown
## Instructions

- Follow these guidelines
- Use consistent formatting
```

**Compact Implementation (line_breaks.after: false)**:

```markdown
{{instructions output="heading" line_breaks.after=false}}
- Follow these guidelines
- Use consistent formatting
{{/instructions}}
```

Renders as:

```markdown
## Instructions
- Follow these guidelines
- Use consistent formatting
```

## Integration with Existing Linting Workflows

Mixdown aims to produce outputs that work well with existing markdown linting tools. When differences between Mixdown's style choices and a project's linting rules exist, there are three approaches:

1. **Adjust Mixdown settings** to match the project's linting expectations
2. **Configure markdownlint** to accept Mixdown's output (via .markdownlint.json)
3. **Override specific rules** in Mixdown's configuration

## Benefits

1. **Consistent markdown**: Outputs follow established markdown conventions
2. **User-friendly controls**: Simple, descriptive configuration options
3. **Linting compatibility**: Works well with existing linting workflows
4. **Flexibility**: Can override specific rules when needed

## Future Enhancements

1. **Linting rule generation**: Automatically generate .markdownlint.json based on Mixdown settings
2. **Style validation**: Test mix files against linting rules before compilation
3. **Style correction**: Optionally correct style issues during compilation
4. **Additional style controls**: Expand to cover more markdown formatting concerns