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

## Delimiter Roles

The Mixdown options syntax follows strict delimiter rules to maintain consistency and clarity:

| Delimiter | Role | Example | Purpose |
|-----------|------|---------|---------|
| `:` | Scope indicator | `target:code-js` | Indicates that options are scoped to a specific target |
| `()` | Value container | `name(value)` | Contains values for a specific option |
| `[]` | Option grouping | `target:[option-1 option-2]` | Groups multiple options within a scope |
| `+` | Inclusion | `+target`, `+track-one` | Indicates inclusion of a target or track |
| `!` | Exclusion | `!target`, `!track-two` | Indicates exclusion of a target or track |

These delimiters always maintain their role throughout the syntax, making the language more intuitive and easier to learn.

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

| Prefix   | Purpose            | Examples                        |
|----------|--------------------|---------------------------------|
| (none)   | Direct operations  | `tag-omit`, `inline`, `code-js` |
| `h-`     | Heading related    | `h-2`, `h-inc`, `h-dec`         |
| `num-`   | Numbering related  | `num`, `num-tag-first`         |
| `+`      | Target inclusion   | `+cursor`, `+all`               |
| `!`      | Target exclusion   | `!windsurf`, `!claude-code`     |

### 2. Value Specification Patterns

| Pattern          | Format                 | Example                              | Use Case                                                   |
|------------------|------------------------|--------------------------------------|------------------------------------------------------------|
| Simple Flag      | `option-name`          | `tag-omit`                           | Boolean operations                                         |
| Enumerated Value | `option-value`         | `h-2`, `code-js`                     | Fixed value choices                                        |
| Named Value      | `option(value)`        | `name(rules)`, `name(Custom Title)`  | String values with special chars/spaces                    |
| List Value       | `option(+item1 !item2)` | `(+track-one !track-two target:+option)`           | Collections or inclusion/exclusion lists (space-delimited) |
| Target-scoped    | `target:option`        | `target:option(value)`              | Target-specific options (scope:option pattern)             |

### 3. Option Categories & Examples

#### Display Options

| Option                | Description                | Example                              |
|-----------------------|----------------------------|--------------------------------------|
| `tag-omit`            | Remove XML tags            | `{{rules tag-omit}}`          |
| `inline`              | Render content inline      | `{{rules inline}}`                    |
| `inline-with-tags`    | Inline with XML tags       | `{{rules inline-with-tags}}`         |
| `raw-all`             | Preserve Mixdown notation  | `{{rules raw-all}}`                |
| `raw-content`         | Preserve content notation  | `{{rules raw-content}}`               |
| `raw-tags`            | Preserve tag notation      | `{{rules raw-tags}}`                 |

#### Code Block Options

| Option                | Description                | Example                              |
|-----------------------|----------------------------|--------------------------------------|
| `code-auto`           | Auto-detect language       | `{{rules code}}`                 |
| `code-<language>`             | Language-specified code block      | `{{rules code-js}}` |

#### Heading Options (h-* family)

| Option                | Description                | Example                              |
|-----------------------|----------------------------|--------------------------------------|
| `h-1` to `h-6`        | Heading levels 1-6         | `{{rules h-2}}`                    |
| `h-inc`               | Increment heading level    | `{{rules h-inc}}`                  |
| `h-dec`               | Decrement heading level    | `{{rules h-dec}}`                  |
| `h-same`              | Same heading level         | `{{rules h-same}}`                 |
| `h-initial`           | Replace first heading      | `{{rules h-initial}}`              |
| `heading`             | Add heading (shortcut)     | `{{rules heading}}`                |

#### Numbering Options (num-* family)

| Option                | Description                | Example                              |
|-----------------------|----------------------------|--------------------------------------|
| `num`                 | Enable default numbering   | `{{chapter num}}`                    |
| `num-heading-first`  | Number first heading      | `{{rules num-heading-first}}`     |
| `num-heading-last`   | Number last heading       | `{{rules num-heading-last}}`      |
| `num-tag-first`      | Number first tag          | `{{rules num-tag-first}}`         |
| `num-tag-last`       | Number last tag           | `{{rules num-tag-last}}`          |


