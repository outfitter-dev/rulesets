# 💽 Mixdown – v0 Overview

> *Write rules once, render tool-specific rules, zero drift.*

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Purpose \& Vision](#purpose--vision)
  - [Overview](#overview)
  - [The Problem](#the-problem)
  - [Our Solution](#our-solution)
- [Core Concepts](#core-concepts)
- [Key Features](#key-features)
  - [Mixdown Notation](#mixdown-notation)
  - [Compiler \& Integration](#compiler--integration)
- [Destination Providers](#destination-providers)
- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
- [Notation Reference](#notation-reference)
  - [Design Goals](#design-goals)
  - [Delimiter Roles](#delimiter-roles)
  - [Stems](#stems)
    - [Stem Notation Markers](#stem-notation-markers)
    - [Stem Marker Names](#stem-marker-names)
    - [Stem Marker Parsing](#stem-marker-parsing)
    - [Destination-scoped Property Overrides](#destination-scoped-property-overrides)
    - [Destination-scoped Multiple Properties](#destination-scoped-multiple-properties)
    - [Property Processing Order](#property-processing-order)
    - [Destination Filtering Properties](#destination-filtering-properties)
    - [Self-Closing Tags](#self-closing-tags)
    - [Multi-line Markers for Readability](#multi-line-markers-for-readability)
    - [Stem Properties](#stem-properties)
    - [Output Format](#output-format)
    - [Property Grouping](#property-grouping)
      - [Multi-line Property Grouping](#multi-line-property-grouping)
      - [Property Bracketing Rules](#property-bracketing-rules)
    - [Property Grouping \& Scoping: Common Patterns](#property-grouping--scoping-common-patterns)
    - [Using bare XML tags](#using-bare-xml-tags)
  - [Mixdown Frontmatter](#mixdown-frontmatter)
  - [Links](#links)
    - [External \& Mixdown File Internal Links](#external--mixdown-file-internal-links)
    - [Linking to Project Files](#linking-to-project-files)
  - [Variables](#variables)
  - [Imports](#imports)
    - [Import Attributes](#import-attributes)
    - [Destination-Specific Stem Filtering](#destination-specific-stem-filtering)
  - [Imports vs. Inclusions](#imports-vs-inclusions)
  - [Mixins](#mixins)
  - [Rendering Raw Mixdown Notation](#rendering-raw-mixdown-notation)
  - [Instruction Placeholders](#instruction-placeholders)
    - [Placeholder Formatting](#placeholder-formatting)
  - [Whitespace Handling](#whitespace-handling)
- [Code Examples](#code-examples)
- [Directory Structure](#directory-structure)
- [Future Releases](#future-releases)
- [Appendix](#appendix)
  - [Comprehensive Property Reference](#comprehensive-property-reference)
    - [Property Naming Conventions](#property-naming-conventions)
    - [Property Categories and Usage](#property-categories-and-usage)
    - [Common Property Patterns and Languages](#common-property-patterns-and-languages)
    - [Property Extension Rules](#property-extension-rules)

## Purpose & Vision

### Overview

Mixdown is a **Markdown-previewable rules compiler** that lets you author a single Source Rules file in Markdown and compile it into compiled rules for each destination (`.cursor/rules.mdc`, `./CLAUDE.md`, `.roo/rules.md`, and more). Think of it as **Terraform for AI rules**: write once, compile for many destinations, your agents, no matter the tool, on the (literal) same page.

### The Problem

- Agentic rules files are **fragmented** across IDEs and agentic tools, following different formats, and in disparate locations, leading to duplication and drift.
- Manual copy-paste workflows break **source-of-truth** guarantees and slow (or halt) experimentation with new agentic tools (that might even be better suited for the task).
- Lack of a **cohesive format for rules** hinders creation, testing, versioning…you name it.

### Our Solution

Mixdown introduces a single source-of-truth rules notation written in pure Markdown (with a dash of specialized notation), which is processed into tool-specific files by a compiler that:

1. Parses the Source Rules into an AST (abstract syntax tree) to ensure a consistent format.
2. Uses **tool-specific compilers** (as plugins) to transform the AST into per-tool rules files.
3. Writes per-tool **rules files** to their respective locations, with the necessary filenames, formats, etc. all accounted for.

Result: *Write rules once, render tool-specific rules, zero drift.*

## Core Concepts

- **Source Rules**
  - Source rules files, written in 100% previewable Markdown.
  - Written in Mixdown Notation and use `{{...}}` notation markers to direct the compiler.
  - Compiled into destination-specific rules files:
    - `./mixdown/src/my-rule.md` → `.cursor/rules/my-rule.mdc`
- **Destination**
  - A supported tool, such as `cursor`, `windsurf`, or `claude-code`.
  - Defines destination-specific criteria for compiling Source Rules to compiled rules.
  - Provided through plugins.
- **Compiled Rules**
  - Destination-specific rules files rendered from the Source Rules.
  - Examples for a Source Rules file called `project-conventions.md`:
    - Cursor → `.cursor/rules/project-conventions.mdc`
    - Claude Code → `./CLAUDE.md#project-conventions`
    - OpenAI Codex → `./conventions.md`.
  - When placed in destination directories, referred to as "tool-ready rules".
- **Notation Marker**
  - Syntax: `{{...}}`
  - Fundamental building block of Mixdown Notation
  - Used to direct the compiler for various purposes (stems, imports, variables)
  - All Mixdown directives use marker notation, but serve different functions
  - Similar to `<xml-tags>`, but fully Markdown-previewable.
- **Stem**
  - Syntax: `{{stem-name}}...{{/stem-name}}`
  - A specific application of notation markers that creates delimited content blocks
  - Translates directly to XML tags in output: `<stem_name>...</stem_name>`
  - Has opening and closing notation markers that surround content
  - Can contain attributes that control rendering behavior
  - Example: `{{instructions}}This is instruction content{{/instructions}}`
- **Import**
  - Syntax: `{{> my-rule }}`
  - Embed content from another Source Rules file, stem, mixin, or template.
- **Variable**
  - Syntax: `{{$key}}` or `$key` if used within a `{{...}}` marker.
  - Dynamic values replaced inline at build time.
  - Examples: `{{$destination}}`, `{{$.frontmatter.key}}`, `{{$alias}}`

## Key Features

### Mixdown Notation

- **100% Preview-able Markdown:** Renders cleanly in GitHub, VS Code, etc.; passes markdown-lint.
- **Granular Stems:** Filter stems within a single Source Rules for per-destination inclusion/exclusion.
- **Build-time Variables:** Aliases and frontmatter data injection.

### Compiler & Integration

- **Plugin Architecture:** Add new destinations via `MixdownPluginProvider` without touching core.
- **CLI & API:** `mixdown build`, `mixdown validate`, and `POST /compile` endpoint.

## Destination Providers

| ID | Tool | Type |
|----|------|------|
| `cursor` | Cursor | IDE |
| `windsurf` | Windsurf | IDE |
| `claude-code` | Claude Code | CLI |
| `roo-code` | Roo Code | VS Code Extension |
| `cline` | Cline | VS Code Extension |
| `codex-cli` | OpenAI Codex CLI | CLI |
| `codex-agent` | OpenAI Codex Agent | Web agent |

## Getting Started

### Installation

```bash
npm install -g @mixdown/cli        # global CLI
# project-local
npm install --save-dev @mixdown
# or with the CLI
npx @mixdown/cli init
```

### Quick Start

```bash
mixdown init      # scaffolds .mixdown/ directory structure

mixdown import    # imports existing rules files into the mixdown format

mixdown build     # writes compiled rules to .mixdown/dist/
```

## Notation Reference

### Design Goals

| Goal | Description |
|------|-------------|
| ✨ **Simplicity** | Reduce bespoke format/structure for each tool to just one. |
| 🧹 **Lintability** | Files must pass standard markdown-lint without hacks. |
| 👀 **Previewability** | Render legibly in GitHub, VS Code, Obsidian, etc. |
| 🧩 **Extensibility** | Advanced behaviors declared via attributes instead of new notation. |

### Delimiter Roles

Mixdown's syntax follows strict delimiter rules to maintain consistency and clarity. Each character serves a specific purpose:

| Delimiter | Role | Example | Purpose |
|-----------|------|---------|---------|
| `:` | Scope indicator | `destination:code-js` | Indicates that properties are scoped to a specific destination |
| `()` | Value container | `name-(value)` | Contains values for a specific property |
| `[]` | Property grouping | `destination:[property-1 property-2]` | Groups multiple properties within a scope |
| `+` | Inclusion | `+destination`, `+stem-one` | Indicates inclusion of a destination or stem |
| `!` | Exclusion | `!destination`, `!stem-two` | Indicates exclusion of a destination or stem |
| `#` | Stem reference | `#stem-name`, `#(stem1 stem2)` | References stems in imports |

These delimiters always maintain their role throughout the syntax, making the language more intuitive and easier to learn.

### Stems

Stems are the core building block of Mixdown and are a direct stand in for XML tags. They are used to create reusable content blocks that provide clarity for agents, and can be included in other stems or Source Rules files.

```markdown
{{instructions +cursor !claude-code}}
- IMPORTANT: You must follow these coding standards...
{{/instructions}}
```

#### Stem Notation Markers

- **1:1 Markdown-to-XML Translation**: Write stems as `{{stem-name}}` and they will be converted to `<stem_name>` in the output.
- **Open/Close** `{{stem-name ... }}` [ stem content ] `{{/stem-name}}`

#### Stem Marker Names

- `kebab-case` is recommended for stem names (to avoid accidental Markdown emphasis rendering)
- Regardless of the naming convention, XML tags in outputs will be formatted as `<snake_case>` (which is configurable)

#### Stem Marker Parsing

```markdown
<!-- Mixdown input -->
{{stem-one}}
Content A
{{/stem-one}}

{{stem-two +all !claude-code}}
Content B
{{/stem-two}}

---

Output for all configured tools (except `claude-code` in this example):
<!-- XML output -->
<stem-one>
Content A
</stem-one>
<stem-two>
Content B
</stem-two>
```

While Claude Code output will be:

```markdown
<stem-one>
Content A
</stem-one>
```

#### Destination-scoped Property Overrides

Any property can be given a per-destination override by suffixing the destination ID with a **`:`** delimiter (colon):

```markdown
{{instructions cursor:name-(cursor-instructions)}}
...
{{/instructions}}
```

In this example the stem will use the name "cursor-instructions" when compiled for the *cursor* destination. The same pattern works with groups once they arrive (e.g. `ide:name-(ide-instructions)`).

Note: You can also use the `+destination` notation to both include the stem for specific destinations *and* apply destination-specific overrides.

#### Destination-scoped Multiple Properties

For multiple destination-specific properties, you can use square brackets after the colon:

```markdown
{{instructions cursor:[name-(cursor-rules) code-js]}}
```

This applies both `name-(cursor-rules)` and `code-js` properties only when building for the cursor destination, without affecting other destinations. The square brackets group the properties that are scoped to that specific destination.

#### Property Processing Order

Properties within a stem marker are processed sequentially from left to right. This processing order affects three main categories of properties:

1. **Basic Properties**: Simple formatting properties like `tag-omit` or `code-js`
2. **Destination Inclusion/Exclusion**: Modifiers like `+destination` and `!destination`
3. **Destination-Scoped Properties**: Special formatting for specific destinations using `destination:[properties]`

The evaluation follows this simple rule:

- Properties are applied **in the exact order they appear** (left to right)
- When conflict occurs, **the last directive wins**

**Simple Example:**

```markdown
{{stem code-js tag-omit}}
```

First applies `code-js` (JavaScript code block formatting), then applies `tag-omit` (removes surrounding XML tags).

**Practical Destination Example:**

```markdown
{{stem +ide !windsurf cursor:[tag-omit]}}
```

This would:

1. Include the stem for all IDE destinations (`+ide`)
2. Exclude it specifically for Windsurf (`!windsurf`), even though Windsurf might be in the IDE group
3. Apply the `tag-omit` property, but only when building for Cursor

**Conflict Resolution Example:**

```markdown
{{stem h-2 h-3}}
```

The stem would use heading level 3 because `h-3` appears last and overrides `h-2`.

> [!NOTE]
> While properties are processed left-to-right, certain property types like `name-()` might have special handling if specified multiple times. When in doubt about complex combinations, the last specified property for a particular feature usually takes precedence.

#### Destination Filtering Properties

Destination filtering properties control which destinations receive content. These provide powerful ways to include or exclude content for specific destinations or groups of destinations:

| Property | Description | Example |
|--------|-------------|--------|
| `+destination` | Include for a specific destination | `{{stem +cursor}}` |
| `!destination` | Exclude for a specific destination | `{{stem !windsurf}}` |
| `+all` | Include for all configured destinations | `{{stem +all}}` |
| `+group` | Include for all destinations in a group | `{{stem +ide}}` |

The `+all` property is particularly useful for explicitly indicating that content should be included for all destinations. This is helpful when you want to be explicit about inclusion, even though the default behavior is already to include content for all destinations.

```markdown
{{instructions +all !claude-code}}
This content is explicitly included for all destinations except claude-code.
{{/instructions}}
```

When combined with exclusions, `+all` helps make it clear that the content is intentionally included everywhere except for the excluded destinations.

#### Self-Closing Tags

For stems with no content, you can use a self-closing tag format:

```markdown
{{empty-stem/}}

<!-- Which is equivalent to: -->
{{empty-stem}}{{/empty-stem}}
```

Self-closing tags render as empty XML tags in the output:

```xml
<empty_stem />
```

**Further Destination Scoping Examples:**

- **Destination-specific property (block included for all destinations unless otherwise specified):**
  `{{instructions cursor:name-(cursor-specific-rules)}}`
  *(Applies `name-(cursor-specific-rules)` only for the `cursor` destination. The block itself is included for all destinations by default.)*

- **Inclusion for a destination with a specific property:**
  `{{instructions +cursor:name-(only-for-cursor)}}`
  *(Includes this stem *only* for the `cursor` destination, and for `cursor`, it uses `name-(only-for-cursor)`.)*

- **Inclusion for a destination with multiple specific properties:**
  `{{instructions +cursor:[name-(cursor-rules) code-js]}}`
  *(Includes this stem *only* for the `cursor` destination, applying both `name-(cursor-rules)` and `code-js` for `cursor`.)*

- **Exclusion for a destination, even if a scoped property is present:**
  `{{instructions !cursor:name-(ignored-for-cursor)}}`
  *(Excludes this stem for the `cursor` destination. The `name-(ignored-for-cursor)` property would not apply as the stem is excluded for `cursor`.)*

- **Group inclusion with member exclusion and scoped properties for the group:**
  `{{instructions +ide:[code-block] !cursor}}`
  *(Includes this stem for all destinations in the `ide` group, applying the `code-block` property, but explicitly excludes it for the `cursor` destination, even if `cursor` is part of the `ide` group. Assumes `ide` is a defined group, typically in `mixdown.config.json`.)*

> [!IMPORTANT]
> Differentiating Scoped Properties from Scoped Inclusion:
>
> - `destination:[my-property]` means "If this stem is rendered for `destination`, apply `my-property`." The stem's general inclusion is determined elsewhere (e.g. by default, or by a `+destination` on its own).
> - `+destination:[my-property]` means "Render this stem *only* for `destination`, and when doing so, apply `my-property`." This controls both inclusion and destination-specific properties simultaneously.

#### Multi-line Markers for Readability

Properties can be split across lines for readability. The parser preserves this formatting when writing XML tags:

```markdown
<!-- Multi-line section marker in Mixdown format -->

{{instructions
  name-(important-rules)
}}
This is the content of the instructions section.
{{/instructions}}

<!-- Note: Using the name-(value) syntax specifically sets the 'name' attribute 
  (e.g., name="important-rules") in the rendered XML output. -->

---

Output:
<instructions
  name="important-rules">
  This is the content of the instructions section.
</instructions>
```

#### Stem Properties

| Property | Type | Purpose |
|--------|------|---------|
| `+/!destination` | flag | Include/exclude for specific destinations (e.g., `+cursor !windsurf`). |
| `name-(value)` | value | Sets a name with a specified value for the stem. |
| `tag-omit`, `inline`, etc. | flag | Controls how content is processed (see [Output Format](#output-format) below). |
| `code-*`, `h-*`, `num-*` | flag | Family-specific properties for code blocks, headings, and numbering. |
| `[property1 property2]` | group | Groups multiple properties together for readability. |
| `destination:[properties]` | scoped | Destination-specific property group. |
| *Custom* `key="value"` | attribute | Any key-value pair is passed through to XML output. |

#### Output Format

Output properties provide flexible control over how content is formatted in the final output. These properties are available for stems, imports, and inclusions.

```markdown
{{instructions tag-omit}}
Content without surrounding XML tags
{{/instructions}}

{{> conventions#style-guide inline}}

{{> @code-example code-js}}
```

**Output Property Values:**

| Value | Description |
|-------|-------------|
| (default) | Normal rendering with XML tags in standard format (default behavior) |
| `inline` | Content rendered inline without XML tags (simple, concise format) |
| `inline-with-tags` | Content rendered inline with XML tags preserved (all on a single line) |
| `tag-omit` | Remove XML tags from output but maintain block formatting |
| `code-*` | Render content as a code block in specified language (see Code Block Properties below) |
| `raw-all` | Render everything as raw Mixdown Notation |
| `raw-content` | Process tags normally, keep content as raw notation |
| `raw-tags` | Process content normally, keep tags as raw notation |

Multiple properties can be applied together (space-separated):

```markdown
{{instructions inline tag-omit}}
This content will appear without tags and inline
{{/instructions}}
```

**Code Block Properties (code-* family):**

The `code-*` property family renders content as a code block in the specified language. For example:

```markdown
{{section code-js}}
function hello() {
  console.log("Hello, world!");
}
{{/section}}
```

Common language shortcuts include:

| Property | Language |
|--------|----------|
| `code-js` | JavaScript |
| `code-ts` | TypeScript |
| `code-py` | Python |
| `code-rb` | Ruby |
| `code-java` | Java |
| `code-go` | Go |
| `code-rust` | Rust |
| `code-html` | HTML |
| `code-css` | CSS |
| `code-sql` | SQL |
| `code-sh` | Shell/Bash |
| `code-yaml` | YAML |
| `code-json` | JSON |

**Heading Properties (h-* family):**

Heading properties control how headings are processed:

| Property | Description | Example |
|--------|-------------|--------|
| `h-1` to `h-6` | Set specific heading level | `{{section h-2}}` |
| `h-inc` | Increment heading level | `{{section h-inc}}` |
| `h-dec` | Decrement heading level | `{{section h-dec}}` |
| `h-same` | Keep same heading level | `{{section h-same}}` |
| `h-initial` | Replace first heading | `{{section h-initial}}` |

**Heading Shortcut:**

For convenience, you can use a string as the first item in a stem to automatically create a heading:

```markdown
{{section "Section Name" h-3}}
Section content goes here.
{{/section}}
```

This is equivalent to specifying the heading within the content but provides a more visible and consolidated way to name sections. It's particularly useful when creating structured documents with many subsections.

The heading shortcut will automatically:

- Set the heading level (via h-* properties)
- Use the provided text as the heading
- Apply the heading to the beginning of the stem content

**Numbering Properties (num-* family):**

Numbering properties control how content is numbered:

| Property | Description | Example |
|--------|-------------|--------|
| `num` | Enable default numbering | `{{chapter num}}` |
| `num-heading-first` | Number first heading | `{{chapter num-heading-first}}` |
| `num-heading-last` | Number last heading | `{{chapter num-heading-last}}` |
| `num-tag-first` | Number first tag | `{{chapter num-tag-first}}` |
| `num-tag-last` | Number last tag | `{{chapter num-tag-last}}` |

#### Property Grouping

> [!NOTE]
> This section has been added to document the new property grouping syntax.

By default, properties are space-delimited. You can propertyally wrap a list of properties in square brackets for visual grouping and better readability:

```markdown
{{rules [ tag-omit code-js +cursor name-(important-rules) ]}}
...
{{/rules}}
```

All properties inside `[...]` behave exactly the same as if they were space-delimited. This is particularly useful for complex property combinations.

##### Multi-line Property Grouping

Property grouping allows for improved readability with multi-line properties:

```markdown
{{rules [
  tag-omit
  code-js
  name-(important-rules)
  +cursor
  ]}}
...
{{/rules}}
```

##### Property Bracketing Rules

Property groups (brackets) cannot be nested. All properties within a group must be space-delimited and cannot themselves contain another properties group.

For destination-scoped properties with multiple properties, use square brackets after the colon:

```markdown
{{rules destination:[code-js name-(destination-rules)]}}
```

Important: You cannot nest property groups within other property groups:

```markdown
{{rules [code-js tag-omit destination:[property-a property-b]]}}  # ❌ Invalid, nested properties groups
{{rules [code-js tag-omit] destination:[property-a property-b]}}  # ✅ Valid, separate property groups
```

Leading and trailing whitespace within the property group brackets `[]` is propertyal and will be ignored by the parser. Spaces between properties within the brackets are necessary delimiters. For example, `[ property1  property2 ]` is equivalent to `[property1 property2]`.

#### Property Grouping & Scoping: Common Patterns

The following table provides a quick reference to common invocation patterns for property grouping and destination scoping:

| Pattern                                     | Example                                         | Description                                                                 |
|---------------------------------------------|-------------------------------------------------|-----------------------------------------------------------------------------|
| Basic Grouping                              | `{{stem [opt1 opt2 opt3]}}`                    | Visually groups space-delimited properties.                                    |
| Multi-line Grouping                         | `{{stem [\n opt1 \n opt2 \n]}}`                     | Improves readability for many properties.                                      |
| Destination-Scoped Single Property (no group)      | `{{stem destination:opt1}}`                         | Applies `opt1` only for `destination`. Block included for all valid destinations.     |
| Destination-Scoped Multiple Properties (via group)  | `{{stem destination:[opt1 opt2]}}`                  | Applies `opt1` and `opt2` only for `destination`. Block included for all.        |
| Inclusion for Destination + Scoped Single Opt  | `{{stem +destination:opt1}}`                        | Includes block only for `destination`, applying `opt1`.                          |
| Inclusion for Destination + Scoped Multi Opts  | `{{stem +destination:[opt1 opt2]}}`                 | Includes block only for `destination`, applying `opt1` and `opt2`.               |
| Exclusion for Destination (scoped opts moot)     | `{{stem !destination:opt1}}` or `!destination:[opt1]`  | Excludes block for `destination`.                                                |
| Group Inclusion + Member Exclusion          | `{{stem +group:[opt1] !member}}`               | Includes for `group` with `opt1`, but excludes for `member`.                |
| All Destinations Inclusion                      | `{{stem +all}}`                                | Explicitly includes content for all configured destinations.                     |

When used with mixins, if the language is omitted (`code`), the system will automatically determine the language based on the mixin file's extension:

```markdown
{{> @my-script.js code}}
<!-- Will output as JavaScript code block -->

{{> @styles.css code}}
<!-- Will output as CSS code block -->
```

If the file extension is not recognized (and isn't a `.md` file), it will default to `txt`. Explicitly specifying a language will always override the automatic detection:

```markdown
{{> @config.json code-yaml}}
<!-- Will output as YAML code block despite being a JSON file -->
```

#### Using bare XML tags

> [!WARNING]
> Bare XML tags are not valid Markdown, so Markdown previewers may be likely to render them differently or not at all.

When `allow-bare-xml-tags` is set to `true` in frontmatter or `.mixdown.config.json`, you can use bare XML tags for stem names. The outputs will be rendered verbatim, but note:

```markdown
<!-- XML tags with `allow-bare-xml-tags` set to `true` -->
<stem_name>
  ...
</stem_name>

Renders as:

<stem_name>
  ...
</stem_name>
```

### Mixdown Frontmatter

```yaml
---
# .mixdown/src/my-rule.md
mixdown:
  version: 0.1.0 # propertyal, version number for the Mixdown format used
description: "Rules for this project" # propertyal, may be useful for tools that use descriptions, such as Cursor, Windsurf, etc.
globs: ["**/*.{txt,md,mdc}"] # propertyal, globs re-written based on destination-specific needs
# Destination filter examples using standard keys:
destination:
  include: ["cursor", "windsurf"]
  exclude: ["claude-code"]
  path: "./custom/output/path"
# Provide destination-specific frontmatter which is included in their respective outputs:
cursor:
  alwaysApply: false
  destination:
    path: "./custom/.cursor/rules"
windsurf:
  trigger: globs
# Add additional metadata to the mix:
name: my-rule # propertyal, defaults to filename
version: 2.0 # propertyal, version number for this file
created: 2025-05-13 # propertyal, date of creation, automatically included by default
updated: 2025-05-14 # propertyal, date of last update, automatically included by default
labels: ["core", "security"] # propertyal, categorization tags for the mix, available for future use
---
```

Frontmatter is used to provide metadata about the Source Rules file and control how it's compiled. Basic frontmatter includes:

- `mixdown.version`: Metadata about the Mixdown format used
- `name`: Unique identifier for the Source Rules (propertyal, defaults to filename)
- `description`: Propertyal description of the mix, rendered for tools that use them (e.g. Cursor, Windsurf, etc.)
- `globs`: Propertyal globs to be rewritten based on destination-specific needs
- `destination`: Control how this Source Rules is processed for destinations
  - `include`/`exclude`: Control which destinations receive this mix
  - `path`: Specify a custom output path for outputs
  - Properties include any destination providers registered in `.mixdown.config.json`
- `version`: Version information
- `labels`: Categorization tags
- `[cursor|windsurf|claude-code|...]`: Destination-specific key/value pairs
  - Can include `destination.path` to override the global path for specific destinations

### Links

#### External & Mixdown File Internal Links

Standard Markdown links work as expected external links, and links to other Source Rules files:

- Regular links: `[Text](url)`
- Links to other Source Rules files: `[Text](other-mix.md)`

Mixdown also provides a `{{link}}` notation marker to allow for more expressive link notation.

```markdown
{{link mix-name}}
{{link ["Link Title"] mix-name}}
```

> [!NOTE]
> Standard Markdown links will work in previews as expected within the `.mixdown/src` directory, but `{{link ...}}` will not, as it requires compilation by Mixdown to resolve paths relative to the final compiled rules directory and apply any destination-specific link transformations.

#### Linking to Project Files

Linking to project files is done with with the link tag and a relative path to the project root, starting with a `/`:

```markdown
{{link ["Link Title"] /path/to/file.ts}}

The above will render as a link relative to the compiled output's directory. For example, if the compiled output is written to `.cursor/rules/project-conventions.mdc`, the link will be rendered as:

[Link Title](../../path/to/file/.ts)
```

### Variables

Variables are dynamic values using the `{{$...}}` notation. They are replaced inline at build time.

| Type | Notation | Notes |
|------|--------|-------|
| **Alias** | `{{$key}}` | Alias lookup in `.mixdown.config.json` under `aliases` key. |
| **Frontmatter value** | `{{$.key}}` | Access values from thecurrent file's frontmatter. |
| **Destination** | `{{$destination}}` or `{{$destination.id}}` | Display name from the provider manifest (e.g. `Cursor`, `Claude Code`). The current destination ID in kebab-case can be accessed by adding `.id` to the end (`cursor`, `claude-code`, etc.) |

**Built-in System Variables**:

- `{{$destination}}` → display name from the provider manifest (e.g. `Cursor`, `Claude Code`, etc.)
- `{{$destination.id}}` → current destination ID in kebab-case (`cursor`, `claude-code`, etc.)

### Imports

Imports allow you to reuse content across multiple Source Rules files by embedding Source Rules, stems within a file, or mixins into compiled outputs. They are denoted by the `{{> ...}}` notation.

```markdown
<!-- Embeds `/_mixins/legal.md` -->
{{> @legal}}

<!-- Embed a specific stem from the `conventions.md` Source Rules file -->
{{> conventions#stem-name}}

<!-- Embed a stem from within the existing file -->
{{> #stem-name}}

<!-- Import a Source Rules with multiple specific stems, with exclusion -->
{{> my-rules#[stem-one stem-two !stem-three]}}
```

Example:

Let's say that we have a Source Rules file called `conventions.md` that contains a stem called `style-guide`. We can import it into another Source Rules file called `my-rules.md` and include only the `style-guide` stem:

```markdown
<!-- my-rules.md -->
Important: Be sure to follow the style guide:

{{> conventions#style-guide}}

---

The above will render as:

Important: Be sure to follow the style guide:

<style_guide>
  ( contents of #conventions.md#style-guide )
</style_guide>
```

#### Import Attributes

All [stem properties](#stem-properties) can be applied to imports. Additionally, imports support filtering of stems using `#[...]` square bracket syntax:

```markdown
{{> my-rules#[stem-one !stem-two]}}
```

This allows you to filter which stems from the Source Rules are included/excluded on render:

- For included stems, use the stem name without any prefix
- For excluded stems, prefix the stem name with `!` e.g. `!stem-two`

For formatting properties:

- `tag-omit` will remove the surrounding XML tags from the output
- `inline` will render the content inline without XML tags
- `inline-with-tags` will render the content inline with XML tags (all on a single line)
- `code` or `code-*` will format the content as a code block

Examples:

```markdown
{{> my-rules#[!less-important-considerations]}}

<!-- 👆 This would include all stems from `my-rules.md`
     except for `less-important-considerations`. -->

{{> my-rules#[stem-one stem-two]}}

<!-- 👆 This would include only the `stem-one` and `stem-two`
     stems from `my-rules.md`. -->
```

#### Destination-Specific Stem Filtering

You can also apply destination-specific stem filtering for imports:

```markdown
{{> my-rules#[common-stem !legacy-stem cursor:cursor-specific-stem]}}
```

This would:

- Include `common-stem` for all destinations
  - Additionally include `cursor-specific-stem` only when building for the `cursor` destination
- Exclude `legacy-stem` for all destinations

### Imports vs. Inclusions

While they may seem similar, imports and inclusions have different use cases and will be interpreted differently by the compiler:

- **Imports** `{{> ...}}` **will** render the surrounding tag in the final output.
- **Inclusions** `{{$...}}` are replaced outright and **will not** render the surrounding tag in the final output.

### Mixins

Mixins are modular, reusable content components, stored in the `/_mixins` directory. Like pieces of code that provide specific functionality, Mixdown mixins provide isolated content blocks that can be imported into multiple rules files.

- Mixins are converted to `<mixin_name>` tags in the final output. This can be disabled using the `tag-omit` or `inline` properties.

Example:

```markdown
<!-- Mixin: `/_mixins/remember.md` -->
1. Always follow the code conventions.
2. Never commit directly to `main`
3. Use conventional commit messages.

---

<!-- Source Rules: `my-rules.md` -->
# My Rules

...rest of Source Rules content...

{{> @remember}}

---

<!-- Output: `.cursor/rules/my-rules.mdc` -->

# My Rules

...rest of rules file...

<remember>
1. Always follow the code conventions.
2. Never commit directly to `main`
3. Use conventional commit messages.
</remember>
```

### Rendering Raw Mixdown Notation

Triple-brace `{{{...}}}` to skip processing of the content and render it in the raw Mixdown Notation.

- This is useful for writing documentation or rules that need to show Mixdown-flavored Markdown (mix.md) literally
- Wrapping a section in triple curly braces preserves all Mixdown Notation and content exactly as written
- Example:

```markdown
> Triple braces will preserve the Mixdown Notation on render.
> Adding `tag-omit` will remove those stem tags from the output.
> Adding `+cursor` will only include the section for the `cursor` destination.

{{{examples tag-omit +cursor}}}
  {{example}}
  - Instructions
  - Rules
  {{/example}}
{{{/examples}}}

The above will render (in Cursor only) as:

{{example}}
- Instructions
- Rules
{{/example}}

Without the `tag-omit` property, it would render as:

<examples>
  <example>
    - Instructions
    - Rules
  </example>
</examples>
```

### Instruction Placeholders

When writing prompts or instructions, you can use placeholders as self-contained prompts to direct an AI to fill in. Mixdown recommends using single-bracket `[placeholder text]`, but single-brace `{placeholder text}` notation is supported. Just be careful, as one extra brace will cause the compiler to treat it as a Mixdown notation marker.

- ✅ Do this:
  - `[requirements]` / `[ requirements ]`
  - `{requirements}` / `{ requirements }`
- ❌ Don't do this:
  - `[[requirements]]`
  - `{{requirements}}`
  - `<requirements>`

> [!IMPORTANT]
> Remember, placeholder values should be simply considered instructions for the AI, and the output may not always be exactly what you expect. They're probabilistic, not deterministic.

#### Placeholder Formatting

Feel free to experiment with different language choice, formats, and even attributes to see what works best for your use case:

```markdown
[requirements|Title Case]
[requirements format="Title Case"]
[requirements in Title Case]
```

While the AI may not always follow the instructions in the placeholder precisely, it's worth experimenting.

### Whitespace Handling

Mixdown has specific rules for whitespace to ensure consistent parsing and output:

- Space after opening `{{` and before closing `}}` is propertyal
  - Example: `{{instructions}}` is equivalent to `{{ instructions }}`
- No spaces are allowed around the `=` sign in attribute declarations
- Attributes must be separated by spaces or newlines
  - Whitespace adjacent to brackets is removed on render, while new lines are preserved

## Code Examples

**Section with attributes:**

```markdown
{{instructions name-(core-rules) +cursor !windsurf}}
All code must follow consistent formatting.

Testing is required for all new features.
{{/instructions}}

Output in Cursor (but not Windsurf):

<instructions name="core_rules">
All code must follow consistent formatting.

Testing is required for all new features.
</instructions>
```

**Importing content:**

```markdown
{{> @coding-standards}}

{{> my-mix#specific-stem}}
```

**Using variables:**

```markdown
Project: {{ $project }}
Version: {{ $.version }}
```

**Using raw output:**

```markdown
{{{example tag-omit}}}
To include a section in Mixdown use: {{section-name}}
{{{/example}}}
```

## Directory Structure

```text
project/
├── .mixdown/
│   ├── dist/
│   │   └── latest/            # compiled rules
│   ├── src/                   # Source Rules files (*.md)
│   │   └── _mixins/           # reusable content modules
│   └── mixdown.config.json    # compiler config
```

## Future Releases

Features planned for v0.x releases:

- Self-closing section tags
- Destination groups for easier filtering of multiple destinations
- Template support with placeholder filling
- Mode support for tools like Roo Code
- Slash command support for Claude Code
- Strict mode for validation

## Appendix

### Comprehensive Property Reference

This section provides a complete reference for all properties supported in Mixdown v0.x, organized by their purpose and usage patterns.

#### Property Naming Conventions

Mixdown uses consistent naming patterns to make properties discoverable and intuitive:

| Pattern | Description | Examples |
|---------|-------------|----------|
| `prefix-*` | Family of related properties | `code-js`, `h-2` |
| `name-(value)` | Property with parameter value | `name-(important-rules)` |
| `+/-prefix` | Inclusion/exclusion modifiers | `+cursor`, `!windsurf` |
| `destination:property` | Destination-scoped single property | `cursor:tag-omit` |
| `destination:[opts]` | Destination-scoped property group | `cursor:[tag-omit code-js]` |
| `custom="value"` | Custom XML attribute | `priority="high"` |

#### Property Categories and Usage

The table below organizes properties by their categories with comprehensive information about where they can be used.

| Property | Format | Example | Stem | Import | Frontmatter | Description |
|--------|--------|---------|-------|--------|-------------|-------------|
| **Destination Selection Properties** |||||||
| `+destination` | Flag | `+cursor` | ✅ | ✅ | ❌ | Include content for specific destination |
| `!destination` | Flag | `!windsurf` | ✅ | ✅ | ❌ | Exclude content for specific destination |
| `+group` | Flag | `+ide` | ✅ | ✅ | ❌ | Include for all destinations in a group |
| `+all` | Flag | `+all` | ✅ | ✅ | ❌ | Include content for all configured destinations |
| `!group` | Flag | `!cli` | ✅ | ✅ | ❌ | Exclude for all destinations in a group |
| **Destination-Scoped Properties** |||||||
| `destination:property` | Scoped | `cursor:tag-omit` | ✅ | ✅ | ❌ | Apply property only for specified destination |
| `destination:[properties]` | Scoped group | `cursor:[code-js name-(rules)]` | ✅ | ✅ | ❌ | Apply multiple properties only for specified destination |
| `+destination:property` | Combined | `+cursor:tag-omit` | ✅ | ✅ | ❌ | Include for destination and apply property to that destination |
| `!destination:property` | Combined | `!windsurf:code-js` | ✅ | ✅ | ❌ | Exclude for destination (property has no effect) |
| **Metadata Properties** |||||||
| `name-(value)` | Parameter | `name-(important-rules)` | ✅ | ✅ | ✅ | Set XML name attribute; identifier in frontmatter |
| `id-(value)` | Parameter | `id-(section-1)` | ✅ | ✅ | ❌ | Set id attribute for linking and references |
| `custom="value"` | XML attribute | `priority="high"` | ✅ | ✅ | ❌ | Set custom XML attributes passed to output |
| **Display Properties** |||||||
| `tag-omit` | Flag | `tag-omit` | ✅ | ✅ | ❌ | Remove XML tags from output, preserve formatting |
| `inline` | Flag | `inline` | ✅ | ✅ | ❌ | Remove XML tags and render content inline |
| `inline-with-tags` | Flag | `inline-with-tags` | ✅ | ✅ | ❌ | Keep XML tags but render content inline |
| **Code Formatting Properties** |||||||
| `code` | Flag | `code` | ✅ | ✅ | ❌ | Auto-detect language from file extension |
| `code-*` | Flag | `code-js`, `code-py`, etc. | ✅ | ✅ | ❌ | Format as code block in specified language |
| **Heading Properties** |||||||
| `h-[1-6]` | Flag | `h-1` through `h-6` | ✅ | ✅ | ❌ | Format as heading of specified level |
| `h-inc` | Flag | `h-inc` | ✅ | ✅ | ❌ | Increment heading level (demote) |
| `h-dec` | Flag | `h-dec` | ✅ | ✅ | ❌ | Decrement heading level (promote) |
| `h-same` | Flag | `h-same` | ✅ | ✅ | ❌ | Keep same heading level |
| `h-initial` | Flag | `h-initial` | ✅ | ✅ | ❌ | Replace first heading |
| **Numbering Properties** |||||||
| `num` | Flag | `num` | ✅ | ✅ | ❌ | Enable default numbering |
| `num-heading-first` | Flag | `num-heading-first` | ✅ | ✅ | ❌ | Number first heading only |
| `num-heading-last` | Flag | `num-heading-last` | ✅ | ✅ | ❌ | Number last heading only |
| `num-tag-first` | Flag | `num-tag-first` | ✅ | ✅ | ❌ | Number first tag only |
| `num-tag-last` | Flag | `num-tag-last` | ✅ | ✅ | ❌ | Number last tag only |
| **Raw Notation Properties** |||||||
| `raw-all` | Flag | `raw-all` | ✅ | ✅ | ❌ | Render everything as raw Mixdown notation |
| `raw-content` | Flag | `raw-content` | ✅ | ✅ | ❌ | Process tags, preserve content as raw |
| `raw-tags` | Flag | `raw-tags` | ✅ | ✅ | ❌ | Process content, preserve tags as raw |
| **Import Filtering** |||||||
| `#stem` | Single stem | `#stem-name` | ❌ | ✅ | ❌ | Include specific stem from import |
| `#!stem` | Single exclusion | `#!stem-name` | ❌ | ✅ | ❌ | Exclude specific stem from import |
| `#[stem1 stem2]` | Multiple stems | `#[section-a section-b]` | ❌ | ✅ | ❌ | Include multiple specific stems |
| `#[destination:stem]` | Scoped stem | `#[cursor:section-a]` | ❌ | ✅ | ❌ | Destination-specific stem inclusion |
| **Frontmatter Configuration** |||||||
| `mixdown.version` | YAML | `mixdown.version: 0.1.0` | ❌ | ❌ | ✅ | Mixdown format version for the file |
| `description` | YAML | `description: "Project rules"` | ❌ | ❌ | ✅ | Short description of the Source Rules |
| `name` | YAML | `name: my-rules` | ❌ | ❌ | ✅ | Unique identifier for the Source Rules (defaults to filename) |
| `version` | YAML | `version: 2.0` | ❌ | ❌ | ✅ | Version number for this Source Rules file |
| `labels` | YAML | `labels: ["core", "security"]` | ❌ | ❌ | ✅ | Categorization tags for the Source Rules |
| `globs` | YAML | `globs: ["**/*.{txt,md}"]` | ❌ | ❌ | ✅ | File patterns for tool-specific support |
| `destination.include` | YAML | `destination.include: ["cursor"]` | ❌ | ❌ | ✅ | List of destinations to include this Source Rules for |
| `destination.exclude` | YAML | `destination.exclude: ["claude-code"]` | ❌ | ❌ | ✅ | List of destinations to exclude this Source Rules from |
| `destination.path` | YAML | `destination.path: "./custom/path"` | ❌ | ❌ | ✅ | Custom output path for outputs |
| `allow-bare-xml-tags` | YAML | `allow-bare-xml-tags: true` | ❌ | ❌ | ✅ | Allow using bare XML tags |
| `[destination-id]` | YAML | `cursor: { ... }` | ❌ | ❌ | ✅ | Destination-specific configuration block |

#### Common Property Patterns and Languages

**Code Languages (`code-*`):**
Most common programming languages are supported using the `code-language` pattern, including: `code-js` (JavaScript), `code-ts` (TypeScript), etc.

**Common Property Combinations:**

```markdown
<!-- Basic formatting properties -->
{{stem tag-omit}}                    <!-- Remove XML tags, keep block formatting -->
{{stem inline}}                      <!-- Render inline without tags -->
{{stem code-js tag-omit}}           <!-- JavaScript code block without XML wrapper -->

<!-- Destination scoping properties -->
{{stem +cursor !windsurf}}          <!-- Include for Cursor, exclude for Windsurf -->
{{stem +ide:[code-js]}}             <!-- Include for all IDE destinations with code-js formatting -->
{{stem cursor:tag-omit}}            <!-- Apply tag-omit only for Cursor -->

<!-- Import properties -->
{{> @mixin code-js}}               <!-- Import mixin as JavaScript code block -->
{{> mix-file#[stem-a !stem-b]}}    <!-- Import only stem-a from file, exclude stem-b -->
{{> rules#section cursor:[inline]}}  <!-- Import rules#section with cursor-specific inline formatting -->
```

#### Property Extension Rules

1. **Prefixed Families**: Properties like `code-*` and `h-*` follow consistent naming with a prefix identifying the family.

2. **Parameter Values**: Properties requiring values use parentheses syntax: `name-(value)`.

3. **Destination Scoping**: Destination scoping follows the `destination:property` or `destination:[property1 property2]` pattern.

4. **Custom Attributes**: Any `key="value"` pair not matching a defined property is treated as a custom XML attribute. These attributes are passed through to the output XML tags:

   ```markdown
   {{rules data-id="123" role="example"}}
   Content with tags including the custom attributes
   {{/rules}}
   ```

   Renders as:

   ```xml
   <rules data-id="123" role="example">
   Content with tags including the custom attributes
   </rules>
   ```

   Note that when using `tag-omit`, custom XML attributes won't appear in the output since the tags themselves are removed.

5. **Property Precedence**: When multiple properties might conflict, the last specified property takes precedence (left-to-right evaluation).

6. **Frontmatter to Destination**: Destination-specific frontmatter (e.g., `cursor: { ... }`) overrides global values for that destination.

*© 2025 Mixdown contributors – MIT License.*
