# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Bricks** is an AI-powered documentation and approvals platform for the construction industry. It helps architects, civil engineers, and carpenters collaborate on documentation that must comply with city codes and legal requirements set by Norwegian (and international) authorities.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Vector search | pgvector (via Supabase) |
| AI | Claude API via Vercel AI SDK (`@ai-sdk/anthropic`) |
| RAG | LlamaIndex or LangChain + pgvector |
| i18n | next-intl (Norwegian Bokmål + English, extensible) |
| Deployment | Vercel |

## Commands

> Commands will be added here once the project is scaffolded (issue #1).

## Architecture Overview

### High-level shape

```
Browser (Next.js App Router)
    │
    ├── Supabase Auth        — authentication + role enforcement (RLS)
    ├── Supabase Storage     — document files, images, diagrams
    ├── Supabase Realtime    — live comments, notifications, presence
    │
    └── Next.js API Routes
            ├── /api/ai/*    — Claude API calls, streaming responses
            ├── /api/rag/*   — RAG pipeline (ingest + similarity search)
            └── /api/webhooks/* — inbound/outbound external integrations
```

### Key domain concepts

- **Organization** — a construction firm or practice
- **Project** — a construction project, owned by an organization, grouping all related documents and members
- **Document** — a unit of work (proposal, drawing, report). Always has at least one version.
- **Document Version** — immutable snapshot of a document at a point in time. Approval locks a version.
- **Knowledge Source** — an external legal doc, city code, or specification ingested into the RAG pipeline

### Roles (per project)

| Role | Permissions |
|---|---|
| `admin` | Full access, invite members, manage settings |
| `architect` | Create, upload, edit documents; submit for review |
| `civil_engineer` | Review and comment; approve or request changes |
| `carpenter` | Read-only access to approved documents |

Role checks happen **server-side** via Supabase Row Level Security (RLS). Frontend role checks (`useRole`) are for UI only — never trust them for security.

### Document lifecycle

```
Draft → In Review → Approved / Changes Requested → Submitted (to authorities)
```

An approved version is immutable. Further edits require creating a new version.

### AI architecture

- **Compliance check** — triggered on document upload/submission. Extracts document text, retrieves relevant legal chunks via pgvector similarity search, sends to Claude for structured issue identification.
- **Improvement suggestions** — on-demand, streaming. Claude reads the document and suggests missing sections, unclear language, or non-compliant clauses.
- **Document generation** — user fills a wizard, Claude generates a structured draft which opens in the rich-text editor.
- All AI prompts are language-aware (respond in the user's selected locale).

### i18n

- Locale routing: `/no/...` and `/en/...`
- Translation files: `messages/no.json`, `messages/en.json`
- Language preference stored on the user's `profiles` row in Supabase

## Database Schema (planned)

> Full migrations will live in `supabase/migrations/`. This is the logical overview.

- `profiles` — extends `auth.users` (name, avatar, language)
- `organizations` — firms and practices
- `projects` — construction projects (name, description, location, status)
- `project_members` — user ↔ project with role
- `documents` — document metadata (title, type, project_id, current_version_id, status)
- `document_versions` — immutable snapshots (file_path or rich-text JSON, version_number, change_summary)
- `comments` — on a specific `document_version`, supports threading and resolution
- `compliance_checks` — AI compliance results per document version
- `knowledge_sources` — ingested legal docs/specs
- `embeddings` — chunked text + pgvector embeddings from knowledge sources
- `notifications` — in-app notifications per user
- `integrations` — external system configs (webhook URLs, API keys)

## Key file paths

> Will be populated as the codebase is scaffolded. Expected structure:

```
app/                    # Next.js App Router pages and layouts
components/             # Shared UI components
lib/
  supabase/             # Supabase client helpers (server + client)
  ai/                   # Claude API wrappers, RAG utilities
types/                  # Shared TypeScript types
messages/               # i18n translation files (no.json, en.json)
supabase/
  migrations/           # SQL migration files
```

## Build order (GitHub issues)

Issues are numbered in the intended build sequence:

1. Next.js scaffold
2. Supabase connection
3. Database schema
4. Authentication
5. Role-based access control
6. Project management
7. Document upload + versioning
8. Document viewer
9. Rich-text editor
10. Comments
11. Review/approval workflow
12. Claude API setup
13. RAG pipeline
14. AI compliance check
15. AI suggestions
16. AI document generation
17. i18n (Norwegian + English)
18. External integrations framework
19. Notifications
20. Search
