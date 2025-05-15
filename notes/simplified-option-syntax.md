# Simplified Syntax for Mixdown Options

## Current Approach

The current approach for track options uses a verbose `key="value"` syntax:

```markdown
{{instructions output="tag:omit"}}
Content without surrounding XML tags
{{/instructions}}

{{> @code-example output="code:javascript"}}
```

## Proposed Tailwind-inspired Approach

We can adopt a more concise, Tailwind-like approach for marker options:

```markdown
{{instructions tag-omit}}
Content without surrounding XML tags 
{{/instructions}}

{{> @code-example code-js}}
```

## Core Ideas

1. **Direct Option Usage**: Descriptive options use a simple kebab-case format
2. **Simple Flags**: Boolean flags are just bare words (like `\name` for preserved options)
3. **Multi-word Values**: Only use quotes for multi-word values
4. **Target Filtering**: Include with `+target`, exclude with `!target` (new)
5. **Scope Delimiter**: Colon (`:`) reserved as scope delimiter (e.g., `cursor:name="value"`)
6. **Composable**: Multiple options can be combined with spaces

## Option Mapping Examples

Based on the actual options in the Mixdown specification:

| Current Syntax | Proposed Syntax | Description |
|---------------|-----------------|-------------|
| `output="tag:omit"` | `tag-omit` | Remove XML tags |
| `output="inline"` | `inline` | Render content inline |
| `output="inline:tags"` | `inline-tags` | Inline with XML tags preserved |
| `output="code:javascript"` | `code-js` | JavaScript code block |
| `output="code:python"` | `code-py` | Python code block |
| `output="raw:all"` | `raw-all` | Raw Mixdown notation |
| `output="raw:content"` | `raw-content` | Process markers, keep content raw |
| `name="important_rules"` | `name="important_rules"` | Named track (quotes needed) |
| `tracks="included,!excluded"` | `tracks="included,!excluded"` | Filter tracks in imports |
| `-windsurf` | `!windsurf` | Exclude target |
| `+cursor` | `+cursor` | Include target (unchanged) |
| `output="heading"` | `heading` | Render as heading |
| `output="heading=2"` | `h-2` | Heading level 2 |
| `output="heading=inc"` | `h-inc` | Increment heading level |
| `output="heading=dec"` | `h-dec` | Decrement heading level |
| `output="heading=same"` | `h-same` | Same heading level |
| `output="heading=replace:first"` | `h-replace` | Replace first heading |
| `numbering="heading:before"` | `num-head-before` | Numbering before heading |
| `\name` | `\name` | Preserve option in rendered XML |

## Multiple Options Example

```markdown
{{instructions tag-omit name="Important Rules"}}
This content will appear without tags and have a custom name
{{/instructions}}
```

## Format-Specific Options

### Heading Format

Using the heading output format with the simplified syntax:

```markdown
{{chapter h-2}}
Chapter content at heading level 2

{{section h-3}}
Section content at heading level 3
{{/section}}

{{section h-inc}}
Incrementally created section
{{/section}}
{{/chapter}}
```

This simplified syntax replaces all of these verbose heading options:

```markdown
{{chapter output="heading=2"}}
{{section output="heading=3"}}
{{section output="heading=inc"}}
```

### Heading with Numbering

Simplified syntax for numbered headings:

```markdown
{{chapter h-2 numbering}}
Chapter content (becomes "1. Chapter")

{{section h-3 numbering}}
Section content (becomes "1.1 Section")
{{/section}}
{{/chapter}}
```

Instead of:

```markdown
{{chapter output="heading=2" numbering="heading:before"}}
{{section output="heading=3" numbering="heading:before"}}
```

### Heading Placement Options

Control how numbering appears with simplified directives:

```markdown
{{section h-3 num-head-before}}   <!-- 1. Section -->
{{section h-3 num-head-after}}    <!-- Section 1 -->
{{section h-3 num-tag-before}}    <!-- <1_section> -->
{{section h-3 num-tag-after}}     <!-- <section_1> -->
```

Instead of:

```markdown
{{section output="heading=3" numbering="heading:before"}}
{{section output="heading=3" numbering="heading:after"}}
{{section output="heading=3" numbering="tag:before"}}
{{section output="heading=3" numbering="tag:after"}}
```

### Scoped Options

For scoped options, use a simple colon syntax where the scope comes first:

```markdown
{{instructions cursor:name="cursor_instructions"}}
These are instructions specifically for Cursor
{{/instructions}}
```

This would be equivalent to the current syntax:

```markdown
{{instructions cursor?name="cursor_instructions"}}
These are instructions specifically for Cursor
{{/instructions}}
```

The colon pattern is reserved for scope delimiting, making it:
- Clear that `cursor` is the scope
- Extensible to future scope types
- Consistent with common programming patterns

### Target Filtering and Scope Combinations

Target inclusion can also be combined with scoped options compactly:

```markdown
{{instructions +cursor:name="cursor_instructions"}}
These are instructions for Cursor with a cursor-specific name
{{/instructions}}
```

This would be equivalent to the current:

```markdown
{{instructions +cursor cursor?name="cursor_instructions"}}
These are instructions for Cursor with a cursor-specific name
{{/instructions}}
```

Note: For target exclusion with `!target`, there's generally no need for additional options since the content is being excluded entirely for that target.

## Implementation Details

### Parser Integration

The parser would need to:

1. Identify options as any token after the track name
2. Categorize them based on pattern recognition:
   - Starting with `+` (but no `:`): Target inclusion
   - Starting with `+` and containing `:`: Scoped option for included target
   - Starting with `!`: Target exclusion 
   - Starting with `h-` followed by a number (1-6): Heading level
   - Starting with `h-`: Heading modifier
   - Starting with `num-`: Numbering directive
   - Contains `=`: Key-value pair
   - Contains `:`: Scoped option (where text before `:` is the scope)
   - Starting with `\`: Preserved option
   - Otherwise: Simple option
3. Apply them in a deterministic order

## Side-by-Side Comparison with Actual Mixdown Options

| Use Case | Current Syntax | Proposed Syntax | Character Reduction |
|----------|---------------|-----------------|---------------------|
| Remove XML tags | `{{track output="tag:omit"}}` | `{{track tag-omit}}` | 37% (19 → 12 chars) |
| JavaScript code block | `{{code output="code:javascript"}}` | `{{code code-js}}` | 46% (28 → 15 chars) |
| Named track | `{{track name="custom_name"}}` | `{{track name="custom_name"}}` | 0% (unchanged) |
| Include for target | `{{track +cursor}}` | `{{track +cursor}}` | 0% (unchanged) |
| Exclude for target | `{{track -windsurf}}` | `{{track !windsurf}}` | 0% (symbols changed) |
| Multiple options | `{{track output="code:js" name="example"}}` | `{{track code-js name="example"}}` | 25% (32 → 24 chars) |
| Preserved option | `{{track \name="core_rules"}}` | `{{track \name="core_rules"}}` | 0% (unchanged) |
| Import tracks filter | `{{> rules tracks="included,!excluded"}}` | `{{> rules tracks="included,!excluded"}}` | 0% (unchanged) |
| Target-scoped option | `{{track cursor?name="specific"}}` | `{{track cursor:name="specific"}}` | 0% (symbols changed) |
| Heading level | `{{section output="heading=2"}}` | `{{section h-2}}` | 68% (25 → 8 chars) |
| Combined target inclusion with scope | `{{track +cursor cursor?name="value"}}` | `{{track +cursor:name="value"}}` | 29% (35 → 25 chars) |
| Heading with numbering | `{{section output="heading=3" numbering="heading:before"}}` | `{{section h-3 numbering}}` | 63% (47 → 17 chars) |

## Examples from the Mixdown Spec

### Current Syntax (from spec)

```markdown
{{instructions \name="core_rules" +cursor -windsurf}}
All code must follow consistent formatting.

Testing is required for all new features.
{{/instructions}}
```

### Proposed Syntax

```markdown
{{instructions \name="core_rules" +cursor !windsurf}}
All code must follow consistent formatting.

