# Grepable Version Markers Strategy

## For AI Agents: Use Grep for Fast Code Discovery

**AI agents working on this codebase should extensively use the `grep` command to navigate and understand code.** The `mixd-*` marker system is specifically designed to make grep searches highly effective. Instead of reading entire files or browsing directories, use targeted grep commands.

### All `mixd-` Markers

All markers follow the pattern `mixd-{suffix}` for consistent greping:

- **`mixd-v{version}`** - Version-specific implementations (e.g., `mixd-v0`, `mixd-v0.1`)
- **`mixd-sec`** - Security-sensitive code requiring extra review
- **`mixd-perf`** - Performance-critical code paths or known bottlenecks
- **`mixd-unsafe`** - Potentially dangerous operations requiring caution
- **`mixd-api`** - Breaking API changes or deprecated functionality
- **`mixd-config`** - Environment or configuration-dependent behavior
- **`mixd-external`** - External service dependencies or integrations
- **`mixd-debug`** - Important debugging or troubleshooting points
- **`mixd-test`** - Testing-related annotations (manual tests, flaky tests, etc.)
- **`mixd-temp`** - Temporary code, hacks, or workarounds that need cleanup

### Quick Search Examples

```bash
# Find all security-sensitive code
grep -r "mixd-sec" .

# Find performance bottlenecks
grep -r "mixd-perf" .

# Find all version-specific code
grep -r "mixd-v" .

# Find external dependencies
grep -r "mixd-external" .
```

This approach is faster and more precise than traditional file browsing, especially for large codebases.

## Versioning Strategy

The remainder of this document focuses specifically on the `mixd-v*` versioning markers used throughout the Rulesets codebase. These markers enable rapid navigation and identification of version-specific code through simple grep commands.

## What are `mixd-*` Markers?

Version markers are specially formatted comments that indicate code with limited implementation that will be expanded in future versions. They follow this pattern:

```
mixd-v{major}.{minor}
```

Examples:

- `mixd-v0` - Initial v0 implementation
- `mixd-v0.1` - Planned for v0.1 release
- `mixd-v0.2` - Planned for v0.2 release
- `mixd-v1` - Major v1 release

## Implementation Format

### File-level Comments

Each file should start with a TLDR comment that includes the version marker:

```typescript
// TLDR: Simple parser implementation that doesn't process markers (mixd-v0)
```

### Function-level Comments

Each function should include a TLDR comment with version context:

```typescript
// TLDR: Pass-through compiler that ignores notation markers (mixd-v0)
function compile(content: string): CompiledDoc {
  // Implementation...
}
```

### TODO Comments for Future Versions

Use TODO comments to indicate planned enhancements:

```typescript
// TLDR: Basic frontmatter parser (mixd-v0)
// TODO (mixd-v0.1): Add support for stem parsing
// TODO (mixd-v0.2): Add variable substitution
function parseContent(content: string) {
  // Current implementation
}
```

### Inline Comments for Temporary Code

Mark temporary or simplified implementations:

```typescript
export default defineConfig({
  splitting: false, // TLDR: keep it simple for now (mixd-v0)
  // TODO (mixd-v0.1): Enable code splitting for better performance
});
```

## Grep Commands for Navigation

### Find All v0-Specific Code

```bash
grep -r "mixd-v0" . --include="*.ts" --include="*.js" --include="*.tsx"
```

### Find Code Scheduled for v0.1

```bash
grep -r "mixd-v0\.1" . --include="*.ts" --include="*.js" --include="*.tsx"
```

### Find All Version Markers

```bash
grep -r "mixd-v" . --include="*.ts" --include="*.js" --include="*.tsx"
```

### Find TODO Items by Version

```bash
grep -r "TODO (mixd-v0\.1)" . --include="*.ts" --include="*.js" --include="*.tsx"
```

### Count Version-Specific Implementations

```bash
grep -c "mixd-v0" **/*.ts | grep -v ":0"
```

## Benefits for AI Agents

### Rapid Context Understanding

When working on a codebase, AI agents can quickly understand implementation scope:

