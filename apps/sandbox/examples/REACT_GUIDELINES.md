# React Development Guidelines

This file contains supplementary React development guidelines referenced by the react-guidelines.ruleset.md file.

## Component Design Principles

### Functional Components

- Always prefer functional components over class components
- Use React hooks for state management and side effects
- Keep components small and focused on a single responsibility

### Props and Interface Design

- Define clear TypeScript interfaces for all component props
- Use descriptive property names that indicate purpose
- Prefer explicit props over spreading objects when possible

### Performance Considerations

- Use React.memo for components that receive stable props
- Implement useMemo and useCallback for expensive computations
- Consider component lazy loading for large applications

## State Management

- Use local state (useState) for component-specific data
- Use Context API for app-wide state that changes infrequently
- Consider external libraries (Zustand, Redux) for complex state needs

## Testing Guidelines

- Write tests for all public component interfaces
- Test user interactions, not implementation details
- Use React Testing Library for component testing
- Mock external dependencies and API calls

## Code Organization

- Group related components in feature-based directories
- Keep component files focused and under 200 lines when possible
- Extract custom hooks for reusable stateful logic
- Use absolute imports for better maintainability

## Best Practices

- Follow React's built-in ESLint rules
- Use TypeScript strict mode for better type safety
- Implement error boundaries for graceful error handling
- Document complex component behaviors with JSDoc comments
