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
| Vector search | pgvector extension (via Supabase) |
| AI model | Claude API (`claude-sonnet-4-6` default) |
| AI SDK | Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) |
| RAG | LlamaIndex or LangChain + pgvector |
| Rich-text editor | Tiptap |
| i18n | next-intl (Norwegian Bokmål `no`, English `en`) |
| Deployment | Vercel (frontend + API routes) + Supabase (hosted) |

## Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint (uses node_modules/eslint/bin/eslint.js directly — Node v25 workaround)
npm run typecheck    # TypeScript check (uses node_modules/typescript/lib/tsc.js directly — Node v25 workaround)
npm run format       # Format all files with Prettier
npm run format:check # Check formatting without writing
```

To add a shadcn/ui component:
```bash
NODE_EXTRA_CA_CERTS=/tmp/system-ca.pem npx shadcn@latest add <component>
```

> **Corporate SSL note:** `NODE_EXTRA_CA_CERTS` is required in this environment due to corporate SSL inspection.
> Build the combined CA bundle once per session:
> ```bash
> security find-certificate -a -p /Library/Keychains/System.keychain > /tmp/system-ca.pem
> security find-certificate -a -p /System/Library/Keychains/SystemRootCertificates.keychain >> /tmp/system-ca.pem
> cat /Users/lamisi/Downloads/corporate-ca.pem >> /tmp/system-ca.pem
> npm config set cafile /tmp/system-ca.pem
> ```
## Folder Structure

> To be confirmed after issue #1. Planned layout:

```
app/                        # Next.js App Router
  [locale]/                 # i18n locale wrapper (no / en)
    (auth)/                 # Sign in, sign up pages
    (app)/                  # Authenticated app shell
      dashboard/
      projects/[id]/
      documents/[id]/
      admin/
  api/
    ai/                     # Claude API routes (streaming)
    rag/                    # Ingestion + similarity search
    webhooks/               # Inbound integration events
components/                 # Shared UI components
lib/
  supabase/                 # server.ts, client.ts, middleware.ts
  ai/                       # Claude wrappers, RAG utilities, prompts
  hooks/                    # useRole, useCurrentUser, etc.
types/                      # Shared TypeScript types and enums
messages/                   # i18n translation files
  no.json
  en.json
supabase/
  migrations/               # SQL migration files (Supabase CLI)
```

## Domain Model

```
Organization
  └── Project (has many Members with roles)
        └── Document (has many Versions)
              └── DocumentVersion (immutable snapshot)
                    ├── Comments
                    └── ComplianceCheck (AI result)

KnowledgeSource → Embeddings (pgvector) — powers RAG
```

## Roles (per project)

| Role | Key permissions |
|---|---|
| `admin` | Full access, invite members, manage settings, approve documents |
| `architect` | Create, upload, edit documents; submit for review |
| `civil_engineer` | Review, comment, approve or request changes |
| `carpenter` | Read-only access to approved documents |

**Rule:** Role checks are enforced server-side via Supabase RLS. Frontend `useRole` checks are UI-only — never rely on them for security.

## Document Lifecycle

```
Draft → In Review → Approved / Changes Requested → Submitted (to authorities)
```

- An **approved** version is immutable. Further edits require creating a new version.
- Every status transition is logged with a timestamp and the actor's user ID.

## AI Architecture

All AI features use the Claude API via the Vercel AI SDK. Entry point: `app/api/ai/`.

| Feature | Trigger | How it works |
|---|---|---|
| Compliance check | On upload / submit for review | Extract text → RAG similarity search → Claude structured output → store in `compliance_checks` |
| Improvement suggestions | On-demand (button) | Document text + RAG context → Claude streaming response |
| Document generation | Wizard form submission | User inputs → Claude streaming → opens in Tiptap editor |

**RAG pipeline:** Legal PDFs / city codes are chunked, embedded, and stored in the `embeddings` table (pgvector). Retrieval uses a `match_documents` Supabase RPC function. Sources are tagged with language (`no` / `en`).

**Language awareness:** All Claude prompts include the user's locale and instruct Claude to respond in that language.

## i18n

- Locale routing: `/no/...` and `/en/...` via next-intl
- Translation files: `messages/no.json`, `messages/en.json`
- Language preference stored on `profiles.language` in Supabase
- To add a new language: add a new `messages/{locale}.json` and register the locale in next-intl config

## Database Tables

Full migrations live in `supabase/migrations/`. Logical overview:

| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users` — name, avatar, language |
| `organizations` | Construction firms / practices |
| `projects` | Construction projects — name, location, status |
| `project_members` | User ↔ project join with role |
| `documents` | Document metadata — title, type, status, current version |
| `document_versions` | Immutable snapshots — file path or rich-text JSON, version number |
| `comments` | Threaded comments on a document version |
| `compliance_checks` | AI compliance results per document version |
| `knowledge_sources` | Ingested legal docs / specs |
| `embeddings` | Chunked text + pgvector vectors from knowledge sources |
| `notifications` | In-app notifications per user |
| `integrations` | External system configs — webhook URLs, API keys |

## Environment Variables

See `.env.example` for the full list. Key variables:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY     # Server only — never expose to client
ANTHROPIC_API_KEY              # Server only — never expose to client
```

## Key Conventions

- **Never expose** `SUPABASE_SERVICE_ROLE_KEY` or `ANTHROPIC_API_KEY` to the client bundle.
- **Always** use signed Supabase Storage URLs with short expiry for file access — never public bucket URLs.
- **RLS is the source of truth** for authorization — API routes must also check roles server-side.
- **Every PR** that introduces an architectural change must update this file.
- Migrations are applied via the Supabase CLI (`supabase db push`) — never edit the database manually in production.

## Build Order (GitHub Issues)

| # | Area | Issue |
|---|---|---|
| 1 | Foundation | Next.js scaffold |
| 2 | Foundation | Supabase connection |
| 3 | Foundation | Database schema |
| 4 | Auth | Authentication |
| 5 | Auth | Role-based access control |
| 6 | Documents | Project management |
| 7 | Documents | Document upload + versioning |
| 8 | Documents | Document viewer |
| 9 | Documents | Rich-text editor |
| 10 | Collaboration | Comments |
| 11 | Collaboration | Review / approval workflow |
| 12 | AI | Claude API setup |
| 13 | AI | RAG pipeline |
| 14 | AI | Compliance check |
| 15 | AI | Improvement suggestions |
| 16 | AI | Document generation |
| 17 | i18n | Norwegian + English |
| 18 | Integrations | Webhooks + external API |
| 19 | Collaboration | Notifications |
| 20 | Search | Full-text + semantic search |
