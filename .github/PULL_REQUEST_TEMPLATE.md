# Pull Request

## Description
<!-- Provide a clear and concise description of what this PR does -->


## Type of Change
<!-- Check all that apply -->
- [ ] 🚀 Feature - New functionality
- [ ] 🐛 Bug fix - Fixes an issue
- [ ] 🗃️ Database migration - Schema changes
- [ ] 📝 Documentation - Updates to docs
- [ ] ⚡ Performance improvement
- [ ] 🎨 UI/UX - Visual or interaction changes
- [ ] ♻️ Refactor - Code restructuring without functional changes
- [ ] 🧪 Test - Adding or updating tests
- [ ] 🔧 Chore - Maintenance tasks

## Database Changes
<!-- Check one -->
- [ ] ✅ No database changes
- [ ] 📊 Schema changes - Migration file: `lib/db/migrations/XXXX_migration_name.sql`
- [ ] 🔄 Data migration required
- [ ] 🔒 RLS policy changes
- [ ] 📈 Index additions/modifications

### Migration Details (if applicable)
<!-- Describe the database changes -->
**Tables affected:**
- 

**Migration file:**
- `lib/db/migrations/XXXX_migration_name.sql`

**Backward compatible:**
- [ ] Yes
- [ ] No (breaking change - requires coordination)

**Rollback script included:**
- [ ] Yes
- [ ] No
- [ ] N/A

**Impact on existing data:**
<!-- Describe if any existing data needs transformation or if this is backward compatible -->


**Verification queries:**
<!-- SQL queries to verify the migration worked correctly -->
```sql

```

## Testing
<!-- Describe how you tested these changes -->
- [ ] ✅ Tested locally
- [ ] ✅ All existing tests pass (`pnpm test:all`)
- [ ] ✅ New unit tests added (for new features/functions)
- [ ] ✅ New integration tests added (for new API endpoints/flows)
- [ ] ✅ New E2E tests added (for new user journeys)
- [ ] ✅ Manual testing performed
- [ ] ✅ Tested with production-like data

### Test Coverage
<!-- Describe your testing approach -->
**Unit Tests:**
- Files:
- Coverage: %

**Integration Tests:**
- Files:
- Coverage: %

**E2E Tests:**
- Files:
- Scenarios tested:

**Test Commands Run:**
```bash
pnpm test:unit          # Unit tests
pnpm test:integration   # Integration tests
pnpm test:e2e          # E2E tests
pnpm test:coverage     # Coverage report
```

**Coverage Report:**
- Overall: %
- Lines: % (minimum: 80%)
- Functions: % (minimum: 80%)
- Branches: % (minimum: 75%)
- Statements: % (minimum: 80%)


## Screenshots/Videos (if UI changes)
<!-- Add screenshots or screen recordings to demonstrate the changes -->


## Breaking Changes
<!-- List any breaking changes and migration steps required -->
- [ ] ⚠️ This PR includes breaking changes

**If yes, describe:**


## Performance Impact
<!-- Describe any performance implications -->
- [ ] No performance impact expected
- [ ] Performance improvements expected
- [ ] Potential performance impact (explain below)

**Details:**


## Security Considerations
<!-- Any security implications of this change? -->
- [ ] No security impact
- [ ] Security improvement
- [ ] Requires security review

**Details:**


## Dependencies
<!-- List any new dependencies added or updated -->
**New dependencies:**
- 

**Updated dependencies:**
- 

## Checklist
<!-- Ensure all items are completed before requesting review -->

### Code Quality
- [ ] 📖 Code follows project style guidelines (`pnpm lint` passes)
- [ ] 🔍 Self-reviewed the code
- [ ] 💬 Commented complex/unclear code
- [ ] 🏷️ Updated TypeScript types/interfaces
- [ ] ♻️ No code duplication

### Testing Requirements ⚠️ MANDATORY
- [ ] 🧪 **All existing tests pass** (`pnpm test:all`)
- [ ] 📝 **New features have unit tests** (functions, utilities, components)
- [ ] 🔗 **New endpoints have integration tests** (API routes, database operations)
- [ ] 🎭 **New user flows have E2E tests** (Playwright)
- [ ] 📊 **Coverage thresholds met** (80% lines, 80% functions, 75% branches)
- [ ] 🐛 **Bug fixes include regression tests**
- [ ] ⏱️ **No commented-out or skipped tests** (unless justified in PR description)

### Documentation
- [ ] 📚 Updated relevant documentation (README, docs/, etc.)
- [ ] 📖 Updated test documentation if adding new test patterns
- [ ] 💡 Added JSDoc comments for exported functions
- [ ] 📝 Updated CHANGELOG.md (if applicable)

### Database (if applicable)
- [ ] 🔒 Verified RLS policies work correctly
- [ ] ⚡ Added indexes for new foreign keys
- [ ] 🧪 Database queries have unit tests
- [ ] 🔄 Migration tested on local Supabase

### UI/UX (if applicable)
- [ ] ♿ Considered accessibility (ARIA labels, keyboard navigation)
- [ ] 📱 Tested on mobile/responsive breakpoints
- [ ] 🎨 Follows existing design patterns
- [ ] 🌐 No hardcoded strings (using i18n if applicable)

## Related Issues
<!-- Link related issues/tickets -->
Closes #
Related to #

## Additional Context
<!-- Add any other context, notes, or concerns about the PR -->


## Deployment Notes
<!-- Special instructions for deployment -->
- [ ] Requires environment variable changes
- [ ] Requires manual migration by Super Admin
- [ ] Requires coordination with other PRs
- [ ] Should be deployed during low-traffic hours

**Special instructions:**


---

## For Reviewers
<!-- Help reviewers understand what to focus on -->
**Focus areas:**
1.
2.

**Testing instructions:**
1. Clone and checkout this branch
2. Run `pnpm install`
3. Run `pnpm test:all` to verify all tests pass
4. Run `pnpm test:coverage` to check coverage report
5. Review test files for quality and completeness

**Test Review Checklist:**
- [ ] Tests are well-organized and follow project patterns
- [ ] Test names clearly describe what they test
- [ ] Tests are independent (no shared state)
- [ ] Tests cover edge cases and error scenarios
- [ ] Mocks are used appropriately for external dependencies
- [ ] Integration tests verify actual behavior (minimal mocking)
- [ ] E2E tests cover critical user paths
- [ ] No flaky or brittle tests 

---

## Super Admin Checklist (for DB migrations)
<!-- Only for PRs with database changes - Super Admin fills this out -->
- [ ] Reviewed migration script syntax
- [ ] Verified backward compatibility
- [ ] Tested on staging/local Supabase
- [ ] Verified rollback script works
- [ ] No data loss risk
- [ ] Performance impact assessed (indexes added?)
- [ ] RLS policies correct and secure
- [ ] Ready to apply to production
