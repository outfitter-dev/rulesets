---
ruleset:
  version: 0.1.0

title: 'React Component Guidelines'
description: 'Modern React development best practices'

providers:
  cursor:
    enabled: true
    name: 'react_component_rules'
  claude-code:
    enabled: true
    path: 'REACT_GUIDELINES.md'

tags: ['react', 'frontend', 'components']
framework: 'React 18+'
---

## React Component Guidelines

Best practices for building maintainable, performant React applications.

{{#instructions}}

## Component Architecture

- **Prefer function components** - Use hooks instead of class components
- **Single responsibility** - Each component should have one clear purpose
- **Compose over inheritance** - Build complex UIs through composition
- **Props interface first** - Define clear TypeScript interfaces for all props

## Performance Guidelines

- **Minimize re-renders** - Use React.memo, useMemo, and useCallback appropriately
- **Lazy load components** - Use React.lazy for route-based code splitting
- **Optimize bundle size** - Import only what you need from libraries
- **Virtual scrolling** - Use virtualization for long lists

## State Management

- **Local state by default** - Use useState for component-local state
- **Lift state up sparingly** - Only when multiple components need the same state
- **Context for cross-cutting concerns** - Theme, auth, language, not business data
- **External state libraries** - Zustand/Redux for complex global state
  {{/instructions}}

{{#examples}}

### Well-Structured Components

```tsx
// ✅ Good: Clear props interface and single responsibility
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  showActions?: boolean;
  className?: string;
}

export function UserCard({ user, onEdit, showActions = true, className }: UserCardProps) {
  const handleEdit = useCallback(() => {
    onEdit?.(user);
  }, [user, onEdit]);

  return (
    <Card className={className}>
      <CardHeader>
        <Avatar src={user.avatar} alt={user.name} />
        <h3>{user.name}</h3>
        <p>{user.email}</p>
      </CardHeader>
      {showActions && (
        <CardActions>
          <Button onClick={handleEdit} variant="primary">
            Edit
          </Button>
        </CardActions>
      )}
    </Card>
  );
}
```

### Performance Optimization

```tsx
// ✅ Good: Memoized component prevents unnecessary re-renders
const UserList = React.memo<UserListProps>(({ users, onUserSelect }) => {
  const handleUserClick = useCallback(
    (user: User) => {
      onUserSelect(user);
    },
    [onUserSelect]
  );

  return (
    <div className="user-list">
      {users.map((user) => (
        <UserCard key={user.id} user={user} onEdit={handleUserClick} />
      ))}
    </div>
  );
});
```

### Custom Hooks

```tsx
// ✅ Good: Extract logic into reusable hooks
function useUserManagement(initialUsers: User[] = []) {
  const [users, setUsers] = useState(initialUsers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addUser = useCallback(async (userData: CreateUserData) => {
    setLoading(true);
    setError(null);

    try {
      const newUser = await api.createUser(userData);
      setUsers((prev) => [...prev, newUser]);
      return newUser;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add user';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeUser = useCallback((userId: UserId) => {
    setUsers((prev) => prev.filter((user) => user.id !== userId));
  }, []);

  return {
    users,
    loading,
    error,
    addUser,
    removeUser,
  };
}
```

{{/examples}}

{{#patterns}}

### Component Patterns

#### Compound Components

```tsx
// ✅ Good: Flexible composition pattern
function Card({ children, className }: CardProps) {
  return <div className={`card ${className}`}>{children}</div>;
}

Card.Header = function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="card-header">{children}</div>;
};

Card.Body = function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="card-body">{children}</div>;
};

Card.Actions = function CardActions({ children }: { children: React.ReactNode }) {
  return <div className="card-actions">{children}</div>;
};

// Usage
<Card>
  <Card.Header>User Profile</Card.Header>
  <Card.Body>User details here</Card.Body>
  <Card.Actions>
    <Button>Edit</Button>
    <Button>Delete</Button>
  </Card.Actions>
</Card>;
```

#### Render Props / Children as Function

```tsx
// ✅ Good: Maximum flexibility for rendering
interface DataFetcherProps<T> {
  url: string;
  children: (data: T | null, loading: boolean, error: string | null) => React.ReactNode;
}

function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(url)
      .then((response) => response.json())
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [url]);

  return <>{children(data, loading, error)}</>;
}

// Usage
<DataFetcher<User[]> url="/api/users">
  {(users, loading, error) => {
    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage error={error} />;
    if (!users) return <EmptyState />;
    return <UserList users={users} />;
  }}
</DataFetcher>;
```

{{/patterns}}

{{#testing}}

### Testing Guidelines

```tsx
// ✅ Good: Test behavior, not implementation
describe('UserCard', () => {
  it('displays user information correctly', () => {
    const user = createMockUser({ name: 'John Doe', email: 'john@example.com' });

    render(<UserCard user={user} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const user = createMockUser();
    const onEdit = vi.fn();

    render(<UserCard user={user} onEdit={onEdit} />);

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(onEdit).toHaveBeenCalledWith(user);
  });

  it('hides actions when showActions is false', () => {
    const user = createMockUser();

    render(<UserCard user={user} showActions={false} />);

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });
});
```

{{/testing}}
