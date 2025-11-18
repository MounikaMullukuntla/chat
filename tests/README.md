# Testing Documentation

This directory contains all tests for the CodeChat application, organized according to the test pyramid architecture.

## Directory Structure

```
tests/
├── unit/                    # Unit tests (50% of tests)
│   ├── lib/                # Library/utility tests
│   │   ├── ai/            # AI agent tests
│   │   ├── db/            # Database query tests
│   │   ├── verification/  # Verification service tests
│   │   ├── storage/       # Storage manager tests
│   │   ├── github/        # GitHub integration tests
│   │   └── utils/         # Utility function tests
│   └── components/         # React component tests
│       ├── chat/          # Chat interface components
│       ├── github/        # GitHub UI components
│       ├── settings/      # Settings components
│       ├── admin/         # Admin panel components
│       ├── model/         # Model selector components
│       └── common/        # Common UI components
├── integration/            # Integration tests (30% of tests)
│   ├── api/               # API endpoint tests
│   ├── flows/             # Multi-component flow tests
│   ├── database/          # Database integration tests
│   └── agents/            # Agent collaboration tests
├── e2e/                    # End-to-end tests (20% of tests)
│   ├── chat/              # Chat session flows
│   ├── documents/         # Document lifecycle
│   ├── files/             # File upload flows
│   ├── github/            # GitHub integration flows
│   ├── settings/          # Settings page flows
│   ├── admin/             # Admin panel flows
│   ├── python/            # Python execution flows
│   ├── mermaid/           # Mermaid diagram flows
│   ├── history/           # Chat history flows
│   └── complete-flows/    # Complete user journeys
├── helpers/                # Test helper utilities
│   ├── test-utils.tsx     # React testing utilities
│   └── db-helpers.ts      # Database testing helpers
├── fixtures/               # Test data fixtures
│   ├── users.ts           # User test data
│   ├── chats.ts           # Chat test data
│   └── admin-config.ts    # Admin config test data
├── mocks/                  # Mock implementations
│   ├── supabase.ts        # Supabase client mocks
│   └── ai-providers.ts    # AI provider mocks
├── setup.ts                # Global test setup
└── README.md               # This file
```

## Running Tests

### All Tests
```bash
pnpm test              # Run all unit and integration tests
pnpm test:all          # Run all tests including E2E
```

### Unit Tests
```bash
pnpm test:unit         # Run all unit tests
pnpm test:watch        # Run tests in watch mode
pnpm test:ui           # Run tests with Vitest UI
```

### Integration Tests
```bash
pnpm test:integration  # Run all integration tests
```

### E2E Tests
```bash
pnpm test:e2e          # Run E2E tests in headless mode
pnpm test:e2e:ui       # Run E2E tests with Playwright UI
pnpm test:e2e:headed   # Run E2E tests in headed mode
pnpm test:e2e:debug    # Run E2E tests in debug mode
```

### Coverage
```bash
pnpm test:coverage     # Generate coverage report
```

## Test Coverage Goals

- **Unit Tests**: 80%+ code coverage
- **Integration Tests**: 90%+ endpoint coverage
- **E2E Tests**: 100% critical user journey coverage
- **Overall**: Minimum 80% coverage across all metrics

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/lib/utils/my-function';

describe('myFunction', () => {
  it('should return expected output for valid input', () => {
    const result = myFunction('test input');
    expect(result).toBe('expected output');
  });

  it('should handle edge cases', () => {
    expect(myFunction('')).toBe('');
    expect(myFunction(null)).toBe(null);
  });

  it('should throw error for invalid input', () => {
    expect(() => myFunction(undefined)).toThrow('Invalid input');
  });
});
```

### Component Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/tests/helpers/test-utils';
import { MyComponent } from '@/components/my-component';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const onClickMock = vi.fn();
    render(<MyComponent onClick={onClickMock} />);

    const button = screen.getByRole('button');
    await userEvent.click(button);

    expect(onClickMock).toHaveBeenCalledTimes(1);
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test.describe('Chat Flow', () => {
  test('should complete a basic chat interaction', async ({ page }) => {
    await page.goto('/');

    // Enter API key
    await page.fill('[data-testid="api-key-input"]', 'test-key');

    // Type message
    await page.fill('[data-testid="message-input"]', 'Hello AI');
    await page.click('[data-testid="send-button"]');

    // Wait for response
    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible();
  });
});
```

## Test Guidelines

### Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **AAA Pattern**: Arrange, Act, Assert
3. **Descriptive Names**: Test names should clearly describe what they test
4. **Edge Cases**: Always test edge cases and error scenarios
5. **Mocking**: Mock external dependencies (API calls, database, etc.)
6. **Cleanup**: Clean up test data after each test

### What to Test

#### Unit Tests (lib, components)
- Individual function logic
- Component rendering
- Props handling
- Event handlers
- Edge cases and error conditions

#### Integration Tests (API, flows)
- API endpoint responses
- Database operations
- Agent interactions
- Multi-component workflows
- Data flow between modules

#### E2E Tests (user journeys)
- Complete user workflows
- Critical business paths
- Multi-step interactions
- Error recovery flows
- Performance benchmarks

### What NOT to Test

- Third-party library internals
- Framework-specific behavior
- Implementation details
- Trivial getters/setters

## CI/CD Pipeline

Tests run automatically on:
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`

### Pipeline Stages

1. **Linting & Type Check**: ESLint and TypeScript validation
2. **Unit Tests**: Fast, isolated tests
3. **Integration Tests**: API and database tests
4. **E2E Tests**: Full user journey tests
5. **Coverage Report**: Generate and upload coverage

All stages must pass for PR to be mergeable.

## Debugging Tests

### Vitest
```bash
# Run specific test file
pnpm test tests/unit/lib/utils/my-test.test.ts

# Run tests matching pattern
pnpm test -t "myFunction"

# Update snapshots
pnpm test -u
```

### Playwright
```bash
# Debug specific test
pnpm test:e2e:debug tests/e2e/chat/chat-session.spec.ts

# Show test report
npx playwright show-report

# View trace
npx playwright show-trace trace.zip
```

## Troubleshooting

### Common Issues

**Tests timing out**
- Increase timeout in vitest.config.ts or test file
- Check for unresolved promises
- Verify mock implementations

**Database connection errors**
- Ensure Supabase is running locally
- Check environment variables
- Verify database migrations

**Flaky E2E tests**
- Add proper wait conditions
- Use `waitFor` instead of fixed delays
- Ensure test data isolation

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Project Testing Strategy](../docs/testing.md)
- [Comprehensive Testing Structure](../docs/comprehensive-testing-structure.md)

## Contributing

When adding new features:
1. Write tests BEFORE or alongside implementation (TDD)
2. Ensure all tests pass locally
3. Maintain or improve coverage
4. Follow existing test patterns
5. Update this README if adding new test categories

For questions or issues, refer to the main [Testing Documentation](../docs/testing.md).
