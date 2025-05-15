# Simplified Syntax for Mixdown Attributes

## Current Approach

The current approach for track attributes uses a verbose `key="value"` syntax:

```markdown
{{instructions output="tag:omit"}}
Content without surrounding XML tags
{{/instructions}}

{{> @code-example output="code:javascript"}}
```

## Proposed Tailwind-inspired Approach

We can adopt a more concise, Tailwind-like approach for attributes:

```markdown
{{instructions tag-omit}}
Content without surrounding XML tags 
{{/instructions}}

{{> @code-example code-js}}
```

## Core Ideas

1. **Direct Attribute Usage**: Descriptive attributes use a simple kebab-case format
2. **Simple Flags**: Boolean flags are just bare words (like `\name` for preserved attributes)
3. **Multi-word Values**: Only use quotes for multi-word values
4. **Target Filtering**: Include with `+target`, exclude with `!target` (new)
5. **Scope Delimiter**: Colon (`:`) reserved as scope delimiter (e.g., `cursor:name="value"`)
6. **Composable**: Multiple attributes can be combined with spaces

## Attribute Mapping Examples

Based on the actual attributes in the Mixdown specification:

| Current Syntax | Proposed Syntax | Description |
|---------------|-----------------|-------------|
| `output="tag:omit"` | `tag-omit` | Remove XML tags |
| `output="inline"` | `inline` | Render content inline |
| `output="inline:tags"` | `inline-tags` | Inline with XML tags preserved |
| `output="code:javascript"` | `code-js` | JavaScript code block |
| `output="code:python"` | `code-py` | Python code block |
| `output="raw:all"` | `raw-all` | Raw Mixdown notation |
| `output="raw:content"` | `raw-content` | Process tags, keep content raw |
| `name="important_rules"` | `name="important_rules"` | Named track (quotes needed) |
| `tracks="included,!excluded"` | `tracks="included,!excluded"` | Filter tracks in imports |
| `-windsurf` | `!windsurf` | Exclude target |
| `+cursor` | `+cursor` | Include target (unchanged) |
| `\name` | `\name` | Preserve attribute in rendered XML |

## Multiple Attributes Example

```markdown
{{instructions tag-omit name="Important Rules"}}
This content will appear without tags and have a custom name
{{/instructions}}
```

## Format-Specific Attributes

### Heading Format

Using the heading output format with the simplified syntax:

```markdown
{{chapter h2}}
Chapter content at heading level 2

{{section h3}}
Section content at heading level 3
{{/section}}

{{section h-inc}}
Incrementally created section
{{/section}}
{{/chapter}}
```

### Scoped Attributes

For scoped attributes, use a simple colon syntax where the scope comes first:

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

Target inclusion can also be combined with scoped attributes compactly:

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

Note: For target exclusion with `!target`, there's generally no need for additional attributes since the content is being excluded entirely for that target.

## Implementation Details

### Parser Integration

The parser would need to:

1. Identify attributes as any token after the track name
2. Categorize them based on pattern recognition:
   - Starting with `+` (but no `:`): Target inclusion
   - Starting with `+` and containing `:`: Scoped attribute for included target
   - Starting with `!`: Target exclusion 
   - Contains `=`: Key-value pair
   - Contains `:`: Scoped attribute (where text before `:` is the scope)
   - Starting with `\`: Preserved attribute
   - Otherwise: Simple attribute
3. Apply them in a deterministic order

## Side-by-Side Comparison with Actual Mixdown Attributes

| Use Case | Current Syntax | Proposed Syntax | Character Reduction |
|----------|---------------|-----------------|---------------------|
| Remove XML tags | `{{track output="tag:omit"}}` | `{{track tag-omit}}` | 37% (19 → 12 chars) |
| JavaScript code block | `{{code output="code:javascript"}}` | `{{code code-js}}` | 46% (28 → 15 chars) |
| Named track | `{{track name="custom_name"}}` | `{{track name="custom_name"}}` | 0% (unchanged) |
| Include for target | `{{track +cursor}}` | `{{track +cursor}}` | 0% (unchanged) |
| Exclude for target | `{{track -windsurf}}` | `{{track !windsurf}}` | 0% (symbols changed) |
| Multiple attributes | `{{track output="code:js" name="example"}}` | `{{track code-js name="example"}}` | 25% (32 → 24 chars) |
| Preserved attribute | `{{track \name="core_rules"}}` | `{{track \name="core_rules"}}` | 0% (unchanged) |
| Import tracks filter | `{{> rules tracks="included,!excluded"}}` | `{{> rules tracks="included,!excluded"}}` | 0% (unchanged) |
| Target-scoped attribute | `{{track cursor?name="specific"}}` | `{{track cursor:name="specific"}}` | 0% (symbols changed) |
| Heading level | `{{section output="heading=2"}}` | `{{section h2}}` | 68% (25 → 8 chars) |
| Combined target inclusion with scope | `{{track +cursor cursor?name="value"}}` | `{{track +cursor:name="value"}}` | 29% (35 → 25 chars) |

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

### Real-world Example with Multiple Attributes

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

## Conclusion

This simplified Tailwind-inspired syntax offers a more concise approach to managing Mixdown attributes. By adopting kebab-case for descriptive attributes, reserving the colon for scopes, and changing target exclusion to use `!` instead of `-`, we create a more intuitive and extensible syntax.

The approach maintains compatibility with existing features while reducing the amount of typing required. For most common use cases, the character count reduction is significant, and the syntax becomes more visually intuitive.

The parser can reliably distinguish between different attribute types based on their format, making this approach both simple and unambiguous.