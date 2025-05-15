# Mixdown Project Language Specification

This document provides terminology guidance for consistent language in Mixdown documentation, code, and community communication.

## Key Terminology

| Term | Definition | Usage Examples |
|------|------------|----------------|
| **Mix** | Source instruction files, written in Mixdown Syntax | "Write your code standards in a mix file." |
| **Record** | Target-specific output files generated from mixes | "Compile your mixes into records for each tool." |
| **Target** | A supported tool (e.g., Cursor, Claude Code) | "Each target has specific formatting requirements." |
| **Tag** | Syntax element using `{{...}}` notation | "Use tags to direct the compiler." |
| **Section** | Delimited blocks marked with `{{tag}}...{{/tag}}` | "Define a section for agent instructions." |
| **Import** | A reference to another mix file or section | "Import common guidelines into multiple files." |
| **Variable** | Dynamic values replaced at build time | "Use variables to include dynamic data." |
| **Stem** | Modular content component stored in `/_stems` | "Import commonly used content as stems." |

## Linguistic Conventions

### General Principles

- Prefer clear, specific terminology over vague descriptions
- Be consistent with capitalization and hyphenation
- Use declarative present tense when describing functionality

### Specific Terminology Patterns

#### Compilation Process

- ✅ "Compile mixes into records"
- ✅ "Generate tool-specific outputs"
- ✅ "Transform mix into target-specific records"
- ❌ "Render artifacts" (outdated)

#### Record Generation

- ✅ "Output" (as a noun for the compilation result)
- ✅ "Records are written to their respective locations"
- ✅ "The mix file is transformed into records"
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
| Section tags | `kebab-case` | `{{user-instructions}}` |
| Section tags in output records | `snake_case` | `<user_instructions>` |

## Musical Theme Alignment

Mixdown uses audio production terminology to reinforce its brand identity:

| Term | Audio Meaning | Mixdown Meaning |
|------|--------------|-----------------|
| **Mix** | Source audio tracks | Source instruction file |
| **Mixdown** | Process of combining audio | Process of compiling instructions |
| **Record** | Final audio product | Final compiled output |
| **Track** | Individual audio component | Individual section in a mix |
| **Stem** | Isolated, reusable track | Modular, reusable content component |

## Markdown Formatting

- Headers (`#` syntax)
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
