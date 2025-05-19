# 💽 Mixdown – v0 Overview

> *Write prompts once, render tool-specific rules, zero drift.*

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
- [Target Providers](#target-providers)
- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
- [Notation Reference](#notation-reference)
  - [Design Goals](#design-goals)
  - [Tracks](#tracks)
    - [Track Notation Markers](#track-notation-markers)
    - [Track Marker Names](#track-marker-names)
    - [Track Marker Parsing](#track-marker-parsing)
    - [Target-scoped Option Overrides](#target-scoped-option-overrides)
    - [Target-scoped Multiple Options](#target-scoped-multiple-options)
    - [Self-Closing Tags](#self-closing-tags)
    - [Multi-line Markers for Readability](#multi-line-markers-for-readability)
    - [Track Options](#track-options)
    - [Output Format](#output-format)
    - [Option Grouping](#option-grouping)
      - [Multi-line Option Grouping](#multi-line-option-grouping)
      - [Option Bracketing Rules](#option-bracketing-rules)
    - [Using bare XML tags](#using-bare-xml-tags)
  - [Mixdown Frontmatter](#mixdown-frontmatter)
  - [Links](#links)
    - [External \& Mixdown File Internal Links](#external--mixdown-file-internal-links)
    - [Linking to Project Files](#linking-to-project-files)
  - [Variables](#variables)
  - [Imports](#imports)
    - [Import Attributes](#import-attributes)
    - [Target-Specific Track Filtering](#target-specific-track-filtering)
  - [Imports vs. Inclusions](#imports-vs-inclusions)
  - [Snippets](#snippets)
  - [Rendering Raw Mixdown Notation](#rendering-raw-mixdown-notation)
  - [Instruction Placeholders](#instruction-placeholders)
    - [Placeholder Formatting](#placeholder-formatting)
  - [Whitespace Handling](#whitespace-handling)
- [Code Examples](#code-examples)
- [Directory Structure](#directory-structure)
- [Future Releases](#future-releases)
- [Appendix](#appendix)
  - [Comprehensive Option Reference Table](#comprehensive-option-reference-table)

## Purpose & Vision

### Overview

Mixdown is a **CommonMark-compliant prompt compiler** that lets you author a single *mix* file in Markdown and compile it into tool-specific instruction files (`.cursor/rules.mdc`, `./CLAUDE.md`, `.roo/rules.md`, and more). Think of it as **Terraform for AI prompts**: write once, target many, your agents, no matter the tool, on the (literal) same page.

### The Problem

- Agentic rules files are **fragmented** across IDEs and agentic tools, following different formats, and in disparate locations, leading to duplication and drift.
- Manual copy-paste workflows break **source-of-truth** guarantees and slow (or halt) experimentation with new agentic tools (that might even be better suited for the task).
- Lack of a **cohesive format for rules** hinders creation, testing, versioning…you name it.

### Our Solution

Mixdown introduces a single source-of-truth rules notation written in pure Markdown (with a dash of specialized notation), which is processed into tool-specific files by a compiler that:

1. Parses the mix into an AST (abstract syntax tree) to ensure a consistent format.
2. Uses **tool-specific compilers** (as plugins) to transform the AST into per-tool rules files (outputs).
3. Writes per-tool **outputs** to their respective locations, with the necessary filenames, formats, etc. all accounted for.

Result: *Write prompts once, render tool-specific rules, zero drift.*

## Core Concepts

- **Mix**
  - Source instruction files, written in 100% previewable Markdown.
  - Written in Mixdown Notation and use `{{...}}` notation markers to direct the compiler.
  - Compiled into tool-specific rules files:
    - `./mixdown/mixes/my-rule.md` → `.cursor/rules/my-rule.mdc`
- **Target**
  - A supported tool, such as `cursor`, `windsurf`, or `claude-code`.
  - Defines tool-specific criteria for compiling mixes to rules files.
  - Provided through plugins.
- **Output**
  - Target-specific (tool) output files, rendered from the source mix.
  - Examples for a mix called `project-conventions.md`:
    - Cursor → `.cursor/rules/project-conventions.mdc`
    - Claude Code → `./CLAUDE.md#project-conventions`
    - OpenAI Codex → `./conventions.md`.
  - When placed in tool directories, referred to as "tool-ready outputs".
- **Notation Marker**
  - Syntax: `{{...}}`
  - Fundamental building block of Mixdown Notation
  - Used to direct the compiler for various purposes (tracks, imports, variables)
  - All Mixdown directives use marker notation, but serve different functions
  - Similar to `<xml-tags>`, but fully Markdown-previewable.
- **Track**
  - Syntax: `{{track-name}}...{{/track-name}}`
  - A specific application of notation markers that creates delimited content blocks
  - Translates directly to XML tags in output: `<track_name>...</track_name>`
  - Has opening and closing notation markers that surround content
  - Can contain attributes that control rendering behavior
  - Example: `{{instructions}}This is instruction content{{/instructions}}`
- **Import**
  - Syntax: `{{> my-rule }}`
  - Embed content from another mix, track, snippet, or template.
- **Variable**
  - Syntax: `{{$key}}` or `$key` if used within a `{{...}}` marker.
  - Dynamic values replaced inline at build time.
  - Examples: `{{$target}}`, `{{$.frontmatter.key}}`, `{{$alias}}`

## Key Features

### Mixdown Notation

- **100% Preview-able Markdown:** Renders cleanly in GitHub, VS Code, etc.; passes markdown-lint.
- **Granular Tracks:** Filter tracks within a single mix for per-target inclusion/exclusion.
- **Build-time Variables:** Aliases and frontmatter data injection.

### Compiler & Integration

- **Plugin Architecture:** Add new targets via `MixdownPluginProvider` without touching core.
- **CLI & API:** `mixdown build`, `mixdown validate`, and `POST /compile` endpoint.

## Target Providers

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

mixdown build     # writes outputs to .mixdown/outputs/
```

## Notation Reference

### Design Goals

| Goal | Description |
|------|-------------|
| ✨ **Simplicity** | Reduce bespoke format/structure for each tool to just one. |
| 🧹 **Lintability** | Files must pass standard markdown-lint without hacks. |
| 👀 **Previewability** | Render legibly in GitHub, VS Code, Obsidian, etc. |
| 🧩 **Extensibility** | Advanced behaviors declared via attributes instead of new notation. |

### Tracks

Tracks are the core building block of Mixdown and are a direct stand in for XML tags. They are used to create reusable content blocks that provide clarity for agents, and can be included in other tracks or mixes.

```markdown
{{instructions +cursor !claude-code}}
- IMPORTANT: You must follow these coding standards...
{{/instructions}}
```

#### Track Notation Markers

- **1:1 Markdown-to-XML Translation**: Write tracks as `{{track-name}}` and they will be converted to `<track_name>` in the output.
- **Open/Close** `{{track-name ... }}` [ track content ] `{{/track-name}}`

#### Track Marker Names

- `kebab-case` is recommended for track names (to avoid accidental Markdown emphasis rendering)
- Regardless of the naming convention, XML tags in outputs will be formatted as `<snake_case>` (which is configurable)

#### Track Marker Parsing

```markdown
<!-- Mixdown input -->
{{track-one}}
Content A
{{/track-one}}

{{track-two +* !claude-code}}
Content B
{{/track-two}}

---

Output for all configured tools (except `claude-code` in this example):
<!-- XML output -->
<track-one>
Content A
</track-one>
<track-two>
Content B
</track-two>
```

While Claude Code output will be:

```markdown
<track-one>
Content A
</track-one>
```

#### Target-scoped Option Overrides

Any option can be given a per-target override by suffixing the target ID with a **`:`** delimiter (colon):

```markdown
{{instructions cursor:name(cursor-instructions)}}
...
{{/instructions}}
```

In this example the track will use the name "cursor-instructions" when compiled for the *cursor* target. The same pattern works with groups once they arrive (e.g. `ide:name(ide-instructions)`).

Note: You can also use the `+target` notation to both include the track for specific targets *and* apply target-specific overrides.

#### Target-scoped Multiple Options

For multiple target-specific options, you can use square brackets after the colon:

```markdown
{{instructions cursor:[name(cursor-rules) code-js]}}
```

This applies both `name(cursor-rules)` and `code-js` options only when building for the cursor target, without affecting other targets. The square brackets group the options that are scoped to that specific target.

#### Option Processing Order

Options within a track marker are processed sequentially from left to right. This processing order affects three main categories of options:

1. **Basic Options**: Simple formatting options like `tag-omit` or `code-js`
2. **Target Inclusion/Exclusion**: Modifiers like `+target` and `!target`
3. **Target-Scoped Options**: Special formatting for specific targets using `target:[options]`

The evaluation follows this simple rule:

- Options are applied **in the exact order they appear** (left to right)
- When conflict occurs, **the last directive wins**

**Simple Example:**
```markdown
{{track code-js tag-omit}}
```
First applies `code-js` (JavaScript code block formatting), then applies `tag-omit` (removes surrounding XML tags).

**Practical Target Example:**
```markdown
{{track +ide !windsurf cursor:[tag-omit]}}
```
This would:
1. Include the track for all IDE targets (`+ide`)
2. Exclude it specifically for Windsurf (`!windsurf`), even though Windsurf might be in the IDE group
3. Apply the `tag-omit` option, but only when building for Cursor

**Conflict Resolution Example:**
```markdown
{{track h-2 h-3}}
```
The track would use heading level 3 because `h-3` appears last and overrides `h-2`.

> [!NOTE]
> While options are processed left-to-right, certain option types like `name()` might have special handling if specified multiple times. When in doubt about complex combinations, the last specified option for a particular feature usually takes precedence.

#### Self-Closing Tags

For tracks with no content, you can use a self-closing tag format:

```markdown
{{empty-track/}}

<!-- Which is equivalent to: -->
{{empty-track}}{{/empty-track}}
```

Self-closing tags render as empty XML tags in the output:

```xml
<empty_track />
```

**Further Target Scoping Examples:**

- **Target-specific option (block included for all targets unless otherwise specified):**
  `{{instructions cursor:name(cursor-specific-rules)}}`
  *(Applies `name(cursor-specific-rules)` only for the `cursor` target. The block itself is included for all targets by default.)*

- **Inclusion for a target with a specific option:**
  `{{instructions +cursor:name(only-for-cursor)}}`
  *(Includes this track *only* for the `cursor` target, and for `cursor`, it uses `name(only-for-cursor)`.)*

- **Inclusion for a target with multiple specific options:**
  `{{instructions +cursor:[name(cursor-rules) code-js]}}`
  *(Includes this track *only* for the `cursor` target, applying both `name(cursor-rules)` and `code-js` for `cursor`.)*

- **Exclusion for a target, even if a scoped option is present:**
  `{{instructions !cursor:name(ignored-for-cursor)}}`
  *(Excludes this track for the `cursor` target. The `name(ignored-for-cursor)` option would not apply as the track is excluded for `cursor`.)*

- **Group inclusion with member exclusion and scoped options for the group:**
  `{{instructions +ide:[code-block] !cursor}}`
  *(Includes this track for all targets in the `ide` group, applying the `code-block` option, but explicitly excludes it for the `cursor` target, even if `cursor` is part of the `ide` group. Assumes `ide` is a defined group, typically in `mixdown.config.json`.)*

> [!IMPORTANT]
> Differentiating Scoped Options from Scoped Inclusion:
> - `target:[my-option]` means "If this track is rendered for `target`, apply `my-option`." The track's general inclusion is determined elsewhere (e.g. by default, or by a `+target` on its own).
> - `+target:[my-option]` means "Render this track *only* for `target`, and when doing so, apply `my-option`." This controls both inclusion and target-specific options simultaneously.

#### Multi-line Markers for Readability

Options can be split across lines for readability. The parser preserves this formatting when writing XML tags:

```markdown
<!-- Multi-line section marker in Mixdown format -->

{{instructions
  name(important-rules)
}}
This is the content of the instructions section.
{{/instructions}}

<!-- Note: Using the name(value) syntax specifically sets the 'name' attribute 
  (e.g., name="important-rules") in the rendered XML output. -->

---

Output:
<instructions
  name="important-rules">
  This is the content of the instructions section.
</instructions>
```

#### Track Options

| Option | Type | Purpose |
|--------|------|---------|
| `+/!target` | flag | Include/exclude for specific targets (e.g., `+cursor !windsurf`). |
| `name(value)` | value | Sets a name with a specified value for the track. |
| `tag-omit`, `inline`, etc. | flag | Controls how content is processed (see [Output Format](#output-format) below). |
| `code-*`, `h-*`, `num-*` | flag | Family-specific options for code blocks, headings, and numbering. |
| `[option1 option2]` | group | Groups multiple options together for readability. |
| `target:[options]` | scoped | Target-specific option group. |
| *Custom* `key="value"` | attribute | Any key-value pair is passed through to XML output. |

#### Output Format

Output options provide flexible control over how content is formatted in the final output. These options are available for tracks, imports, and inclusions.

```markdown
{{instructions tag-omit}}
Content without surrounding XML tags
{{/instructions}}

{{> conventions#style-guide inline}}

{{> @code-example code-js}}
```

**Output Option Values:**

| Value | Description |
|-------|-------------|
| (default) | Normal rendering with XML tags in standard format (default behavior) |
| `inline` | Content rendered inline without XML tags (simple, concise format) |
| `inline-with-tags` | Content rendered inline with XML tags preserved (all on a single line) |
| `tag-omit` | Remove XML tags from output but maintain block formatting |
| `code-*` | Render content as a code block in specified language (see Code Block Options below) |
| `raw-all` | Render everything as raw Mixdown Notation |
| `raw-content` | Process tags normally, keep content as raw notation |
| `raw-tags` | Process content normally, keep tags as raw notation |

Multiple options can be applied together (space-separated):

```markdown
{{instructions inline tag-omit}}
This content will appear without tags and inline
{{/instructions}}
```

**Code Block Options (code-* family):**

The `code-*` option family renders content as a code block in the specified language. For example:

```markdown
{{section code-js}}
function hello() {
  console.log("Hello, world!");
}
{{/section}}
```

Common language shortcuts include:

| Option | Language |
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

**Heading Options (h-* family):**

Heading options control how headings are processed:

| Option | Description | Example |
|--------|-------------|--------|
| `h-1` to `h-6` | Set specific heading level | `{{section h-2}}` |
| `h-inc` | Increment heading level | `{{section h-inc}}` |
| `h-dec` | Decrement heading level | `{{section h-dec}}` |
| `h-same` | Keep same heading level | `{{section h-same}}` |
| `h-initial` | Replace first heading | `{{section h-initial}}` |

You can also use a string as the first item to create a heading:

```markdown
{{section "Section Name" h-3}}
Section content goes here.
{{/section}}
```

**Numbering Options (num-* family):**

Numbering options control how content is numbered:

| Option | Description | Example |
|--------|-------------|--------|
| `num` | Enable default numbering | `{{chapter num}}` |
| `num-heading-first` | Number first heading | `{{chapter num-heading-first}}` |
| `num-heading-last` | Number last heading | `{{chapter num-heading-last}}` |
| `num-tag-first` | Number first tag | `{{chapter num-tag-first}}` |
| `num-tag-last` | Number last tag | `{{chapter num-tag-last}}` |

#### Option Grouping

> [!NOTE]
> This section has been added to document the new option grouping syntax.

By default, options are space-delimited. You can optionally wrap a list of options in square brackets for visual grouping and better readability:

```markdown
{{rules [ tag-omit code-js +cursor name(important-rules) ]}}
...
{{/rules}}
```

All options inside `[...]` behave exactly the same as if they were space-delimited. This is particularly useful for complex option combinations.

##### Multi-line Option Grouping

Option grouping allows for improved readability with multi-line options:

```markdown
{{rules [
  tag-omit
  code-js
  name(important-rules)
  +cursor
  ]}}
...
{{/rules}}
```

##### Option Bracketing Rules

Option groups (brackets) cannot be nested. All options within a group must be space-delimited and cannot themselves contain another options group.

For target-scoped options with multiple options, use square brackets after the colon:

```markdown
{{rules target:[code-js name(target-rules)]}}
```

Important: You cannot nest option groups within other option groups:

```markdown
{{rules [code-js tag-omit target:[option-a option-b]]}}  # ❌ Invalid, nested options groups
{{rules [code-js tag-omit] target:[option-a option-b]}}  # ✅ Valid, separate option groups
```

Leading and trailing whitespace within the option group brackets `[]` is optional and will be ignored by the parser. Spaces between options within the brackets are necessary delimiters. For example, `[ option1  option2 ]` is equivalent to `[option1 option2]`.

#### Option Grouping & Scoping: Common Patterns

The following table provides a quick reference to common invocation patterns for option grouping and target scoping:

| Pattern                                     | Example                                         | Description                                                                 |
|---------------------------------------------|-------------------------------------------------|-----------------------------------------------------------------------------|
| Basic Grouping                              | `{{track [opt1 opt2 opt3]}}`                    | Visually groups space-delimited options.                                    |
| Multi-line Grouping                         | `{{track [opt1
  opt2
]}}`                     | Improves readability for many options.                                      |
| Target-Scoped Single Option (no group)      | `{{track target:opt1}}`                         | Applies `opt1` only for `target`. Block included for all valid targets.     |
| Target-Scoped Multiple Options (via group)  | `{{track target:[opt1 opt2]}}`                  | Applies `opt1` and `opt2` only for `target`. Block included for all.        |
| Inclusion for Target + Scoped Single Opt  | `{{track +target:opt1}}`                        | Includes block only for `target`, applying `opt1`.                          |
| Inclusion for Target + Scoped Multi Opts  | `{{track +target:[opt1 opt2]}}`                 | Includes block only for `target`, applying `opt1` and `opt2`.               |
| Exclusion for Target (scoped opts moot)     | `{{track !target:opt1}}` or `!target:[opt1]`  | Excludes block for `target`.                                                |
| Group Inclusion + Member Exclusion          | `{{track +group:[opt1] !member}}`               | Includes for `group` with `opt1`, but excludes for `member`.                |

When used with snippets, if the language is omitted (`code`), the system will automatically determine the language based on the snippet file's extension:

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

When `allow-bare-xml-tags` is set to `true` in frontmatter or `.mixdown.config.json`, you can use bare XML tags for track names. The outputs will be rendered verbatim, but note:

```markdown
<!-- XML tags with `allow-bare-xml-tags` set to `true` -->
<track_name>
  ...
</track_name>

Renders as:

<track_name>
  ...
</track_name>
```

### Mixdown Frontmatter

```yaml
---
# .mixdown/mixes/my-rule.md
mixdown:
  version: 0.1.0 # optional, version number for the Mixdown format used
description: "Rules for this project" # optional, may be useful for tools that use descriptions, such as Cursor, Windsurf, etc.
globs: ["**/*.{txt,md,mdc}"] # optional, globs re-written based on target-specific needs
# Target filter examples using standard keys:
target:
  include: ["cursor", "windsurf"]
  exclude: ["claude-code"]
  path: "./custom/output/path"
# Provide target-specific frontmatter which is included in their respective outputs:
cursor:
  alwaysApply: false
  target:
    path: "./custom/.cursor/rules"
windsurf:
  trigger: globs
# Add additional metadata to the mix:
name: my-rule # optional, defaults to filename
version: 2.0 # optional, version number for this file
created: 2025-05-13 # optional, date of creation, automatically included by default
updated: 2025-05-14 # optional, date of last update, automatically included by default
labels: ["core", "security"] # optional, categorization tags for the mix, available for future use
---
```

Frontmatter is used to provide metadata about the mix file and control how it's compiled. Basic frontmatter includes:

- `mixdown.version`: Metadata about the Mixdown format used
- `name`: Unique identifier for the mix (optional, defaults to filename)
- `description`: Optional description of the mix, rendered for tools that use them (e.g. Cursor, Windsurf, etc.)
- `globs`: Optional globs to be rewritten based on target-specific needs
- `target`: Control how this mix is processed for targets
  - `include`/`exclude`: Control which targets receive this mix
  - `path`: Specify a custom output path for outputs
  - Options include any target providers registered in `.mixdown.config.json`
- `version`: Version information
- `labels`: Categorization tags
- `[cursor|windsurf|claude-code|...]`: Target-specific key/value pairs
  - Can include `target.path` to override the global path for specific targets

### Links

#### External & Mixdown File Internal Links

Standard Markdown links work as expected external links, and links to other mix files:

- Regular links: `[Text](url)`
- Links to other mix files: `[Text](other-mix.md)`

Mixdown also provides a `{{link}}` notation marker to allow for more expressive link notation.

```markdown
{{link mix-name}}
{{link ["Link Title"] mix-name}}
```

> [!NOTE]
> Standard Markdown links will work in previews as expected within the `.mixdown/mixes` directory, but `{{link ...}}` will not, as it requires compilation by Mixdown to resolve paths relative to the final output directory and apply any target-specific link transformations.

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
| **Target** | `{{$target}}` or `{{$target.id}}` | Display name from the provider manifest (e.g. `Cursor`, `Claude Code`). The current target ID in kebab-case can be accessed by adding `.id` to the end (`cursor`, `claude-code`, etc.) |

**Built-in System Variables**:

- `{{$target}}` → display name from the provider manifest (e.g. `Cursor`, `Claude Code`, etc.)
- `{{$target.id}}` → current target ID in kebab-case (`cursor`, `claude-code`, etc.)

### Imports

Imports allow you to reuse content across multiple mixes by embedding mixes, tracks within a mix, or snippets into rendered outputs. They are denoted by the `{{> ...}}` notation.

```markdown
<!-- Embeds `/_snippets/legal.md` -->
{{> @legal}}

<!-- Embed a specific track from the `conventions.md` mix file -->
{{> conventions#track-name}}

<!-- Embed a track from within the existing file -->
{{> #track-name}}

<!-- Import a mix with multiple specific tracks -->
{{> my-rules(+track-name !track-name-to-exclude)}}
```

Example:

Let's say that we have a mix file called `conventions.md` that contains a track called `style-guide`. We can import it into another mix file called `my-rules.md` and include only the `style-guide` track:

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

All [track options](#track-attributes) can be applied to imports. Additionally, imports support filtering of tracks using parentheses syntax:

```markdown
{{> my-rules(+track-one !track-two)}}
```

This allows you to filter which tracks from the mix are included/excluded on render:
- Prefix included tracks with `+` (consistent with target inclusion)
- Prefix excluded tracks with `!` (consistent with target exclusion)

For formatting options:
- `tag-omit` will remove the surrounding XML tags from the output
- `inline` will render the content inline without XML tags
- `inline-with-tags` will render the content inline with XML tags (all on a single line)
- `code` or `code-*` will format the content as a code block

Examples:

```markdown
{{> my-rules(!less-important-considerations)}}

<!-- 👆 This would include all tracks from `my-rules.md`
     except for `less-important-considerations`. -->

{{> my-rules(+important-considerations)}}

<!-- 👆 This would include only the `important-considerations`
     track from `my-rules.md`. -->
```

#### Target-Specific Track Filtering

You can also apply target-specific track filtering for imports:

```markdown
{{> my-rules(+common-track cursor:+cursor-specific !legacy-track)}}
```

This would:
- Include "common-track" for all targets
- Additionally include "cursor-specific" only when building for the cursor target
- Exclude "legacy-track" for all targets

### Imports vs. Inclusions

While they may seem similar, imports and inclusions have different use cases and will be interpreted differently by the compiler:

- **Imports** `{{> ...}}` **will** render the surrounding tag in the final output.
- **Inclusions** `{{$...}}` are replaced outright and **will not** render the surrounding tag in the final output.

### Snippets

Snippets are modular, reusable content components, stored in the `/_snippets` directory. Like pieces of code that provide specific functionality, Mixdown snippets provide isolated content blocks that can be imported into multiple instruction files.

- Snippets are converted to `<snippet_name>` tags in the final output. This can be disabled using the `tag-omit` or `inline` options.

Example:

```markdown
<!-- Snippet: `/_snippets/remember.md` -->
1. Always follow the code conventions.
2. Never commit directly to `main`
3. Use conventional commit messages.

---

<!-- Mix: `my-rules.md` -->
# My Rules

...rest of mix content...

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
> Adding `tag-omit` will remove those track tags from the output.
> Adding `+cursor` will only include the section for the `cursor` target.

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

Without the `tag-omit` option, it would render as:

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

- Space after opening `{{` and before closing `}}` is optional
  - Example: `{{instructions}}` is equivalent to `{{ instructions }}`
- No spaces are allowed around the `=` sign in attribute declarations
- Attributes must be separated by spaces or newlines
  - Whitespace adjacent to brackets is removed on render, while new lines are preserved

## Code Examples

**Section with attributes:**

```markdown
{{instructions name(core-rules) +cursor !windsurf}}
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

{{> my-mix#specific-section}}
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
│   ├── outputs/
│   │   └── builds/            # compiled outputs
│   ├── mixes/                 # Mix files (*.md)
│   │   └── _snippets/         # reusable content modules
│   └── mixdown.config.json    # compiler config
```

## Future Releases

Features planned for v0.x releases:

- Self-closing section tags
- Target groups for easier filtering of multiple targets
- Template support with placeholder filling
- Mode support for tools like Roo Code
- Slash command support for Claude Code
- Strict mode for validation

## Appendix

### Comprehensive Option Reference Table

The following table provides a complete list of all supported options in Mixdown v0:

| Option Category      | Examples                         | Track | Import | Frontmatter | Description |
|----------------------|----------------------------------|---------|-------|--------------|-------------|
| **Core Options** | | | | | |
| `name(value)`        | `name(important-rules)`          | ✅      | ✅    | ✅           | Name or identifier (frontmatter: mix identifier, required) |
| `+/!target`          | `+cursor`, `!windsurf`           | ✅      | ✅    | ❌           | Include/exclude for specific targets |
| `target:[options]`   | `cursor:[code-js tag-omit]`      | ✅      | ✅    | ❌           | Target-scoped multiple options |
| **Display Options** | | | | | |
| `tag-omit`           | `tag-omit`                       | ✅      | ✅    | ❌           | Remove XML tags from output |
| `inline`             | `inline`                         | ✅      | ✅    | ❌           | Render content inline without tags |
| `inline-with-tags`   | `inline-with-tags`               | ✅      | ✅    | ❌           | Render content inline with tags |
| **Raw Options** | | | | | |
| `raw-all`            | `raw-all`                        | ✅      | ✅    | ❌           | Render as raw Mixdown notation |
| `raw-content`        | `raw-content`                     | ✅      | ✅    | ❌           | Process tags, keep content as raw |
| `raw-tags`           | `raw-tags`                       | ✅      | ✅    | ❌           | Process content, keep tags as raw |
| **Code Options** | | | | | |
| `code`               | `code`                           | ✅      | ✅    | ❌           | Auto-detect code language |
| `code-*`             | `code-js`, `code-py`             | ✅      | ✅    | ❌           | Render as code block in language |
| **Heading Options** | | | | | |
| `h-1` to `h-6`       | `h-2`                            | ✅      | ✅    | ❌           | Set heading level |
| `h-inc`/`h-dec`      | `h-inc`                          | ✅      | ✅    | ❌           | Increment/decrement heading level |
| **Numbering Options** | | | | | |
| `num-*`              | `num`, `num-heading-first`       | ✅      | ✅    | ❌           | Control content numbering |
| **Import Filtering** | | | | | |
| `(+/-tracks)`        | `(+track-one !track-two)`        | ❌      | ✅    | ❌           | Filter specific tracks in imports |
| **Frontmatter**     | | | | | |
| `description`        | (In YAML frontmatter)            | ❌      | ❌    | ✅           | Short description of content |
| `allow-bare-xml-tags`| (In YAML frontmatter)            | ❌      | ❌    | ✅           | Allow using bare XML tags |
| `version`            | (In YAML frontmatter)            | ❌      | ❌    | ✅           | Mix version |
| `labels`             | (In YAML frontmatter)            | ❌      | ❌    | ✅           | Categorization tags |
| `target.include/exclude` | (In YAML frontmatter)         | ❌      | ❌    | ✅           | Target inclusion/exclusion lists |
| `target.path`        | (In YAML frontmatter)            | ❌      | ❌    | ✅           | Custom output path for outputs |
| `globs`              | (In YAML frontmatter)            | ❌      | ❌    | ✅           | File patterns for tool-specific support |
| `alwaysApply`        | (In YAML frontmatter)            | ❌      | ❌    | ✅           | Whether rule should always be applied |

**Notes:**

- Options are space-delimited (`{{track tag-omit code-js}}`) or can be grouped with brackets (`{{track [tag-omit code-js]}}`) 
- Target-scoped options use the colon syntax: `target:option` or `target:[option1 option2]`
- Frontmatter target blocks override global values (e.g., `cursor: { description: "..." }`)
- Target-specific paths can be set with `cursor: { target: { path: "./custom/path" } }`
- Custom XML attributes use the format `attribute="value"` and are passed through to the output XML

*© 2025 Mixdown contributors – MIT License.*
