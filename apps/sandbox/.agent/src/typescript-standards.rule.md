---
ruleset:
  version: 0.1.0
  
title: "TypeScript Coding Standards"
description: "Professional TypeScript development standards for our team"

providers:
  cursor:
    enabled: true
  claude-code:
    enabled: true
  windsurf:
    enabled: true
---

# TypeScript Coding Standards

{{instructions}}

## Type Safety Requirements

- **NEVER use `any`** - Use proper types or `unknown` with type guards
- **Enable strict mode** - All TypeScript projects must use strict configuration
- **Prefer type-only imports** - Use `import type` for type-only imports
- **Use branded types** - For domain-specific strings/numbers to prevent mixing

## Code Organization

- **One export per file** - Prefer single-purpose modules
- **Index files for public APIs** - Use index.ts to define public interfaces
- **Co-locate types** - Keep types close to their usage
- **Use barrel exports sparingly** - Only for well-defined module boundaries

## Error Handling

- **Use Result types** - Prefer `Result<T, E>` over throwing exceptions
- **Handle all async operations** - Every Promise must be awaited or handled
- **Custom error classes** - Create specific error types for different failure modes
{{/instructions}}

{{examples}}

### Type Safety Examples

```typescript
// ✅ Good: Branded types prevent mixing different IDs
type UserId = string & { readonly brand: unique symbol };
type OrderId = string & { readonly brand: unique symbol };

function getUserOrders(userId: UserId): Promise<Order[]> {
  // This prevents accidentally passing an OrderId where UserId expected
  return api.get(`/users/${userId}/orders`);
}
```

```typescript
// ✅ Good: Proper error handling with Result types
type Result<T, E> = { success: true; data: T } | { success: false; error: E };

async function fetchUser(id: UserId): Promise<Result<User, UserError>> {
  try {
    const response = await api.get(`/users/${id}`);
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: new UserError('Failed to fetch user', error) };
  }
}

// Usage
const result = await fetchUser(userId);
if (result.success) {
  console.log(result.data.name); // TypeScript knows data exists
} else {
  logger.error(result.error.message); // TypeScript knows error exists
}
```

```typescript
// ✅ Good: Proper async/await with error boundaries
async function processUserData(userId: UserId): Promise<void> {
  try {
    const [user, orders, preferences] = await Promise.all([
      fetchUser(userId),
      fetchUserOrders(userId),
      fetchUserPreferences(userId)
    ]);
    
    await updateUserProfile({ user, orders, preferences });
  } catch (error) {
    // Handle specific error types differently
    if (error instanceof NetworkError) {
      throw new ServiceUnavailableError('Service temporarily unavailable');
    }
    throw error; // Re-throw unknown errors
  }
}
```

{{/examples}}
