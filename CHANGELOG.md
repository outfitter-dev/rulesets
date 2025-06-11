### Added
- Added `.mix.md` file extension for source rules files to improve discoverability, search capabilities, and IDE support

### Changed
- Updated terminology throughout the documentation:
  - "Mix files" → "Source rules"
  - "Target" → "Destination"
  - "Output" → "Compiled rules"
  - "Track" → "Stem"
  - "Option" → "Property"
  - "Snippet" → "Mixin"
  - `property(value)` → `property-*` and `name-("value")`
- Updated directory structure:
  - `.rulesets/mixes/` → `.rulesets/src/`
  - `.rulesets/mixes/_snippets/` → `.rulesets/src/_mixins/`
  - `.rulesets/output/` → `.rulesets/dist/`
