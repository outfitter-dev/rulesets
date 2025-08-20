---
ruleset:
  version: 0.1.0

title: 'Basic Development Rules'
description: 'Simple example showing Rulesets basics'

providers:
  cursor:
    enabled: true
  claude-code:
    enabled: true

author: 'Your Name'
---

## Basic Development Rules

This is a simple example showing the basic features of Rulesets.

{{#instructions}}

- Always write clear, self-documenting code
- Use TypeScript for type safety
- Write tests for your functions
- Follow consistent naming conventions
- Document complex logic with comments
  {{/instructions}}

{{#examples}}

```typescript
// ✅ Good: Clear function name and types
function calculateDiscountPrice(originalPrice: number, discountRate: number): number {
  return originalPrice * (1 - discountRate);
}

// ❌ Bad: Unclear function name and no types
function calc(p, d) {
  return p * (1 - d);
}
```

```typescript
// ✅ Good: Well-documented complex logic
function processUserPreferences(user: User): ProcessedPreferences {
  // Apply default preferences first, then merge user-specific settings
  // This ensures all required fields are present even if user hasn't set them
  const defaultPrefs = getDefaultPreferences();
  return mergePreferences(defaultPrefs, user.preferences);
}
```

{{/examples}}

{{#best-practices}}

## Best Practices

### Code Organization

- Keep functions small and focused (< 20 lines when possible)
- Use meaningful file and folder names
- Group related functionality together

### Error Handling

- Always handle potential errors explicitly
- Provide helpful error messages to users
- Log errors appropriately for debugging

### Performance

- Don't optimize prematurely
- Profile before making performance changes
- Consider readability over micro-optimizations
  {{/best-practices}}
