# ARCHITECTURE.md

Architecture reference for the Bricks platform. Describes system design, domain model, data flows, and key decisions.

---

## System Overview

Bricks is a web platform that helps construction companies, architects, and engineers produce documentation that complies with city codes and legal requirements — primarily in the Norwegian regulatory context, with international expansion planned.

**Core capabilities:**
- Upload, create, and version-control construction documents
- Multi-role collaboration with a formal approval workflow
- AI-powered compliance checking against legal sources
- AI-assisted document drafting and improvement suggestions
- Integration with external authority portals and tools

---

## Tech Stack and Rationale

| Choice | Rationale |
|---|---|
| **Next.js 14+ (App Router)** | Unified frontend + API in one repo. SSR for SEO and auth safety. Edge-ready for Vercel. |
| **TypeScript** | Domain is complex (roles, states, versioning) — types catch errors early. |
| **Supabase** | Provides PostgreSQL, Auth, Storage, and Realtime in one managed service. Avoids building auth, file handling, and realtime infrastructure from scratch. pgvector for embeddings means no separate vector DB. |
| **Claude API (Anthropic)** | Best-in-class for long-document analysis, structured output, and instruction following — critical for compliance checking. |
| **Vercel AI SDK** | First-class streaming support for Next.js. Simplifies tool use and multi-step AI flows. |
| **Tiptap** | Extensible rich-text editor with good TypeScript support. Can be extended for construction-specific content blocks. |
| **next-intl** | Best i18n solution for Next.js App Router. Supports locale routing, server components, and is easy to extend to new languages. |
| **Vercel** | Zero-config deployment for Next.js. Edge functions support streaming AI responses without cold starts. |

---

