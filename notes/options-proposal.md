# Comprehensive Options Proposal for Mixdown

## Overview

This document proposes a comprehensive approach to Mixdown options, designed to solve the most common usability issues faced when creating rule files. Building on the kebab-case notation introduced in the simplified-option-syntax proposal, this approach focuses on intuitive option discovery, consistent naming patterns, and ergonomic composability.

## Core Principles

1. **Intuitive Discovery** - Options should follow predictable patterns to enable users to guess what they need
2. **Visual Economy** - Reduce typing while maintaining clarity and meaning
3. **Consistency** - Apply uniform naming patterns across all option types
4. **Progressive Enhancement** - Support both simple common cases and complex advanced cases
5. **Separation of Concerns** - Group options logically by their purpose and effect
6. **Composability** - Options should combine elegantly without interference

## Key Challenges Addressed

From the perspective of authors writing mix files:

1. **Memorability** - Too many option names make it hard to remember the exact syntax
2. **Discoverability** - Option usage isn't obvious without documentation
3. **Verbosity** - The current syntax is needlessly verbose for common operations
4. **Inconsistency** - Similar concepts use different notation patterns
5. **Cognitive Load** - Complex rules with many options become difficult to read
6. **Target Management** - Options specific to certain tools can be cumbersome to specify

## Proposed Option System

### 1. Structured Prefixes

All options follow a consistent prefix pattern for categorization:

| Prefix | Purpose | Examples |
|--------|---------|----------|
| (none) | Direct operations | `tag-omit`, `inline`, `code-js` |
| `h-` | Heading related | `h-2`, `h-inc`, `h-dec` |
| `num-` | Numbering related | `num`, `num-tag-before` |
| `fmt-` | Formatting related | `fmt-table`, `fmt-list` |
| `style-` | Visual styling | `style-bold`, `style-highlight` |
| `meta-` | Metadata options | `meta-id`, `meta-author` |
| `+` | Target inclusion | `+cursor`, `+all` |
| `!` | Target exclusion | `!windsurf`, `!claude-code` |

### 2. Value Specification Patterns

Consistent patterns for specifying option values:

| Pattern | Format | Example | Use Case |
|---------|--------|---------|----------|
| Simple Flag | `option-name` | `tag-omit` | Boolean operations |
| Enumerated Value | `option-value` | `h-2`, `code-js` | Fixed value choices |
| Named Value | `name-(value)` | `name-(rules)` | String values with special chars |
| Target-scoped | `target:option` | `cursor:name-(value)` | Target-specific options |
| Complex Value | `option:[a,b,c]` | `tracks:[one,two,!three]` | Collections or lists |
| Quoted String | `option:("string")` | `cursor:("Custom Heading")` | Values with spaces |

### 3. Option Categories & Examples

#### Display Options
| Option | Description | Example |
|--------|-------------|---------|
| `tag-omit` | Remove XML tags | `{{instructions tag-omit}}` |
| `inline` | Render content inline | `{{code inline}}` |
| `inline-with-tags` | Inline with XML tags | `{{rules inline-with-tags}}` |
| `raw-all` | Preserve Mixdown notation | `{{example raw-all}}` |
| `raw-content` | Preserve content notation | `{{demo raw-content}}` |
| `raw-tags` | Preserve tag notation | `{{block raw-tags}}` |

#### Code Block Options
| Option | Description | Example |
|--------|-------------|---------|
| `code-js` | JavaScript code block | `{{code code-js}}` |
| `code-py` | Python code block | `{{code code-py}}` |
| `code-html` | HTML code block | `{{code code-html}}` |
| `code-css` | CSS code block | `{{code code-css}}` |
| `code-ruby` | Ruby code block | `{{code code-ruby}}` |
| `code-auto` | Auto-detect language | `{{code code-auto}}` |

#### Heading Options (h-* family)
| Option | Description | Example |
|--------|-------------|---------|
| `h-1` to `h-6` | Heading levels 1-6 | `{{section h-2}}` |
| `h-inc` | Increment heading level | `{{section h-inc}}` |
| `h-dec` | Decrement heading level | `{{section h-dec}}` |
| `h-same` | Same heading level | `{{section h-same}}` |
| `h-initial` | Replace first heading | `{{section h-initial}}` |
| `heading` | Add heading (shortcut) | `{{section heading}}` |

