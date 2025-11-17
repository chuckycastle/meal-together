# Testing Guide

This guide explains how to run and write tests for the MealTogether frontend application.

## Test Setup

The application uses:
- **Vitest** - Fast unit test framework
- **React Testing Library** - React component testing utilities
- **jsdom** - Browser environment simulation
- **@vitest/ui** - Visual test UI

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Writing Tests

### Component Tests

Component tests are located next to the component files with a `.test.tsx` extension.

**Example: Testing a simple component**

```typescript
import { describe, it, expect } from 'vitest';
import { simpleRender, screen } from '../../../test/utils';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    simpleRender(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

###Hook Tests

**Example: Testing a React Query hook**

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRecipes } from './useRecipes';

describe('useRecipes', () => {
  it('fetches recipes', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useRecipes(1), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```

## Test Utilities

### Custom Render Functions

Located in `test/utils.tsx`:

- **`render()`** - Renders component with all providers (Auth, Family, WebSocket, React Query)
- **`simpleRender()`** - Renders component without providers (for isolated testing)

### Mock Data

Mock data fixtures are available in `test/mocks/data.ts`:

```typescript
import { mockUser, mockFamily, mockRecipe } from '../../../test/mocks/data';
```

### Mock Services

API and WebSocket mocks are in `test/mocks/`:

- `api.ts` - Mock API client methods
- `websocket.ts` - Mock WebSocket service

## Test Coverage

Current coverage thresholds:
- **Lines**: 15%
- **Functions**: 5%
- **Branches**: 15%
- **Statements**: 15%

**Goal**: Increase to 80% across all metrics as more tests are added.

### Viewing Coverage Reports

After running `npm run test:coverage`, open:
```
coverage/index.html
```

## Best Practices

### 1. Test Behavior, Not Implementation

✅ **Good**: Test what the user sees
```typescript
it('shows error message when form is invalid', async () => {
  render(<LoginForm />);
  await user.click(screen.getByRole('button', { name: /log in/i }));
  expect(screen.getByText(/email is required/i)).toBeInTheDocument();
});
```

❌ **Bad**: Test internal state
```typescript
it('sets error state to true', () => {
  // Don't test internal component state
});
```

### 2. Use Accessibility Queries

Prefer queries that match how users interact:

```typescript
// ✅ Good - accessible queries
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText(/email/i)
screen.getByText(/welcome/i)

// ❌ Avoid - implementation details
screen.getByTestId('submit-button')
screen.getByClassName('btn-primary')
```

### 3. Test User Interactions

```typescript
it('submits form when button clicked', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();

  render(<MyForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(onSubmit).toHaveBeenCalledWith({ email: 'test@example.com' });
});
```

### 4. Wait for Async Updates

```typescript
it('shows data after loading', async () => {
  render(<DataComponent />);

  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText(/data loaded/i)).toBeInTheDocument();
  });
});
```

### 5. Clean Up After Tests

Cleanup happens automatically via `test/setup.ts`, but for manual cleanup:

```typescript
afterEach(() => {
  vi.clearAllMocks();
});
```

## Common Testing Patterns

### Testing Forms

```typescript
it('validates required fields', async () => {
  const user = userEvent.setup();
  render(<MyForm />);

  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(screen.getByText(/field is required/i)).toBeInTheDocument();
});
```

### Testing Loading States

```typescript
it('shows loading spinner', () => {
  render(<MyComponent isLoading={true} />);
  expect(screen.getByRole('status')).toBeInTheDocument();
});
```

### Testing Error States

```typescript
it('displays error message', () => {
  render(<MyComponent error="Something went wrong" />);
  expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
});
```

### Testing Conditional Rendering

```typescript
it('shows content when authenticated', () => {
  render(<ProtectedContent isAuthenticated={true} />);
  expect(screen.getByText(/protected content/i)).toBeInTheDocument();
});

it('hides content when not authenticated', () => {
  render(<ProtectedContent isAuthenticated={false} />);
  expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument();
});
```

## Debugging Tests

### 1. Print Component Output

```typescript
import { screen, debug } from '@testing-library/react';

it('test case', () => {
  render(<MyComponent />);
  screen.debug(); // Prints current DOM
});
```

### 2. Use Vitest UI

```bash
npm run test:ui
```

Opens interactive UI at `http://localhost:51204/__vitest__/`

### 3. Run Single Test File

```bash
npm test -- LoadingSpinner.test.tsx
```

### 4. Run Tests Matching Pattern

```bash
npm test -- -t "renders correctly"
```

## File Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── ui/
│   │       ├── LoadingSpinner.tsx
│   │       └── LoadingSpinner.test.tsx
│   ├── hooks/
│   │   ├── useRecipes.ts
│   │   └── useRecipes.test.ts
│   └── pages/
│       ├── LoginPage.tsx
│       └── LoginPage.test.tsx
├── test/
│   ├── setup.ts           # Test setup
│   ├── utils.tsx          # Test utilities
│   └── mocks/
│       ├── data.ts        # Mock data fixtures
│       ├── api.ts         # Mock API client
│       └── websocket.ts   # Mock WebSocket
├── vitest.config.ts       # Vitest configuration
└── coverage/              # Coverage reports (generated)
```

## Continuous Integration

Tests run automatically on every push via GitHub Actions:

```yaml
- name: Run tests
  run: npm test -- --run

- name: Generate coverage
  run: npm run test:coverage
```

## Next Steps

1. Add tests for all UI components
2. Add tests for all custom hooks
3. Add integration tests for user flows
4. Increase coverage thresholds progressively
5. Add E2E tests with Playwright (future)

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Cheatsheet](https://testing-library.com/docs/react-testing-library/cheatsheet)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
