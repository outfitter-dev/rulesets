# Terminology Refactoring: Destination → Provider

## Overview

We need to standardize terminology across the Rulesets project. Currently, we inconsistently use "Destination" and "Provider" to refer to the same concept. This document outlines the refactoring from "Destination" to "Provider" terminology.

## Rationale for "Provider"

1. **Clarity**: A "provider" provides compilation capabilities, not just a destination path
2. **Industry Standard**: Aligns with established patterns (VSCode providers, Terraform providers)
3. **Plugin Architecture**: Better reflects the plugin-based architecture (ProviderPlugin)
4. **Semantic Accuracy**: "Destination" implies just a location, "Provider" implies functionality

## Current State Analysis

### Mixed Terminology Usage

| Component | Current Terms | Files Affected |
|-----------|--------------|----------------|
| Types | `DestinationPlugin`, `DestinationId`, `Provider`, `ProviderRegistry` | 10+ files |
| Documentation | "Destination", "Destination Providers" | LANGUAGE.md, CLAUDE.md, README.md |
| Branded Types | `DestinationId`, `DestPath` | brands.ts, ruleset-context.ts |
| Core Code | `destinations/` folder | cursor-plugin.ts, windsurf-plugin.ts |
| Frontmatter | `destination:` key | All .rule.md files |

## Refactoring Plan

### Phase 1: Type System Updates

#### Before
```typescript
// brands.ts
export type DestinationId = Opaque<string, 'DestinationId'>;
export function createDestinationId(value: string): DestinationId { ... }

// destination-plugin.ts
export interface DestinationPlugin {
  name: string;
  compile(doc: ParsedDocument): CompiledDocument;
}
```

#### After
```typescript
// brands.ts
export type ProviderId = Opaque<string, 'ProviderId'>;
export function createProviderId(value: string): ProviderId { ... }

// provider.ts (renamed from destination-plugin.ts)
export interface Provider {
  id: ProviderId;
  name: string;
  type: ProviderType;
  compile(doc: ParsedDocument): CompiledDocument;
}
```

### Phase 2: File Structure Updates

```bash
# Rename directories
packages/core/src/destinations/ → packages/core/src/providers/
packages/core/src/destinations/cursor-plugin.ts → packages/core/src/providers/cursor-provider.ts
packages/core/src/destinations/windsurf-plugin.ts → packages/core/src/providers/windsurf-provider.ts

# Rename type files
packages/types/src/destination-plugin.ts → packages/types/src/provider.ts
```

### Phase 3: Code Updates

#### Variable and Property Names
```typescript
// Before
const destinationId = createDestinationId('cursor');
const destPath = createDestPath('.cursor/rules/');

// After
const providerId = createProviderId('cursor');
const outputPath = createOutputPath('.cursor/rules/');
```

#### Context Types
```typescript
// Before
export interface CompilerContext {
  destinationId: DestinationId;
  destPath: DestPath;
}

// After
export interface CompilerContext {
  providerId: ProviderId;
  outputPath: OutputPath;
}
```

### Phase 4: Documentation Updates

#### LANGUAGE.md
```markdown
// Before
| **Destination** | A supported tool (e.g., Cursor, Claude Code) |

// After
| **Provider** | A tool that provides AI assistant capabilities (e.g., Cursor, Claude Code) |
```

#### Frontmatter Schema
```yaml
# Before
destination:
  include: ['cursor', 'windsurf']
  exclude: ['claude-code']

# After
provider:
  include: ['cursor', 'windsurf']
  exclude: ['claude-code']
```

### Phase 5: Backwards Compatibility

Create aliases during transition period:

```typescript
// Temporary compatibility layer
export type DestinationId = ProviderId; // @deprecated Use ProviderId
export const createDestinationId = createProviderId; // @deprecated Use createProviderId

// Add migration warnings
function createDestinationId(value: string): ProviderId {
  console.warn('createDestinationId is deprecated. Use createProviderId instead.');
  return createProviderId(value);
}
```

## Implementation Checklist

### Immediate Changes (Breaking)
- [ ] Rename `DestinationId` → `ProviderId` in brands.ts
- [ ] Rename `DestPath` → `OutputPath` in brands.ts
- [ ] Rename `destination-plugin.ts` → `provider.ts`
- [ ] Update `DestinationPlugin` interface → `Provider` interface
- [ ] Rename `destinations/` folder → `providers/`
- [ ] Update all imports

### Gradual Changes (Non-Breaking)
- [ ] Add deprecation warnings to old functions
- [ ] Create compatibility aliases
- [ ] Update documentation
- [ ] Update examples
- [ ] Update tests

### Final Cleanup (Next Major Version)
- [ ] Remove all deprecated aliases
- [ ] Remove compatibility layer
- [ ] Update all frontmatter in example files
- [ ] Final documentation sweep

## Migration Guide for Users

### For Source Rules Files

```markdown
# Before
---
destination:
  include: ['cursor', 'windsurf']
---

# After
---
provider:
  include: ['cursor', 'windsurf']
---
```

### For Plugin Developers

```typescript
// Before
import { DestinationPlugin } from '@outfitter/types';

class MyPlugin implements DestinationPlugin {
  name = 'my-plugin';
}

// After
import { Provider } from '@outfitter/types';

class MyProvider implements Provider {
  id = createProviderId('my-provider');
  name = 'My Provider';
  type = 'ide';
}
```

## Affected Files List

### High Priority (Core Types)
1. `packages/types/src/brands.ts`
2. `packages/types/src/destination-plugin.ts` → `provider.ts`
3. `packages/types/src/provider-types.ts`
4. `packages/types/src/provider-registry.ts`
5. `packages/types/src/ruleset-context.ts`

### Medium Priority (Implementation)
6. `packages/core/src/destinations/` → `providers/`
7. `packages/compiler/src/index.ts`
8. `packages/linter/src/index.ts`
9. `packages/parser/src/index.ts`

### Low Priority (Documentation)
10. `docs/project/LANGUAGE.md`
11. `CLAUDE.md`
12. `README.md`
13. All test files

## Benefits After Refactoring

1. **Consistency**: Single term throughout codebase
2. **Clarity**: "Provider" better describes the functionality
3. **Alignment**: Matches industry standards and patterns
4. **Discoverability**: Easier to understand for new contributors
5. **Future-Proof**: Better foundation for provider plugin ecosystem

## Timeline

- **Phase 1-2**: Immediate (core type changes)
- **Phase 3-4**: Within next sprint (code and docs)
- **Phase 5**: Next minor version (compatibility layer)
- **Final Cleanup**: Next major version (v1.0)