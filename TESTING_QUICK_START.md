# Testing Quick Start Guide

Get started with testing in 5 minutes!

## Prerequisites

The testing infrastructure is already set up. Just ensure you have:
- Node.js 18+
- pnpm installed
- Dependencies installed (`pnpm install`)

## Running Your First Test

### 1. Run the Example Unit Test

```bash
cd chat
pnpm test:unit
```

You should see:
```
✓ codechat-tests tests/unit/lib/utils/example.test.ts (4 tests) 3ms

Test Files  1 passed (1)
Tests  4 passed (4)
```

### 2. Run Tests in Watch Mode

```bash
pnpm test:watch
```

This opens an interactive mode where tests re-run automatically when files change.

### 3. Open the Test UI

```bash
pnpm test:ui
```

This opens a web interface at `http://localhost:51204` with:
- Visual test explorer
- Coverage visualization
- Test debugging tools

### 4. Run E2E Tests

```bash
# Start your dev server first
pnpm dev

# In another terminal:
pnpm test:e2e
```

## Writing Your First Test

### Unit Test Example

Create `tests/unit/lib/utils/my-function.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

export function add(a: number, b: number): number {
  return a + b;
}

describe('add function', () => {
  it('should add two numbers correctly', () => {
    expect(add(2, 3)).toBe(5);
  });

  it('should handle negative numbers', () => {
    expect(add(-1, 1)).toBe(0);
  });

  it('should handle zero', () => {
    expect(add(0, 0)).toBe(0);
  });
});
```

Run it:
```bash
pnpm test:unit tests/unit/lib/utils/my-function.test.ts
```

### Component Test Example

Create `tests/unit/components/button.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/tests/helpers/test-utils';
import { userEvent } from '@testing-library/user-event';

// Example button component
function Button({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick}>{children}</button>;
}

describe('Button', () => {
  it('should render with text', () => {
    render(<Button onClick={() => {}}>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button');
    await userEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### E2E Test Example

Create `tests/e2e/chat/simple-chat.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Simple Chat Flow', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/CodeChat/i);
  });

  test('should navigate to settings', async ({ page }) => {
    await page.goto('/');
    await page.click('[href="/settings"]');
    await expect(page).toHaveURL('/settings');
  });
});
```

Run it:
```bash
pnpm test:e2e tests/e2e/chat/simple-chat.spec.ts
```

## Common Commands

```bash
# Unit Tests
pnpm test:unit                    # Run all unit tests
pnpm test:unit --watch            # Watch mode
pnpm test:ui                      # Interactive UI

# Integration Tests
pnpm test:integration             # Run integration tests

# E2E Tests
pnpm test:e2e                     # Run all E2E tests
pnpm test:e2e:headed              # With browser visible
pnpm test:e2e:ui                  # Interactive mode
pnpm test:e2e:debug               # Debug mode

# Coverage
pnpm test:coverage                # Generate coverage report
# Open: coverage/index.html

# All Tests
pnpm test:all                     # Run everything
```

## Test Structure

```
tests/
├── unit/           # Fast, isolated tests
├── integration/    # Multi-component tests
├── e2e/           # Full user journey tests
├── helpers/       # Test utilities
├── fixtures/      # Test data
└── mocks/         # Mock implementations
```

## Debugging Tests

### Vitest

1. Add `debugger` statement in your test
2. Run with Node inspector:
```bash
node --inspect-brk ./node_modules/vitest/vitest.mjs run
```

### Playwright

1. Use debug mode:
```bash
pnpm test:e2e:debug
```

2. Or use the Playwright Inspector:
```typescript
await page.pause(); // Pauses execution
```

## Best Practices

### ✅ DO
- Write tests before or alongside code (TDD)
- Test behavior, not implementation
- Use descriptive test names
- Keep tests independent
- Mock external dependencies
- Clean up after tests

### ❌ DON'T
- Test third-party libraries
- Hardcode test data
- Share state between tests
- Skip cleanup
- Commit commented-out tests
- Test implementation details

## Getting Help

- **Test Documentation**: See `tests/README.md`
- **Full Testing Guide**: See `docs/testing.md`
- **Test Structure**: See `docs/comprehensive-testing-structure.md`
- **Setup Summary**: See `TESTING_SETUP_SUMMARY.md`

## Next Steps

1. ✅ You're ready to write tests!
2. Start with unit tests for utilities
3. Add component tests for UI
4. Write integration tests for API routes
5. Create E2E tests for user flows

Happy testing! 🚀