#### Target Management

| Option      | Description                                              | Example                  |
|-------------|----------------------------------------------------------|--------------------------|
| `+target`   | Include only for target                                  | `{{rules +target}}`      |
| `!target`   | Exclude only for target                                  | `{{rules !target}}`      |
| `+all`      | Include for all targets                                  | `{{rules +all}}`         |
| `+group`    | Include for IDE group, exclude specific member of group  | `{{rules +group !member}}`|

#### Named Values, Lists, and Target Groups

| Option                         | Description                 | Example                                     |
|-------------------------------|-----------------------------|---------------------------------------------|
| `name(important-rules)`      | Rename the track (useful for imports)              | `{{> rules name(important-rules)}}`          |
| `{{> imported-rules(+item1 !item2)}}`               | Filter imported tracks (import markers) | `{{> my-rules(+included cursor:+also !excluded)}}`        |
| `+cursor[name(Custom Title)]`| Target-scoped override      | `{{rules +cursor[name(Custom Title)]}}`  |

### 4. Grouping Options

By default, options are space-delimited. You can optionally wrap a list of options in square brackets for visual grouping:

```markdown
{{rules [ tag-omit code-js +cursor name(important-rules) ]}}
...
{{/rules}}
```

All options inside `[...]` behave exactly the same as if they were space-delimited:

```markdown
{{rules [ tag-omit code-js name(rules) +cursor ]}}  # equivalent to {{rules tag-omit code-js name(rules) +cursor}}
```

For target-scoped options, use a colon followed by multiple options in brackets to indicate scope:

```markdown
{{rules +cursor:[name(cursor-rules) code-js] !claude-code }}
```

Here, `name(cursor-rules)` and `code-js` apply only when building for the `cursor` target. The colon indicates that what follows is scoped to the target.

#### Multi-line grouping

```markdown
{{rules [
  tag-omit
  code-js
  name(rules)
  +cursor
  ]}}
```

#### Options Bracketing Rules

Options groups (brackets) cannot be nested. All options within a group must be space-delimited and cannot themselves contain another options group.

For a single target-specific option, you can use the colon syntax without brackets:

```markdown
{{rules target:code-js}}
```

This applies the `code-js` option only for the specified target. The block is still included for all valid targets.

If you need to specify multiple options for a target, use brackets after the colon:

```markdown
{{rules target:[code-js name(target-rules)]}}
```

Important nesting rule: You cannot nest option groups within other option groups. Instead, keep them as separate groups:

```markdown
{{rules [code-js tag-omit target:[option-a option-b]]}}  # ❌ Invalid, nested options groups
{{rules [code-js tag-omit] target:[option-a option-b]}}  # ✅ Valid, separate option groups
```

### Target Option Invocation Patterns

There are three primary ways to use targets as options:

1. **Target-Scoped Options (No Inclusion/Exclusion)**
   - **Single Option:** `target:option` (no brackets required)
   - **Multiple Options:** `target:[option-1 option-2]` (brackets required after colon)
   - **Behavior:** The options apply only when building for the specified target, but the block is included for all valid targets.
   - **Examples:**  

     ```markdown
     {{rules target:code-js}}
     {{rules target:[code-js tag-omit]}}
     ```

     The first applies `code-js` only for the specified target. The second applies both `code-js` and `tag-omit` for the specified target.

2. **Target Inclusion/Exclusion**
   - **Single Option:** `+target:option` or `!target:option`
   - **Multiple Options:** `+target:[option-1 option-2]` or `!target:[option-1 option-2]`
   - **Behavior:** The block is included or excluded for the specified target(s). Options in brackets or after the colon apply only for the included/excluded target.
   - **Examples:**  

     ```markdown
     {{rules +cursor:code-js}}
     {{rules +cursor:[code-js tag-omit]}}
     ```

     The first includes the block only for the `cursor` target, applying `code-js` as an option. The second includes the block for `cursor` with both options.