## High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│              Next.js App (React, Tiptap, shadcn/ui)         │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────────┐
│                   Vercel Edge / Node                        │
│                  Next.js API Routes                         │
│                                                             │
│   /api/ai/*        /api/rag/*        /api/webhooks/*        │
│   (Claude calls)   (embeddings)      (external events)      │
└──────┬──────────────────┬───────────────────┬──────────────┘
       │                  │                   │
┌──────▼──────┐  ┌────────▼────────┐  ┌───────▼──────────────┐
│ Claude API  │  │   Supabase      │  │  External Systems    │
│ (Anthropic) │  │                 │  │  (city portals, etc) │
└─────────────┘  │  PostgreSQL     │  └──────────────────────┘
                 │  pgvector       │
                 │  Auth           │
                 │  Storage        │
                 │  Realtime       │
                 └─────────────────┘
```

---

## Domain Model

```
Organization
│
└── Project
      │   name, description, location, status
      │
      ├── ProjectMember (user + role)
      │     roles: admin | architect | civil_engineer | carpenter
      │
      └── Document
            │   title, type, status, current_version_id
            │   status: draft | in_review | approved | changes_requested | submitted
            │
            └── DocumentVersion  (immutable once approved)
                  │   version_number, file_path or rich_text_json
                  │   change_summary, created_by, created_at
                  │
                  ├── Comment (threaded, resolvable)
                  │
                  └── ComplianceCheck (AI result)
                        issues[], severity, legal_source_refs

KnowledgeSource (legal PDFs, city codes, specs)
  └── Embedding (chunked text + pgvector vector, language tag)
```

---

## Role Permission Matrix

| Action | admin | architect | civil_engineer | carpenter |
|---|:---:|:---:|:---:|:---:|
| Create project | ✓ | ✓ | | |
| Invite members | ✓ | | | |
| Upload / create document | ✓ | ✓ | | |
| Edit draft document | ✓ | ✓ | | |
| Submit for review | ✓ | ✓ | | |
| Comment on document | ✓ | ✓ | ✓ | |
| Approve / request changes | ✓ | | ✓ | |
| View approved documents | ✓ | ✓ | ✓ | ✓ |
| Manage knowledge sources | ✓ | | | |
| Manage integrations | ✓ | | | |

All permissions are enforced at the database level via Supabase Row Level Security (RLS). Frontend role checks are for UI rendering only.

---

## Document Lifecycle

```
  ┌─────────┐   submit for    ┌───────────┐
  │  Draft  │───review──────▶ │ In Review │
  └────┬────┘                 └─────┬─────┘
       │                            │
       │ (new version)    ┌─────────┴──────────┐
       │◀─────────────────│  Changes Requested  │
       │                  └─────────────────────┘
       │                            │
       │                       approve
       │                            │
       │                     ┌──────▼──────┐   submit to    ┌───────────┐
       │                     │  Approved   │───authorities─▶│ Submitted │
       │                     └─────────────┘                └───────────┘
```

- **Approved** versions are immutable. Edits require creating a new version (status resets to Draft).
- Every transition is written to an audit log with actor and timestamp.

---

## AI Subsystem

### RAG Pipeline (Knowledge Ingestion)

```
Admin uploads PDF / URL
        │
        ▼
Text extraction (pdf-parse)
        │
        ▼
Chunking (overlapping segments ~500 tokens)
        │
        ▼
Embedding generation (Claude / OpenAI embeddings API)
        │
        ▼
Store in `embeddings` table (pgvector)
   - chunk text
   - vector
   - source metadata
   - language tag (no | en)
```

### Compliance Check Flow

```
Document uploaded / submitted
        │
        ▼
Extract text from document
        │
        ▼
match_documents RPC → retrieve top-K relevant legal chunks
        │
        ▼
Claude prompt:
  system: You are a Norwegian construction compliance expert...
  user:   [document text] + [retrieved legal chunks]
  output: structured JSON { issues: [{ severity, description, legal_ref }] }
        │
        ▼
Store in `compliance_checks` table
        │
        ▼
Display report on document page + notify uploader
```

### Improvement Suggestions Flow

```
User clicks "Get AI suggestions"
        │
        ▼
Fetch document text + retrieve relevant RAG context
        │
        ▼
Claude streaming response (Vercel AI SDK)
        │
        ▼
Render suggestions panel in real time
Each suggestion: type | description | recommended fix
User: accept (apply to editor) | dismiss
```

### Document Generation Flow

```
User completes wizard (project type, location, scope, specs)
        │
        ▼
Retrieve relevant templates + legal context via RAG
        │
        ▼
Claude streaming → structured draft (headings, sections)
        │
        ▼
Stream directly into Tiptap editor
User edits → saves as DocumentVersion (status: Draft)
```

---

## Data Flow: Document Upload to Approval

```
1. User uploads file
      → Stored in Supabase Storage: /projects/{project_id}/documents/{doc_id}/{version}/
      → `documents` record created (status: draft)
      → `document_versions` record created (version: 1)

2. Compliance check triggered (async)
      → Text extracted from file
      → RAG retrieves relevant legal chunks
      → Claude returns structured compliance issues
      → `compliance_checks` record saved
      → Uploader notified

3. User reviews compliance report, makes edits
      → Each save creates a new `document_versions` record

4. User submits for review
      → `documents.status` → in_review
      → Reviewers notified via `notifications` + email

5. Reviewer approves
      → `documents.status` → approved
      → `document_versions` record becomes immutable
      → Audit log entry written
      → Document owner notified

6. Admin submits to authority portal
      → `documents.status` → submitted
      → Outbound webhook fires to configured integration
```

---

## i18n Architecture

- **Locale routing:** All authenticated app routes are prefixed with locale: `/no/...` and `/en/...`
- **Translation files:** `messages/no.json` and `messages/en.json` — keyed by component/feature
- **Language preference:** Stored on `profiles.language`. Set on sign-up, changeable in settings.
- **Server components:** Use `getTranslations()` from next-intl
- **Client components:** Use `useTranslations()` from next-intl
- **AI responses:** Every Claude prompt includes `Respond in {locale} language.` instruction
- **RAG retrieval:** Embeddings are tagged with language; retrieval filters by user locale first, falls back to all sources
- **Adding a language:** Add `messages/{locale}.json`, register locale in next-intl config, add to language switcher

---

## External Integrations Architecture

```
Outbound (Bricks → external):
  Event occurs (document approved, submitted, etc.)
      → Look up `integrations` records for the project
      → POST JSON payload to configured webhook URL
      → Log request + response in `integrations_log`
      → Retry up to 3 times on failure

Inbound (external → Bricks):
  POST /api/webhooks/{integration_id}
      → Verify HMAC signature
      → Validate payload schema
      → Process event (update document status, create notification, etc.)
      → Log to `integrations_log`
```

---

## Deployment Architecture

```
Vercel (Production)
  ├── Next.js frontend (SSR + static)
  ├── Next.js API routes (Node.js runtime)
  └── Edge middleware (auth session, locale redirect)

Supabase (Hosted — eu-west region recommended for Norwegian compliance)
  ├── PostgreSQL + pgvector
  ├── Auth (JWT, session management)
  ├── Storage (document files, images)
  └── Realtime (notifications, presence)

External
  └── Claude API (Anthropic)
```

---

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Monorepo vs separate frontend/backend | Monorepo (Next.js API routes) | Simpler to ship fast at this stage. Python microservice can be added later if RAG needs it. |
| Separate vector DB vs pgvector | pgvector in Supabase | Avoids operational overhead of a separate service. Sufficient for expected data volumes. |
| File versioning strategy | New Storage path per version | Simple, immutable, no risk of overwriting. Storage is cheap. |
| Rich text storage format | Tiptap JSON in `document_versions` | Portable, diff-able, renderable without the editor. |
| Email provider | Resend (planned) | Simple API, good deliverability, works well with Supabase Edge Functions. |
| Auth strategy | Supabase Auth (email + password) | Sufficient for v1. OAuth (Google, Microsoft) can be added in a later issue. |
