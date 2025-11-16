# AI Code Chatbot with Admin Dashboard

A powerful, production-ready AI chatbot application with comprehensive admin controls, usage analytics, and multi-agent architecture. Built for teams to manage and deploy conversational AI with GitHub repository integration.

## Overview

This application provides an intelligent, extensible chatbot platform featuring:

- **Multi-Agent AI System**: Specialized agents for chat, document management, code execution, diagram generation, and GitHub integration
- **Multi-Provider Support**: Google Gemini, OpenAI, and Anthropic Claude integration with dynamic model selection
- **Enterprise-Ready**: Comprehensive admin dashboard, usage tracking, rate limiting, and RBAC
- **Developer-Friendly**: Type-safe TypeScript, modern Next.js 15, comprehensive testing, and detailed documentation
- **Secure by Default**: Row Level Security (RLS), Supabase Auth, client-side API key storage, and input validation

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

## Architecture

### High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        UI[Next.js Frontend]
        LC[Local Storage<br/>API Keys]
    end

    subgraph "Application Layer"
        API[Next.js API Routes]
        AUTH[Supabase Auth]
        RESOLVER[Agent Resolver]
    end

    subgraph "AI Agent Layer"
        CHAT[Chat Agent]
        TOOLS[Provider Tools Agent]
        DOC[Document Agent]
        PY[Python Agent]
        MM[Mermaid Agent]
        GIT[Git MCP Agent]
    end

    subgraph "Data Layer"
        DB[(Supabase PostgreSQL<br/>RLS Policies)]
        BLOB[Vercel Blob Storage]
    end

    subgraph "External Services"
        GEMINI[Google Gemini API]
        OPENAI[OpenAI API]
        CLAUDE[Anthropic Claude API]
        GITHUB[GitHub API]
    end

    UI --> API
    UI --> LC
    API --> AUTH
    API --> RESOLVER
    RESOLVER --> CHAT
    RESOLVER --> TOOLS
    RESOLVER --> DOC
    RESOLVER --> PY
    RESOLVER --> MM
    RESOLVER --> GIT

    CHAT --> GEMINI
    CHAT --> OPENAI
    CHAT --> CLAUDE
    TOOLS --> GEMINI
    GIT --> GITHUB

    API --> DB
    API --> BLOB
    DOC --> DB

    style CHAT fill:#4285f4
    style TOOLS fill:#ea4335
    style DOC fill:#fbbc04
    style PY fill:#34a853
    style MM fill:#ff6d00
    style GIT fill:#5e35b1
