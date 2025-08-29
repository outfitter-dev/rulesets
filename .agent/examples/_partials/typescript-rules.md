---
title: TypeScript Standards
version: 1.0.0
language: TypeScript
---

## TypeScript Coding Standards

### Type Safety Requirements

- Use `strict` mode in tsconfig.json
- No `any` types unless absolutely necessary
- Prefer `unknown` over `any` for uncertain types
- Use branded types for domain modeling

### Code Organization

- One class/interface per file
- Use barrel exports (`index.ts`) for modules
- Group related types in dedicated modules; avoid TypeScript namespaces
- Separate types from implementation

### Naming Conventions

- PascalCase for types, classes, interfaces
- camelCase for variables, functions, methods
- SCREAMING_SNAKE_CASE for constants
- Prefix interfaces with `I` only when needed

### Error Handling

- Use Result types instead of throwing exceptions
- Define custom error types with branded strings
- Always handle async rejections
- Prefer exhaustive pattern matching

### Performance Considerations

- Use `readonly` for immutable data
- Prefer `const assertions` for literal types
- Avoid deep object nesting (max 3 levels)
- Use lazy evaluation for expensive computations