Testing is required for all new features.
{{/instructions}}
```

### Real-world Example with Multiple Options

**Current syntax:**

```markdown
{{instructions 
  output="tag:omit" 
  name="important_rules" 
  +cursor 
  -claude-code 
  cursor?name="cursor_specific"}}
Content
{{/instructions}}
```

**Proposed syntax:**

```markdown
{{instructions 
  tag-omit
  name="important_rules"
  +cursor
  !claude-code
  cursor:name="cursor_specific"}}
Content
{{/instructions}}
```

**Further simplified syntax:**

```markdown
{{instructions 
  tag-omit
  name="important_rules"
  +cursor:name="cursor_specific"
  !claude-code}}
Content
{{/instructions}}
```

### Quoted String Syntax for Headings

The simplified quoted string syntax with proposed option mapping:

```markdown
{{"Getting Started" h-2}}
This section explains how to get started.

{{"Installation" h-3}}
First, install the dependencies:
```bash
npm install
```
{{/"Installation"}}

{{"Configuration" h-3}}
Next, configure your environment...
{{/"Configuration"}}

{{/"Getting Started"}}
```

## Potential Future Scope Types

The colon-based scope delimiter allows for future expansion to other scope types:

```markdown
{{instructions 
  tag-omit
  mode:dark="specific-dark-mode-content"
  device:mobile="activate-mobile-layout"
  env:dev="show-debug-info"}}
Content
{{/instructions}}
```

## Comprehensive Format Option Table

| Current Format Option | Proposed Option | Description |
|--------------------------|-------------------|-------------|
| `output="tag:omit"` | `tag-omit` | Remove XML tags |
| `output="inline"` | `inline` | Render content inline |
| `output="inline:tags"` | `inline-tags` | Inline with XML tags preserved |
| `output="code:javascript"` | `code-js` | JavaScript code block |
| `output="code:python"` | `code-py` | Python code block |
| `output="code:ruby"` | `code-rb` | Ruby code block |
| `output="code:html"` | `code-html` | HTML code block |
| `output="code:css"` | `code-css` | CSS code block |
| `output="raw:all"` | `raw-all` | Raw Mixdown notation |
| `output="raw:content"` | `raw-content` | Process markers, keep content raw |
| `output="raw:tags"` | `raw-tags` | Process content, keep markers raw |
| `output="heading"` | `heading` | Render as heading |
| `output="heading=1"` | `h-1` | Heading level 1 |
| `output="heading=2"` | `h-2` | Heading level 2 |
| `output="heading=3"` | `h-3` | Heading level 3 |
| `output="heading=4"` | `h-4` | Heading level 4 |
| `output="heading=5"` | `h-5` | Heading level 5 |
| `output="heading=6"` | `h-6` | Heading level 6 |
| `output="heading=inc"` | `h-inc` | Increment heading level |
| `output="heading=dec"` | `h-dec` | Decrement heading level |
| `output="heading=same"` | `h-same` | Same heading level |
| `output="heading=replace:first"` | `h-replace` | Replace first heading |
| `numbering="heading:before"` | `num-head-before` | Numbering before heading |
| `numbering="heading:after"` | `num-head-after` | Numbering after heading |
| `numbering="tag:before"` | `num-tag-before` | Numbering before tag |
| `numbering="tag:after"` | `num-tag-after` | Numbering after tag |
| `numbering` | `numbering` | Enable numbering with defaults |

## Terminology Clarification

In Mixdown, we use these specific terms:

- **Marker options**: The general term for all configurable options that can be applied to markers
- **Track options**: Options specific to content tracks like `{{instructions}}` or `{{code}}`
- **Import options**: Options specific to imports like `{{> snippet}}`

This terminology better reflects how these settings function as customization choices rather than passive properties.

## Conclusion

This simplified Tailwind-inspired syntax offers a more concise approach to managing Mixdown options. By adopting kebab-case for descriptive options, reserving the colon for scopes, and changing target exclusion to use `!` instead of `-`, we create a more intuitive and extensible syntax.

The approach maintains compatibility with existing features while reducing the amount of typing required. For most common use cases, the character count reduction is significant, and the syntax becomes more visually intuitive.

The parser can reliably distinguish between different option types based on their format, making this approach both simple and unambiguous.