---
ruleset:
  version: 0.1.0

title: 'Complete Rulesets Feature Demo'
description: 'Demonstrates all Rulesets ruleset-v0.1-beta features and syntax'

# Provider-specific configuration
providers:
  cursor:
    enabled: true
    path: '.cursor/rules/complete-demo.mdc'
    priority: 'high'
  claude-code:
    enabled: true
    path: 'COMPLETE_DEMO.md'
    sections: ['instructions', 'examples', 'references']
  windsurf:
    enabled: true
    name: 'complete_demo_rules'
  amp:
    enabled: false # Disabled for this example
  codex:
    enabled: true

# Metadata
tags: ['demo', 'complete', 'showcase']
version: '1.0.0'
author: 'Rulesets Team'
category: 'examples'
---

## Complete Rulesets Feature Demo

This example showcases all the features available in Rulesets ruleset-v0.1-beta.

{{instructions}}

## Core Development Principles

- **Write code that tells a story** - Your code should read like well-written prose
- **Optimize for readability first** - Code is read 10x more than it's written
- **Test behavior, not implementation** - Focus on what the code does, not how
- **Embrace functional programming** - Prefer pure functions and immutable data
- **Document the why, not the what** - Comments should explain reasoning

## Architecture Guidelines

- **Single Responsibility Principle** - Each module should have one reason to change
- **Dependency Inversion** - Depend on abstractions, not concretions
- **Interface Segregation** - No client should depend on methods it doesn't use
- **Don't Repeat Yourself** - But also don't abstract prematurely

## Code Review Standards

- **Every PR requires review** - No exceptions, even for hotfixes
- **Review for correctness first** - Does it solve the problem correctly?
- **Review for maintainability** - Will this be easy to change later?
- **Review for performance** - Are there obvious performance issues?
  {{/instructions}}

{{examples}}

### Clean Function Design

```typescript
// ✅ Good: Pure function with clear intent
function calculateShippingCost(
  weight: number,
  distance: number,
  shippingTier: ShippingTier
): ShippingCost {
  const baseRate = getBaseRateForTier(shippingTier);
  const weightMultiplier = Math.ceil(weight / 5) * 0.5;
  const distanceMultiplier = distance > 100 ? 1.2 : 1.0;

  return {
    amount: baseRate * weightMultiplier * distanceMultiplier,
    currency: 'USD',
    tier: shippingTier,
  };
}

// ❌ Bad: Unclear function with side effects
let globalShippingRate = 10;
function shipping(w, d, t) {
  globalShippingRate += 2;
  return globalShippingRate * w * d * (t === 'premium' ? 1.5 : 1);
}
```

### Error Handling Patterns

```typescript
// ✅ Good: Explicit error handling with proper types
async function fetchUserProfile(userId: UserId): Promise<Result<UserProfile, ProfileError>> {
  try {
    const response = await api.get(`/users/${userId}/profile`);

    if (!response.ok) {
      return Result.error(new ProfileError(`HTTP ${response.status}: ${response.statusText}`));
    }

    const profile = UserProfileSchema.parse(response.data);
    return Result.success(profile);
  } catch (error) {
    if (error instanceof ValidationError) {
      return Result.error(new ProfileError('Invalid profile data received'));
    }

    if (error instanceof NetworkError) {
      return Result.error(new ProfileError('Network error occurred'));
    }

    // Unknown error - log it and return generic error
    logger.error('Unexpected error in fetchUserProfile', error);
    return Result.error(new ProfileError('An unexpected error occurred'));
  }
}
```

### Testing Best Practices

```typescript
// ✅ Good: Behavior-focused test with clear structure
describe('ShippingCalculator', () => {
  describe('calculateShippingCost', () => {
    it('applies premium tier multiplier correctly', () => {
      // Arrange
      const weight = 10; // lbs
      const distance = 50; // miles
      const tier = ShippingTier.Premium;

      // Act
      const cost = calculateShippingCost(weight, distance, tier);

      // Assert
      expect(cost.amount).toBe(30); // 15 base * 1 weight * 2 premium
      expect(cost.tier).toBe(ShippingTier.Premium);
    });

    it('handles edge case of zero weight gracefully', () => {
      const cost = calculateShippingCost(0, 100, ShippingTier.Standard);

      expect(cost.amount).toBeGreaterThan(0); // Should still charge minimum
    });
  });
});
```

