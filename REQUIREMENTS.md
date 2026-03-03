# REQUIREMENTS.md

## Purpose

This repository follows a **requirements-driven engineering model**.

All non-trivial changes — including features, workflows, automations, security controls, and architectural changes — must originate from a structured requirement defined in this document format.

No design, architecture, or security implementation may be generated without a corresponding structured requirement.

---

## Operating Model

All requirements must:

1. Be deterministic and testable
2. Define scope boundaries explicitly
3. Include architectural impact
4. Include a minimal threat model
5. Define measurable success metrics
6. Define testing strategy
7. Avoid speculative features
8. Avoid implementation ambiguity

If information is missing:

* Explicit assumptions must be documented
* Risk of incorrect assumption must be stated

---

## Requirement Lifecycle

1. GitHub issue created
2. Requirement generated using template below
3. Architecture and security design derived from requirement
4. Implementation follows approved design
5. Tests validate requirement success criteria

No implementation should precede structured requirement approval.

---

# Requirement Template

Copy the following section for each new requirement.

---

# Requirement: \<Short Descriptive Title\>

**Date:** \<YYYY-MM-DD\>
**Status:** Draft | In Review | Approved | Rejected
**Owner:** \<Role or Team\>
**Related Issue:** #\<number\>

---

## 1. Overview

**Purpose** \<What problem is being solved and why it matters.\>

**Business or Operational Impact** \<Describe measurable impact or risk reduction.\>

---

## 2. Scope

**In Scope**

* \<Capability 1\>

**Out of Scope**

* \<Explicit non-goal 1\>

---

## 3. User Story

**As a** \<persona\>
**I want** \<capability\>
**So that** \<measurable outcome\>

---

## 4. Acceptance Criteria

* [ ] \<Behavior 1\>

---

## 5. Assumptions

Assumption: \<statement\>
Risk: \<impact if incorrect\>

---

## 6. Architecture Impact

**Repositories Affected** / **Workflows Affected** / **Configuration Changes** / **Data Flow Impact**

---

## 7. Security Considerations

### Assets / Threats / Controls

---

## 8. Failure Handling

---

## 9. Observability

---

## 10. Testing Requirements

---

## 11. Success Metrics

---

## 12. Alternatives Considered

---

## 13. Rollout Plan

---

## 14. Future Enhancements (Optional)

---

# Enforcement Rules

* Requirements must be complete before design begins.
* All fields above are mandatory unless explicitly marked optional.
* Security section may not be omitted.
* Acceptance criteria must be testable.
* Ambiguous requirements must document assumptions and risk.
* Requirements override stylistic preferences in other documents.

---
---

# Requirement: Next.js Project Scaffold with Brand Identity

**Date:** 2026-03-03
**Status:** Approved
**Owner:** Engineering
**Related Issue:** #1

---

## 1. Overview

**Purpose:** Establish the foundational Next.js project structure, tooling, and visual brand identity from which all subsequent features are built. Without a clean, correctly configured scaffold, every subsequent issue inherits technical debt.

**Business or Operational Impact:** Unblocks all 19 remaining issues. Establishes brand consistency from day one, reducing costly redesign later.

---

## 2. Scope

**In Scope**

* Next.js 14+ (App Router) with TypeScript
* Tailwind CSS v4 with brand color tokens
* shadcn/ui component library initialisation
* ESLint + Prettier with Tailwind class sorting
* Brand identity: logo SVG, colour palette, typography
* Landing page with nav, hero, features, and footer sections
* Base folder structure: `app/`, `components/`, `lib/`, `types/`, `messages/`
* Translation stub files for Norwegian and English
* `.env.example` documenting all required environment variables

**Out of Scope**