3. **Group Inclusion/Exclusion with Member Override**
   - **Syntax:** `+group:[options] !member`
   - **Behavior:** The block is included for all members of the group, with the specified options, but excluded for a specific member.
   - **Example:**  

     ```markdown
     {{rules +group:[code-js] !member}}
     ```

     This includes the block for all in `group` with `code-js`, but excludes it for `member`.

#### Summary Table

| Pattern                  | Example                                 | Description                                 |
|--------------------------|-----------------------------------------|---------------------------------------------|
| Single target option     | `target:code-js`                        | One option for a target, no brackets needed |
| Multiple target options  | `target:[code-js tag-omit]`             | Multiple options, brackets after colon      |
| Single inclusion option  | `+cursor:code-js`                       | Include for target only, one option         |
| Multiple inclusion opts  | `+cursor:[code-js tag-omit]`            | Include for target only, multiple options   |

### Example Patterns

```markdown
{{rules target:code-js}}                          # Single target option, included for all
{{rules target:[code-js tag-omit]}}               # Multiple target options, included for all
{{rules +cursor:code-js}}                         # Included for cursor only, with single option
{{rules +cursor:[code-js tag-omit]}}              # Included for cursor only, with multiple options
{{rules +group:[code-js] !member}}                # Included for group, excluded for member
```

## Import Track Filtering

### Current Approach

The current approach for filtering tracks when importing from other mix files uses a verbose attribute syntax:

```markdown
{{> my-rules tracks="included-track,!excluded-track"}}

<!-- This would include only the 'included-track'
     from my-rules.md, but exclude 'excluded-track' -->
```

### Proposed Approach

The new approach simplifies this by using parentheses directly after the import name, creating a more intuitive and concise syntax:

```markdown
{{> my-rules(+track-one !track-two)}}
```

This pattern:

- Uses space-delimited values within parentheses
- Prefixes included tracks with `+` and excluded tracks with `!` (consistent with target inclusion/exclusion)
- Eliminates the need for the verbose `tracks="..."` attribute
- Follows a more natural language-like structure: "import my-rules, but only these specific tracks"

#### Basic Examples

```markdown
{{> style-guide(+track-one !track-two)}}
<!-- Only include 'track-one' track from style-guide, exclude 'track-two' -->

{{> project-setup(!track-two)}} 
<!-- Include all tracks from project-setup except 'track-two' -->

{{> comprehensive-guide(+track-one +track-two !track-three)}}
<!-- Include only 'track-one' and 'track-two' tracks, exclude 'track-three' -->
```

#### Target-Specific Track Filtering

The parentheses syntax also supports target-specific track inclusion and exclusion, allowing for powerful conditional imports:

```markdown
{{> my-rules(+track-one cursor:+track-cursor windsurf:!track-windsurf)}}
```

This advanced pattern:

- Includes "track-one" for all targets
- Additionally includes "track-cursor" only when building for the cursor target
- Excludes "track-windsurf" only when building for the windsurf target

```markdown
{{> project-setup(+core-track ide:+ide-features cli:+cli-features)}}
<!-- Include 'core-track' for all targets, plus target-specific tracks -->

{{> style-guide(+common-track cursor:+cursor-specific !legacy-track windsurf:!beta-features)}}
<!-- Complex filtering with both global and target-specific inclusions/exclusions -->
```

This combines the track filtering approach with target-specific options into a unified syntax that handles complex conditional inclusion patterns elegantly.

### Benefits

- **More Intuitive**: The parentheses immediately after the import target clearly indicate filtering
- **More Concise**: Eliminates the verbose `tracks="..."` attribute
- **Visual Clarity**: Creates a clear visual pattern that's easier to scan and understand
- **Consistency**: Uses the same `+` for inclusion and `!` for exclusion as used in target filtering
- **Target-Specific Control**: Enables fine-grained per-target track filtering
- **Unified Pattern**: Uses the same `target:option` pattern established for other options

This simplified yet powerful approach reduces cognitive load when writing imports while enabling complex conditional inclusion patterns through a single unified syntax.
