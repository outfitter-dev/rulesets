# Heading-Based Output Format Proposal

## Overview

Adding a heading-based output format would allow users to represent nested structural elements as Markdown headings instead of XML tags. This approach is particularly useful for documentation formats or tools that render Markdown headings as structural elements.

## Core Concept

I propose adding a new `heading` output format with optional level specification (defaulting to the block's nesting level), along with frontmatter/config settings to control minimum/maximum heading levels and text case transformation.

## Proposed Format Properties

Add the following output value within a block:

| Value                                  | Description                                                             |
| -------------------------------------- | ----------------------------------------------------------------------- |
| `heading`                              | Render block as a Markdown heading instead of XML tags                  |
| `heading="3"`                          | Specify exact heading level                                             |
| `heading="inc"`                        | Increment heading level by 1 from parent/default level                  |
| `heading="dec"`                        | Decrement heading level by 1 from parent/default level (never below h1) |
| `heading="same"`                       | Keep the same heading level as parent/previous block                    |
| `heading="replace"`                    | Replace the first heading in the content with a block name heading      |
| `h-1` to `h-6`                         | Shorthand for exact heading levels (h-1, h-2, h-3, h-4, h-5, h-6)       |
| `h-inc`                                | Shorthand for incrementing heading level                                |
| `h-dec`                                | Shorthand for decrementing heading level                                |
| `h-same`                               | Shorthand for keeping the same heading level                            |
| `numbering`                            | Enable sequential numbering of blocks based on position and hierarchy   |
| `numbering="heading:before tag:after"` | Control where numbering appears in output formats                       |
| `"Example $n"`                         | Use `$n` variable in quoted strings for automatic sequential numbering  |

## Implementation Details

### 1. Basic Heading Format

```markdown
{{block-name heading}}
This content will be preceded by a heading based on the block name
{{/block-name}}
```

This would output:

```markdown
## Block Name

This content will be preceded by a heading based on the block name
```

### 2. Explicit Heading Level

Users can specify an exact heading level:

```markdown
{{block-name heading="3"}}
This content will use an h3 heading regardless of nesting
{{/block-name}}

<!-- Or using the shorthand notation -->

{{block-name h-3}}
This content will also use an h3 heading
{{/block-name}}
```

This would output:

```markdown
### Block Name

This content will use an h3 heading regardless of nesting

### Block Name

This content will also use an h3 heading
```

### 3. Nested Block Heading Calculation

When blocks are nested, the heading level would automatically increment based on the nesting depth (unless explicitly overridden):

```markdown
{{outer-block heading}}
Outer content

{{inner-block heading}}
Inner content
{{/inner-block}}

{{another-inner heading}}

Another inner section

{{nested-again heading}}
Nesting more content
{{/nested-again}}

{{/another-inner}}

{{/outer-block}}
```

With the `heading` property applied to all blocks, this would output:

```markdown
## Outer Block

Outer content

### Inner Block

Inner content

### Another Inner

Another inner section

#### Nested Again

Nesting more content
```

### 4. Heading Level Configuration

In frontmatter or config file:

```yaml
---
ruleset:
  heading:
    level:
      min: 2 # Minimum heading level to start at (default: 2)
      max: 5 # Maximum heading level (default: 5, capped at 6)
    case: 'title' # Optional: block name case transformation
    line_breaks:
      before: true # Insert blank line before heading (default: true)
      after: true # Insert blank line after heading (default: true)
---
```

### 5. Simplified Heading-Only Syntax

A simplified syntax using only quoted strings allows for quick heading creation without XML tags:

```markdown
{{"Section Title"}}
Content for this section goes here.
{{/"Section Title"}}
```

Would output:

```markdown
## Section Title

Content for this section goes here.
```

This shorthand automatically applies heading formatting and makes the opinionated choice of using Markdown headings vs. XML tags.

### 6. Nested XML to Headings Conversion

When embedded blocks use different output formats, maintain proper structure:

```markdown
{{outer-block heading}}
Outer content

{{inner-block}}
Inner content with XML tags
{{/inner-block}}

{{another-inner h-4}}
Another inner section with explicit heading level
{{/another-inner}}

{{third-inner h-4}}
Third inner section with shorthand heading notation
{{/third-inner}}

{{/outer-block}}
```

Would output:

```markdown
## Outer Block

Outer content

<inner_block>
Inner content with XML tags
</inner_block>

#### Another Inner

Another inner section with explicit heading level

#### Third Inner

Third inner section with shorthand heading notation
```

## Configuration Properties

### Global Configuration (ruleset.config.json)

```json
{
  "ruleset": {
    "heading": {
      "level": {
        "min": 2,
        "max": 5
      },
      "case": "title",
      "line_breaks": {
        "before": true,
        "after": true
      }
    },
    "block": {
      "numbering": {
        "heading": "before",
        "tag": "after",
        "children": 3,
        "separator": "."
      }
    }
  }
}
```

### Per-Ruleset Configuration (frontmatter)

```yaml
---
ruleset:
  heading:
    level:
      min: 2 # Minimum heading level to start at (default: 2)
      max: 5 # Maximum heading level (default: 5, capped at 6)
    case: 'title' # Optional: block name case transformation
    line_breaks:
      before: true # Insert blank line before heading (default: true)
      after: true # Insert blank line after heading (default: true)
  block:
    numbering:
      heading: 'before' # before, after, or none
      tag: 'after' # before, after, or none
      children: 3 # max depth for hierarchical numbering
      separator: '.' # separator between numbers (e.g., 1.[2.3])
---
```

### Heading Text Case Properties

- `title`: Title Case (`block-name` → `# Block Name`)
- `sentence`: Sentence case (`block-name` → `# Block name`)
- `lower`: lowercase (`block-name` → `# block name`)
- `upper`: UPPERCASE (`block-name` → `# BLOCK NAME`)
- `kebab`: Original form (`block-name` → `# block-name`)
- `space`: Spaces for hyphens (`block-name` → `# block name`)

## Edge Cases and Handling

1. **Heading Level Range**:
   - Heading levels respect `level.min` (default: 2) and `level.max` (default: 5).
   - If nesting would exceed `level.max`, the level is capped.
   - If nesting would exceed h6 (the maximum Markdown heading level), it's capped at h6.
2. **Heading Content**: If a block has a `name` property, that would be used for the heading text instead of the block name.
3. **Empty Blocks**: If a block has no content, it would still generate a heading, but implementations might choose to handle this differently.
4. **Content With Existing Headings**: When using `heading="replace"`, special handling is needed:

   ```markdown
   {{block-name heading="replace"}}

   # Existing Heading

   This content has an existing heading that will be replaced with the block name
   {{/block-name}}
   ```

   Would output:

   ```markdown
   # Block Name

   This content has an existing heading that will be replaced with the block name
   ```

   If there are no headings to replace, a new heading would be added at the beginning.

5. **Simple Heading Structure**: Keep headings simple and focused on content structure:

   ```markdown
   {{block-name output="heading"}}
   Content
   {{/block-name}}
   ```

   Would output:

   ```markdown
   ## Block Name

   Content
   ```

6. **Quoted String Heading Derivation**: When using the simplified `{{"Heading"}}` syntax:
   - XML tag string is derived from heading (e.g., `{{"Getting Started"}}` → `<getting_started>`)
   - Nesting is automatically determined for proper heading levels
   - No XML tags appear in the output
   - Configuration properties like `level` and `case` still apply
   - `#` characters are not supported within quoted titles

## Sequential Numbering

Sequential numbering allows blocks to be automatically numbered based on their position and relationship to other blocks. This feature is especially useful for creating structured documents with hierarchical sections.

### 1. Basic Numbering

To enable numbering on a block, use the `numbering` property:

```markdown
{{chapter numbering}}
Chapter content (becomes "1. Chapter" with heading output)
{{/chapter}}

{{chapter numbering}}
Next chapter content (becomes "2. Chapter" with heading output)
{{/chapter}}
```

### 2. Numbering Placement Properties

Control where numbering appears in output:

```markdown
{{section numbering="heading:before tag:after"}}
Section content
{{/section}}
```

| Property         | Description                                     |
| ---------------- | ----------------------------------------------- |
| `heading:before` | Place number before heading text ("1. Section") |
| `heading:after`  | Place number after heading text ("Section 1")   |
| `heading:none`   | No numbering in headings                        |
| `tag:before`     | Place number before tag string (`<1_section>`)  |
| `tag:after`      | Place number after tag string (`<section_1>`)   |
| `tag:none`       | No numbering in tags                            |

### 3. Hierarchical Numbering

Numbering can reflect the hierarchical structure of nested blocks:

```markdown
{{chapter numbering}}
Chapter content (becomes "1. Chapter")

{{section}}
Section content (becomes "1.1 Section")

{{subsection}}
Subsection content (becomes "1.1.1 Subsection")
{{/subsection}}
{{/section}}
{{/chapter}}
```

### 4. Quoted String Syntax with Numbering

The simplified quoted string syntax also supports numbering. The `$n` variable is replaced inline with a number value based on the block's position in the parent block.

```markdown
{{"Example $n"}}
Content for the first example
{{/"Example $n"}}

{{"Example $n"}}
Content for the second example
{{/"Example $n"}}
```

Would render as:

```markdown
## Example 1

Content for the first example

## Example 2

Content for the second example
```

Note: When including `$n` within a quoted string, if you'd like it to be rendered as-is, you'll need to escape it with a backslash: `{{"Example \$n"}}`.

The `$n` variable works with hierarchical numbering as well:

```markdown
{{chapter numbering}}
Chapter 1

{{"Section $n"}}
This renders as "Section 1.1"

{{"Subsection $n"}}
This renders as "Subsection 1.1.1"
{{/"Subsection $n"}}
{{/"Section $n"}}
{{/chapter}}
```

### 5. Numbering Configuration

Control numbering globally or per-ruleset:

```yaml
ruleset:
  block:
    numbering:
      heading: 'before' # before, after, or none
      tag: 'after' # before, after, or none
      children: 3 # max depth for hierarchical numbering
      separator: '.' # separator between numbers (e.g., 1.[2.3])
```

## Implementation Considerations

1. The processor would need to determine nesting depth for each block when rendering.
2. Configuration merging (global → destination → ruleset → block) would need clear precedence rules.
3. Heading transformation would need to happen at render time to account for various transformations.
4. Line break handling should respect both configuration and markdown linting standards:
   - By default, follow markdownlint rule MD022 (blanks-around-headings)
   - Allow overriding through `line_breaks` settings
   - Provide inline control with block properties: `heading line_breaks.after=false`
5. Quoted string heading syntax should:
   - Create a derived block name (e.g., `{{"Getting Started"}}` → `getting-started`)
   - Automatically apply heading formatting without XML tags
   - Respect heading nesting based on parent-child relationships
   - Provide the simplest way to create documentation
6. Block numbering should:
   - Be configurable at multiple levels (global, ruleset, block)
   - Support different formats for headings and tags
   - Handle hierarchical relationships automatically
   - Respect max depth settings to prevent overly complex number strings

## Examples

### Basic Usage

```markdown
{{instructions heading}}

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

### Replace First Heading

```markdown
{{implementation-details heading="replace"}}

# Implementation

This section covers details about how to implement the feature.
The implementation should follow these principles...
{{/implementation-details}}
```

Renders as:

```markdown
# Implementation Details

This section covers details about how to implement the feature.
The implementation should follow these principles...
```

### Mixed Format Usage

```markdown
{{project-details heading="1"}}

## Project Overview

{{key-features}}
The project includes the following features:

- Feature 1
- Feature 2
  {{/key-features}}

{{requirements heading}}
System requirements:

- Requirement 1
- Requirement 2
  {{/requirements}}

{{/project-details}}
```

Renders as:

```markdown
# Project Details

## Project Overview

<key_features>
The project includes the following features:

- Feature 1
- Feature 2
  </key_features>

## Requirements

System requirements:

- Requirement 1
- Requirement 2
```

### Simplified Heading Syntax

````markdown
{{"Getting Started"}}
This section explains how to get started with the project.

{{"Installation"}}
First, install the dependencies:

```bash
npm install
```
````

{{/"Installation"}}

{{"Configuration"}}
Next, configure your environment...
{{/"Configuration"}}

{{/"Getting Started"}}

````text

Renders as:

```markdown
## Getting Started

This section explains how to get started with the project.

### Installation

First, install the dependencies:

```bash
npm install
````

```text

### Configuration

Next, configure your environment...
```
