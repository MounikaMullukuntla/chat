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
- [ ] ✅ All existing tests pass
- [ ] ✅ New tests added
- [ ] ✅ Manual testing performed
- [ ] ✅ Tested with production-like data

### Test Coverage
<!-- Describe your testing approach -->


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
- [ ] 📖 Code follows project style guidelines (run `pnpm lint`)
- [ ] 🔍 Self-reviewed the code
- [ ] 💬 Commented complex/unclear code
- [ ] 📚 Updated relevant documentation (README, API docs, etc.)
- [ ] 🧪 Added/updated tests for new functionality
- [ ] 🔒 Verified RLS policies work correctly (if DB changes)
- [ ] ⚡ Added indexes for new foreign keys (if DB changes)
- [ ] 🏷️ Updated TypeScript types/interfaces
- [ ] ♿ Considered accessibility (if UI changes)
- [ ] 📱 Tested on mobile/responsive (if UI changes)
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
1. 
2. 

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
