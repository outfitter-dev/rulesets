---
mixdown:
  version: 0.1.0
description: "Example source rules using .mix.md extension"
globs: ["**/*.{ts,tsx}"]
---

# TypeScript Coding Standards

{{instructions +cursor}}
Follow these TypeScript coding standards for the project:

- Use TypeScript's strict mode
- Prefer interfaces over type aliases for object types
- Use meaningful variable and function names
- Add return types to all functions and methods
- Use proper JSDoc comments for all public APIs
{{/instructions}}

{{instructions +claude-code}}
When working with TypeScript in this project:

1. Enable strict type checking in tsconfig.json
2. Use explicit return types for all functions
3. Prefer interfaces for object shapes
4. Use type guards to narrow types safely
5. Document complex types with JSDoc comments
{{/instructions}}