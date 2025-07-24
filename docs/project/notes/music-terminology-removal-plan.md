# Music Terminology Removal Plan

**Status**: Ready for Implementation  
**Date**: December 2024  
**Scope**: Complete removal of all music-related terminology from the Rulesets project

## Overview

This document outlines the complete removal of all music-related terminology from the Rulesets project. This is a **fresh start** with no migration paths or backwards compatibility. All music metaphors and terminology will be replaced with clear, generic programming terms.

## Core Principle

**This is a complete break from the past.** No migration paths, no backwards compatibility, no preservation of old terminology. The project should read as if it had always been called Rulesets and never had any music-related naming.

## Terminology Changes

### 1. Project Identity

| Old Term            | New Term            | Notes                      |
| ------------------- | ------------------- | -------------------------- |
| Mixdown             | Rulesets            | The project name           |
| mixdown             | ruleset             | CLI command, package names |
| .mixdown/           | .ruleset/           | Configuration directory    |
| mixdown.config.json | ruleset.config.json | Configuration file         |
| @mixdown/\*         | @ruleset/\*         | Package namespace          |

### 2. Core Concepts

| Old Term         | New Term       | Definition                                                     |
| ---------------- | -------------- | -------------------------------------------------------------- |
| stem             | block          | A delimited content block marked with `{{block}}...{{/block}}` |
| mixin            | partial        | Reusable component stored in `_partials/`                      |
| Mixdown Notation | Ruleset Syntax | The `{{...}}` syntax system                                    |
| mix/source rules | ruleset        | A source file defining rules                                   |
| track (legacy)   | block          | Already transitioned to stem, now to block                     |

### 3. Directory Structure

| Old Path               | New Path                 |
| ---------------------- | ------------------------ |
| .mixdown/              | .ruleset/                |
| .mixdown/src/          | .ruleset/src/            |
| .mixdown/src/\_mixins/ | .ruleset/src/\_partials/ |
| .mixdown/dist/         | .ruleset/dist/           |

### 4. File Extensions

| Old Extension | New Extension |
| ------------- | ------------- |
| .mix.md       | .rule.md      |
| .mixdown.md   | .rule.md      |

### 5. Syntax Updates

| Old Syntax                | New Syntax                 |
| ------------------------- | -------------------------- |
| `{{stem}}...{{/stem}}`    | `{{block}}...{{/block}}`   |
| `{{stem name="example"}}` | `{{block name="example"}}` |
| `{{> @mixin }}`           | `{{> @partial }}`          |
| "stem content"            | "block content"            |
| "stem name"               | "block name"               |

## Implementation Checklist

### Phase 1: Core Renaming

- [ ] Update all references to "Mixdown" → "Rulesets" (project name)
- [ ] Update all references to "mixdown" → "ruleset" (lowercase contexts)
- [ ] Update all references to "stem" → "block"
- [ ] Update all references to "mixin" → "partial"
- [ ] Update all references to "Mixdown Notation" → "Ruleset Syntax"

### Phase 2: Directory and File Updates

- [ ] Rename `.mixdown/` → `.ruleset/`
- [ ] Rename `_mixins/` → `_partials/`
- [ ] Update all file extensions from `.mix.md` and `.mixdown.md` → `.rule.md`
- [ ] Update configuration file names

### Phase 3: Documentation Cleanup

- [ ] Remove all references to "music production theme"
- [ ] Remove all guidance about "musical theme alignment"
- [ ] Remove any musical metaphors or analogies
- [ ] Update all examples to use new terminology
- [ ] Delete `musical-terminology-migration.md` and similar files

### Phase 4: Code Updates

- [ ] Update all variable names (e.g., `stemName` → `blockName`)
- [ ] Update all function names (e.g., `parseStem` → `parseBlock`)
- [ ] Update all class names and interfaces
- [ ] Update all test descriptions and test data
- [ ] Update all error messages and logging

### Phase 5: Package and Build Updates

- [ ] Update package.json files with new names
- [ ] Update all import statements
- [ ] Update build configuration files
- [ ] Update CI/CD pipelines
- [ ] Update GitHub repository name (if applicable)

## Files Requiring Updates

### Critical Documentation Files

1. **README.md** - Complete rewrite with new terminology
2. **CLAUDE.md** - Remove musical theme guidance
3. **docs/project/LANGUAGE.md** - Full terminology update
4. **docs/project/ARCHITECTURE.md** - Update all technical references
5. **All files in docs/** - Comprehensive terminology update

### Source Code Files

1. All TypeScript files (\*.ts)
2. All JavaScript files (\*.js)
3. All test files (_.spec.ts, _.test.ts)
4. Configuration files (_.json, _.config.\*)

### Remove Entirely

1. `docs/project/notes/musical-terminology-migration.md`
2. `docs/project/notes/music-theme-rationale.md` (if exists)
3. Any other music-related documentation

## Verification Process

After implementation, run these searches to ensure complete removal:

```bash
# These searches should return NO results:
grep -r "mixdown" . --include="*.md" --include="*.ts" --include="*.js"
grep -r "stem" . --include="*.md" --include="*.ts" --include="*.js"
grep -r "mixin" . --include="*.md" --include="*.ts" --include="*.js"
grep -r "music" . --include="*.md"
grep -r "track" . --include="*.md" --include="*.ts" --include="*.js"
grep -r "musical" . --include="*.md"
grep -r "audio" . --include="*.md"
grep -r "💽" . --include="*.md"  # Old emoji
```

## No Migration Strategy

**Important**: This is a complete terminology replacement with:

- ❌ No backwards compatibility
- ❌ No migration guides
- ❌ No deprecated aliases
- ❌ No transition period
- ❌ No preservation of old names

The project should appear as if it had always been called Rulesets and had always used the new terminology.

## Example Transformations

### Before

```markdown
{{stem name="instructions"}}

- This is a stem in a mix file
- Import mixins with {{> @legal}}
  {{/stem}}
```

### After

```markdown
{{block name="instructions"}}

- This is a block in a ruleset
- Import partials with {{> @legal}}
  {{/block}}
```

### Before (Directory Structure)

```bash
.mixdown/
├── src/
│   ├── _mixins/
│   └── my-rules.mix.md
└── dist/
```

### After (Directory Structure)

```bash
.ruleset/
├── src/
│   ├── _partials/
│   └── my-rules.rule.md
└── dist/
```

## Success Criteria

The transformation is complete when:

1. Zero music-related terminology remains in the codebase
2. All documentation reads naturally with the new terminology
3. The project appears to have always been "Rulesets"
4. No confusion exists about the project's purpose or naming
5. All tests pass with updated terminology

## Final Notes

This is a complete fresh start for the project's naming. The goal is to make Rulesets feel like a professional developer tool with clear, industry-standard terminology that any developer can immediately understand without needing to learn music production concepts.
