# Project Management Strategy - Multi-Developer Setup

## Overview

This document outlines the development workflow, database management, and deployment strategy for a multi-developer team working on this project.

---

## Team Structure

### **Roles**
1. **Super Admin (You)** - 1 person
   - Access to production Supabase database
   - Access to Vercel production environment
   - Manages production deployments
   - Approves and applies schema migrations

2. **Admin/Developers** - ~10 people
   - Clone repository and work locally
   - Create their own Supabase projects for development
   - Submit PRs for review
   - Can create migration scripts (reviewed by Super Admin)

---

## Development Workflow

### **Phase 1: Initial Setup (Each Developer)**

#### **Step 1: Clone Repository**
```bash
git clone <repo-url>
cd code-chatbot
pnpm install
```

#### **Step 2: Create Personal Supabase Project**
1. Go to https://supabase.com
2. Create a new project (free tier is sufficient)
3. Note down:
   - Project URL
   - Anon Key
   - Service Role Key
   - Database Password

#### **Step 3: Setup Local Environment**
Create `.env.local` file:
```env
# Supabase (Your personal dev instance)
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-KEY]

# Database connection for Drizzle
POSTGRES_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

#### **Step 4: Run Initial Migrations**
```bash
# Apply all migrations to your local Supabase
pnpm db:migrate

# Or manually run SQL files in Supabase SQL Editor
```

#### **Step 5: Create Your First Admin User**
1. Sign up via your local app at `http://localhost:3000/register`
2. Go to Supabase Dashboard → Authentication → Users
3. Find your user, click "Edit User"
4. Update `raw_user_meta_data`:
```json
{
  "role": "admin",
  "isActive": true
}
```
5. Save and verify admin access at `http://localhost:3000/admin`

#### **Step 6: Start Development**
```bash
pnpm dev
```

---

## Database Schema Management Strategy

### **Migration Files Structure**

```
lib/db/migrations/
├── 0001_initial_schema.sql           # Existing tables (Chat, Message, Document, etc.)
├── 0002_supabase_migration.sql       # Drop User table, add FKs to auth.users
├── 0003_add_new_tables.sql           # Add admin_config, usage_logs, etc.
├── 0004_add_rls_policies.sql         # RLS policies and helper functions
├── 0005_add_indexes.sql              # Performance indexes
├── 0006_seed_admin_config.sql        # Default configurations
└── README.md                         # Migration instructions
```

### **Migration Workflow**

#### **When Developer Makes Schema Changes**

1. **Create Migration File Locally**
   ```bash
   # Developer creates new migration file
   # lib/db/migrations/0007_add_feature_X.sql
   ```

2. **Write Migration Script**
   ```sql
   -- Migration: Add feature X
   -- Author: Developer Name
   -- Date: 2025-01-31
   
   -- Forward migration
   ALTER TABLE chat ADD COLUMN IF NOT EXISTS new_field TEXT;
   
   -- Create index
   CREATE INDEX IF NOT EXISTS idx_chat_new_field ON chat(new_field);
   
   -- Update RLS policies if needed
   CREATE POLICY "policy_name" ON chat FOR SELECT USING (...);
   ```

3. **Test Migration Locally**
   ```bash
   # Apply to your local Supabase
   pnpm db:migrate
   
   # Or manually in Supabase SQL Editor
   # Test the application to ensure it works
   ```

4. **Update Drizzle Schema** (if using Drizzle ORM)
   ```typescript
   // lib/db/drizzle-schema.ts
   export const chat = pgTable("chat", {
     // ... existing fields
     newField: text("new_field"), // Add new field
   });
   ```

5. **Create Rollback Script** (optional but recommended)
   ```sql
   -- Rollback: Remove feature X
   ALTER TABLE chat DROP COLUMN IF EXISTS new_field;
   DROP INDEX IF EXISTS idx_chat_new_field;
   DROP POLICY IF EXISTS "policy_name" ON chat;
   ```

6. **Commit and Push**
   ```bash
   git add lib/db/migrations/0007_add_feature_X.sql
   git add lib/db/schema.ts
   git commit -m "feat: add new_field to chat table"
   git push origin feature/add-new-field
   ```

