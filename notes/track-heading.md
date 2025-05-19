# Heading-Based Output Format Proposal

## Overview

Adding a heading-based output format would allow users to represent nested structural elements as Markdown headings instead of XML tags. This approach is particularly useful for documentation formats or tools that render Markdown headings as structural elements.

## Core Concept

I propose adding a new `heading` output format with optional level specification (defaulting to the track's nesting level), along with frontmatter/config settings to control minimum/maximum heading levels and text case transformation.

## Proposed Format Options

Add the following output value within a track:

| Value | Description |
|-------|-------------|
| `heading` | Render track as a Markdown heading instead of XML tags |
| `heading="3"` | Specify exact heading level |
| `heading="inc"` | Increment heading level by 1 from parent/default level |
| `heading="dec"` | Decrement heading level by 1 from parent/default level (never below h1) |
| `heading="same"` | Keep the same heading level as parent/previous track |
| `heading="replace"` | Replace the first heading in the content with a track name heading |
| `h-1` to `h-6` | Shorthand for exact heading levels (h-1, h-2, h-3, h-4, h-5, h-6) |
| `h-inc` | Shorthand for incrementing heading level |
| `h-dec` | Shorthand for decrementing heading level |
| `h-same` | Shorthand for keeping the same heading level |
| `numbering` | Enable sequential numbering of tracks based on position and hierarchy |
| `numbering="heading:before tag:after"` | Control where numbering appears in output formats |
| `"Example $n"` | Use `$n` variable in quoted strings for automatic sequential numbering |

## Implementation Details

### 1. Basic Heading Format

```markdown
{{track-name heading}}
This content will be preceded by a heading based on the track name
{{/track-name}}
```

This would output:

```markdown
## Track Name

This content will be preceded by a heading based on the track name
```

### 2. Explicit Heading Level

Users can specify an exact heading level:

```markdown
{{track-name heading="3"}}
This content will use an h3 heading regardless of nesting
{{/track-name}}

<!-- Or using the shorthand notation -->
{{track-name h-3}}
This content will also use an h3 heading
{{/track-name}}
```

This would output:

```markdown
### Track Name

This content will use an h3 heading regardless of nesting

### Track Name

This content will also use an h3 heading
```

### 3. Nested Track Heading Calculation

When tracks are nested, the heading level would automatically increment based on the nesting depth (unless explicitly overridden):

```markdown
{{outer-track heading}}
Outer content

{{inner-track heading}}
Inner content
{{/inner-track}}

{{another-inner heading}}

Another inner section

{{nested-again heading}}
Nesting more content
{{/nested-again}}

{{/another-inner}}

{{/outer-track}}
```

With the `heading` option applied to all tracks, this would output:

```markdown
## Outer Track

Outer content

### Inner Track

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
mixdown:
  heading:
    level:
      min: 2      # Minimum heading level to start at (default: 2)
      max: 5      # Maximum heading level (default: 5, capped at 6)
    case: "title" # Optional: track name case transformation
    line_breaks:
      before: true # Insert blank line before heading (default: true)
      after: true   # Insert blank line after heading (default: true)
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

When embedded tracks use different output formats, maintain proper structure:

```markdown
{{outer-track heading}}
Outer content

{{inner-track}}
Inner content with XML tags
{{/inner-track}}

{{another-inner h-4}}
Another inner section with explicit heading level
{{/another-inner}}

{{third-inner h-4}}
Third inner section with shorthand heading notation
{{/third-inner}}

{{/outer-track}}
```

Would output:

```markdown
## Outer Track

Outer content

<inner_track>
Inner content with XML tags
</inner_track>

#### Another Inner

Another inner section with explicit heading level

#### Third Inner

Third inner section with shorthand heading notation
```

## Configuration Options

### Global Configuration (mixdown.config.json)

```json
{
  "mix": {
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
    "track": {
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

### Per-Mix Configuration (frontmatter)

```yaml
---
mixdown:
  heading:
    level:
      min: 2             # Minimum heading level to start at (default: 2)
      max: 5             # Maximum heading level (default: 5, capped at 6)
    case: "title"        # Optional: track name case transformation
    line_breaks:
      before: true       # Insert blank line before heading (default: true)
      after: true        # Insert blank line after heading (default: true)
  track:
    numbering:
      heading: "before"     # before, after, or none
      tag: "after"          # before, after, or none
      children: 3           # max depth for hierarchical numbering
      separator: "."        # separator between numbers (e.g., 1.[2.3])
---
```

### Heading Text Case Options

- `title`: Title Case (`track-name` → `# Track Name`)
- `sentence`: Sentence case (`track-name` → `# Track name`)
- `lower`: lowercase (`track-name` → `# track name`)
- `upper`: UPPERCASE (`track-name` → `# TRACK NAME`)
- `kebab`: Original form (`track-name` → `# track-name`)
- `space`: Spaces for hyphens (`track-name` → `# track name`)

## Edge Cases and Handling

1. **Heading Level Range**:
   - Heading levels respect `level.min` (default: 2) and `level.max` (default: 5).
   - If nesting would exceed `level.max`, the level is capped.
   - If nesting would exceed h6 (the maximum Markdown heading level), it's capped at h6.
2. **Heading Content**: If a track has a `name` option, that would be used for the heading text instead of the track name.
3. **Empty Tracks**: If a track has no content, it would still generate a heading, but implementations might choose to handle this differently.
4. **Content With Existing Headings**: When using `heading="replace"`, special handling is needed:

   ```markdown
   {{track-name heading="replace"}}
   # Existing Heading

   This content has an existing heading that will be replaced with the track name
   {{/track-name}}
   ```

   Would output:

   ```markdown
   # Track Name

   This content has an existing heading that will be replaced with the track name
   ```

   If there are no headings to replace, a new heading would be added at the beginning.

5. **Simple Heading Structure**: Keep headings simple and focused on content structure:

   ```markdown
   {{track-name output="heading"}}
   Content
   {{/track-name}}
   ```

   Would output:

   ```markdown
   ## Track Name
   
   Content
   ```

6. **Quoted String Heading Derivation**: When using the simplified `{{"Heading"}}` syntax:
   - XML tag string is derived from heading (e.g., `{{"Getting Started"}}` → `<getting_started>`)
   - Nesting is automatically tracked for proper heading levels
   - No XML tags appear in the output
   - Configuration options like `level` and `case` still apply
   - `#` characters are not supported within quoted titles

## Sequential Numbering

Sequential numbering allows tracks to be automatically numbered based on their position and relationship to other tracks. This feature is especially useful for creating structured documents with hierarchical sections.

### 1. Basic Numbering

To enable numbering on a track, use the `numbering` option:

```markdown
{{chapter numbering}}
Chapter content (becomes "1. Chapter" with heading output)
{{/chapter}}

{{chapter numbering}}
Next chapter content (becomes "2. Chapter" with heading output)
{{/chapter}}
```

### 2. Numbering Placement Options

Control where numbering appears in output:

```markdown
{{section numbering="heading:before tag:after"}}
Section content
{{/section}}
```

| Option | Description |
|--------|-------------|
| `heading:before` | Place number before heading text ("1. Section") |
| `heading:after` | Place number after heading text ("Section 1") |
| `heading:none` | No numbering in headings |
| `tag:before` | Place number before tag string (`<1_section>`) |
| `tag:after` | Place number after tag string (`<section_1>`) |
| `tag:none` | No numbering in tags |

### 3. Hierarchical Numbering

Numbering can reflect the hierarchical structure of nested tracks:

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

The simplified quoted string syntax also supports numbering. The `$n` variable is replaced inline with a number value based on the track's position in the parent track.

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

Control numbering globally or per-mix:

```yaml
mixdown:
  track:
    numbering:
      heading: "before"      # before, after, or none
      tag: "after"           # before, after, or none
      children: 3            # max depth for hierarchical numbering 
      separator: "."         # separator between numbers (e.g., 1.[2.3])
```

## Implementation Considerations

1. The processor would need to track nesting depth for each track when rendering.
2. Configuration merging (global → target → mix → track) would need clear precedence rules.
3. Heading transformation would need to happen at render time to account for various transformations.
4. Line break handling should respect both configuration and markdown linting standards:
   - By default, follow markdownlint rule MD022 (blanks-around-headings)
   - Allow overriding through `line_breaks` settings
   - Provide inline control with track options: `heading line_breaks.after=false`
5. Quoted string heading syntax should:
   - Create a derived track name (e.g., `{{"Getting Started"}}` → `getting-started`)
   - Automatically apply heading formatting without XML tags
   - Respect heading nesting based on parent-child relationships
   - Provide the simplest way to create documentation
6. Track numbering should:
   - Be configurable at multiple levels (global, mix, track)
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

```markdown
{{"Getting Started"}}
This section explains how to get started with the project.

{{"Installation"}}
First, install the dependencies:
```bash
npm install
```
{{/"Installation"}}

{{"Configuration"}}
Next, configure your environment...
{{/"Configuration"}}

{{/"Getting Started"}}
```

Renders as:

```markdown
## Getting Started

This section explains how to get started with the project.

### Installation

First, install the dependencies:
```bash
npm install
```

### Configuration

Next, configure your environment...
```