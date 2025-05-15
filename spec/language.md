# Mixdown Project Language Specification

This document provides terminology guidance for consistent language in Mixdown documentation, code, and community communication.

## Key Terminology

| Term | Definition | Usage Examples |
|------|------------|----------------|
| **Mix** | Source instruction files, written in Mixdown Notation | "Write your code standards in a mix file." |
| **Output** | Target-specific output files generated from mixes | "Compile your mixes into outputs for each tool." |
| **Target** | A supported tool (e.g., Cursor, Claude Code) | "Each target has specific formatting requirements." |
| **Notation Marker** | Element using `{{...}}` notation | "Use notation markers to direct the compiler." |
| **Track** | Delimited blocks marked with `{{track}}...{{/track}}` | "Define a track for agent instructions." |
| **Import** | A reference to another mix file or track | "Import common guidelines into multiple files." |
| **Variable** | Dynamic values replaced at build time | "Use variables to include dynamic data." |
| **Snippet** | Modular content component stored in `/_snippets` | "Import commonly used content as snippets." |

## Linguistic Conventions

### General Principles

- Prefer clear, specific terminology over vague descriptions
- Be consistent with capitalization and hyphenation
- Use declarative present tense when describing functionality

### Specific Terminology Patterns

#### Compilation Process

- ✅ "Compile mixes into outputs"
- ✅ "Generate tool-specific outputs"
- ✅ "Transform mix into target-specific outputs"
- ❌ "Render artifacts" (outdated)

#### Output Generation

- ✅ "Output" (as a noun for the compilation result)
- ✅ "Outputs are written to their respective locations"
- ✅ "The mix file is transformed into outputs"
- ❌ "The rendered artifact" (outdated)

#### Content Display

- ✅ "Formatted as" (when describing how content appears)
- ✅ "Displayed as" (for visual presentation)
- ✅ "Converted to" (for transformation descriptions)
- ❌ "Rendered as" (avoid when possible)

#### XML Generation

- ✅ "Converted to XML tags"
- ✅ "Transformed into XML structure"
- ✅ "Outputs XML notation"
- ❌ "Renders as XML" (outdated)

## File and Directory Naming

| Entity Type | Naming Convention | Example |
|-------------|-------------------|---------|
| Mix files | `kebab-case.md` | `coding-standards.md` |
| Directory | `kebab-case` | `_samples` |
| Config files | `kebab-case.config.json` | `mixdown.config.json` |
| Track markers | `kebab-case` | `{{user-instructions}}` |
| Track markers in outputs | `snake_case` | `<user_instructions>` |

## Musical Theme Alignment

Mixdown uses audio production terminology to reinforce its brand identity:

| Term | Audio Meaning | Mixdown Meaning |
|------|--------------|-----------------|
| **Mix** | Source audio tracks | Source instruction file |
| **Mixdown** | Process of combining audio | Process of compiling instructions |
| **Output** | Final audio product | Final compiled output |
| **Track** | Individual audio component | Individual content block in a mix |
| **Snippet** | Reusable code fragment | Modular, reusable content component |

## Markdown Formatting

- Headers (`#` notation)
  - Must be preceded and followed by blank lines
  - Must not end with `:`
- Code blocks
  - Use triple backticks to wrap, unless there is another code block nested, in which case increment the backticks by 1
  - Must include language identifier (fall back to `text` if no language is appropriate)
  - Must be preceded and followed by blank lines
  - Use the indentation level of the preceding content to determine the level of the code block
- Use bullet lists for collections of related items
  - Use two spaces for indentation
  - Lists must be preceded and followed by blank lines
  - Never add blank lines in between list items
  - Use sublist items for additional details
- Use numbered lists for sequential steps
  - When adding list items within a numbered list, use three spaces for the indentation start
- Prefer tables for structured data comparison
- Use GitHub-style admonitions for additional information. `> [!TIP|INFO|WARNING|CAUTION|DANGER]\n>Helpful information`

## Version References

When referring to versions:

- Full version format: "Mixdown v0.1.0"
- Major version format: "Mixdown v0"
- Release candidate format: "Mixdown v0.1.0-rc1"

## Best Practices

- Be consistent with terminology across all documentation
- Align new terminology with the music production theme
- When new terms are introduced, add them to this language spec
- Prefer clarity over cleverness in technical documentation
- Use examples liberally to illustrate abstract concepts

---

*This language spec is a living styleguide document and will evolve with Mixdown's development.*
