# AI Code Chatbot with Admin Dashboard

A powerful, production-ready AI chatbot application with comprehensive admin controls, usage analytics, and multi-agent architecture. Built for teams to manage and deploy conversational AI with GitHub repository integration.

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 15 (App Router, React Server Components) |
| **AI/LLM** | Google Gemini API (direct client-side calls) |
| **Database** | Supabase Postgres with Drizzle ORM |
| **Authentication** | Supabase Auth with RBAC |
| **File Storage** | Supabase Storage |
| **UI** | shadcn/ui, Tailwind CSS, Radix UI |
| **Deployment** | Vercel |
| **Language** | TypeScript |

---

## Features

### For Users
- 🤖 Multi-modal AI chat with Google Gemini models
- 📄 Artifact generation (documents, code, diagrams)
- 🔗 GitHub repository integration via Git MCP
- 🧠 Extended thinking mode for complex reasoning
- 💾 Browser-based API key storage (localStorage)
- 📊 Personal usage analytics

### For Admins
- ⚙️ **Admin Dashboard** - Configure routing, chat, document, Python code, Mermaid, and Git MCP agents
- 📈 **Usage Analytics** - Track API calls, tokens, and costs across all users
- 👥 **User Management** - RBAC with Supabase Auth
- 🔧 **Rate Limiting** - Per-agent rate limits (hourly/daily)
- 🎨 **System Prompts** - Customize AI behavior for each specialized agent

---

## Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- Supabase account (free tier works)
- Google AI API key (for Gemini models)
- GitHub Personal Access Token (for Git MCP integration)

### Quick Setup

#### 1. Clone Repository
```bash
git clone <repo-url>
cd code-chatbot
pnpm install
# or
npm install
```

#### 2. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project credentials:
   - Project URL
   - Anon Key (public)
   - Service Role Key (secret)
   - Database Password

#### 3. Configure Authentication

**Email Provider:**
In Supabase Dashboard:
- Navigate to **Authentication** → **Providers**
- Enable **Email** provider
- Configure **Site URL**: `http://localhost:3000` (development)
- Add **Redirect URLs**: `http://localhost:3000/**`

**GitHub OAuth (Optional):**
1. Create GitHub OAuth App: [github.com/settings/developers](https://github.com/settings/developers)
   - Click **New OAuth App**
   - **Application name**: Your app name
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `https://[YOUR-PROJECT].supabase.co/auth/v1/callback`
2. Copy **Client ID** and **Client Secret**
3. In Supabase Dashboard → **Authentication** → **Providers** → **GitHub**:
   - Enable GitHub provider
   - Paste Client ID and Client Secret
   - Save

#### 4. Setup Environment Variables
Create `.env.local` in project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-KEY]
POSTGRES_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

#### 5. Run Database Migrations
Apply the database schema to your Supabase project:

```bash
pnpm db:migrate
# or
npm run db:migrate
```

This creates all necessary tables, indexes, RLS policies, and seed data. See [DATABASE_ER_DIAGRAM.md](./DATABASE_ER_DIAGRAM.md) for complete schema details.

#### 6. Create Your Admin User
1. Start the dev server:
```bash
pnpm dev
# or
npm run dev
```
2. Register at `http://localhost:3000/register`
3. Go to Supabase Dashboard → **Authentication** → **Users**
4. Find your user and click **Edit User**
5. Update `raw_user_meta_data`:
```json
{
  "role": "admin",
  "isActive": true
}
```
6. Save and access admin panel at `/admin`

---

## Database Schema

### ER Diagram
<!-- Add your ER diagram image here -->
![Database ER Diagram](./public/images/DB_ER_Diagram.png)

The application uses 11 core tables with Supabase Auth integration. Key entities include:
- **auth.users** - User authentication (managed by Supabase)
- **chat** - Conversation threads
- **message_v2** - Individual messages with usage tracking
- **admin_config** - Agent configurations (admin-only)
- **usage_logs** - Comprehensive API usage analyticsok, 
- **github_repositories** - Connected repos for Git MCP

**Full schema documentation**: [DATABASE_ER_DIAGRAM.md](./DATABASE_ER_DIAGRAM.md)

---



## Development Workflow

### Team Structure

**Super Admin (2)** - @Ananth, @Loren
- Access to production Supabase & Vercel
- Applies schema migrations to production
- Manages deployments

**Developers (~10)**
- Create personal Supabase projects for development
- Work on local branches and submit PRs
- Create migration scripts (reviewed by Super Admin)

### Contributing

1. **Setup**: Follow "Getting Started" to create your local environment
2. **Develop**: Make changes and test locally
3. **Migrate**: If schema changes, create migration file in `lib/db/migrations/`
4. **PR**: Submit pull request using the PR template
5. **Review**: Super Admin reviews and merges
6. **Deploy**: Super Admin applies migrations to production

#### **Pull Request Template**

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

**Detailed workflow**: [PROJECT_MANAGEMENT.md](./PROJECT_MANAGEMENT.md)

---

## Project Roadmap & TODO

Comprehensive development plan with phases, timelines, and implementation details:
📖 **[DEV_PLAN.md](./DEV_PLAN.md)**

Current focus areas:
- ✅ Phase 1: Supabase setup & database migration (In Progress)
- 🔲 Phase 2: Data layer migration
- 🔲 Phase 3: Authentication with Supabase Auth
- 🔲 Phase 4: File storage migration
- 🔲 Phase 5-11: Feature implementation (Admin pages, Usage analytics, Settings, etc.)

---

## Scripts

| Command | Description | When to Use |
|---------|-------------|-------------|
| `pnpm dev` / `npm run dev` | Start development server at localhost:3000 | Every time you work on the project |
| `pnpm build` / `npm run build` | Build optimized production bundle | Before deploying to production |
| `pnpm start` / `npm start` | Start production server | After build, for production deployment |
| `pnpm db:migrate` / `npm run db:migrate` | Apply pending database migrations to your Supabase | **Run once during initial setup**, then whenever new migration files are added to `lib/db/migrations/` |
| `pnpm db:generate` / `npm run db:generate` | Generate new migration file from Drizzle schema changes | When you modify `lib/db/schema.ts` and need to create a migration |
| `pnpm db:studio` / `npm run db:studio` | Open Drizzle Studio visual database browser | Anytime you want to view/edit database data with a GUI (useful for debugging) |

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

## Documentation

- [Development Plan](./DEV_PLAN.md) - Comprehensive roadmap and implementation guide
- [Database Schema](./DATABASE_ER_DIAGRAM.md) - Complete ER diagram and table documentation
- [Project Management](./PROJECT_MANAGEMENT.md) - Multi-developer workflow and migration strategy