7. **Create Pull Request**
   - Title: `feat: Add new_field to chat table`
   - Description:
     - What changed
     - Migration file: `0007_add_feature_X.sql`
     - Testing done locally
     - Impact on existing data

---

### **Super Admin Review & Deployment Process**

#### **Step 1: Review PR**
Super Admin reviews:
- ✅ Migration script syntax
- ✅ Backward compatibility
- ✅ Performance impact (indexes added?)
- ✅ RLS policies updated correctly
- ✅ No data loss
- ✅ Tests pass

#### **Step 2: Merge PR**
```bash
# Merge to main/prod branch
git merge feature/add-new-field
```

#### **Step 3: Apply Migration to Production**

**Option A: Manual Application (Recommended for critical changes)**
1. Go to Supabase Dashboard (Production project)
2. Navigate to SQL Editor
3. Open migration file `0007_add_feature_X.sql`
4. Review one more time
5. Execute SQL
6. Verify changes in Database → Tables

**Option B: Automated via CI/CD (Advanced)**
```yaml
# .github/workflows/migrate-production.yml
name: Migrate Production Database

on:
  push:
    branches: [main]
    paths:
      - 'lib/db/migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        
      - name: Install dependencies
        run: pnpm install
        
      - name: Run migrations
        env:
          POSTGRES_URL: ${{ secrets.PROD_POSTGRES_URL }}
        run: pnpm db:migrate
```

**Option C: Migration CLI Tool**
```bash
# Create a migration runner script
# scripts/migrate-prod.ts

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const runMigrations = async () => {
  const connectionString = process.env.PROD_POSTGRES_URL;
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);
  
  console.log('Running migrations on PRODUCTION...');
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  console.log('Migrations complete!');
  
  await sql.end();
};

runMigrations();
```

```bash
# Super Admin runs:
PROD_POSTGRES_URL="postgresql://..." pnpm tsx scripts/migrate-prod.ts
```

#### **Step 4: Deploy to Vercel**
```bash
# Vercel auto-deploys on main branch push
# Or manually trigger:
vercel --prod
```

#### **Step 5: Verify Production**
1. Check application at production URL
2. Verify new features work
3. Check Supabase Dashboard for schema changes
4. Monitor logs for errors

---

## Environment Management

### **Three Environments**

#### **1. Local Development (Each Developer)**
- Personal Supabase project (free tier)
- `.env.local` with personal credentials
- Full admin access to own Supabase
- Can break things without affecting others

#### **2. Staging (Optional but Recommended)**
- Shared Supabase project for testing
- Managed by Super Admin
- Environment variables in Vercel staging
- Used for integration testing before production

#### **3. Production**
- Main Supabase project (managed by Super Admin)
- Environment variables in Vercel production
- Only Super Admin has direct database access
- Migrations applied by Super Admin only

---

## Vercel Environment Variables Setup

### **Production Environment Variables**
Set in Vercel Dashboard → Settings → Environment Variables

```env
# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://[PROD-PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[PROD-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[PROD-SERVICE-KEY]

# Database
POSTGRES_URL=postgresql://postgres:[PROD-PASSWORD]@db.[PROD-PROJECT].supabase.co:5432/postgres

# App
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

### **Staging Environment Variables** (if used)
```env
# Same structure but different credentials
NEXT_PUBLIC_SUPABASE_URL=https://[STAGING-PROJECT].supabase.co
# ... etc
```

---

## Git Workflow

### **Branch Strategy**

```
main (production)
├── develop (integration branch)
├── feature/add-admin-page
├── feature/usage-analytics
├── feature/api-key-management
└── hotfix/critical-bug
```

### **Branch Naming Convention**
- `feature/description` - New features
- `fix/description` - Bug fixes
- `hotfix/description` - Critical production fixes
- `chore/description` - Maintenance tasks
- `docs/description` - Documentation updates
- `migration/description` - Database schema changes

### **Commit Message Convention**
```
type(scope): subject

