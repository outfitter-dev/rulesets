---
title: Testing Guidelines
version: 1.0.0
category: quality-assurance
---

## Testing Standards

### Test Structure

- Follow AAA pattern (Arrange, Act, Assert)
- One assertion per test when possible
- Descriptive test names that explain behavior
- Group related tests with `describe` blocks

### Coverage Requirements

- Minimum 80% code coverage
- 100% coverage for critical business logic
- Test all exported functions and methods
- Include edge cases and error conditions

### Test Types

1. **Unit Tests**: Individual functions/methods
2. **Integration Tests**: Module interactions
3. **End-to-End Tests**: Complete user workflows
4. **Property Tests**: Random input validation

### Mock Strategy

- Mock external dependencies
- Use dependency injection for testability
- Prefer spy/stub over full mocks
- Test behavior, not implementation

### Test Data Management

- Use factories for test object creation
- Isolate test data per test case
- Clean up resources after tests
- Use realistic but minimal test data