1. **Immediate Version Context**: See what version a file/function targets
2. **Future Planning**: Understand what changes are planned for upcoming versions
3. **Implementation Scope**: Identify minimal vs. complete implementations

### Efficient Debugging

When debugging issues, agents can:

1. **Find Related Code**: Grep for the same version marker to find related implementations
2. **Identify Limitations**: Quickly see if a bug is due to v0 limitations
3. **Plan Fixes**: Understanding if a fix should wait for the next version

### Systematic Upgrades

When upgrading versions, agents can:

1. **Find All Work**: Grep for the target version to see all planned changes
2. **Track Progress**: Mark items as complete by updating version markers
3. **Validate Completeness**: Ensure no version-specific code is missed

## Usage Guidelines for AI Agents

### When to Add Markers

- **Simplified Implementations**: When code is intentionally basic for the current version
- **Temporary Solutions**: When using a workaround that will be improved later
- **Feature Placeholders**: When implementing minimal functionality that will be expanded
- **Performance Compromises**: When choosing simplicity over optimization

### When NOT to Add Markers

- **Complete Implementations**: Fully-featured code that won't change significantly
- **External Dependencies**: Third-party code or standard library usage
- **Configuration Files**: Unless the configuration itself is version-specific
- **Test Files**: Unless testing version-specific behavior

### Updating Markers

When implementing new versions:

1. **Search for Target Version**: `grep -r "mixd-v0.1" .`
2. **Implement Features**: Update code according to TODO comments
3. **Update Markers**: Change version markers to reflect new implementation level
4. **Add New TODOs**: Document future enhancements for next version

## Example Workflow

### Starting Work on v0.1

```bash
# Find all work planned for v0.1
grep -r "mixd-v0\.1" . --include="*.ts"

# Find all TODOs for v0.1
grep -r "TODO (mixd-v0\.1)" . --include="*.ts"
```

### Tracking Progress

```bash
# See remaining v0 implementations that might need upgrading
grep -r "TLDR.*mixd-v0)" . --include="*.ts"

# Check for any forgotten TODOs
grep -r "TODO (mixd-v0)" . --include="*.ts"
```

### Quality Assurance

```bash
# Verify no temporary code made it to production
grep -r "mixd-v0" . --include="*.ts" | grep -v test

# Check for orphaned TODOs from previous versions
grep -r "TODO (mixd-v" . --include="*.ts"
```

## Integration with Development Workflow

### Code Reviews

Reviewers can quickly identify:

- Implementation scope and limitations
- Future enhancement plans
- Version-specific concerns

### Documentation

Version markers help maintain consistency between:

- Code implementation
- API documentation
- Planning documents

### Release Planning

Project managers can:

- Track implementation progress
- Plan feature releases
- Estimate development effort

## Best Practices

1. **Be Specific**: Use precise version numbers (mixd-v0.1, not mixd-v0.x)
2. **Update Regularly**: Keep markers current as code evolves
3. **Document Reasoning**: Explain why something is version-limited
4. **Link TODOs**: Connect TODO comments to specific implementation plans
5. **Clean Up**: Remove markers when implementations become permanent

## Common Patterns

### Basic Implementation Pattern

```typescript
// TLDR: Simple implementation for initial release (mixd-v0)
// TODO (mixd-v0.1): Add advanced features
function basicFeature() {
  // Minimal implementation
}
```

### Performance Optimization Pattern

```typescript
// TLDR: Unoptimized implementation for correctness (mixd-v0)
// TODO (mixd-v0.2): Optimize for performance
function slowButCorrect() {
  // Straightforward but inefficient implementation
}
```

### Feature Expansion Pattern

```typescript
// TLDR: Supports basic use cases only (mixd-v0)
// TODO (mixd-v0.1): Add support for advanced syntax
// TODO (mixd-v1): Full feature parity with specification
function partialImplementation() {
  // Handles common cases
}
```

---

This marker strategy creates a searchable, navigable codebase that enables both human and AI developers to quickly understand implementation scope, track progress, and plan future development efficiently.
