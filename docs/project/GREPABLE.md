# Grepable Cairns Markers Strategy

## For AI Agents: Use Grep for Fast Code Discovery

**AI agents working on this codebase should extensively use the `grep` command to navigate and understand code.** The Cairns marker system (`:M:`) is specifically designed to make grep searches highly effective. Instead of reading entire files or browsing directories, use targeted grep commands.

### Cairns Marker System

All markers follow the pattern `:M: {type}: {description}` for consistent greping:

- **`:M: tldr:`** - Brief description of what the code does
- **`:M: v{version}:`** - Version-specific implementation details (e.g., `v0.1.0`, `v0.2.0`)
- **`:M: todo(v{version}):`** - Future work planned for specific versions
- **`:M: sec:`** - Security-sensitive code requiring extra review
- **`:M: perf:`** - Performance-critical code paths or known bottlenecks
- **`:M: unsafe:`** - Potentially dangerous operations requiring caution
- **`:M: api:`** - Breaking API changes or deprecated functionality
- **`:M: config:`** - Environment or configuration-dependent behavior
- **`:M: external:`** - External service dependencies or integrations
- **`:M: debug:`** - Important debugging or troubleshooting points
- **`:M: test:`** - Testing-related annotations (manual tests, flaky tests, etc.)
- **`:M: temp:`** - Temporary code, hacks, or workarounds that need cleanup

### Quick Search Examples

```bash
# Find all TLDRs
grep -r ":M: tldr:" .

# Find all security-sensitive code
grep -r ":M: sec:" .

# Find performance bottlenecks
grep -r ":M: perf:" .

# Find all version 0.1.0 code
grep -r ":M: v0.1.0:" .

# Find all TODOs for version 0.2.0
grep -r ":M: todo(v0.2.0):" .

# Find external dependencies
grep -r ":M: external:" .
```

This approach is faster and more precise than traditional file browsing, especially for large codebases.

## Cairns Format

Cairns are navigation markers placed in code comments that provide context and version information. They use a consistent format that works across different comment styles.

### Basic Format

```typescript
// :M: tldr: Brief description of what this code does
// :M: v0.1.0: What this specific version implements
```

### With JSDoc

```typescript
/**
 * :M: tldr: Core functionality description
 * :M: v0.1.0: Initial implementation with basic features
 * 
 * Detailed documentation follows...
 */
```

### TODO Format

```typescript
// :M: tldr: Current implementation
// :M: v0.1.0: Basic functionality
// :M: todo(v0.2.0): Add advanced feature X
// :M: todo(v0.3.0): Optimize for performance
```

### HTML/Markdown Comments

```html
<!-- :M: tldr: Configuration section -->
<!-- :M: v0.1.0: Basic configuration options -->
```

## Implementation Examples

### File-level Cairns

Each file should start with a TLDR cairn:

```typescript
// :M: tldr: Parser implementation for Rulesets notation
// :M: v0.1.0: Basic frontmatter extraction without marker processing
```

### Function-level Cairns

```typescript
// :M: tldr: Compiles parsed document to destination format
// :M: v0.1.0: Pass-through implementation without transformation
// :M: todo(v0.2.0): Add stem processing and XML conversion
function compile(content: string): CompiledDoc {
  // Implementation...
}
```

### Security-sensitive Code

```typescript
// :M: tldr: User authentication handler
// :M: sec: Validates JWT tokens and manages sessions
// :M: v0.1.0: Basic JWT validation with standard claims
async function authenticate(token: string) {
  // Implementation...
}
```

### Performance-critical Code

```typescript
// :M: tldr: Batch processes multiple files concurrently
// :M: perf: Processes up to 100 files in parallel, memory usage scales with file count
// :M: v0.1.0: Simple parallel processing without optimization
async function batchProcess(files: string[]) {
  // Implementation...
}
```

## Grep Commands for Navigation

### Find All v0.1.0 Code

```bash
grep -r ":M: v0.1.0:" . --include="*.ts" --include="*.js" --include="*.tsx"
```

### Find Code Scheduled for v0.2.0

```bash
grep -r ":M: todo(v0.2.0):" . --include="*.ts" --include="*.js" --include="*.tsx"
```

### Find All Cairns

```bash
grep -r ":M:" . --include="*.ts" --include="*.js" --include="*.tsx"
```

### Count Version-Specific Implementations

```bash
grep -c ":M: v0.1.0:" **/*.ts | grep -v ":0"
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
2. **Identify Limitations**: Quickly see if a bug is due to version limitations
3. **Plan Fixes**: Understanding if a fix should wait for the next version

### Systematic Upgrades

When upgrading versions, agents can:

1. **Find All Work**: Grep for the target version to see all planned changes
2. **Track Progress**: Mark items as complete by updating version markers
3. **Validate Completeness**: Ensure no version-specific code is missed

## Usage Guidelines for AI Agents

### When to Add Cairns

- **Every File**: Start with a TLDR cairn
- **Key Functions**: Add cairns to important functions
- **Version-specific Code**: Mark code that will change in future versions
- **Security/Performance**: Mark sensitive or critical code paths
- **TODOs**: Use todo format for planned improvements

### When NOT to Add Cairns

- **Trivial Functions**: Don't mark every getter/setter
- **Stable Code**: Skip code that won't change across versions
- **External Libraries**: Don't mark third-party code
- **Generated Code**: Skip auto-generated files

### Updating Cairns

When implementing new versions:

1. **Search for TODOs**: `grep -r ":M: todo(v0.2.0):" .`
2. **Implement Features**: Update code according to TODO cairns
3. **Update Cairns**: Change version markers to reflect new implementation
4. **Add New TODOs**: Document future enhancements for next version

## Integration with Development Workflow

### Code Reviews

Reviewers can quickly identify:
- Implementation scope and limitations
- Future enhancement plans
- Version-specific concerns
- Security and performance considerations

### Documentation

Cairns help maintain consistency between:
- Code implementation
- API documentation
- Planning documents
- Release notes

### Release Planning

Project managers can:
- Track implementation progress
- Plan feature releases
- Estimate development effort
- Identify dependencies between versions

## Best Practices

1. **Be Concise**: Keep TLDR descriptions brief and clear
2. **Version Accurately**: Use semantic versioning (0.1.0, not v0)
3. **Update Regularly**: Keep cairns current as code evolves
4. **Document Reasoning**: Explain why something is version-limited
5. **Clean Up**: Remove obsolete TODOs after implementation

---

This cairns strategy creates a searchable, navigable codebase that enables both human and AI developers to quickly understand implementation scope, track progress, and plan future development efficiently.