#### Numbering Options (num-* family)
| Option | Description | Example |
|--------|-------------|---------|
| `num` | Enable default numbering | `{{chapter num}}` |
| `num-heading-before` | Number before heading | `{{section num-heading-before}}` |
| `num-heading-after` | Number after heading | `{{section num-heading-after}}` |
| `num-tag-before` | Number before tag | `{{section num-tag-before}}` |
| `num-tag-after` | Number after tag | `{{section num-tag-after}}` |
| `num-format-(x.y)` | Custom number format | `{{section num-format-(1.a)}}` |

#### NEW: Text Formatting Options (fmt-* family)
| Option | Description | Example |
|--------|-------------|---------|
| `fmt-list` | Format as bulleted list | `{{items fmt-list}}` |
| `fmt-numlist` | Format as numbered list | `{{steps fmt-numlist}}` |
| `fmt-table` | Format as table | `{{data fmt-table}}` |
| `fmt-quote` | Format as blockquote | `{{quote fmt-quote}}` |
| `fmt-preformatted` | Preserve whitespace | `{{example fmt-preformatted}}` |
| `fmt-wrap-(80)` | Wrap text at width | `{{content fmt-wrap-(80)}}` |

#### NEW: Style Options (style-* family)
| Option | Description | Example |
|--------|-------------|---------|
| `style-bold` | Bold/strong emphasis | `{{important style-bold}}` |
| `style-italic` | Italic emphasis | `{{note style-italic}}` |
| `style-highlight` | Highlight text | `{{warning style-highlight}}` |
| `style-indent-(2)` | Indent content | `{{details style-indent-(2)}}` |
| `style-box` | Box/frame content | `{{example style-box}}` |
| `style-color-(red)` | Color text (if supported) | `{{caution style-color-(red)}}` |

#### NEW: Metadata Options (meta-* family)
| Option | Description | Example |
|--------|-------------|---------|
| `meta-id-(unique-id)` | Set unique identifier | `{{section meta-id-(sec-1)}}` |
| `meta-author-(name)` | Set author metadata | `{{rules meta-author-(matt)}}` |
| `meta-date-(2025-05-17)` | Set date metadata | `{{update meta-date-(2025-05-17)}}` |
| `meta-version-(1.0)` | Set version metadata | `{{release meta-version-(1.0)}}` |
| `meta-group-(name)` | Group related tracks | `{{part meta-group-(intro)}}` |
| `meta-order-(10)` | Set sorting order | `{{first meta-order-(10)}}` |

#### Target Management
| Option | Description | Example |
|--------|-------------|---------|
| `+cursor` | Include for Cursor | `{{rules +cursor}}` |
| `!claude-code` | Exclude for Claude Code | `{{section !claude-code}}` |
| `+all` | Include for all targets | `{{global +all}}` |
| `+cursor:name-(value)` | Target-scoped option | `{{rules +cursor:name-(special)}}` |
| `+ide` | Include for IDE group | `{{code +ide}}` |
| `+cli` | Include for CLI group | `{{command +cli}}` |

#### Named Values and Tracks
| Option | Description | Example |
|--------|-------------|---------|
| `name-(important-rules)` | Name the track | `{{rules name-(important-rules)}}` |
| `tracks-(one,!two)` | Filter tracks | `{{> rules tracks-(core,!optional)}}` |
| `cursor:("Heading")` | Target-specific heading | `{{section cursor:("Custom Title")}}` |
| `cursor:[a,b,c]` | Multiple values | `{{options cursor:[clean,concise]}}` |

### 4. Alias System for Common Combinations

For frequently used combinations, aliases provide concise shortcuts:

| Alias | Expands To | Description |
|-------|------------|-------------|
| `h1` to `h6` | `h-1 tag-omit` to `h-6 tag-omit` | Headings without XML tags |
| `toc` | `meta-id-(toc) style-box` | Table of contents section |
| `important` | `style-bold style-highlight` | Important content formatting |
| `note` | `style-italic fmt-quote` | Note formatting |
| `warning` | `style-color-(orange) style-bold` | Warning formatting |
| `sample` | `fmt-preformatted style-box` | Sample code/text formatting |
| `steps` | `fmt-numlist tag-omit` | Numbered steps without tags |
| `hidden` | `style-hidden +none` | Hide content from all targets |