{{/examples}}

{{patterns}}

### Design Patterns

#### Repository Pattern

```typescript
// ✅ Good: Clean separation of data access
interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: UserId): Promise<void>;
}

class DatabaseUserRepository implements UserRepository {
  constructor(private db: Database) {}

  async findById(id: UserId): Promise<User | null> {
    const row = await this.db.query('SELECT * FROM users WHERE id = ?', [id]);
    return row ? UserMapper.fromDatabase(row) : null;
  }

  // ... other methods
}

class InMemoryUserRepository implements UserRepository {
  private users = new Map<UserId, User>();

  async findById(id: UserId): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  // ... other methods
}
```

#### Builder Pattern

```typescript
// ✅ Good: Complex object construction made simple
class ApiRequestBuilder {
  private request: ApiRequest = {
    method: 'GET',
    headers: {},
    params: {},
  };

  method(method: HttpMethod): this {
    this.request.method = method;
    return this;
  }

  path(path: string): this {
    this.request.path = path;
    return this;
  }

  header(key: string, value: string): this {
    this.request.headers[key] = value;
    return this;
  }

  param(key: string, value: string): this {
    this.request.params[key] = value;
    return this;
  }

  build(): ApiRequest {
    if (!this.request.path) {
      throw new Error('Path is required');
    }
    return { ...this.request };
  }
}

// Usage
const request = new ApiRequestBuilder()
  .method('POST')
  .path('/users')
  .header('Content-Type', 'application/json')
  .param('include', 'profile')
  .build();
```

{{/patterns}}

{{anti-patterns}}

### Anti-Patterns to Avoid

```typescript
// ❌ Bad: God object that does everything
class UserManager {
  validateUser() {
    /* ... */
  }
  saveUser() {
    /* ... */
  }
  deleteUser() {
    /* ... */
  }
  sendWelcomeEmail() {
    /* ... */
  }
  generateReport() {
    /* ... */
  }
  processPayment() {
    /* ... */
  }
  uploadAvatar() {
    /* ... */
  }
  // ... 50 more methods
}

// ✅ Good: Separated responsibilities
class UserValidator {
  validateUser() {
    /* ... */
  }
}
class UserRepository {
  save() {
    /* ... */
  }
  delete() {
    /* ... */
  }
}
class EmailService {
  sendWelcomeEmail() {
    /* ... */
  }
}
class ReportGenerator {
  generateUserReport() {
    /* ... */
  }
}
```

```typescript
// ❌ Bad: Callback hell
function processOrder(orderId, callback) {
  getOrder(orderId, (order) => {
    validateOrder(order, (isValid) => {
      if (isValid) {
        processPayment(order, (paymentResult) => {
          updateInventory(order, (inventoryResult) => {
            sendConfirmation(order, (confirmResult) => {
              callback(null, { success: true });
            });
          });
        });
      }
    });
  });
}

// ✅ Good: Clean async/await
async function processOrder(orderId: OrderId): Promise<ProcessResult> {
  const order = await getOrder(orderId);
  const isValid = await validateOrder(order);

  if (!isValid) {
    throw new OrderValidationError('Order validation failed');
  }

  const paymentResult = await processPayment(order);
  const inventoryResult = await updateInventory(order);
  const confirmResult = await sendConfirmation(order);

  return { success: true, paymentResult, inventoryResult, confirmResult };
}
```

{{/anti-patterns}}

{{references}}

### Useful Resources

- [Clean Code by Robert Martin](https://example.com/clean-code)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### Tools and Libraries

- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier with consistent configuration
- **Testing**: Vitest for unit tests, Playwright for E2E
- **Type Checking**: TypeScript in strict mode
- **Documentation**: TSDoc for code documentation
  {{/references}}
