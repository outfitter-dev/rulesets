---
ruleset:
  version: 0.1.0
  
title: "Project Conventions"
description: "General development conventions and standards"

providers:
  cursor:
    enabled: true
  claude-code:
    enabled: true
  windsurf:
    enabled: true
  amp:
    enabled: true
  codex:
    enabled: true
---

# Project Conventions

{{instructions}}

## File Organization

- **Feature-based structure** - Organize by feature, not by file type
- **Index files for exports** - Use index.ts to define public APIs
- **Consistent naming** - Use kebab-case for files, PascalCase for components
- **Test co-location** - Keep tests next to the code they test

## Code Quality

- **Linting and formatting** - Use ESLint, Prettier, and Biome consistently
- **Type safety first** - TypeScript strict mode required
- **No console.log in production** - Use proper logging libraries
- **Documentation inline** - JSDoc for public APIs

## Git Workflow

- **Conventional commits** - Use conventional commit format
- **Feature branches** - Work on feature branches, PR to main
- **No direct commits to main** - All changes through pull requests
- **Squash merge** - Keep main branch history clean
{{/instructions}}

{{examples}}

### File Structure Example

```
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── LoginForm.test.tsx
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useAuth.test.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   └── auth.service.test.ts
│   │   └── index.ts
│   └── dashboard/
│       ├── components/
│       ├── hooks/
│       └── index.ts
├── shared/
│   ├── components/
│   ├── utils/
│   └── types/
└── app/
    ├── layout.tsx
    └── page.tsx
```

### Conventional Commit Examples

```bash
# Features
feat: add user authentication with JWT tokens
feat(dashboard): implement real-time data updates

# Bug fixes  
fix: resolve memory leak in user session handling
fix(api): handle null response from external service

# Documentation
docs: update API documentation for auth endpoints
docs(readme): add installation and setup instructions

# Refactoring
refactor: extract user validation logic to shared utility
refactor(components): simplify Modal component props interface

# Performance
perf: optimize database queries for user dashboard
perf(images): implement lazy loading for gallery component
```

### JSDoc Documentation Example

```typescript
/**
 * Fetches user data with caching and error handling
 * 
 * @param userId - The unique identifier for the user
 * @param options - Configuration options for the request
 * @param options.useCache - Whether to use cached data if available
 * @param options.timeout - Request timeout in milliseconds
 * @returns Promise that resolves to user data or null if not found
 * 
 * @throws {UserNotFoundError} When user doesn't exist
 * @throws {NetworkError} When request fails due to network issues
 * 
 * @example
 * ```typescript
 * const user = await fetchUserData('123', { useCache: true });
 * if (user) {
 *   console.log(user.name);
 * }
 * ```
 */
async function fetchUserData(
  userId: string,
  options: {
    useCache?: boolean;
    timeout?: number;
  } = {}
): Promise<User | null> {
  // Implementation here
}
```

{{/examples}}
