### Added

- Added `.ruleset.md` file extension for source rules files to improve discoverability, search capabilities, and IDE support

### Changed

- Updated terminology throughout the documentation:
  - "Mix files" → "Source rules"
  - "Target" → "Destination"
  - "Output" → "Compiled rules"
  - "Track" → "Block"
  - "Option" → "Property"
  - "Snippet" → "Partial"
  - `property(value)` → `property-*` and `name-("value")`
- Updated directory structure:
  - `.ruleset/src/` (source rules location)
  - `.ruleset/src/_partials/` (reusable content)
  - `.ruleset/dist/` (compiled output location)
