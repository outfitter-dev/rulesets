# Heading-Based Output Format Proposal for Rulesets

**Status**: Proposed for v0.2.0+
**Author**: Claude Code
**Date**: 2025-08-13
**Document**: `.agent/notes/heading-output-format-proposal.md`

## Executive Summary

This proposal introduces a heading-based output format for Rulesets that allows blocks to be rendered as Markdown headings instead of XML tags. This enhancement improves CommonMark compliance, provides better readability in standard Markdown viewers, and offers flexibility for providers that don't support XML.

## Motivation

Currently, Rulesets blocks are designed to compile into XML tags. However:

- Many providers (Cursor, Windsurf) only support Markdown format
- XML tags reduce readability in standard Markdown viewers
- Documentation-focused rulesets would benefit from hierarchical heading structure
- Users need flexibility to choose output format based on their use case

## Core Features

### 1. Basic Heading Format

Transform blocks into Markdown headings based on block names:

```markdown
{{block-name heading}}
Content here
{{/block-name}}
```

Output:

```markdown
## Block Name

Content here
```

### 2. Heading Level Control

Multiple ways to specify heading levels:

| Syntax                     | Description                      | Example Output       |
| -------------------------- | -------------------------------- | -------------------- |
| `heading`                  | Auto-calculate based on nesting  | `## Block Name`      |
| `heading="3"`              | Explicit level                   | `### Block Name`     |
| `heading="inc"`            | Increment from parent            | Parent h2 → h3       |
| `heading="dec"`            | Decrement from parent            | Parent h3 → h2       |
| `heading="same"`           | Keep parent level                | Parent h2 → h2       |
| `heading="replace"`        | Replace first heading in content | Replaces existing    |
| `h-1` to `h-6`             | Shorthand for levels             | `# Block Name`       |
| `h-inc`, `h-dec`, `h-same` | Shorthand modifiers              | Relative adjustments |

### 3. Sequential Numbering

Automatic block numbering with hierarchical support:

```markdown
{{chapter numbering}}
Chapter content
{{/chapter}}

{{chapter numbering}}
Next chapter content
{{/chapter}}
```

Output:

```markdown
## 1. Chapter

Chapter content

## 2. Chapter

Next chapter content
```

#### Hierarchical Numbering

```markdown
{{chapter numbering}}
{{section numbering}}
{{subsection numbering}}
Content
{{/subsection}}
{{/section}}
{{/chapter}}
```

Produces: `1. Chapter` → `1.1 Section` → `1.1.1 Subsection`

#### Dynamic Numbering Variable

The `$n` variable provides inline numbering:

```markdown
{{\"Example $n\"}}
First example content
{{/\"Example $n\"}}

{{\"Example $n\"}}
Second example content
{{/\"Example $n\"}}
```

Output:

```markdown
## Example 1

First example content

## Example 2

Second example content
```

### 4. Simplified Quoted String Syntax

Quick heading creation without XML output:

```markdown
{{\"Getting Started\"}}
Introduction content here
{{/\"Getting Started\"}}
```

This automatically:

- Applies heading formatting
- Derives block name from heading text
- Excludes XML tags from output
- Respects nesting for heading levels

### 5. Configuration Options

#### Global Configuration (ruleset.config.json)

```json
{
  "ruleset": {
    "heading": {
      "level": {
        "min": 2, // Minimum heading level (default: 2)
        "max": 5 // Maximum heading level (default: 5)
      },
      "case": "title", // Text transformation
      "line_breaks": {
        "before": true, // Blank line before heading
        "after": true // Blank line after heading
      }
    },
    "block": {
      "numbering": {
        "heading": "before", // Number placement for headings
        "tag": "after", // Number placement for tags
        "children": 3, // Max hierarchical depth
        "separator": "." // Number separator
      }
    }
  }
}
```

#### Per-Ruleset Configuration (front matter)

```yaml
---
ruleset:
  heading:
    level:
      min: 2
      max: 5
    case: 'title'
    line_breaks:
      before: true
      after: true
---
```

#### Text Case Options

- `title`: Title Case (`block-name` → `Block Name`)
- `sentence`: Sentence case (`block-name` → `Block name`)
- `lower`: lowercase (`block-name` → `block name`)
- `upper`: UPPERCASE (`block-name` → `BLOCK NAME`)
- `kebab`: Original form (`block-name` → `block-name`)
- `space`: Spaces for hyphens (`block-name` → `block name`)

## Implementation Plan

### Phase 1: Core Heading Transformation (v0.2.0)

- [ ] Add heading property to block parser
- [ ] Implement basic heading transformation in compiler
- [ ] Update AST types to include heading metadata
- [ ] Add provider capability flags for heading support

### Phase 2: Level Control (v0.2.1)

- [ ] Implement explicit level specification
- [ ] Add relative level adjustments (inc/dec/same)
- [ ] Implement shorthand notation (h-1 through h-6)
- [ ] Add heading level validation and capping

### Phase 3: Sequential Numbering (v0.2.2)

- [ ] Implement basic sequential numbering
- [ ] Add hierarchical numbering support
- [ ] Implement `$n` variable substitution
- [ ] Add numbering configuration options

### Phase 4: Advanced Features (v0.2.3)

- [ ] Implement quoted string syntax
- [ ] Add heading replacement mode
- [ ] Implement mixed format handling
- [ ] Add comprehensive configuration merging

