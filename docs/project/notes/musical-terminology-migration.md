# Musical Terminology Migration Tracking

This document tracks all the musical terminology from Mixdown that will need to be addressed in future updates.

## Current Musical Terms to Replace

| Current Term | Context | Potential Replacement | Notes |
|--------------|---------|----------------------|-------|
| **Mixdown** | Product name | **Rulesets** | ✅ Being replaced now |
| **Stem** | Content blocks (`{{stem}}`) | TBD - Component? Section? Block? | Core concept needing careful consideration |
| **Mixin** | Reusable components (`_mixins/`) | TBD - Module? Fragment? Include? | Directory and concept |
| **Mix** | Source files (`.mix.md`) | Rule? Source? | File extension and terminology |
| **Mixdown Notation** | Markup syntax | Rulesets Notation? | Documentation term |
| **Musical theme** | Throughout docs | Professional/technical theme | Metaphors and examples |

## Location References

### Core Terminology Usage
- `docs/project/LANGUAGE.md` - Primary terminology definitions
- All files using `.mix.md` extension
- `_mixins/` directory name
- Stem notation throughout codebase

### Documentation with Musical References
- README.md - Music production metaphors
- Various examples using musical themes
- Package descriptions

## Replacement Considerations

### For "Stem"
- Used extensively in code as `{{stem-name}}...{{/stem-name}}`
- Appears in types, interfaces, and parsing logic
- Central to the notation system

### For "Mixin"  
- Directory structure `.rulesets/src/_mixins/`
- Import syntax `{{> @mixin-name }}`
- Conceptually similar to CSS mixins

### For ".mix.md" Extension
- Currently preferred extension for source files
- Alternative could be `.rule.md` or `.ruleset.md`
- Affects file discovery and tooling

## Next Steps

1. Complete Mixdown → Rulesets rename (current task)
2. Gather feedback on alternative terms
3. Plan coordinated update for remaining musical terminology
4. Update all documentation and code in a single pass

---

*Last updated: 2025-01-06*