```

### User Flow - Multimodal Chat Session

```mermaid
sequenceDiagram
    actor User
    participant UI as Frontend
    participant API as API Route
    participant Auth as Supabase Auth
    participant Resolver as Agent Resolver
    participant Agent as AI Agent
    participant LLM as LLM Provider
    participant DB as Database

    User->>UI: Enter message + files
    UI->>UI: Retrieve API key from localStorage
    UI->>API: POST /api/chat (with key in headers)
    API->>Auth: Verify user session
    Auth-->>API: User authenticated

    API->>DB: Check rate limits
    DB-->>API: Within limits

    API->>Resolver: Create agent with config
    Resolver->>DB: Fetch admin config
    DB-->>Resolver: Agent settings
    Resolver-->>API: Configured agent

    API->>Agent: Stream chat response
    Agent->>LLM: API request (with user's key)

    loop Streaming Response
        LLM-->>Agent: Token chunk
        Agent-->>API: Process chunk
        API-->>UI: SSE stream
        UI-->>User: Display in real-time
    end

    Agent->>DB: Log usage (tokens, cost)
    Agent->>DB: Save message

    API-->>UI: Complete response
    UI-->>User: Full message displayed
```

### Database Schema Overview

```mermaid
erDiagram
    auth_users ||--o{ Chat : owns
    auth_users ||--o{ github_repositories : connects
    auth_users ||--o{ usage_logs : generates

    Chat ||--o{ Message_v2 : contains
    Chat ||--o{ Document : has

    Message_v2 ||--o{ Suggestion : receives
    Message_v2 ||--o{ Vote_v2 : receives

    Document ||--o{ Suggestion : has

    admin_config ||--o| Chat : configures
    model_config ||--o{ Message_v2 : uses

    auth_users {
        uuid id PK
        string email
        jsonb raw_user_meta_data
    }

    Chat {
        uuid id PK
        uuid userId FK
        string title
        timestamp createdAt
    }

    Message_v2 {
        uuid id PK
        uuid chatId FK
        string role
        jsonb content
        int promptTokens
        int completionTokens
    }

    Document {
        uuid id PK
        uuid chatId FK
        string title
        string kind
        text content
    }

    admin_config {
        uuid id PK
        string agentType
        jsonb systemPrompt
        jsonb rateLimit
    }
```

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
- ⚙️ **Admin Dashboard** - Configure chat model, provider tools, document, Python code, Mermaid, and Git MCP agents
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
| `pnpm db:generate` / `npm run db:generate` | Generate new migration file from Drizzle schema changes | When you modify `lib/db/drizzle-schema.ts` and need to create a migration |
| `pnpm db:studio` / `npm run db:studio` | Open Drizzle Studio visual database browser | Anytime you want to view/edit database data with a GUI (useful for debugging) |

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

## Documentation Index

Comprehensive documentation covering all aspects of the application:

### Getting Started

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Complete guide for contributors
  - Local development setup
  - Database configuration
  - Testing requirements
  - PR submission process

- **[README.md](./README.md)** (this file) - Project overview and quick start

### Core Documentation

- **[docs/database-design.md](./docs/database-design.md)** - Complete database architecture
  - 14 database tables with full schema definitions
  - Entity Relationship Diagrams
  - 12 database functions (validate_user_id, check_rate_limit, etc.)
  - 15+ triggers for data integrity
  - Row Level Security (RLS) policies for all tables
  - Migration strategy and verification
  - Seed data for admin configs

- **[docs/agent-architecture.md](./docs/agent-architecture.md)** - Multi-agent AI system
  - Chat Model Agent (main interface)
  - Provider Tools Agent (Google Search, URL fetch, code execution)
  - Document Agent (create, update, revert documents)
  - Python Agent (code generation and execution)
  - Mermaid Agent (diagram creation)
  - Git MCP Agent (GitHub operations)
  - Agent orchestration and configuration

- **[docs/multimodal-chat-features.md](./docs/multimodal-chat-features.md)** - Chat system features
  - Multimodal input (text, files, GitHub context)
  - File upload and processing
  - Supported file types
  - GitHub repository integration
  - Thinking mode and extended reasoning
  - Model selection across providers
  - Real-time streaming (SSE)
  - Message rendering and artifacts
  - Complete user flow diagrams

- **[docs/settings-and-verification.md](./docs/settings-and-verification.md)** - API keys and settings
  - Settings page architecture
  - Google API key verification service
  - GitHub PAT verification with scope checking
  - Local storage system for API keys
  - Key masking and expiration tracking
  - Security considerations
  - Verification error handling

- **[docs/admin-panel.md](./docs/admin-panel.md)** - Admin dashboard
  - Agent configuration interface
  - System prompt customization
  - Rate limiting configuration
  - Model configuration management
  - Usage analytics and monitoring
  - Error tracking and logging
  - Admin-only features and RBAC

### Testing Documentation

- **[docs/testing.md](./docs/testing.md)** - Testing overview and best practices
  - Testing philosophy
  - Unit testing guidelines
  - Integration testing approach
  - E2E testing with Playwright
  - Database testing
  - Security testing

- **[TESTING_STRATEGY.md](./TESTING_STRATEGY.md)** - Detailed testing strategy
  - Test framework selection
  - Coverage goals and metrics
  - CI/CD integration
  - Performance testing
  - Accessibility testing

- **[docs/comprehensive-testing-structure.md](./docs/comprehensive-testing-structure.md)** - Complete test structure
  - 100+ test file organization
  - Unit, integration, E2E, security, performance tests
  - Test execution strategy
  - Coverage areas for all features

### Development Guides

- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - Implementation details
  - Feature implementation patterns
  - Best practices
  - Code organization

- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - Integration patterns
  - Third-party service integration
  - API integration
  - Database integration

- **[DATABASE_ER_DIAGRAM.md](./DATABASE_ER_DIAGRAM.md)** - Visual database schema
  - Complete ER diagram
  - Table relationships
  - Foreign key constraints

### Analysis Documents

- **[API_ROUTE_ANALYSIS.md](./API_ROUTE_ANALYSIS.md)** - API route documentation
  - All API endpoints
  - Request/response formats
  - Authentication requirements

- **[AI_PROVIDER_LOGGING_ANALYSIS.md](./AI_PROVIDER_LOGGING_ANALYSIS.md)** - AI provider integration
  - Provider abstraction layer
  - Logging and monitoring
  - Error handling

- **[error-handling-logging-analysis.md](./error-handling-logging-analysis.md)** - Error handling
  - Error tracking system
  - Logging strategy
  - Error recovery patterns

### Project Management

- **[DEV_PLAN.md](./DEV_PLAN.md)** - Comprehensive roadmap
  - Development phases
  - Feature timeline
  - Implementation priorities

- **[PROJECT_MANAGEMENT.md](./PROJECT_MANAGEMENT.md)** - Workflow and processes
  - Multi-developer workflow
  - Migration strategy
  - Code review process

### Templates

- **[.github/PULL_REQUEST_TEMPLATE.md](./.github/PULL_REQUEST_TEMPLATE.md)** - PR template
  - Comprehensive checklist
  - Database migration guidelines
  - Testing requirements
  - Security considerations

---

## Quick Links

- [Development Plan](./DEV_PLAN.md) - Comprehensive roadmap and implementation guide
- [Database Schema](./DATABASE_ER_DIAGRAM.md) - Complete ER diagram and table documentation
- [Project Management](./PROJECT_MANAGEMENT.md) - Multi-developer workflow and migration strategy
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute to the project