## Technical Architecture

### AST Extensions

```typescript
interface BlockNode {
  // Existing properties...
  heading?: {
    enabled: boolean;
    level?: number | 'inc' | 'dec' | 'same' | 'replace';
    numbering?: {
      enabled: boolean;
      format: 'before' | 'after' | 'none';
      value?: string;
    };
    case?: 'title' | 'sentence' | 'lower' | 'upper' | 'kebab' | 'space';
  };
}
```

### Provider Capabilities

```typescript
interface ProviderCapabilities {
  // Existing properties...
  supportsHeadings: boolean;
  preferredBlockFormat: 'xml' | 'heading' | 'mixed';
  maxHeadingLevel?: number;
}
```

### Compiler Logic

```typescript
function compileBlock(block: BlockNode, context: CompilerContext): string {
  if (block.heading?.enabled && context.provider.capabilities.supportsHeadings) {
    return compileAsHeading(block, context);
  }
  return compileAsXml(block, context);
}

function compileAsHeading(block: BlockNode, context: CompilerContext): string {
  const level = calculateHeadingLevel(block, context);
  const text = transformBlockName(block.name, block.heading.case);
  const number = getBlockNumber(block, context);

  const heading = number
    ? `${'#'.repeat(level)} ${number}. ${text}`
    : `${'#'.repeat(level)} ${text}`;

  return `${heading}\n\n${block.content}`;
}
```

## Edge Cases and Validation

### Heading Level Overflow

- Levels beyond h6 are capped at h6
- Configuration can set custom max level (1-6)
- Warning logged when capping occurs

### Mixed Format Handling

```markdown
{{outer heading}} <!-- Renders as heading -->
{{inner}} <!-- Renders as XML -->
{{nested h-4}} <!-- Renders as h4 heading -->
{{/nested}}
{{/inner}}
{{/outer}}
```

### Empty Blocks

- Empty blocks still generate headings
- Configuration option to skip empty block headings
- Provider-specific handling allowed

### Existing Headings in Content

- `replace` mode finds and replaces first heading
- If no heading exists, adds at beginning
- Preserves heading level from original or uses calculated level

## Provider Compatibility Matrix

| Provider    | Heading Support | XML Support | Preferred Format | Notes         |
| ----------- | --------------- | ----------- | ---------------- | ------------- |
| Cursor      | ✅              | ❌          | heading          | Markdown only |
| Claude Code | ✅              | ✅          | mixed            | Supports both |
| Windsurf    | ✅              | ❌          | heading          | Markdown only |
| Codex CLI   | ✅              | ❌          | heading          | Markdown only |
| Cline       | ✅              | ❌          | heading          | Markdown only |
| Roo Code    | ✅              | ❌          | heading          | Markdown only |

## Benefits

1. **Improved Readability**: Pure Markdown output is more readable in standard viewers
2. **Provider Flexibility**: Works with Markdown-only providers
3. **Documentation Structure**: Better for documentation-focused rulesets
4. **User Control**: Multiple levels of configuration and control
5. **CommonMark Compliance**: Enhances compatibility with Markdown standards
6. **Progressive Enhancement**: Can be adopted incrementally

## Risks and Mitigations

| Risk                                | Mitigation                               |
| ----------------------------------- | ---------------------------------------- |
| Breaking changes for existing rules | Feature is opt-in via properties         |
| Complex nesting edge cases          | Comprehensive test suite with edge cases |
| Performance impact                  | Caching heading level calculations       |
| Provider incompatibility            | Capability flags for feature detection   |

## Success Metrics

- [ ] All providers can handle heading-based output appropriately
- [ ] No performance regression in compilation time
- [ ] 100% test coverage for heading transformations
- [ ] Documentation examples compile correctly
- [ ] User feedback indicates improved readability

## Example Usage

### Documentation Ruleset

```markdown
---
ruleset:
  heading:
    level:
      min: 2
      max: 4
    case: 'title'
---

{{\"Getting Started\"}}

Welcome to our project documentation.

{{\"Installation\"}}

First, install the dependencies:

```bash
npm install
```

{{/\"Installation\"}}

{{\"Configuration\"}}

Configure your environment variables:

{{\"Environment Variables\"}}
Set these required variables:

- `API_KEY`: Your API key
- `API_URL`: The API endpoint
  {{/\"Environment Variables\"}}

{{/\"Configuration\"}}

{{/\"Getting Started\"}}

```text

### Mixed Format Example

```markdown
{{project-overview h-1}}

# Project Title

{{features}}
<key_features>
- Feature 1
- Feature 2
</key_features>
{{/features}}

{{requirements heading}}
## System Requirements

- Node.js 18+
- npm 9+
{{/requirements}}

{{/project-overview}}
````

## References

- Original proposal: `docs/project/notes/block-heading.md`
- Language specification: `docs/project/LANGUAGE.md`
- Provider types: `packages/types/src/provider.ts`
- Compiler implementation: `packages/compiler/src/index.ts`

## Next Steps

1. Review and approve proposal
2. Create feature branch for implementation
3. Implement Phase 1 (Core Heading Transformation)
4. Add comprehensive tests
5. Update documentation
6. Gather user feedback
7. Iterate through remaining phases

---

*This proposal aims to enhance Rulesets' flexibility and user experience by providing an alternative to XML-based output that better aligns with Markdown standards and provider capabilities.*
