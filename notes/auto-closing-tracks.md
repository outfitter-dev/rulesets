# Auto-Closing Tracks Proposal

## Overview

This document outlines a proposal for implementing "auto-closing tracks" in Mixdown. Auto-closing tracks would allow users to write sequential track markers without explicitly closing previous ones. The compiler would automatically close tracks in the appropriate order.

## Core Concept

In traditional XML and Mixdown's current implementation, explicit closing tags are required. With auto-closing tracks, users could write:

```markdown
{{track-1}}

Content for track 1

{{track-2}}

Content for track 2

{{track-3}}

Content for track 3
```

The output would automatically add closing tags in last-in-first-out (LIFO) order:

```xml
<track_1>
Content for track 1

<track_2>
Content for track 2

<track_3>
Content for track 3
</track_3>
</track_2>
</track_1>
```

## Benefits

1. **Reduced Typing**: Eliminates the need to type closing markers, saving time and reducing errors
2. **Cleaner Authoring**: Reduces visual clutter in the source document
3. **Natural Organization**: Matches how people naturally organize hierarchical content
4. **Readability**: Makes document structure more apparent at a glance

## Implementation Details

### 1. Track Stack Management

The compiler would maintain a stack of open tracks:

1. When a new `{{track-name}}` marker is encountered, push it onto the stack
2. When an explicit closing `{{/track-name}}` marker is encountered:
   - Pop the matching track from the stack
   - Check that it matches the expected name (error if not)
3. At the end of the document:
   - Pop and close all remaining tracks in the stack in reverse order

### 2. Track Level Inference

The level/nesting of tracks would be determined by their appearance in the document:

```markdown
{{outer-track}}
Outer content

{{inner-track}}
Inner content

{{deeper-track}}
Deeper content
```

Would produce:

```xml
<outer_track>
Outer content

<inner_track>
Inner content

<deeper_track>
Deeper content
</deeper_track>
</inner_track>
</outer_track>
```

### 3. Mixed Explicit and Auto-Closing

Users should be able to mix explicit closing and auto-closing as needed:

```markdown
{{track-1}}
Content

{{track-2}}
More content
{{/track-2}}

{{track-3}}
Even more content
```

Would produce:

```xml
<track_1>
Content

<track_2>
More content
</track_2>

<track_3>
Even more content
</track_3>
</track_1>
```

### 4. End-of-File Behavior

At the end of the file, all open tracks would be automatically closed in reverse order:

```markdown
{{track-1}}
Content 1

{{track-2}}
Content 2

{{track-3}}
Content 3
```

Produces:

```xml
<track_1>
Content 1

<track_2>
Content 2

<track_3>
Content 3
</track_3>
</track_2>
</track_1>
```

### 5. Heading-Derived Tracks

This feature would be particularly useful when combined with the heading-based output formats:

```markdown
{{track-1 output="heading"}}
Content 1

{{track-2 output="heading"}}
Content 2

{{track-3 output="heading"}}
Content 3
```

Would produce:

```markdown
## Track 1

Content 1

### Track 2

Content 2

#### Track 3

Content 3
```

## Considerations and Edge Cases

### 1. Explicit vs. Implicit Track Closure

When an explicit closing tag is encountered, the compiler must ensure it matches the expected track:

```markdown
{{track-1}}
Content 1

{{track-2}}
Content 2
{{/track-1}} <!-- ERROR: Expected closing track-2 -->
```

This would result in a compilation error because we expected `{{/track-2}}`.

### 2. Auto-closing at Same Level

Special handling may be needed for tracks at the same level:

```markdown
{{track-1}}
Content 1

{{track-2}}
Content 2

{{track-3}}
Content 3
```

Options:
- Close all previous tracks (resulting in sequential tracks)
- Only auto-close tracks of the same level (allowing nesting)

Recommendation: Track distinct levels, closing only when necessary to maintain proper nesting.

### 3. Self-Closing Tags vs. Auto-Closing Tracks

It's important to distinguish between:

- **Self-closing tags**: `{{track-name/}}` (a single tag with no content)
- **Auto-closing tracks**: `{{track-1}}...{{track-2}}...` (tracks closed by inference)

### 4. Attribute Inheritance

Consider whether attributes should be inherited between adjacent auto-closed tracks:

```markdown
{{track-1 attr="value"}}
Content 1

{{track-2}}
Content 2
```

Options:
- No inheritance (each track has its own attributes)
- Inherit non-conflicting attributes from parent
- Inherit specifically marked attributes

Recommendation: No inheritance by default, with an opt-in inheritance attribute.

### 5. Target Filtering Implications

When tracks are filtered out for specific targets, auto-closing needs to maintain proper structure:

```markdown
{{track-1}}
Content 1

{{track-2 -cursor}}
Content 2 (excluded for Cursor)

{{track-3}}
Content 3
```

For Cursor, this would need to produce:

```xml
<track_1>
Content 1

<track_3>
Content 3
</track_3>
</track_1>
```

### 6. Indentation and Whitespace

Consider whether auto-closed sections should adjust indentation to reflect nesting level:

```markdown
{{track-1}}
Content 1

  {{track-2}}
  Content 2

    {{track-3}}
    Content 3
```

Options:
- Preserve original indentation (simpler)
- Adjust indentation to reflect nesting (more complex but potentially more readable)

Recommendation: Preserve original indentation to maintain maximum fidelity with source.

## Syntax Variations

### 1. Potential Auto-Close Marker

An alternative could be to provide a special notation that explicitly indicates auto-closing behavior:

```markdown
{{track-1>}}  <!-- '>' indicates this track will close when another track appears -->
Content 1

{{track-2>}}
Content 2

{{track-3}}
Content 3
```

### 2. Level Markers

Explicit level markers could be added:

```markdown
{{1:track-1}}  <!-- Level 1 -->
Content 1

{{2:track-2}}  <!-- Level 2 -->
Content 2

{{3:track-3}}  <!-- Level 3 -->
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
mixdown:
  auto-close: true
---

{{track-1}}
Content for track 1

{{track-2}}
Content for track 2

{{track-3}}
Content for track 3
```

Output:

```xml
<track_1>
Content for track 1

<track_2>
Content for track 2

<track_3>
Content for track 3
</track_3>
</track_2>
</track_1>
```

### 2. Mixed Explicit and Auto-Closing

```markdown
{{track-1}}
Content 1

{{track-2}}
Content 2
{{/track-2}}

{{track-3}}
Content 3
```

Output:

```xml
<track_1>
Content 1

<track_2>
Content 2
</track_2>

<track_3>
Content 3
</track_3>
</track_1>
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

Auto-closing tracks are different from self-closing tags, which should still be implemented separately:

1. **Self-closing tags** (`{{tag-name/}}`) represent an empty element with no content or children
2. **Auto-closing tracks** represent the implied closing of a parent tag when a new sibling appears

Both features would be complementary within the Mixdown ecosystem.

## Conclusion

Auto-closing tracks would provide a more intuitive and efficient way to author hierarchical content in Mixdown. The implementation would need careful consideration of edge cases, but would result in cleaner source documents with less redundancy.

This feature would be particularly valuable when:
- Creating deeply nested document structures
- Using heading-based output formats
- Rapidly authoring new content where exact nesting is still being determined