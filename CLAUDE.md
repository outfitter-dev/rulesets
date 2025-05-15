# CLAUDE.md

<file_purpose>
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
</file_purpose>

<overview>
Mixdown is a **CommonMark-compliant prompt compiler** that lets you author a single *mix* file in Markdown and compile it into tool-specific instruction files (`.cursor/rules.mdc`, `./CLAUDE.md`, `.roo/rules.md`, and more). Think of it as **Terraform for AI prompts**: write once, target many, keeping agents across different tools on the same page.
</overview>

<critical_instructions>
1. ✅ Always follow the language spec (mixdown/spec/language.md)
2. ✅ Always ensure the `.gitignore` file is updated to exclude potentially sensitive information
3. ✅ Unless otherwise directed by the user, always work within the `dev` branch, or a feature branch off of `dev`
4. ✅ Commit regularly, group commits logically, and use conventional commit messages. When committing, check to see if any files need to be staged.
5. ✅ When writing code, follow the SOLID principles, DRY principles, KISS principle, and include descriptive inline comments for future developers
</critical_instructions>

<key_concepts>
- **Mix**: Source instruction files, written in 100% previewable Markdown
- **Target**: A supported tool, such as `cursor`, `windsurf`, or `claude-code`
- **Output**: Target-specific output files, rendered from the source mix
- **Notation Marker**: Element using `{{...}}` notation, used to direct the compiler
- **Track**: Delimited blocks of content with optional attributes (`{{instructions}}...{{/instructions}}`)
- **Import**: Embed content from another mix, track, snippet, or template (`{{> my-rule }}`)
- **Variable**: Dynamic values replaced inline at build time (`{{$key}}`)
- **Snippet**: Modular, reusable content components
</key_concepts>

<project_structure>
```text
project/
├── .mixdown/
│   ├── outputs/
│   │   └── builds/         # compiled outputs
│   ├── instructions/       # Mix files (*.md)
│   │   └── _snippets/         # reusable content modules
│   └── mixdown.config.json # Mixdown config file
```
</project_structure>

<design_goals>
| Goal | Description |
|------|-------------|
| ✨ **Simplicity** | Reduce bespoke format/structure for each tool to just one. |
| 🧹 **Lintability** | Files must pass standard markdown-lint without hacks. |
| 👀 **Previewability** | Render legibly in GitHub, VS Code, Obsidian, etc. |
| 🧩 **Extensibility** | Advanced behaviors declared via attributes instead of new notation. |
</design_goals>

<frontmatter_example>
```yaml
---
# .mixdown/instructions/my-rule.md
mixdown:
  version: 0.1.0 # version number for the Mixdown format used
description: "Rules for this project" # useful for tools that use descriptions
globs: ["**/*.{txt,md,mdc}"] # globs re-written based on target-specific needs
# Target filter examples:
target:
  include: ["cursor", "windsurf"]
  exclude: ["claude-code"]
  path: "./custom/output/path"
# Target-specific frontmatter:
cursor:
  alwaysApply: false
  target:
    path: "./custom/.cursor/rules"
# Additional metadata:
name: my-rule # defaults to filename
version: 2.0 # version number for this file
---
```
</frontmatter_example>

<naming_conventions>
- Mix files: `kebab-case.md` (e.g., `coding-standards.md`)
- Directories: `kebab-case` (e.g., `_samples`)
- Config files: `kebab-case.config.json` (e.g., `mixdown.config.json`)
- Section names: `kebab-case` (e.g., `{{user-instructions}}`)
- XML output tags: `snake_case` (e.g., `<user_instructions>`)
</naming_conventions>

<mixdown_notation>
<example>
```markdown
{{instructions +cursor -claude-code}}
- IMPORTANT: You must follow these coding standards...
{{/instructions}}
```
</example>

<imports>
```markdown
{{> @legal}}  <!-- Embeds `/_snippets/legal.md` -->
{{> conventions#track-name}}  <!-- Embed a specific track -->
{{> my-rules tracks="important-considerations,!less-important-considerations"}}  <!-- Filter tracks -->
```
</imports>

<variables>
```markdown
Alias: {{$alias}}
Mix file version: {{$file.version}}
Current target: {{$target}}
Target ID: {{$target.id}}
```
</variables>

<target_scoped_attributes>
```markdown
{{instructions cursor?name="cursor_instructions"}}
...
{{/instructions}}
```
</target_scoped_attributes>

<rendering_options>
```markdown
{{instructions rendered="content-only"}}
Content without surrounding XML tags
{{/instructions}}

{{> @code-example rendered="code:javascript"}}
```
</rendering_options>

<raw_notation>
```markdown
{{{examples}}}  <!-- Triple braces preserve Mixdown notation -->
{{example}}
- Instructions
- Rules
{{/example}}
{{{/examples}}}
```
</raw_notation>

<placeholders>
```markdown
[requirements]  <!-- Instruction placeholder for AI to fill -->
{requirements}  <!-- Alternative placeholder notation -->
```
</placeholders>

</mixdown_notation>

<contributing_guidelines>
When contributing to this project:

1. Follow the naming conventions and terminology outlined in the language spec
2. Be consistent with the musical theme alignment in feature naming
3. Ensure all documentation uses clear, specific terminology over vague descriptions
4. Write mixes using Markdown ATX-style headers and proper code blocks with language identifiers
</contributing_guidelines>