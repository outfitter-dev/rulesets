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
  - `.mixdown/mixes/` → `.mixdown/src/`
  - `.mixdown/mixes/_snippets/` → `.mixdown/src/_mixins/`
  - `.mixdown/output/` → `.mixdown/dist/`
