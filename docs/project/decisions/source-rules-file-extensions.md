# Decision: Source Rules File Extensions

## Problem Statement

Currently, Mixdown source rules files use the standard `.md` extension and are organized in the `.mixdown/src/` directory structure. While this approach maintains compatibility with standard Markdown tooling, it creates several challenges:

1. **Discoverability**: It's difficult to quickly identify which Markdown files are Mixdown source rules versus standard documentation, especially when files exist outside the standard directory structure.

2. **Search Capabilities**: Searching for Mixdown-specific files requires complex grep patterns or directory-based searches rather than simple extension filtering.

3. **AI Tool Integration**: AI assistants and tools cannot easily identify Mixdown files by filename alone, requiring content inspection or relying on directory location.

4. **IDE Support**: Without a distinct extension, IDEs cannot provide specialized syntax highlighting, validation, or other features specifically for Mixdown files.

5. **Compilation Process**: The compiler needs to determine whether a given `.md` file is a source rules file, which may require additional parsing or validation steps.

These issues impact both user experience and technical implementation, creating friction in the development workflow and potentially limiting tool integration possibilities.

## Decision Drivers

* Maximize compatibility with existing Markdown tools and viewers
* Improve discoverability of source rules files
* Enable easier searching and filtering
* Support better IDE integration and tooling
* Maintain consistency with project conventions
* Consider migration costs and backward compatibility

## Potential Solutions

### Option 1: Keep Standard `.md` Extension (Status Quo)

**Description:**
Continue using the standard `.md` extension for all source rules files.

**Pros:**
* Maintains full compatibility with all Markdown tools and viewers
* No migration required
* Follows conventional Markdown practices

**Cons:**
* Difficult to distinguish source rules from regular Markdown
* Cannot easily filter or search based on extension
* Limits potential for specialized IDE support

**Implementation Example:**
```
project/
├── .mixdown/
│   ├── src/
│   │   ├── project-rules.md
│   │   ├── coding-standards.md
│   │   └── _mixins/
│   │       ├── legal.md
│   │       └── security.md
│   └── mixdown.config.json
```

### Option 2: Adopt `.mix.md` Extension

**Description:**
Rename all source rules files to use the `.mix.md` extension.

**Pros:**
* Clearly identifies Mixdown files at a glance
* Enables simple extension-based searching and filtering
* Opens possibilities for specialized IDE support
* Maintains the `.md` suffix for Markdown compatibility

**Cons:**
* Some Markdown tools might not recognize the custom extension
* Requires migration of existing files
* May need custom file associations in operating systems

**Implementation Example:**
```
project/
├── .mixdown/
│   ├── src/
│   │   ├── project-rules.mix.md
│   │   ├── coding-standards.mix.md
│   │   └── _mixins/
│   │       ├── legal.mix.md
│   │       └── security.mix.md
│   └── mixdown.config.json
```

### Option 3: Hybrid Approach with Context-Based Extensions

**Description:**
Use standard `.md` in the designated source rules directory (`.mixdown/src/`), but use `.mix.md` for source rules files located elsewhere in the project.

**Pros:**
* Maintains compatibility within standard directories
* Provides clear identification for out-of-place files
* Balances migration cost with improved identification

**Cons:**
* Inconsistent extension usage might be confusing
* Still requires partial migration
* Could create confusion about when to use which extension

**Implementation Example:**
```
project/
├── .mixdown/
│   ├── src/
│   │   ├── project-rules.md         # Standard .md in standard location
│   │   └── coding-standards.md
├── docs/
│   └── examples/
│       └── custom-rule.mix.md       # .mix.md outside standard location
└── project-specific-rules.mix.md    # Root-level source rules file
```

### Option 4: Use Frontmatter Identifier

**Description:**
Keep the standard `.md` extension but add a mandatory frontmatter field to identify source rules files.

**Pros:**
* Maintains full compatibility with all Markdown tools
* No extension changes required
* Provides programmatic identification via content inspection

**Cons:**
* Requires content inspection rather than simple extension checking
* Not immediately visually distinguishable
* Adds mandatory overhead to all source rules files

**Implementation Example:**
```markdown
---
mixdown: true
version: 1.0.0
description: "Project coding standards"
---

# Coding Standards

{{instructions}}
Follow these coding guidelines...
{{/instructions}}
```

## Analysis and Recommendation

Based on the decision drivers, a balanced solution that maximizes both compatibility and discoverability would be most appropriate.

**Option 2 (`.mix.md` extension)** provides the clearest advantages for discoverability, searching, and tooling support while maintaining reasonable compatibility with Markdown tools due to the `.md` suffix.

While it does require a migration effort, this could be handled through:

1. A script to rename files and update references
2. A transitional period where both extensions are supported
3. Clear documentation of the change in the project's README and developer guides

The migration cost is a one-time effort, while the benefits of improved discoverability and tooling support would be ongoing.

### Next Steps for Research

1. **Tool Compatibility Testing**: Test `.mix.md` files with common Markdown editors and viewers to assess compatibility issues
2. **IDE Support**: Investigate potential for custom syntax highlighting and other IDE features for the `.mix.md` extension
3. **Migration Complexity**: Analyze the project to determine the scope of changes needed (number of files, references to update)
4. **User Feedback**: Gather feedback from current users on their preferred approach
5. **Implementation Plan**: Develop a detailed plan for implementing the chosen solution, including backward compatibility considerations

## Implementation Guide (if Option 2 is chosen)

### File Migration

1. Create a script to:
   - Rename all files in `.mixdown/src/` from `.md` to `.mix.md`
   - Update all import references in source rules files
   - Update documentation references

2. Update the compiler to:
   - Primarily look for `.mix.md` files
   - Support `.md` files during transition period

### Documentation Updates

1. Update README.md to explain the extension convention
2. Add a note to CHANGELOG.md about the change
3. Update all code examples to use the new extension

### IDE Integration

1. Provide syntax highlighting configurations for common editors
2. Document file association setup for users

### Backward Compatibility

1. Support both extensions for at least one major version
2. Emit warnings when processing `.md` files
3. Provide clear upgrade instructions