feat(admin): add routing agent configuration page
fix(chat): resolve message ordering issue
migration(db): add usage_logs table
docs(readme): update setup instructions
```

### **Pull Request Template**

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Feature
- [ ] Bug fix
- [ ] Database migration
- [ ] Documentation
- [ ] Performance improvement

## Database Changes
- [ ] No database changes
- [ ] Schema changes (migration file: `XXXX_migration_name.sql`)
- [ ] Data migration required

## Testing
- [ ] Tested locally
- [ ] All existing tests pass
- [ ] New tests added (if applicable)

## Screenshots (if UI changes)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed the code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No breaking changes (or documented)
```

---

## Migration Script Template

### **Standard Migration File**

```sql
-- =====================================================
-- Migration: [Brief description]
-- Author: [Your name]
-- Date: [YYYY-MM-DD]
-- Ticket: [Issue/ticket number if applicable]
-- =====================================================

-- Description:
-- [Detailed description of what this migration does]
-- [Why it's needed]
-- [Impact on existing data]

-- =====================================================
-- FORWARD MIGRATION
-- =====================================================

BEGIN;

-- 1. Create new tables (if any)
CREATE TABLE IF NOT EXISTS new_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Alter existing tables (if any)
ALTER TABLE existing_table 
  ADD COLUMN IF NOT EXISTS new_column TEXT;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_new_table_user 
  ON new_table(user_id, created_at DESC);

-- 4. Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
CREATE POLICY "Users can read own records" ON new_table
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records" ON new_table
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Data migration (if needed)
-- UPDATE existing_table SET new_column = 'default_value' WHERE new_column IS NULL;

COMMIT;

-- =====================================================
-- ROLLBACK SCRIPT (Keep commented, for reference)
-- =====================================================

-- BEGIN;
-- DROP POLICY IF EXISTS "Users can insert own records" ON new_table;
-- DROP POLICY IF EXISTS "Users can read own records" ON new_table;
-- DROP INDEX IF EXISTS idx_new_table_user;
-- ALTER TABLE existing_table DROP COLUMN IF EXISTS new_column;
-- DROP TABLE IF EXISTS new_table;
-- COMMIT;

-- =====================================================
-- VERIFICATION QUERIES (Run after migration)
-- =====================================================

-- Check table exists
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'new_table';

-- Check columns
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'new_table';

-- Check indexes
-- SELECT indexname FROM pg_indexes WHERE tablename = 'new_table';

-- Check RLS policies
-- SELECT policyname FROM pg_policies WHERE tablename = 'new_table';
```

---

## Database Backup Strategy

### **Before Major Migrations**

#### **Super Admin Responsibility**

1. **Backup Production Database**
   ```bash
   # In Supabase Dashboard → Database → Backups → Create backup
   # Or via CLI:
   supabase db dump -f backup_$(date +%Y%m%d).sql
   ```

2. **Test Migration on Staging**
   - Apply migration to staging environment
   - Test thoroughly
   - Verify no data loss

3. **Apply to Production**
   - During low-traffic hours
   - Monitor application logs
   - Have rollback script ready

4. **Post-Migration Verification**
   - Run verification queries
   - Check application functionality
   - Monitor error logs for 24 hours

---

## Communication & Coordination

### **Tools Recommended**

1. **GitHub Issues/Projects**
   - Track features and bugs
   - Assign schema changes to Super Admin for review
   - Label migrations with `migration` tag

2. **Slack/Discord Channel**
   - `#dev-general` - General development discussion
   - `#migrations` - Database schema discussions
   - `#deployments` - Deployment notifications

3. **Documentation**
   - Keep README.md updated
   - Document each migration in detail
   - Maintain CHANGELOG.md

### **Migration Coordination Process**

1. **Developer Creates Migration**
   - Posts in `#migrations` channel
   - Creates GitHub issue with `migration` label
   - Explains changes and impact

2. **Team Discussion**
   - Other developers review
   - Suggest improvements
   - Point out potential issues

3. **Super Admin Review**
   - Reviews migration script
   - Tests on staging
   - Approves or requests changes

