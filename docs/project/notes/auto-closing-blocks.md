# Auto-Closing Blocks Proposal

## Overview

This document outlines a proposal for implementing "auto-closing blocks" in Rulesets. Auto-closing blocks would allow users to write sequential block markers without explicitly closing previous ones. The compiler would automatically close blocks in the appropriate order.

## Core Concept

In traditional XML and Rulesets' current implementation, explicit closing tags are required. With auto-closing blocks, users could write:

```markdown
{{block-1}}

Content for block 1

{{block-2}}

Content for block 2

{{block-3}}

Content for block 3
```

The output would automatically add closing tags in last-in-first-out (LIFO) order:

```xml
<block_1>
Content for block 1

<block_2>
Content for block 2

<block_3>
Content for block 3
</block_3>
</block_2>
</block_1>
```

## Benefits

1. **Reduced Typing**: Eliminates the need to type closing markers, saving time and reducing errors
2. **Cleaner Authoring**: Reduces visual clutter in the source document
3. **Natural Organization**: Matches how people naturally organize hierarchical content
4. **Readability**: Makes document structure more apparent at a glance

## Implementation Details

### 1. Block Stack Management

The compiler would maintain a stack of open blocks:

1. When a new `{{block-name}}` marker is encountered, push it onto the stack
2. When an explicit closing `{{/block-name}}` marker is encountered:
   - Pop the matching block from the stack
   - Check that it matches the expected name (error if not)
3. At the end of the document:
   - Pop and close all remaining blocks in the stack in reverse order

### 2. Block Level Inference

The level/nesting of blocks would be determined by their appearance in the document:

```markdown
{{outer-block}}
Outer content

{{inner-block}}
Inner content

{{deeper-block}}
Deeper content
```

Would produce:

```xml
<outer_block>
Outer content

<inner_block>
Inner content

<deeper_block>
Deeper content
</deeper_block>
</inner_block>
</outer_block>
```

### 3. Mixed Explicit and Auto-Closing

Users should be able to mix explicit closing and auto-closing as needed:

```markdown
{{block-1}}
Content

{{block-2}}
More content
{{/block-2}}

{{block-3}}
Even more content
```

Would produce:

```xml
<block_1>
Content

<block_2>
More content
</block_2>

<block_3>
Even more content
</block_3>
</block_1>
```

### 4. End-of-File Behavior

At the end of the file, all open blocks would be automatically closed in reverse order:

```markdown
{{block-1}}
Content 1

{{block-2}}
Content 2

{{block-3}}
Content 3
```

Produces:

```xml
<block_1>
Content 1

<block_2>
Content 2

<block_3>
Content 3
</block_3>
</block_2>
</block_1>
```

### 5. Heading-Derived Blocks

This feature would be particularly useful when combined with the heading-based output formats:

```markdown
{{block-1 output="heading"}}
Content 1

{{block-2 output="heading"}}
Content 2

{{block-3 output="heading"}}
Content 3
```

Would produce:

```markdown
## Block 1

Content 1

### Block 2

Content 2

#### Block 3

Content 3
```

## Considerations and Edge Cases

### 1. Explicit vs. Implicit Block Closure

When an explicit closing tag is encountered, the compiler must ensure it matches the expected block:

```markdown
{{block-1}}
Content 1

{{block-2}}
Content 2
{{/block-1}} <!-- ERROR: Expected closing block-2 -->
```

This would result in a compilation error because we expected `{{/block-2}}`.

### 2. Auto-closing at Same Level

Special handling may be needed for blocks at the same level:

```markdown
{{block-1}}
Content 1

{{block-2}}
Content 2

{{block-3}}
Content 3
```

Properties:
- Close all previous blocks (resulting in sequential blocks)
- Only auto-close blocks of the same level (allowing nesting)

Recommendation: Block distinct levels, closing only when necessary to maintain proper nesting.

### 3. Self-Closing Tags vs. Auto-Closing Blocks

It's important to distinguish between:

- **Self-closing tags**: `{{block-name/}}` (a single tag with no content)
- **Auto-closing blocks**: `{{block-1}}...{{block-2}}...` (blocks closed by inference)