* Authentication or protected routes (issue #4)
* Supabase connection (issue #2)
* Any real data or API calls
* Mobile-specific optimisations beyond responsive Tailwind classes

---

## 3. User Story

**As a** new engineer joining the project
**I want** a fully configured project scaffold with clear conventions
**So that** I can start contributing without spending time on tooling setup

---

## 4. Acceptance Criteria

* [ ] `npm run dev` starts without errors at `localhost:3000`
* [ ] `npm run typecheck` passes with zero errors
* [ ] `npm run lint` passes with zero errors
* [ ] `npm run format:check` passes with zero formatting violations
* [ ] Brand colour tokens (`brand-navy`, `brand-terracotta`, `brand-parchment`) are usable as Tailwind utilities
* [ ] Logo SVG renders correctly at `sm`, `md`, and `lg` sizes
* [ ] Landing page displays all sections: nav, hero, features, how-it-works, CTA banner, footer
* [ ] `.env.example` documents all variables without containing real values
* [ ] `messages/en.json` and `messages/no.json` exist with at least nav and hero keys

---

## 5. Assumptions

Assumption: Node.js v25 is the runtime in this environment.
Risk: Some npm binary shims are broken on Node v25. Workaround: scripts invoke ESLint and TypeScript via `node` directly.

Assumption: A corporate SSL inspection proxy is active.
Risk: npm and npx commands fail with certificate errors without the combined CA bundle. Workaround documented in CLAUDE.md.

---

## 6. Architecture Impact

**Repositories Affected**
* `Lamisi/Bricks` — all files created here

**Workflows Affected**
* All future CI/CD pipelines will inherit the lint, typecheck, and format scripts

**Configuration Changes**
* `.prettierrc` — Prettier config with tailwind plugin
* `components.json` — shadcn/ui configuration
* `app/globals.css` — Tailwind v4 theme with brand tokens via `@theme inline`

**Data Flow Impact**
* None — landing page is fully static

---

## 7. Security Considerations

### Assets
* `.env.example` must not contain real secrets

### Threats
* Accidental secret commit via `.env.local`

### Controls
* `.gitignore` explicitly excludes `.env`, `.env.local`, `.env.*.local`
* `.env.example` contains only variable names, no values

---

## 8. Failure Handling

* If `npm run dev` fails, check Node version and CA bundle setup per CLAUDE.md
* If shadcn/ui components fail to render, verify `components.json` and `globals.css` imports

---

## 9. Observability

* No runtime observability required at this stage
* Build errors surfaced via `npm run build` exit code

---

## 10. Testing Requirements

**Unit Tests**
* Logo component renders without errors at all sizes

**Integration Tests**
* Landing page renders all sections server-side

**Negative Tests**
* `.env.local` must not be committable (gitignore validation)

---

## 11. Success Metrics

* Success rate: `npm run dev` starts on first attempt: 100%
* Build time: `npm run build` completes in under 60 seconds
* Zero TypeScript errors on initial scaffold

---

## 12. Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| Vite + React | Faster HMR | No SSR, separate backend needed | Rejected |
| Remix | Good data loading | Smaller ecosystem, less shadcn/ui support | Rejected |
| Next.js (selected) | SSR, App Router, Vercel-native, large ecosystem | Slightly more complex routing | Selected |

---

## 13. Rollout Plan

* Phase 1: Scaffold merged to `main` — immediately unblocks issues #2–#5
* Rollback: Revert PR. No data or infrastructure is affected.

---

---

# Requirement: Supabase Connection and Environment Setup

**Date:** 2026-03-03
**Status:** Approved
**Owner:** Engineering
**Related Issue:** #2

---

## 1. Overview

**Purpose:** Connect the Next.js application to Supabase to provide the database, authentication, file storage, and real-time infrastructure that all features depend on.

**Business or Operational Impact:** Unblocks issues #3–#20. Without this, no persistent data, auth, or file handling is possible.

---

## 2. Scope

**In Scope**

* Supabase project creation and configuration
* `@supabase/supabase-js` and `@supabase/ssr` installation
* Server-side Supabase client (for Server Components and API routes)
* Client-side Supabase client (for Client Components)
* `pgvector` extension enabled in Supabase (required for issue #13)
* Environment variable documentation in `.env.example`

**Out of Scope**

* Database schema creation (issue #3)
* Authentication flows (issue #4)
* Storage bucket creation (issue #7)

---

## 3. User Story

**As an** engineer
**I want** a correctly configured Supabase client available in both server and client contexts
**So that** all features can read and write data without each team member setting up their own connection logic

---

## 4. Acceptance Criteria

* [ ] `createServerClient()` from `lib/supabase/server.ts` initialises without errors in a Server Component
* [ ] `createBrowserClient()` from `lib/supabase/client.ts` initialises without errors in a Client Component
* [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are the only Supabase variables exposed to the client
* [ ] `SUPABASE_SERVICE_ROLE_KEY` is confirmed absent from the client bundle (verified via build output)
* [ ] `pgvector` extension is enabled in the Supabase project
* [ ] `.env.example` updated with all Supabase variable names

---

## 5. Assumptions

Assumption: A single Supabase project serves all environments (dev/prod split via separate projects later).
Risk: Schema changes in dev could affect prod if projects are shared. Mitigation: use separate projects per environment from the start.

---

## 6. Architecture Impact

**Repositories Affected**
* `Lamisi/Bricks` — `lib/supabase/server.ts`, `lib/supabase/client.ts`, `middleware.ts`

**Configuration Changes**
* `.env.local` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Data Flow Impact**
* Establishes the connection layer all future server actions and API routes use

---

## 7. Security Considerations

### Assets
* `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS; full database access

### Threats
* Service role key leaked to client bundle
* Anon key used for privileged operations

### Controls
* Service role key only instantiated in server-side helpers, never in `NEXT_PUBLIC_*` variables
* Client helper uses anon key only
* Automated check in CI: scan build output for service role key string

---

## 8. Failure Handling

* If client fails to initialise, log the missing environment variable name (not the value)
* Middleware must redirect to an error page if Supabase is unreachable, not crash the server

---

## 9. Observability

* Supabase connection errors logged server-side with severity `error`
* No sensitive values in logs

---

## 10. Testing Requirements

**Unit Tests**
* Server client initialises with valid env vars
* Server client throws a clear error with missing env vars

**Integration Tests**
* A test query to a public table succeeds using the anon key

**Negative Tests**
* Build output does not contain `SUPABASE_SERVICE_ROLE_KEY` value
* Client component cannot access service role key

---

## 11. Success Metrics

* Client initialisation latency: under 100ms
* Zero occurrences of service role key in client bundle across all builds

---

## 12. Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| Plain PostgreSQL + Prisma | Full control | No auth/storage/realtime built in | Rejected |
| Firebase | Easy setup | No SQL, no pgvector | Rejected |
| Supabase (selected) | Auth + DB + Storage + Realtime + pgvector | Vendor dependency | Selected |

---

## 13. Rollout Plan

* Phase 1: Dev environment connection validated
* Phase 2: CI environment variable injection confirmed
* Rollback: Remove Supabase client files. No schema exists yet; no data loss risk.

---

---

# Requirement: Core Database Schema

**Date:** 2026-03-03
**Status:** Approved
**Owner:** Engineering
**Related Issue:** #3

---

## 1. Overview

**Purpose:** Define and apply the complete relational data model before any feature is built on top of it. Schema changes after data exists are costly and risky.

**Business or Operational Impact:** A well-designed schema prevents data integrity bugs, enables correct RLS enforcement, and avoids expensive migrations later.

---

## 2. Scope

**In Scope**

* Tables: `profiles`, `organizations`, `projects`, `project_members`, `documents`, `document_versions`, `comments`
* Row Level Security (RLS) policies on all tables
* Supabase migration files via Supabase CLI
* Schema documentation in `/docs/schema.md`

**Out of Scope**

* AI-specific tables (`embeddings`, `compliance_checks`, `knowledge_sources`) — deferred to issues #13 and #14
* `notifications` and `integrations` tables — deferred to issues #18 and #19

---

## 3. User Story

**As an** engineer implementing any feature
**I want** a stable, documented schema with enforced access policies
**So that** I can build features without redesigning the data model mid-implementation

---

## 4. Acceptance Criteria

* [ ] All 7 tables created via Supabase CLI migrations (not manual SQL)
* [ ] RLS enabled on every table
* [ ] A `carpenter` role member cannot read documents from a project they do not belong to
* [ ] An `architect` cannot insert into `project_members`
* [ ] A Supabase trigger creates a `profiles` row automatically on `auth.users` insert
* [ ] Migrations run cleanly on a fresh Supabase project via `supabase db push`
* [ ] `/docs/schema.md` documents every table, column, type, and relationship

---

## 5. Assumptions

Assumption: `project_members.role` uses a PostgreSQL enum type.
Risk: Adding enum values later requires a migration. Mitigation: define all four roles (`admin`, `architect`, `civil_engineer`, `carpenter`) upfront.

Assumption: `document_versions` stores file content either as a Supabase Storage path or as Tiptap JSON, not both simultaneously.
Risk: Ambiguous content type handling. Mitigation: add a `content_type` enum column (`file` | `rich_text`).

---

## 6. Architecture Impact

**Configuration Changes**
* `supabase/migrations/` — new migration files

**Data Flow Impact**
* Establishes the schema all API routes, RLS policies, and server actions read from

---

## 7. Security Considerations

### Assets
* All user data, document content, project metadata

### Threats
* Cross-tenant data access (one organisation reading another's documents)
* Privilege escalation via direct `project_members` insert

### Controls
* RLS policies scope all SELECT/INSERT/UPDATE/DELETE to the authenticated user's memberships
* `project_members` insert restricted to `admin` role members of the project
* Foreign key constraints enforce referential integrity
* `profiles` created via server-side trigger only — not via client insert

---

## 8. Failure Handling

* Migration failure must roll back atomically — no partial schema state
* RLS policy test suite must fail the CI pipeline if any cross-tenant query succeeds

---

## 9. Observability

* Migration applied/failed events logged in Supabase dashboard
* RLS policy violations return `403` and are logged

---

## 10. Testing Requirements

**Unit Tests**
* Each RLS policy tested with a user of each role

**Integration Tests**
* Full document creation flow: project → member → document → version

**Negative Tests**
* Carpenter cannot INSERT a document version
* User not in a project cannot SELECT that project's documents
* Non-admin cannot INSERT into `project_members`

---

## 11. Success Metrics

* Zero RLS bypass cases in negative test suite
* Migration applies cleanly in under 10 seconds on a fresh Supabase project

---

## 12. Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| Prisma migrations | Type-safe schema | Adds Prisma ORM dependency; Supabase CLI already provides migrations | Rejected |
| Manual SQL via Supabase dashboard | Fastest initial setup | Not reproducible; no version control | Rejected |
| Supabase CLI migrations (selected) | Reproducible, version-controlled, works with CI | Requires Supabase CLI installed | Selected |

---

## 13. Rollout Plan

* Phase 1: Apply migrations to dev Supabase project
* Phase 2: Validate RLS with automated tests
* Phase 3: Document schema in `/docs/schema.md`
* Rollback: `supabase db reset` on dev. No production data exists yet.

---

---

# Requirement: User Authentication

**Date:** 2026-03-03
**Status:** Approved
**Owner:** Engineering
**Related Issue:** #4

---

## 1. Overview

**Purpose:** Allow users to create accounts, sign in, and sign out securely. Authentication is the gateway to all protected functionality.

**Business or Operational Impact:** Without authentication, no user-specific data can be stored or retrieved, and no access control can be enforced.

---

## 2. Scope

**In Scope**

* Email + password sign-up with email verification
* Sign-in page
* Sign-out action
* Next.js middleware protecting all `/app/*` routes
* Automatic `profiles` row creation on sign-up via Supabase trigger
* Redirect to sign-in for unauthenticated access to protected routes

**Out of Scope**

* OAuth/SSO (Google, Microsoft) — post-v1
* Multi-factor authentication — post-v1
* Password reset flow — deferred to a follow-up issue

---

## 3. User Story

**As a** construction professional
**I want** to create an account and sign in securely
**So that** my documents and project data are protected and associated with my identity

---

## 4. Acceptance Criteria

* [ ] User can register with email + password and receives a verification email
* [ ] Unverified users cannot access protected routes
* [ ] User can sign in with correct credentials
* [ ] User can sign out and session is invalidated server-side
* [ ] Unauthenticated requests to `/app/*` redirect to `/sign-in`
* [ ] A `profiles` row is created automatically on sign-up
* [ ] Failed sign-in shows a user-friendly error (not a raw Supabase error)
* [ ] Session is stored in an HTTP-only cookie (not localStorage)

---

## 5. Assumptions

Assumption: Email verification is required before accessing the app.
Risk: Higher friction at sign-up. Acceptable — compliance context requires verified identities.

---

## 6. Architecture Impact

**Configuration Changes**
* `middleware.ts` — session validation and route protection

**Data Flow Impact**
* All subsequent requests carry a Supabase session cookie
* `auth.uid()` is available in all RLS policies

---

## 7. Security Considerations

### Assets
* User credentials, session tokens

### Threats
* Session hijacking via token in localStorage
* CSRF attacks on sign-in/sign-out endpoints
* Brute-force login attempts

### Controls
* Sessions stored in HTTP-only, `SameSite=Lax` cookies via `@supabase/ssr`
* Supabase Auth enforces rate limiting on login attempts
* Sign-out invalidates the session server-side (not just client-side cookie deletion)
* No raw Supabase error messages exposed to the client

---

## 8. Failure Handling

* If Supabase Auth is unreachable, middleware fails closed (redirects to sign-in, not bypasses auth)
* Sign-up email delivery failure surfaced as a user-friendly message

---

## 9. Observability

* Sign-in success/failure events logged (user ID on success, email hash on failure — never plaintext email)
* Supabase Auth dashboard provides audit trail of auth events

---

## 10. Testing Requirements

**Unit Tests**
* Middleware redirects unauthenticated users
* Middleware allows authenticated users through

**Integration Tests**
* Full sign-up → verify → sign-in → sign-out flow

**Negative Tests**
* Wrong password returns error without leaking which field is wrong
* Unverified email cannot access protected route
* Expired session redirects to sign-in

---

## 11. Success Metrics

* Sign-in latency (p95): under 500ms
* Zero cases of sessions persisted in localStorage
* Auth middleware adds under 50ms to request time

---

## 12. Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| NextAuth.js | Flexible providers | Adds complexity; Supabase Auth already included | Rejected |
| Clerk | Great DX | Additional vendor dependency and cost | Rejected |
| Supabase Auth (selected) | Integrated with DB and RLS, no extra service | Limited customisation vs Clerk | Selected |

---

## 13. Rollout Plan

* Phase 1: Sign-up, sign-in, sign-out implemented and tested
* Phase 2: Middleware protecting all routes validated
* Rollback: Remove auth middleware. No user data exists yet if reverted before launch.

---

---

# Requirement: Role-Based Access Control

**Date:** 2026-03-03
**Status:** Approved
**Owner:** Engineering
**Related Issue:** #5

---

## 1. Overview

**Purpose:** Enforce that each actor in a construction project (admin, architect, civil engineer, carpenter) can only perform actions their role permits. Access decisions must be made server-side — not just in the UI.

**Business or Operational Impact:** Without RBAC, any authenticated user could modify or access any document. In a compliance context, this is a regulatory and liability risk.

---

## 2. Scope

**In Scope**

* Four roles: `admin`, `architect`, `civil_engineer`, `carpenter`
* RLS policies enforcing role-scoped access on `documents`, `document_versions`, `comments`, `project_members`
* Server-side role verification in API routes
* `useRole` hook for frontend UI gating (non-authoritative)

**Out of Scope**

* Custom roles or role hierarchies — not required for v1
* Permission grants per document (only per project)

---

## 3. User Story

**As a** project admin
**I want** to control what each team member can do within a project
**So that** documents are only modified by authorised roles and the approval chain is enforced

---

## 4. Acceptance Criteria

* [ ] A `carpenter` cannot INSERT, UPDATE, or DELETE a `document_version`
* [ ] A `carpenter` can SELECT `document_versions` where the parent document status is `approved`
* [ ] An `architect` cannot INSERT into `project_members`
* [ ] A `civil_engineer` can UPDATE a document's status to `approved` or `changes_requested`
* [ ] An `architect` cannot UPDATE a document's status to `approved`
* [ ] All role checks pass server-side RLS — frontend `useRole` is supplementary only
* [ ] API routes return `403` (not `404`) for unauthorised role actions

---

## 5. Assumptions

Assumption: A user has one role per project (not globally).
Risk: A user who is an architect on project A and a carpenter on project B could confuse future permission logic. Mitigation: always scope role lookups to the current project ID.

---

## 6. Architecture Impact

**Configuration Changes**
* Additional RLS policies on `documents`, `document_versions`, `comments`, `project_members`

**Data Flow Impact**
* Every API route that mutates data must resolve the calling user's role via `project_members` before executing

---

## 7. Security Considerations

### Assets
* Document integrity, approval chain validity

### Threats
* Client-side role spoofing (bypassing UI-only checks)
* Horizontal privilege escalation (architect acting as admin)

### Controls
* RLS is the authoritative enforcement layer — evaluated in PostgreSQL, not in application code
* API routes perform a secondary role check as defence-in-depth
* `useRole` hook explicitly documented as UI-only in code comments

---

## 8. Failure Handling

* If role cannot be resolved (e.g., user not in `project_members`), default to no access
* Role resolution failures logged with user ID and project ID

---

## 9. Observability

* Unauthorised access attempts logged with user ID, project ID, attempted action
* Supabase RLS violations auditable via Supabase logs

---

## 10. Testing Requirements

**Unit Tests**
* `useRole` hook returns correct role for each scenario

**Integration Tests**
* Each role tested against every protected action

**Negative Tests**
* Carpenter cannot write documents
* Architect cannot approve documents
* Civil engineer cannot invite members
* User from different project cannot read documents

---

## 11. Success Metrics

* Zero RLS bypass cases across all negative tests
* Role resolution adds under 20ms to API route response time

---

## 12. Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| Application-level RBAC only | Simpler code | Trust boundary at application layer; DB still accessible | Rejected |
| Attribute-based access control (ABAC) | More granular | Overkill for v1 with 4 fixed roles | Rejected |
| RLS + server-side check (selected) | Defence-in-depth; authoritative at DB | Requires careful RLS policy design | Selected |

---

## 13. Rollout Plan

* Phase 1: RLS policies applied and validated via automated tests
* Phase 2: API routes updated with server-side role checks
* Rollback: Drop RLS policies (note: this removes all access control — only acceptable before any production data exists)

---

---

# Requirement: Project Creation and Management

**Date:** 2026-03-03
**Status:** Approved
**Owner:** Engineering
**Related Issue:** #6

---

## 1. Overview

**Purpose:** Allow users to create construction projects and invite collaborators with defined roles. A project is the top-level container for all documents, members, and activity in Bricks.

**Business or Operational Impact:** Without project management, documents have no organisational context and multi-user collaboration cannot begin.

---

## 2. Scope

**In Scope**

* Project creation form (name, description, location, type)
* Projects dashboard (list of all projects the user belongs to)
* Project detail page (overview, members, documents)
* Member invitation by email with role assignment
* Project settings (edit metadata, archive project)

**Out of Scope**

* Document upload within projects (issue #7)
* Real-time presence on project pages (post-v1)
* Project deletion (archive only, to preserve audit trail)

---

## 3. User Story

**As an** architect
**I want** to create a project and invite my civil engineer and carpenter
**So that** we can collaborate on documentation within a defined, access-controlled workspace

---

## 4. Acceptance Criteria

* [ ] User can create a project with name, description, location, and type
* [ ] Created project appears in the user's projects dashboard
* [ ] Project creator is automatically assigned the `admin` role
* [ ] Admin can invite a user by email and assign a role
* [ ] Invited user receives an email with a link to join
* [ ] Project detail page displays member list with their roles
* [ ] Admin can archive a project (sets status to `archived`, hides from active dashboard)
* [ ] Only admin can access project settings

---

## 5. Assumptions

Assumption: Invitation by email — if the email is not yet registered, the user is prompted to create an account before joining.
Risk: Invite links may be forwarded. Mitigation: invites are single-use and expire after 7 days.

---

## 6. Architecture Impact

**Configuration Changes**
* New pages: `/app/projects`, `/app/projects/[id]`, `/app/projects/[id]/settings`
* Server actions for project create, update, and member invite

**Data Flow Impact**
* `projects` and `project_members` tables populated
* Invite flow: server generates a signed invite token → email sent → token validated on join

---

## 7. Security Considerations

### Assets
* Project metadata, member list

### Threats
* Invite token reuse or forwarding
* Non-admin user accessing project settings

### Controls
* Invite tokens are single-use, signed, and expire after 7 days
* Project settings route gated by admin RLS policy server-side

---

## 8. Failure Handling

* If invite email fails to send, surface error to admin and allow resend
* If invite token is expired, show a clear message with a request-new-invite CTA

---

## 9. Observability

* Project creation events logged (project ID, creator ID)
* Member invitation sent/accepted events logged

---

## 10. Testing Requirements

**Integration Tests**
* Full flow: create project → invite member → member joins → verify role

**Negative Tests**
* Non-admin cannot access `/settings`
* Expired invite token is rejected
* User not in project cannot view project detail

---

## 11. Success Metrics

* Project creation form submits in under 1 second
* Invitation email delivered within 60 seconds

---

## 12. Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| Organisation-wide roles | Simpler | Too coarse — same user needs different roles per project | Rejected |
| Per-project roles (selected) | Accurate to real-world construction teams | Slightly more complex permission logic | Selected |

---

## 13. Rollout Plan

* Phase 1: Project creation and dashboard
* Phase 2: Member invitation and role assignment
* Phase 3: Project settings and archiving
* Rollback: Remove project pages. Existing `projects` and `project_members` rows are soft-deleted via archive.

---

---

# Requirement: Document Upload with Version Tracking

**Date:** 2026-03-03
**Status:** Approved
**Owner:** Engineering
**Related Issue:** #7

---

## 1. Overview

**Purpose:** Allow project members to upload construction documents (PDFs, images, diagrams) and automatically version every upload. Versioning is non-negotiable in a compliance context — every change must be traceable.

**Business or Operational Impact:** Document versioning reduces regulatory risk by providing a full audit trail of what was submitted, when, and by whom.

---

## 2. Scope

**In Scope**

* Drag-and-drop and file picker upload UI
* Supported file types: PDF, PNG, JPG, SVG, DWG
* Files stored in Supabase Storage under `/projects/{project_id}/documents/{doc_id}/{version}/`
* `documents` and `document_versions` records created on each upload
* Re-uploading an existing document creates a new version (not an overwrite)
* Upload progress indicator

**Out of Scope**

* In-browser document viewing (issue #8)
* AI compliance check triggered on upload (issue #14)
* Rich-text document creation (issue #9)

---

## 3. User Story

**As an** architect
**I want** to upload a drawing and have every revision tracked automatically
**So that** reviewers and authorities can see exactly what changed and when

---

## 4. Acceptance Criteria

* [ ] User can upload a file via drag-and-drop or file picker
* [ ] Upload progress is displayed during transfer
* [ ] Uploaded file appears in the project document list after upload
* [ ] Re-uploading a file with the same name creates a new `document_versions` row with an incremented `version_number`
* [ ] File types outside the allowlist are rejected with a user-friendly error
* [ ] Files are stored in a private Supabase Storage bucket (not publicly accessible)
* [ ] A signed URL is required to access any uploaded file
* [ ] `documents.current_version_id` is updated to the latest version on each upload

---

## 5. Assumptions

Assumption: File size limit is 50MB per file for v1.
Risk: Large architectural drawings may exceed this. Mitigation: display clear limit messaging; increase limit post-v1 if needed.

---

## 6. Architecture Impact

**Configuration Changes**
* Supabase Storage bucket created (private)
* New API route: `POST /api/documents/upload`

**Data Flow Impact**
* File → Supabase Storage → `document_versions` record → `documents.current_version_id` updated

---

## 7. Security Considerations

### Assets
* Uploaded construction documents (potentially confidential)

### Threats
* Malicious file upload (executable disguised as PDF)
* Unauthorised access to stored files
* Path traversal in storage keys

### Controls
* MIME type validated server-side against allowlist (not just file extension)
* Storage paths use UUIDs — no user-controlled path segments
* Files served only via short-lived signed URLs (60-second expiry for view, 5-minute for download)
* Only project members with `architect` or `admin` role can upload

---

## 8. Failure Handling

* If Storage upload fails, no `document_versions` record is created (atomic operation)
* Partial uploads are cleaned up via a Supabase Storage lifecycle rule
* Network interruption during upload shows retry option

---

## 9. Observability

* Upload events logged: document ID, version number, file size, uploader ID
* Storage errors logged with document ID and error code

---

## 10. Testing Requirements

**Integration Tests**
* Upload PDF → verify `documents` and `document_versions` records created
* Re-upload → verify version number incremented

**Negative Tests**
* Upload `.exe` file → rejected
* Carpenter role cannot upload
* Unsigned URL returns 403

---

## 11. Success Metrics

* Upload success rate: ≥ 99.5% for files under 50MB
* Upload throughput: at least 5MB/s on standard connection
* Signed URL generation latency: under 200ms

---

## 12. Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| AWS S3 directly | More control | Additional service, no RLS integration | Rejected |
| Store files in DB as BLOBs | Simple | Unscalable, no CDN | Rejected |
| Supabase Storage (selected) | Integrated auth, RLS-compatible, CDN-backed | Limited to Supabase ecosystem | Selected |

---

## 13. Rollout Plan

* Phase 1: Single-file upload to private bucket
* Phase 2: Version tracking and document list update
* Phase 3: Upload progress and error handling
* Rollback: Delete uploaded files and `document_versions` records. No structural changes required.

---

---

# Requirement: Document Viewer

**Date:** 2026-03-03
**Status:** Approved
**Owner:** Engineering
**Related Issue:** #8

---

## 1. Overview

**Purpose:** Allow users to view documents directly in the browser without downloading them. Viewing must be secure — files must not be publicly accessible.

**Business or Operational Impact:** Inline viewing reduces the friction of document review, which is critical to keeping the approval workflow moving.

---

## 2. Scope

**In Scope**

* PDF rendering in-browser (`react-pdf` or signed URL iframe)
* Image viewer with zoom for PNG, JPG, SVG
* Version history sidebar — click to load any past version
* Document metadata panel: uploader, date, version number, change summary
* Download button (generates a fresh signed URL)

**Out of Scope**

* Annotation or markup tools (post-v1)
* DWG (AutoCAD) native rendering — show download-only fallback
* Real-time collaborative viewing (post-v1)

---

## 3. User Story

**As a** civil engineer reviewing documents
**I want** to view PDFs and drawings directly in Bricks
**So that** I can review and comment without switching to an external app

---

## 4. Acceptance Criteria

* [ ] PDF renders in-browser on the document detail page
* [ ] Images render with zoom controls
* [ ] Version history sidebar lists all versions with date and uploader
* [ ] Clicking a past version loads that version in the viewer
* [ ] Metadata panel shows uploader name, upload date, version number, change summary
* [ ] Download button generates a signed URL valid for 5 minutes
* [ ] DWG files display a download-only fallback with a clear label
* [ ] Signed URLs used for all file access — no public bucket URLs

---

## 5. Assumptions

Assumption: `react-pdf` is sufficient for v1 PDF rendering.
Risk: Large or complex PDFs may render slowly. Mitigation: load pages lazily; show loading skeleton.

---

## 6. Architecture Impact

**Data Flow Impact**
* Document page requests a signed URL from a server action; the URL is passed to the viewer component
* Signed URLs expire — the viewer must request a fresh URL if the session persists beyond expiry

---

## 7. Security Considerations

### Assets
* Confidential construction documents

### Threats
* Signed URL harvesting (user shares a signed URL externally)
* Unauthorised version access

### Controls
* Signed URLs expire in 60 seconds for viewing, 5 minutes for download
* Signed URL generation gated by project membership check server-side
* Version access validated against project membership before URL is issued

---

## 8. Failure Handling

* If signed URL generation fails, show error with retry option
* If PDF fails to render, offer download fallback

---

## 9. Observability

* Document view events logged (document ID, version ID, viewer user ID)

---

## 10. Testing Requirements

**Integration Tests**
* Document page loads correct version content
* Version switch loads new content

**Negative Tests**
* Non-project-member cannot generate a signed URL for project documents
* Expired signed URL returns 403

---

## 11. Success Metrics

* PDF first-page render time (p95): under 3 seconds
* Signed URL generation latency: under 200ms
* Version switch latency: under 500ms

---

## 12. Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| Google Docs Viewer embed | No dependencies | Sends file to Google servers; not acceptable for confidential documents | Rejected |
| react-pdf (selected) | Fully in-browser, no external service | Bundle size overhead | Selected |

---

## 13. Rollout Plan

* Phase 1: PDF and image viewing with signed URLs
* Phase 2: Version history sidebar
* Phase 3: DWG fallback and metadata panel
* Rollback: Remove viewer page. No data changes required.

---

---

# Requirement: Rich-Text Document Creation

**Date:** 2026-03-03
**Status:** Approved
**Owner:** Engineering
**Related Issue:** #9

---

## 1. Overview

**Purpose:** Allow users to create structured documents (project proposals, inspection reports, approval applications) directly in Bricks — not just upload external files.

**Business or Operational Impact:** Native document creation reduces reliance on external tools (Word, Google Docs) and keeps all documentation within the compliant, version-controlled environment.

---

## 2. Scope

**In Scope**

* Tiptap rich-text editor with headings, tables, lists, bold, italic
* Auto-save every 30 seconds (saves as a new draft version)
* Explicit save creates a new `document_version` with Tiptap JSON content
* Image embedding (from Supabase Storage)
* PDF export of the current version

**Out of Scope**

* Real-time collaborative editing (post-v1 — requires Yjs or similar)
* Custom document templates (post-v1)
* Track changes / diff view (post-v1)

---

## 3. User Story

**As an** architect
**I want** to write a project proposal directly in Bricks
**So that** it is automatically versioned and can be reviewed without exporting to a separate file

---

## 4. Acceptance Criteria

* [ ] Editor renders with heading, paragraph, table, list, bold, italic, and image tools
* [ ] Auto-save runs every 30 seconds and creates/updates a draft version
* [ ] Explicit "Save" creates a new `document_version` record with Tiptap JSON content
* [ ] Images can be embedded from a file picker that uploads to Supabase Storage
* [ ] "Export to PDF" generates a downloadable PDF of the current content
* [ ] Version history sidebar shows all saved versions of the rich-text document
* [ ] Auto-save indicator shows last saved time to the user

---

## 5. Assumptions

Assumption: Tiptap JSON is stored in `document_versions.rich_text_content` column (JSONB).
Risk: Large documents may produce large JSON payloads. Mitigation: compress content or paginate for very large documents post-v1.

---

## 6. Architecture Impact

**Configuration Changes**
* `document_versions.content_type` distinguishes `file` from `rich_text`
* New server action: `saveDocumentVersion(docId, content)`

**Data Flow Impact**
* Auto-save: client → server action → `document_versions` upsert
* PDF export: server renders Tiptap JSON to PDF using a headless renderer

---

## 7. Security Considerations

### Assets
* Document content (potentially sensitive legal/business information)

### Threats
* XSS via embedded HTML in Tiptap output
* Unauthorised writes via server action

### Controls
* Tiptap configured with `StarterKit` only — no raw HTML nodes unless explicitly enabled
* Server action validates user has `architect` or `admin` role before writing
* PDF export runs server-side — client receives a download link, not raw HTML

---

## 8. Failure Handling

* Auto-save failure surfaced as a persistent warning banner (not a modal)
* If save fails, content is preserved in editor state and retried on next auto-save interval
* PDF export failure shows retry option

---

## 9. Observability

* Auto-save events logged with document ID and version number
* PDF export events logged

---

## 10. Testing Requirements

**Integration Tests**
* Save creates a new `document_versions` row with correct JSON content
* Auto-save creates a draft version after 30 seconds of inactivity

**Negative Tests**
* Carpenter cannot save a new version
* Malicious HTML in content is sanitised before storage

---

## 11. Success Metrics

* Auto-save latency (p95): under 1 second
* PDF export generation time (p95): under 5 seconds
* Zero XSS vulnerabilities from editor output

---

## 12. Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| Quill | Mature | Less TypeScript support, harder to extend | Rejected |
| Slate.js | Flexible | Lower-level, requires more custom work | Rejected |
| Tiptap (selected) | TypeScript-native, extensible, active community | Larger bundle than minimal editors | Selected |

---

## 13. Rollout Plan

* Phase 1: Basic editor with save and version tracking
* Phase 2: Auto-save and version history
* Phase 3: Image embedding and PDF export
* Rollback: Remove editor pages. Saved versions remain in `document_versions` (no data loss).

---

---

# Requirement: Comments and Annotation on Documents

**Date:** 2026-03-03
**Status:** Approved
**Owner:** Engineering
**Related Issue:** #10

---

## 1. Overview

**Purpose:** Allow project members to leave threaded comments on specific document versions to collaborate on reviews without switching to external tools.

**Business or Operational Impact:** Centralised comments eliminate the need for email threads or external tools, keeping the review record attached to the document version it refers to.

---

## 2. Scope

**In Scope**

* Threaded comment UI on the document page
* Comments scoped to a specific `document_version`
* `@mention` of project members by name
* Comment resolution (mark as resolved / reopen)
* Basic email notification on new comment (see also issue #19)

**Out of Scope**

* Inline PDF annotations (post-v1)
* Emoji reactions (post-v1)
* Comment editing after posting (post-v1)

---

## 3. User Story

**As a** civil engineer
**I want** to leave comments on a specific document version
**So that** the architect knows exactly what needs to change and the feedback is attached to that version permanently

---

## 4. Acceptance Criteria

* [ ] Members can post a comment on a document version
* [ ] Comments are displayed in chronological order with author and timestamp
* [ ] Replies are nested under the parent comment (1 level of nesting)
* [ ] `@mention` triggers an in-app notification to the mentioned user
* [ ] A comment can be marked as resolved by the document owner or comment author
* [ ] Resolved comments are visually distinct from open comments
* [ ] Comments are immutably tied to the `document_version` they were posted on
* [ ] A non-project member cannot read or post comments

---

## 5. Assumptions

Assumption: 1 level of comment nesting (reply to comment, not reply to reply).
Risk: Deep threads may be needed for complex reviews. Mitigation: allow multiple replies at 1 level; expand nesting post-v1 if needed.

---

## 6. Architecture Impact

**Data Flow Impact**
* `comments` table: `id`, `document_version_id`, `author_id`, `parent_id` (nullable), `content`, `resolved`, `created_at`
* `@mention` parsing runs server-side on comment submit

---

## 7. Security Considerations

### Assets
* Comment content (may reference sensitive legal or design decisions)

### Threats
* XSS via comment content
* Non-member reading comments via direct API call

### Controls
* Comment content sanitised on server before storage
* RLS restricts comment access to project members
* `@mention` resolution done server-side — client sends user IDs, not resolved names

---

## 8. Failure Handling

* Failed comment submit shows error inline with retry option
* If notification fails to send, comment is still saved

---

## 9. Observability

* Comment posted events logged with document version ID
* Resolution events logged with resolver user ID

---

## 10. Testing Requirements

**Integration Tests**
* Post comment → appears in thread with author and timestamp
* Resolve comment → status updated, visual change confirmed

**Negative Tests**
* Non-member cannot POST a comment
* XSS payload in comment content is sanitised

---

## 11. Success Metrics

* Comment post latency (p95): under 500ms
* Zero XSS vulnerabilities from comment content

---

## 12. Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| Linear-style threaded comments (selected) | Familiar UX | Less flexible than annotation tools | Selected |
| Inline PDF annotation | Rich review experience | Complex to implement; out of scope for v1 | Rejected |

---

## 13. Rollout Plan

* Phase 1: Post and display comments on document versions
* Phase 2: Threaded replies and resolution
* Phase 3: `@mentions` and notifications
* Rollback: Remove comment UI. `comments` table rows can be retained.

---

---

# Requirement: Document Review and Approval Workflow

**Date:** 2026-03-03
**Status:** Approved
**Owner:** Engineering
**Related Issue:** #11

---

## 1. Overview

**Purpose:** Enforce a formal document lifecycle — Draft → In Review → Approved / Changes Requested → Submitted — with role-appropriate gates at each transition. Approval locks the document version to ensure what is submitted to authorities is exactly what was approved.

**Business or Operational Impact:** Without a formal approval workflow, there is no guarantee that the submitted document matches the reviewed version. This is a direct regulatory risk.

---

## 2. Scope

**In Scope**

* `status` field on `documents` table with states: `draft`, `in_review`, `approved`, `changes_requested`, `submitted`
* "Submit for Review" action (architect/admin only)
* "Approve" and "Request Changes" actions (civil engineer/admin only)
* Version immutability on approval — no further edits without creating a new version
* Audit log: every status transition recorded with actor and timestamp

**Out of Scope**

* Multi-stage approval chains (e.g., internal approval then external) — post-v1
* Digital signatures — post-v1
* Direct submission to authority portals (issue #18)

---

## 3. User Story

**As a** civil engineer
**I want** to formally approve or request changes on a document
**So that** only reviewed, approved content can be submitted to city authorities

---

## 4. Acceptance Criteria

* [ ] Only `architect` or `admin` can transition a document from `draft` to `in_review`
* [ ] Only `civil_engineer` or `admin` can transition to `approved` or `changes_requested`
* [ ] An `approved` document version cannot be edited — only a new version can be created
* [ ] Every status transition is written to an audit log with actor user ID, timestamp, and previous/new status
* [ ] Reviewers are notified when a document is submitted for review
* [ ] Document owner is notified when a review decision is made
* [ ] Status is visible on the document list and document detail page
* [ ] "Changes Requested" requires a comment from the reviewer

---

## 5. Assumptions

Assumption: A single reviewer can approve a document (no multi-approver quorum).
Risk: Some organisations may require multiple sign-offs. Mitigation: design audit log to support multiple actors; multi-approver can be added post-v1.

---

## 6. Architecture Impact

**Configuration Changes**
* `documents.status` enum column updated
* New `document_status_history` audit table (or append-only log)

**Data Flow Impact**
* Status transition: server action validates role → updates `documents.status` → writes audit log row → triggers notification

---

## 7. Security Considerations

### Assets
* Document approval integrity — the record of what was approved and by whom

### Threats
* Role spoofing to self-approve a document
* Audit log tampering

### Controls
* Status transition RLS policy restricts transitions by role
* Audit log is append-only (no UPDATE or DELETE policy on `document_status_history`)
* Audit log records Supabase `auth.uid()` — cannot be spoofed by the client

---

## 8. Failure Handling

* If notification fails, status transition is still committed (notification is non-blocking)
* If audit log write fails, status transition is rolled back (audit trail is mandatory)

---

## 9. Observability

* All status transitions logged with actor, document ID, version ID, timestamp
* Approval latency tracked (time from `in_review` to `approved`)

---

## 10. Testing Requirements

**Integration Tests**
* Full lifecycle: draft → in_review → approved → submitted

**Negative Tests**
* Architect cannot approve their own document
* Carpenter cannot submit for review
* Approved version rejects edit attempt

---

## 11. Success Metrics

* Status transition latency (p95): under 500ms
* Audit log completeness: 100% of transitions recorded
* Zero cases of approved document content being mutated

---

## 12. Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| External workflow tool | Feature-rich | Breaks the single-platform experience | Rejected |
| Simple boolean approved flag | Simple | No audit trail, no intermediate states | Rejected |
| Status enum + audit log (selected) | Full lifecycle, auditable | More schema and logic | Selected |

---

## 13. Rollout Plan

* Phase 1: Status field and UI indicators
* Phase 2: Role-gated transitions with server-side enforcement
* Phase 3: Audit log and notifications
* Rollback: Reset status to `draft`. Audit log rows retained.

---

---

# Requirement: Claude API Integration (AI Foundation)

**Date:** 2026-03-03
**Status:** Approved
**Owner:** Engineering
**Related Issue:** #12

---

## 1. Overview

**Purpose:** Wire up the Claude API and Vercel AI SDK to establish the AI infrastructure that all AI features (#13–#16) are built on.

**Business or Operational Impact:** Unblocks all AI features. Without this, compliance checking, suggestions, and document generation cannot be implemented.

---

## 2. Scope

**In Scope**

* Vercel AI SDK (`ai`, `@ai-sdk/anthropic`) installation
* Base streaming API route: `POST /api/ai/chat`
* `ANTHROPIC_API_KEY` environment variable setup
* Reusable server-side Claude invocation helper in `lib/ai/`
* Dev-only AI test panel (hidden in production)

**Out of Scope**

* RAG pipeline (issue #13)
* Any specific AI feature (issues #14–#16)
* Fine-tuning or custom models

---

## 3. User Story

**As an** engineer building AI features
**I want** a tested, reusable Claude API integration
**So that** I don't have to re-implement streaming and error handling in each AI feature

---

## 4. Acceptance Criteria

* [ ] `POST /api/ai/chat` returns a streamed response from Claude for a test prompt
* [ ] `ANTHROPIC_API_KEY` is stored in environment variables only — never in source code
* [ ] The API key is confirmed absent from the client-side bundle
* [ ] Streaming response renders progressively in the test panel
* [ ] API route returns a structured error if Claude API is unavailable
* [ ] Helper function in `lib/ai/claude.ts` wraps the SDK for reuse across routes

---

## 5. Assumptions

Assumption: Default model is `claude-sonnet-4-6`.
Risk: Model updates may change output format. Mitigation: pin model ID in environment configuration; update intentionally.

---

## 6. Architecture Impact

**Configuration Changes**
* `ANTHROPIC_API_KEY` added to `.env.local` and `.env.example`
* New file: `lib/ai/claude.ts`
* New route: `app/api/ai/chat/route.ts`

---

## 7. Security Considerations

### Assets
* `ANTHROPIC_API_KEY` — grants access to Claude API billing account

### Threats
* API key exposed to client bundle
* Unauthenticated users invoking the AI route (cost abuse)

### Controls
* Key only accessed in server-side code
* `/api/ai/chat` route requires authenticated session before invoking Claude
* Rate limiting on the route (per user, per minute) — implement via Supabase or Vercel middleware

---

## 8. Failure Handling

* Claude API unavailable → return structured error `{ error: "AI service unavailable" }` with `503`
* Timeout after 30 seconds → return `{ error: "Request timed out" }` with `504`

---

## 9. Observability

* AI request events logged: user ID, model, prompt token count (not prompt content)
* Error events logged with status code and error type

---

## 10. Testing Requirements

**Integration Tests**
* `POST /api/ai/chat` with a valid session returns a stream
* Streaming response fully received before timeout

**Negative Tests**
* Unauthenticated request returns 401
* Invalid API key returns structured error (not raw Anthropic error)

---

## 11. Success Metrics

* First token latency (p95): under 2 seconds
* Stream completion latency (p95): under 15 seconds for typical prompts
* Zero occurrences of API key in client bundle

---

## 12. Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| OpenAI API | Mature ecosystem | Less strong on document analysis; not preferred | Rejected |
| Direct Anthropic SDK | Maximum control | Vercel AI SDK adds streaming, tool use, and multi-provider support | Rejected |
| Vercel AI SDK + Anthropic (selected) | Streaming, tool use, React hooks, multi-provider | Slight abstraction overhead | Selected |

---

## 13. Rollout Plan

* Phase 1: API route and helper function
* Phase 2: Dev test panel (hidden in production)
* Phase 3: Rate limiting
* Rollback: Remove API route. No data is written.

---

---

# Requirement: RAG Pipeline — Legal Knowledge Ingestion

**Date:** 2026-03-03
**Status:** Approved
**Owner:** Engineering
**Related Issue:** #13

---

## 1. Overview

**Purpose:** Build the knowledge base that powers AI compliance checking and suggestions — by ingesting Norwegian city codes, legal requirements, and construction specifications into a vector database for semantic retrieval.

**Business or Operational Impact:** Without a curated, searchable knowledge base, AI compliance checks and suggestions would be generic rather than grounded in actual Norwegian law. This is the core differentiator of the product.

---

## 2. Scope

**In Scope**

* `knowledge_sources` and `embeddings` tables in Supabase with `pgvector`
* Ingestion pipeline: PDF or URL input → text extraction → chunking → embedding → storage
* Admin UI page to add and manage knowledge sources
* `match_documents` similarity search RPC function in Supabase
* Language tagging on each embedded chunk (`no` / `en`)

**Out of Scope**

* Automated crawling of legal websites (admin-upload only for v1)
* Automatic re-ingestion on legal updates (manual re-ingest for v1)
* Real-time streaming of ingestion progress (batch process for v1)

---

## 3. User Story

**As a** Bricks admin
**I want** to upload legal documents and construction specifications
**So that** the AI can reference accurate, current Norwegian regulations when checking user documents

---

## 4. Acceptance Criteria

* [ ] Admin can upload a PDF via the admin UI and it is ingested into the pipeline
* [ ] Text is extracted, chunked into ~500-token overlapping segments, and embedded
* [ ] Embeddings are stored in the `embeddings` table with source metadata and language tag
* [ ] `match_documents(query_embedding, match_count, language)` RPC returns the top-K relevant chunks
* [ ] Only users with `admin` role (global, not project-level) can add knowledge sources
* [ ] A similarity search query returns results in under 500ms

---

## 5. Assumptions

Assumption: Embeddings are generated using the Claude API or OpenAI `text-embedding-3-small`.
Risk: Embedding model change would require re-embedding all existing chunks. Mitigation: store the embedding model name alongside each embedding.

Assumption: Chunk size of ~500 tokens with 50-token overlap is appropriate for legal text.
Risk: Suboptimal retrieval if legal clauses span chunk boundaries. Mitigation: validate retrieval quality with sample queries before launch.

---

## 6. Architecture Impact

**Configuration Changes**
* `pgvector` extension must be enabled (issue #2 prerequisite)
* New tables: `knowledge_sources`, `embeddings`
* New API route: `POST /api/rag/ingest`

**Data Flow Impact**
* PDF → text extract → chunk → embed → store in `embeddings`
* Query: embedding of query text → `match_documents` RPC → top-K chunks returned

---

## 7. Security Considerations

### Assets
* Legal documents (may be public, but ingestion pipeline is admin-only)

### Threats
* Non-admin uploading malicious content to pollute the knowledge base

### Controls
* Ingestion API route gated to global `admin` role
* PDF text extraction sandboxed (no code execution from PDF content)
* Maximum file size enforced on ingestion endpoint

---

## 8. Failure Handling

* If embedding generation fails for a chunk, log and skip (do not halt full ingestion)
* If ingestion partially fails, mark the `knowledge_sources` row as `partial` for re-processing
* Retry failed chunks up to 3 times before marking as failed

---

## 9. Observability

* Ingestion events logged: source ID, chunk count, embedding model, duration
* Failed chunks logged with chunk index and error

---

## 10. Testing Requirements

**Integration Tests**
* Ingest a sample Norwegian building code PDF → verify chunks and embeddings in DB
* `match_documents` RPC returns relevant chunks for a test query

**Negative Tests**
* Non-admin cannot call the ingestion API
* Malformed PDF is rejected gracefully

---

## 11. Success Metrics

* Ingestion throughput: at least 100 chunks per minute
* Similarity search latency (p95): under 500ms
* Retrieval relevance: top-1 result is relevant for ≥ 80% of test queries (manual evaluation)

---

## 12. Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| Pinecone | Managed vector DB | Additional service, cost, no SQL joins | Rejected |
| pgvector in Supabase (selected) | Integrated with existing DB, SQL-joinable | Performance limits at very large scale | Selected |
| ChromaDB | Simple setup | No cloud-hosted managed option | Rejected |

---

## 13. Rollout Plan

* Phase 1: Schema and ingestion pipeline
* Phase 2: Admin UI for knowledge source management
* Phase 3: `match_documents` RPC and retrieval validation
* Rollback: Truncate `embeddings` and `knowledge_sources`. No user data affected.

---

---

# Requirement: AI Compliance Check on Uploaded Documents

**Date:** 2026-03-03
**Status:** Approved
**Owner:** Engineering
**Related Issue:** #14

---

## 1. Overview

**Purpose:** Automatically check uploaded documents against relevant Norwegian city codes and legal requirements using AI, flagging potential compliance issues before submission to authorities.

**Business or Operational Impact:** Early compliance checking reduces the number of rejected submissions to city authorities, saving time and cost for construction companies.

---

## 2. Scope

**In Scope**

* Async compliance check triggered on document upload and on submission for review
* PDF text extraction from the uploaded document
* RAG retrieval of relevant legal chunks (issue #13 prerequisite)
* Structured Claude output: list of issues with severity, description, and legal source reference
* `compliance_checks` table storing results
* Compliance report UI on the document detail page
* Ability to dismiss false positives with a reason

**Out of Scope**

* Real-time compliance checking while the user types (post-v1)
* Compliance checking of DWG/image files (text-only for v1)
* Automated fix suggestions (issue #15)

---

## 3. User Story

**As an** architect
**I want** my uploaded document automatically checked against Norwegian building regulations
**So that** I catch compliance issues before a reviewer or authority does

---

## 4. Acceptance Criteria

* [ ] Compliance check is triggered automatically within 5 seconds of document upload
* [ ] Check completes and results appear on the document page within 30 seconds for typical documents
* [ ] Each issue includes: severity (`high`/`medium`/`low`), description, and reference to the specific legal source
* [ ] Compliance report is stored in `compliance_checks` table linked to the `document_version`
* [ ] User can dismiss a false positive with a mandatory reason string
* [ ] Dismissed issues are visually distinguished from open issues
* [ ] A loading indicator is shown while the check is running
* [ ] If check fails, a clear error message is shown with a retry option

---

## 5. Assumptions

Assumption: Compliance checks run as background jobs (not blocking the upload response).
Risk: User may not wait for results. Mitigation: notify user when check completes (in-app notification).

Assumption: Text extraction covers standard construction PDFs.
Risk: Scanned PDFs (image-based) have no extractable text. Mitigation: detect image-only PDFs and show a "manual review required" notice.

---

## 6. Architecture Impact

**Configuration Changes**
* New table: `compliance_checks`
* New API route: `POST /api/ai/compliance`
* Background job or Supabase Edge Function triggers the check

**Data Flow Impact**
* Upload complete → async trigger → text extract → RAG retrieval → Claude → store results → notify user

---

## 7. Security Considerations

### Assets
* Document content sent to Claude API

### Threats
* Prompt injection via malicious document content
* PII within documents sent to external API

### Controls
* System prompt instructs Claude to ignore instructions in document text
* Document text wrapped in XML tags to separate it from instructions
* Data Processing Agreement with Anthropic required before processing customer documents

---

## 8. Failure Handling

* Claude API timeout → store `status: failed` in `compliance_checks`, notify user, allow retry
* Text extraction failure → store `status: unsupported`, show manual review notice
* Partial RAG retrieval → proceed with available chunks, note limited context in report

---

## 9. Observability

* Compliance check start/complete/fail events logged with document version ID and duration
* Issue count and severity distribution tracked as metrics

---

## 10. Testing Requirements

**Integration Tests**
* Upload a sample document → verify `compliance_checks` row created with at least one issue
* Dismiss an issue → verify status updated in DB

**Negative Tests**
* Scanned PDF (no text) → shows manual review notice, no crash
* Prompt injection in document text → Claude ignores the injected instruction

---

## 11. Success Metrics

* Check completion rate: ≥ 95% of standard PDFs
* Check latency (p95): under 30 seconds
* False positive rate: under 15% (measured via dismissed issues with reason)

---

## 12. Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| Rules-based compliance engine | Deterministic | Cannot interpret nuanced legal language | Rejected |
| AI without RAG | Simpler | Hallucinations without grounding in actual regulations | Rejected |
| RAG + Claude (selected) | Grounded, contextual, explainable | Dependent on quality of ingested legal corpus | Selected |

---

## 13. Rollout Plan

* Phase 1: Async compliance check on upload
* Phase 2: Results UI and dismiss flow
* Phase 3: Notification when check completes
* Rollback: Disable async trigger. Existing `compliance_checks` rows retained.

---

---

# Requirement: AI Document Improvement Suggestions

**Date:** 2026-03-03
**Status:** Approved
**Owner:** Engineering
**Related Issue:** #15

---

## 1. Overview

**Purpose:** On demand, AI reviews a document and suggests improvements — missing sections, unclear language, incomplete specifications — grounded in legal requirements and best practices.

**Business or Operational Impact:** Proactive suggestions reduce review cycles and improve document quality before formal submission, saving time for both architects and reviewers.

---

## 2. Scope

**In Scope**

* "Get AI suggestions" button on the document detail page
* Streaming suggestions panel rendered in real time
* Structured suggestion format: type, description, recommended fix
* Accept (applies suggestion to the Tiptap editor) or dismiss each suggestion
* Accepted suggestions logged for product feedback

**Out of Scope**

* Suggestions inline within the PDF viewer (post-v1)
* Automatic application of all suggestions (user must review each)
* Suggestions on image or DWG files (text-only for v1)

---

## 3. User Story

**As an** architect
**I want** AI to suggest improvements to my document before I submit it for review
**So that** my reviewer spends less time on obvious issues and I get faster approvals

---

## 4. Acceptance Criteria

* [ ] "Get AI suggestions" button visible to `architect` and `admin` roles
* [ ] Clicking the button streams suggestions in real time in a side panel
* [ ] Each suggestion has a type (`missing_section` / `unclear` / `non_compliant`), description, and recommended fix
* [ ] User can accept or dismiss each suggestion individually
* [ ] Accepting a suggestion inserts the recommended fix text at the correct position in the Tiptap editor
* [ ] Accepted and dismissed suggestions are logged in the DB
* [ ] Suggestions reference the relevant legal source where applicable
* [ ] Panel shows a loading state until the first suggestion streams in

---

## 5. Assumptions

Assumption: Suggestions are generated once per request (not continuously updated as the user edits).
Risk: Suggestions may become stale after edits. Mitigation: show a "refresh suggestions" button after edits.

---

## 6. Architecture Impact

**Data Flow Impact**
* Document text + RAG chunks → Claude stream → client renders suggestions progressively
* Accepted/dismissed actions → server action → `suggestion_logs` table

---

## 7. Security Considerations

### Assets
* Document content sent to Claude

### Threats
* Prompt injection via document content influencing suggestion output

### Controls
* Document text and RAG context wrapped in XML delimiters in the prompt
* Suggestion output validated against expected schema before display

---

## 8. Failure Handling

* Stream interruption → show partial suggestions with "suggestions may be incomplete" notice
* Claude API error → show error with retry option; suggestions panel does not crash

---

## 9. Observability

* Suggestion request events logged: document ID, suggestion count
* Accept/dismiss events logged with suggestion type

---

## 10. Testing Requirements

**Integration Tests**
* Request suggestions for a known incomplete document → at least one `missing_section` suggestion returned

**Negative Tests**
* Carpenter cannot access suggestions panel
* Malformed Claude response is caught and does not crash the panel

---

## 11. Success Metrics

* First suggestion stream latency (p95): under 3 seconds
* Suggestion acceptance rate: ≥ 30% (indicates suggestions are useful)
* Zero crashes from malformed Claude output

---

## 12. Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| Batch suggestions (non-streaming) | Simpler | Poor UX for long documents | Rejected |
| Streaming via Vercel AI SDK (selected) | Progressive UX, faster perceived response | Slightly more complex client code | Selected |

---

## 13. Rollout Plan

* Phase 1: Streaming suggestions panel
* Phase 2: Accept/dismiss with Tiptap integration
* Phase 3: Suggestion logging and feedback loop
* Rollback: Remove suggestion button and panel. No data dependencies.

---

---

# Requirement: AI-Assisted Document Generation

**Date:** 2026-03-03
**Status:** Approved
**Owner:** Engineering
**Related Issue:** #16

---

## 1. Overview

**Purpose:** Allow users to generate a first draft of a project proposal or approval application using AI, based on a structured wizard input. This dramatically reduces the time to produce compliant documentation from scratch.

**Business or Operational Impact:** Reduces document creation time from hours to minutes for standard project types, increasing the platform's value proposition for new users.

---

## 2. Scope

**In Scope**

* "Generate document" wizard (project type, location, scope, key specs)
* AI generates a structured draft referencing relevant Norwegian building codes
* Draft opens directly in the Tiptap editor
* Generation streamed in real time so the user sees the document being written

**Out of Scope**

* Custom templates stored by the user (post-v1)
* Generation of PDF/DWG files — text documents only
* Multi-language generation in a single request (one language per generation)

---

## 3. User Story

**As an** architect starting a new project
**I want** to generate a compliant proposal draft in seconds
**So that** I have a solid foundation to edit rather than starting from a blank page

---

## 4. Acceptance Criteria

* [ ] Wizard collects: project type, location (municipality), scope description, key structural specs
* [ ] "Generate" button is only available to `architect` and `admin` roles
* [ ] Generation streams directly into the Tiptap editor in real time
* [ ] Generated content includes section headings and references to relevant Norwegian regulations
* [ ] Draft is automatically saved as a new `document_version` with status `draft` when generation completes
* [ ] User can edit the draft immediately after generation
* [ ] Generation completes for a standard proposal in under 60 seconds

---

## 5. Assumptions

Assumption: Municipality name is used to retrieve location-specific regulations from the knowledge base.
Risk: Knowledge base may not have municipality-specific data. Mitigation: fall back to national regulations and indicate this to the user.

---

## 6. Architecture Impact

**Data Flow Impact**
* Wizard inputs → server action → RAG retrieval for location + type → Claude stream → Tiptap → save as `document_version`

---

## 7. Security Considerations

### Assets
* User wizard inputs may contain sensitive project details

### Threats
* Prompt injection via wizard text inputs

### Controls
* Wizard inputs sanitised and length-limited before inclusion in Claude prompt
* Input fields wrapped in XML delimiters in the system prompt

---

## 8. Failure Handling

* Generation timeout (>60 seconds) → stop stream, show partial draft with "generation timed out" notice
* Claude error → show error with option to retry

---

## 9. Observability

* Generation events logged: project type, municipality, duration, token count

---

## 10. Testing Requirements

**Integration Tests**
* Complete wizard → generated draft saved as `document_version` with status `draft`

**Negative Tests**
* Carpenter cannot access the generation wizard
* Prompt injection in wizard inputs does not affect system prompt behaviour

---

## 11. Success Metrics

* Generation completion rate: ≥ 90%
* Generation latency (p95): under 60 seconds
* User edit rate post-generation: ≥ 80% (indicates draft is useful but correctly treated as a draft)

---

## 12. Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| Pre-written templates | Zero AI cost | Not adaptive to project specifics | Rejected |
| AI without RAG | Simpler | Hallucinated regulation references | Rejected |
| RAG + Claude streaming (selected) | Grounded, real-time UX | Requires quality knowledge base (issue #13) | Selected |

---

## 13. Rollout Plan

* Phase 1: Wizard UI and Claude generation
* Phase 2: Tiptap streaming integration
* Phase 3: Auto-save on generation complete
* Rollback: Remove wizard. No schema changes required.

---

---

# Requirement: Internationalisation (Norwegian and English)

**Date:** 2026-03-03
**Status:** Approved
**Owner:** Engineering
**Related Issue:** #17

---

## 1. Overview

**Purpose:** Make the entire UI available in Norwegian (Bokmål) and English, with the architecture supporting future expansion to Polish and other languages.

**Business or Operational Impact:** Norwegian is the primary market. English is required for international firms and architects working on Norwegian projects. Without i18n, the platform is inaccessible to a significant portion of the target market.

---

## 2. Scope

**In Scope**

* `next-intl` configuration with locale routing: `/no/...` and `/en/...`
* All UI strings extracted to `messages/no.json` and `messages/en.json`
* Language switcher in the navigation bar
* Language preference persisted to `profiles.language` in Supabase
* AI prompts include the user's locale instruction (`Respond in Norwegian.`)
* RAG retrieval filters by language tag (prefers user's locale)

**Out of Scope**

* Right-to-left language support
* Machine translation of legal documents in the knowledge base
* Currency or date format localisation beyond what next-intl provides

---

## 3. User Story

**As a** Norwegian architect
**I want** the entire Bricks interface in Norwegian
**So that** I can use the platform comfortably without having to read English

---

## 4. Acceptance Criteria

* [ ] All UI text switches language without a full page reload when the user changes locale
* [ ] Locale preference is saved to `profiles.language` after switching
* [ ] On next login, the user's saved locale is applied automatically
* [ ] AI responses are in the user's selected language
* [ ] RAG retrieval prioritises knowledge source chunks tagged with the user's locale
* [ ] Adding a new language requires only adding a `messages/{locale}.json` file and registering the locale

---

## 5. Assumptions

Assumption: Norwegian Bokmål (`no`) is the only Norwegian variant required for v1.
Risk: Nynorsk users may be underserved. Mitigation: document as a known gap; add `nn` locale post-v1 if needed.

---

## 6. Architecture Impact

**Configuration Changes**
* `i18n.ts` — locale configuration
* `middleware.ts` — locale detection and redirect
* All page components use `useTranslations` or `getTranslations`

**Data Flow Impact**
* User locale resolved from: (1) saved profile preference, (2) browser `Accept-Language` header, (3) default `no`

---

## 7. Security Considerations

### Assets
* Translation files (public, no secrets)

### Threats
* XSS via unsanitised translation strings containing HTML

### Controls
* All translation strings are plain text — no HTML interpolation allowed
* next-intl escapes values by default

---

## 8. Failure Handling

* If a translation key is missing, fall back to English and log the missing key
* If locale preference cannot be saved, fall back to browser locale silently

---

## 9. Observability

* Missing translation key events logged with key name and locale
* Locale distribution tracked as a product metric

---

## 10. Testing Requirements

**Integration Tests**
* Switch locale → all visible strings update to the correct language

**Negative Tests**
* Missing translation key falls back to English without error
* Invalid locale in URL redirects to default locale

---

## 11. Success Metrics

* 100% of UI strings extracted to translation files (zero hardcoded strings)
* Missing translation rate: 0% in production for `no` and `en`
* Language switch latency: under 200ms (client-side)

---

## 12. Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| react-i18next | Mature | Not App Router native; client-side only | Rejected |
| next-intl (selected) | App Router native, server + client support, locale routing | Slightly more setup | Selected |

---

## 13. Rollout Plan

* Phase 1: Locale routing and navigation switcher
* Phase 2: All UI strings extracted and translated
* Phase 3: AI locale awareness and RAG language filtering
* Rollback: Remove locale routing. No data schema changes required.

---

---

# Requirement: External Integrations Framework

**Date:** 2026-03-03
**Status:** Approved
**Owner:** Engineering
**Related Issue:** #18

---

## 1. Overview

**Purpose:** Provide a structured, secure mechanism for Bricks to notify and receive events from external systems — city authority portals, project management tools, and other construction software.

**Business or Operational Impact:** Integration with authority portals reduces manual re-entry of data on submission. Outbound webhooks enable customers to connect Bricks to their existing workflows.

---

## 2. Scope

**In Scope**

* `integrations` table: type, config (encrypted), project ID, status
* Outbound webhooks: fire on document approval/status change
* Inbound webhook receiver: `POST /api/webhooks/{integration_id}`
* API key management for external systems calling Bricks
* `integrations_log` table: all events with payload, status, timestamp

**Out of Scope**

* Pre-built integrations with specific authority portals (custom per municipality — post-v1)
* OAuth-based integrations (post-v1)
* Real-time bidirectional sync (post-v1)

---

## 3. User Story

**As a** project admin
**I want** to configure a webhook URL for my project
**So that** our project management system is automatically notified when a document is approved

---

## 4. Acceptance Criteria

* [ ] Admin can configure a webhook URL and secret for a project
* [ ] Document approval triggers a `POST` to the configured webhook URL within 5 seconds
* [ ] Outbound payload is signed with HMAC-SHA256 using the configured secret
* [ ] Inbound webhook endpoint validates HMAC signature before processing
* [ ] All inbound and outbound events are logged in `integrations_log`
* [ ] Failed outbound webhook is retried up to 3 times with exponential backoff
* [ ] Admin can view integration log entries for their project

---

## 5. Assumptions

Assumption: Webhook secrets are stored encrypted in the database.
Risk: If encryption key is compromised, secrets are exposed. Mitigation: use Supabase Vault or environment-variable-based encryption key rotation.

---

## 6. Architecture Impact

**Configuration Changes**
* New tables: `integrations`, `integrations_log`
* New routes: `POST /api/webhooks/{integration_id}` (inbound), background job for outbound

---

## 7. Security Considerations

### Assets
* Webhook secrets, integration configs

### Threats
* Webhook URL pointing to internal network (SSRF)
* Replay attacks on inbound webhooks
* Malicious inbound payload

### Controls
* Outbound webhook URLs validated against blocklist of private IP ranges (SSRF prevention)
* Inbound webhooks include timestamp; reject events older than 5 minutes (replay prevention)
* Inbound payload schema validated before processing
* Webhook secrets encrypted at rest

---

## 8. Failure Handling

* Outbound delivery failure: retry 3 times with exponential backoff; mark as `failed` after all retries
* Inbound signature failure: return `401`, log attempt with source IP

---

## 9. Observability

* All outbound events logged with destination URL (not secret), status, response code
* All inbound events logged with integration ID, status, payload hash

---

## 10. Testing Requirements

**Integration Tests**
* Document approval → outbound webhook fires with correct payload and signature

**Negative Tests**
* Inbound request with invalid signature returns 401
* Outbound URL pointing to `localhost` is rejected
* Replay of inbound event older than 5 minutes is rejected

---

## 11. Success Metrics

* Outbound webhook delivery rate: ≥ 99% (including retries)
* Inbound processing latency (p95): under 500ms
* Zero SSRF vulnerabilities

---

## 12. Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| Third-party webhook service (e.g., Svix) | Managed reliability | Additional vendor, cost | Deferred to post-v1 if scale requires |
| Custom webhook framework (selected) | Full control, no vendor | More implementation effort | Selected for v1 |

---

## 13. Rollout Plan

* Phase 1: Outbound webhook on document status change
* Phase 2: Inbound webhook receiver with signature validation
* Phase 3: Integration log UI and retry visibility
* Rollback: Disable outbound triggers. Log entries retained.

---

---

# Requirement: Notifications System

**Date:** 2026-03-03
**Status:** Approved
**Owner:** Engineering
**Related Issue:** #19

---

## 1. Overview

**Purpose:** Notify users of events that require their attention — document reviews, approvals, comments, and compliance check completions — via in-app notifications and email.

**Business or Operational Impact:** Without notifications, users must manually poll for updates. Delayed responses slow the approval workflow, increasing project timelines.

---

## 2. Scope

**In Scope**

* `notifications` table in Supabase
* In-app notification bell with unread count (Supabase Realtime)
* Mark as read (individual + mark all)
* Email notifications via Resend or Supabase Edge Functions
* User opt-out preferences per notification type

**Notification triggers:**
* Document submitted for review → notify reviewers
* Review approved or changes requested → notify document owner
* New comment on a document → notify document owner
* @mention in a comment → notify mentioned user
* Compliance check complete → notify uploader

**Out of Scope**

* Push notifications (mobile — post-v1)
* Slack/Teams integration (issue #18 webhook handles this)
* Digest emails (post-v1)

---

## 3. User Story

**As a** civil engineer
**I want** to be notified when a document is submitted for my review
**So that** I can respond promptly without having to check Bricks manually

---

## 4. Acceptance Criteria

* [ ] In-app notification appears in real time when a trigger event occurs
* [ ] Notification bell shows unread count, updating without page refresh
* [ ] Individual notifications can be marked as read; "mark all read" clears all
* [ ] Email is sent within 60 seconds of the trigger event
* [ ] User can opt out of specific email notification types in profile settings
* [ ] Opted-out users still receive in-app notifications
* [ ] Notification includes a direct link to the relevant document or comment

---

## 5. Assumptions

Assumption: Resend is used for email delivery.
Risk: Resend outage delays email notifications. Mitigation: in-app notifications are primary; email is supplementary.

---

## 6. Architecture Impact

**Configuration Changes**
* New table: `notifications`
* Supabase Realtime subscription on `notifications` table
* `RESEND_API_KEY` environment variable

**Data Flow Impact**
* Trigger event → server action creates `notifications` row → Realtime broadcasts to client → email sent asynchronously

---

## 7. Security Considerations

### Assets
* User email addresses, notification content

### Threats
* Notification content leaking data across project boundaries
* Email spoofing (sender domain not authenticated)

### Controls
* Notification creation gated by project membership — only project members notified
* Resend configured with SPF/DKIM on the sending domain
* Notification content does not include document content — only a link

---

## 8. Failure Handling

* Email send failure → log error, do not retry more than 3 times; in-app notification unaffected
* Realtime delivery failure → notification is still in the DB; user sees it on next page load

---

## 9. Observability

* Notification created/read events logged
* Email send success/failure logged with notification ID

---

## 10. Testing Requirements

**Integration Tests**
* Trigger event → verify `notifications` row created and Realtime message received

**Negative Tests**
* User not in project does not receive notification from that project
* Opted-out user does not receive email for that notification type

---

## 11. Success Metrics

* In-app notification delivery latency (p95): under 2 seconds (Realtime)
* Email delivery latency (p95): under 60 seconds
* Email delivery rate: ≥ 98%

---

## 12. Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| Supabase Edge Functions for email | No extra service | Limited email template support | Considered |
| Resend (selected) | Great DX, React Email templates, reliable | Additional vendor | Selected |

---

## 13. Rollout Plan

* Phase 1: In-app notifications with Realtime
* Phase 2: Email notifications via Resend
* Phase 3: User opt-out preferences
* Rollback: Remove notification triggers. Existing `notifications` rows retained.

---

---

# Requirement: Search Across Projects and Documents

**Date:** 2026-03-03
**Status:** Approved
**Owner:** Engineering
**Related Issue:** #20

---

## 1. Overview

**Purpose:** Allow users to quickly find documents, projects, and content across the platform using both keyword and semantic search, scoped to their project memberships.

**Business or Operational Impact:** As project volume grows, search becomes critical to usability. Without search, users waste time navigating manually.

---

## 2. Scope

**In Scope**

* Full-text search on document titles, descriptions, and rich-text content (`tsvector` in PostgreSQL)
* Semantic search using embeddings (find documents by meaning, not just keywords)
* Global search bar in the navigation with instant results
* Filters: project, document type, status, date range, author
* Search scoped to the user's project memberships

**Out of Scope**

* Search within PDF content (text extraction for search — post-v1)
* Search result highlighting within document body (post-v1)
* Saved searches (post-v1)

---

## 3. User Story

**As an** architect
**I want** to search for "foundation inspection report" and find the relevant document
**So that** I don't have to navigate through multiple projects to locate it

---

## 4. Acceptance Criteria

* [ ] Keyword search returns results within 500ms
* [ ] Semantic search returns conceptually related documents even without exact keyword match
* [ ] Results are scoped to projects the user is a member of — no cross-project leaks
* [ ] Results include: document title, project name, status, and last modified date
* [ ] Filters by project, status, and date range work in combination
* [ ] Search bar is accessible from any page via the global navigation

---

## 5. Assumptions

Assumption: Full-text search is implemented via PostgreSQL `tsvector` — no additional search service required.
Risk: `tsvector` may not handle Norwegian language stemming optimally. Mitigation: use the `norwegian` text search configuration in PostgreSQL.

---

## 6. Architecture Impact

**Configuration Changes**
* `tsvector` column added to `documents` and `document_versions`
* `embeddings` table reused for semantic document search (from issue #13)
* New API route: `GET /api/search`

---

## 7. Security Considerations

### Assets
* Document metadata (titles, descriptions) returned in search results

### Threats
* Cross-project data exposure via search

### Controls
* Search query joins against `project_members` to scope results to the user's memberships
* RLS applied to the underlying tables — direct DB queries are also scoped
* Search API route verifies authentication before executing any query

---

## 8. Failure Handling

* If semantic search fails, fall back to keyword-only search and log the error
* Empty results return a clear "no results found" state — not an error

---

## 9. Observability

* Search events logged: query string hash (not plaintext), result count, latency
* Zero-result searches tracked to identify content gaps

---

## 10. Testing Requirements

**Integration Tests**
* Search for a known document title → returns that document as first result

**Negative Tests**
* User cannot retrieve documents from projects they are not a member of via search
* SQL injection attempt in search query is sanitised

---

## 11. Success Metrics

* Keyword search latency (p95): under 500ms
* Semantic search latency (p95): under 1 second
* Search result relevance: top-3 results contain the target document for ≥ 85% of test queries
* Zero cross-project data leaks in test suite

---

## 12. Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| Algolia | Best-in-class search | Additional vendor, cost, data leaves Supabase | Rejected |
| Elasticsearch | Powerful | Infrastructure overhead | Rejected |
| PostgreSQL full-text + pgvector (selected) | Integrated, no extra service, Norwegian language support | Less advanced ranking than dedicated search | Selected |

---

## 13. Rollout Plan

* Phase 1: Keyword search on document titles
* Phase 2: Filters and scoping validation
* Phase 3: Semantic search via embeddings
* Rollback: Remove search index columns. No user-facing data loss.

---