4. **Scheduled Deployment**
   - Announce deployment window
   - Apply migration during window
   - Post confirmation after success

---

## Best Practices

### **For Developers**

✅ **DO:**
- Always test migrations locally first
- Write rollback scripts
- Use `IF NOT EXISTS` and `IF EXISTS` clauses
- Add comments to migration files
- Keep migrations small and focused
- Use transactions (BEGIN/COMMIT)
- Document breaking changes clearly

❌ **DON'T:**
- Make direct changes to production database
- Delete data without backup
- Skip testing locally
- Make multiple unrelated changes in one migration
- Forget to update RLS policies
- Ignore index creation for new foreign keys

### **For Super Admin**

✅ **DO:**
- Review all migrations before production
- Keep database backups
- Test on staging first
- Monitor application after deployments
- Document all production changes
- Communicate deployment schedules

❌ **DON'T:**
- Apply untested migrations to production
- Skip backups
- Make manual database changes without migration files
- Deploy during high-traffic hours
- Rush migrations

---

## Troubleshooting

### **Common Issues**

#### **Issue 1: Developer Can't Apply Migration Locally**
**Solution:**
```bash
# Reset local Supabase (⚠️ destroys local data)
supabase db reset

# Or manually drop and recreate tables
# Then reapply all migrations from scratch
```

#### **Issue 2: Migration Fails on Production**
**Solution:**
```bash
# Super Admin: Rollback immediately
# Run the rollback script from migration file
# Investigate issue in staging
# Fix and reapply
```

#### **Issue 3: Schema Drift Between Environments**
**Solution:**
```bash
# Super Admin: Export production schema
pg_dump --schema-only $PROD_POSTGRES_URL > prod_schema.sql

# Compare with local
diff prod_schema.sql local_schema.sql

# Create migration to sync
```

#### **Issue 4: RLS Policy Blocking Access**
**Solution:**
```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Test with RLS disabled (temporarily)
ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;

-- Fix policy and re-enable
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

---

## Migration Checklist for Super Admin

### **Pre-Migration**
- [ ] Review migration script thoroughly
- [ ] Backup production database
- [ ] Test on staging environment
- [ ] Announce deployment window to team
- [ ] Verify rollback script is ready

### **During Migration**
- [ ] Put application in maintenance mode (if needed)
- [ ] Apply migration to production
- [ ] Run verification queries
- [ ] Check application logs for errors

### **Post-Migration**
- [ ] Verify application functionality
- [ ] Monitor error rates
- [ ] Confirm with team that features work
- [ ] Update documentation
- [ ] Archive backup (keep for 30 days)

---

## Summary

### **Key Points**

1. **Each developer has their own Supabase** for local development
2. **Migrations are version-controlled** in Git
3. **Super Admin applies migrations** to production
4. **All changes go through PR review**
5. **Always test locally first**
6. **Always have rollback scripts**
7. **Communication is key** - discuss breaking changes

### **Workflow in One Sentence**
Developer creates migration → Tests locally → Creates PR → Super Admin reviews → Merges to main → Super Admin applies to production → Vercel deploys application.

---

## Quick Start Commands

### **For New Developers**
```bash
# 1. Clone and setup
git clone <repo>
pnpm install

# 2. Create .env.local with your Supabase credentials

# 3. Run migrations
pnpm db:migrate

# 4. Start development
pnpm dev

# 5. Create your admin user via Supabase Dashboard
```

### **For Creating Migrations**
```bash
# 1. Create migration file
touch lib/db/migrations/$(date +%Y%m%d)_description.sql

# 2. Write SQL migration

# 3. Test locally
pnpm db:migrate

# 4. Commit and push
git add lib/db/migrations/
git commit -m "migration: description"
git push origin feature/migration-description

# 5. Create PR
```

### **For Super Admin Deploying**
```bash
# 1. Merge PR
git merge feature/migration-description

# 2. Apply to production (via Supabase Dashboard SQL Editor)

# 3. Deploy to Vercel
vercel --prod

# 4. Monitor and verify
```