### 4. Property Inheritance

Consider whether properties should be inherited between adjacent auto-closed blocks:

```markdown
{{block-1 property="value"}}
Content 1

{{block-2}}
Content 2
```

Properties:
- No inheritance (each block has its own properties)
- Inherit non-conflicting properties from parent
- Inherit specifically marked properties

Recommendation: No inheritance by default, with an opt-in inheritance property.

### 5. Destination Filtering Implications

When blocks are filtered out for specific targets, auto-closing needs to maintain proper structure:

```markdown
{{block-1}}
Content 1

{{block-2 -cursor}}
Content 2 (excluded for Cursor)

{{block-3}}
Content 3
```

For Cursor, this would need to produce:

```xml
<block_1>
Content 1

<block_3>
Content 3
</block_3>
</block_1>
```

### 6. Indentation and Whitespace

Consider whether auto-closed sections should adjust indentation to reflect nesting level:

```markdown
{{block-1}}
Content 1

  {{block-2}}
  Content 2

    {{block-3}}
    Content 3
```

Properties:
- Preserve original indentation (simpler)
- Adjust indentation to reflect nesting (more complex but potentially more readable)

Recommendation: Preserve original indentation to maintain maximum fidelity with source.

## Syntax Variations

### 1. Potential Auto-Close Marker

An alternative could be to provide a special notation that explicitly indicates auto-closing behavior:

```markdown
{{block-1>}}  <!-- '>' indicates this block will close when another block appears -->
Content 1

{{block-2>}}
Content 2

{{block-3}}
Content 3
```

### 2. Level Markers

Explicit level markers could be added:

```markdown
{{1:block-1}}  <!-- Level 1 -->
Content 1

{{2:block-2}}  <!-- Level 2 -->
Content 2

{{3:block-3}}  <!-- Level 3 -->
Content 3
```

## Implementation Recommendation

1. Implement auto-closing as an opt-in feature initially
2. Allow configuration via frontmatter or config with `auto-close: true|false`
3. Provide clear error messages when auto-closing creates ambiguous situations
4. Consider default level detection based on indentation
5. Maintain explicit LIFO ordering for auto-closing

## Usage Examples

### 1. Basic Auto-Closing

```markdown
---
ruleset:
  auto-close: true
---

{{block-1}}
Content for block 1

{{block-2}}
Content for block 2

{{block-3}}
Content for block 3
```

Output:

```xml
<block_1>
Content for block 1

<block_2>
Content for block 2

<block_3>
Content for block 3
</block_3>
</block_2>
</block_1>
```

### 2. Mixed Explicit and Auto-Closing

```markdown
{{block-1}}
Content 1

{{block-2}}
Content 2
{{/block-2}}

{{block-3}}
Content 3
```

Output:

```xml
<block_1>
Content 1

<block_2>
Content 2
</block_2>

<block_3>
Content 3
</block_3>
</block_1>
```

### 3. With Heading Output Format

```markdown
{{section output="heading"}}
This is the main section.

{{subsection output="heading"}}
This is a subsection.

{{code-example}}
function example() {
  console.log("Hello world");
}
{{/code-example}}

{{another-subsection output="heading"}}
This is another subsection.
```

Output:

```markdown
## Section

This is the main section.

### Subsection

This is a subsection.

<code_example>
function example() {
  console.log("Hello world");
}
</code_example>

### Another Subsection

This is another subsection.
</section>
</subsection>
</another-subsection>
```

## Comparison with Self-Closing Tags

Auto-closing blocks are different from self-closing tags, which should still be implemented separately:

1. **Self-closing tags** (`{{tag-name/}}`) represent an empty element with no content or children
2. **Auto-closing blocks** represent the implied closing of a parent tag when a new sibling appears

Both features would be complementary within the Rulesets ecosystem.

## Conclusion

Auto-closing blocks would provide a more intuitive and efficient way to author hierarchical content in Rulesets. The implementation would need careful consideration of edge cases, but would result in cleaner source documents with less redundancy.

This feature would be particularly valuable when:
- Creating deeply nested document structures
- Using heading-based output formats
- Rapidly authoring new content where exact nesting is still being determined