## Alternative Syntax Approaches

### Approach 1: Directive-based syntax

Instead of space-separated options, use directive-style formatting with `.` prefixes:

```markdown
{{instructions .tag-omit .name-(rules) .cursor .!claude-code}}
Content
{{/instructions}}
```

**Pros:**
- Clear visual distinction of options
- Similar to CSS classes or HTML data attributes
- Easy to scan options with consistent prefix

**Cons:**
- Adds character overhead
- Less aligned with common Markdown patterns

### Approach 2: Attribute-like syntax (current baseline)

Maintain key="value" pairs but standardize the names:

```markdown
{{instructions tag="omit" name="rules" target="cursor,!claude-code"}}
Content
{{/instructions}}
```

**Pros:**
- Familiar attribute pattern
- Works well for complex values
- More explicit name-value relationship

**Cons:**
- Verbose for simple flags
- Requires more typing
- Less visually distinctive patterns

### Approach 3: Grouped syntax with functional areas

Group options by function using delimiters:

```markdown
{{instructions display:tag-omit|name:rules|target:+cursor,!claude-code}}
Content
{{/instructions}}
```

**Pros:**
- Explicitly groups by purpose
- Works well for complex option sets
- More structured for tooling

**Cons:**
- More complex syntax to remember
- More characters to type
- Harder to compose simple options

### Approach 4: JSON-like syntax

Use JSON-inspired syntax for maximum expressiveness:

```markdown
{{instructions {display:"tag-omit", name:"rules", target:["+cursor", "!claude-code"]}}}
Content
{{/instructions}}
```

**Pros:**
- Most expressive for complex options
- Matches coding patterns
- Strong hierarchy and nesting

**Cons:**
- Verbose for simple cases
- Less Markdown-like
- Higher learning curve

## Usage Examples

### Basic Track with Options

```markdown
{{instructions tag-omit name-(core-rules)}}
All code must follow consistent formatting.

Testing is required for all new features.
{{/instructions}}
```

### Rich Formatting Example

```markdown
{{warning style-bold style-color-(red)}}
WARNING: This operation cannot be undone!
{{/warning}}

{{note fmt-quote style-italic}}
Note: Save your work before proceeding.
{{/note}}
```

### Complex Document Structure

```markdown
{{chapter h-2 num}}
Getting Started

{{section h-3 num}}
Installation 

First, install the dependencies:

{{code code-bash tag-omit}}
npm install
{{/code}}

{{section h-3 num}}
Configuration

Next, configure your environment...
{{/section}}
{{/chapter}}
```

### Target-specific Content with Custom Options

```markdown
{{instructions 
  tag-omit
  name-(important-rules)
  +cursor:name-(cursor-specific)
  !claude-code
  tracks-(included,!excluded)}}
Content
{{/instructions}}
```

## Implementation Considerations

1. **Parser Design**: The parser needs to identify options by prefix and pattern, categorizing them by function.

2. **Validation**: Predefined option validation could help users discover errors early.

3. **Backwards Compatibility**: Maintain support for the current `key="value"` syntax during transition.

4. **Documentation Generation**: Use prefix patterns to generate comprehensive documentation.

5. **Auto-completion**: IDE support could leverage the prefix system for better auto-completion.

## Extensibility Model

The prefix system is specifically designed for extensibility:

1. **New Option Types**: New prefixes can be added for future functionality
2. **Custom Options**: Projects can define custom options with project-specific prefixes
3. **Plugin Options**: Plugins can add their own prefixed options
4. **Versioning**: Options can be versioned with prefixes indicating support

## Conclusion

This comprehensive options proposal streamlines Mixdown options while expanding functionality. By using structured prefixes, consistent patterns, and intuitive grouping, it addresses the key challenges faced by mix authors. The system balances simplicity for common cases with power for complex scenarios, all while maintaining visual economy and discoverability.

The approach builds on the kebab-case proposal while adding:
- Expanded formatting options for rich content
- Styling capabilities for visual distinction
- Metadata options for advanced integration
- Systematic naming for better learnability
- Alias system for common combinations

The result is a cohesive, intuitive options system that makes Mixdown files easier to write, read, and maintain.