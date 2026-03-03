# Bricks — Database Schema

> Applied via: `supabase/migrations/20260303000000_initial_schema.sql`

## Extensions

| Extension | Purpose |
|---|---|
| `pgcrypto` | `gen_random_uuid()` for primary keys |
| `vector` | pgvector — semantic search and RAG (future issues #13, #14) |

## Enums

### `project_role`
Role a user holds within a specific project.

| Value | Description |
|---|---|
| `admin` | Full access; can invite members, manage settings, approve documents |
| `architect` | Create, upload, edit documents; submit for review |
| `civil_engineer` | Review, comment, approve, or request changes |
| `carpenter` | Read-only access to approved documents |

### `document_status`
Lifecycle state of a document.

| Value | Description |
|---|---|
| `draft` | Initial state; work in progress |
| `in_review` | Submitted internally for review by civil engineers |
| `approved` | Approved by a civil engineer or admin |
| `changes_requested` | Reviewer requested changes |
| `submitted` | Submitted to external authorities |

### `document_content_type`
How the content of a document version is stored.

| Value | Description |
|---|---|
| `file` | Binary file stored in Supabase Storage; `storage_path` is set |
| `rich_text` | Tiptap editor JSON stored in `rich_text_json` column |

### `language_code`
Supported application languages.

| Value | Description |
|---|---|
| `no` | Norwegian Bokmål (default) |
| `en` | English |

---

## Tables

### `profiles`
Extends `auth.users` with application-level user data. Created automatically by the `on_auth_user_created` trigger.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | — | FK → `auth.users.id` (CASCADE delete) |
| `full_name` | `text` | YES | — | User's display name |
| `avatar_url` | `text` | YES | — | URL to profile image |
| `language` | `language_code` | NO | `'no'` | Preferred UI language |
| `created_at` | `timestamptz` | NO | `now()` | Row creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last update timestamp |

**RLS policies:**
- Owner can `SELECT` their own row
- Owner can `UPDATE` their own row

---

### `organizations`
Construction firms or architectural practices.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `name` | `text` | NO | — | Organization display name |
| `slug` | `text` | NO | — | URL-safe unique identifier |
| `logo_url` | `text` | YES | — | URL to organization logo |
| `created_by` | `uuid` | NO | — | FK → `auth.users.id` |
| `created_at` | `timestamptz` | NO | `now()` | Row creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last update timestamp |

**RLS policies:**
- Creator or any member of a project under this org can `SELECT`
- Creator can `INSERT`
- Creator can `UPDATE`

---

### `projects`
Construction projects belonging to an organization.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `organization_id` | `uuid` | NO | — | FK → `organizations.id` (CASCADE delete) |
| `name` | `text` | NO | — | Project name |
| `description` | `text` | YES | — | Optional description |
| `location` | `text` | YES | — | Physical location or address |
| `status` | `text` | NO | `'active'` | `active` \| `archived` \| `completed` |
| `created_by` | `uuid` | NO | — | FK → `auth.users.id` |
| `created_at` | `timestamptz` | NO | `now()` | Row creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last update timestamp |

**RLS policies:**
- Project members can `SELECT`
- Org creator can `INSERT`
- Admin role members can `UPDATE`

---

### `project_members`
Join table linking users to projects with a role. Enforces role-based access across the system.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `project_id` | `uuid` | NO | — | FK → `projects.id` (CASCADE delete) |
| `user_id` | `uuid` | NO | — | FK → `auth.users.id` (CASCADE delete) |
| `role` | `project_role` | NO | — | User's role in this project |
| `invited_by` | `uuid` | YES | — | FK → `auth.users.id` (SET NULL on delete) |
| `created_at` | `timestamptz` | NO | `now()` | Row creation timestamp |

**Unique constraint:** `(project_id, user_id)`

**RLS policies:**
- Any member of the project can `SELECT` all members
- Only `admin` role can `INSERT`, `UPDATE`, `DELETE` members

---

### `documents`
Document metadata. The actual content lives in `document_versions`.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `project_id` | `uuid` | NO | — | FK → `projects.id` (CASCADE delete) |
| `title` | `text` | NO | — | Document title |
| `description` | `text` | YES | — | Optional description |
| `status` | `document_status` | NO | `'draft'` | Current lifecycle status |
| `current_version_id` | `uuid` | YES | — | FK → `document_versions.id` (SET NULL on delete) |
| `created_by` | `uuid` | NO | — | FK → `auth.users.id` |
| `created_at` | `timestamptz` | NO | `now()` | Row creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last update timestamp |

**RLS policies:**
- All project members can `SELECT`
- `admin` and `architect` roles can `INSERT`
- `admin` and `architect` roles can `UPDATE`
- Only `admin` role can `DELETE`

---

### `document_versions`
Immutable snapshots of document content. Once created, a version cannot be modified or deleted.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `document_id` | `uuid` | NO | — | FK → `documents.id` (CASCADE delete) |
| `version_number` | `integer` | NO | — | Sequential version number (1, 2, 3…) |
| `content_type` | `document_content_type` | NO | — | `file` or `rich_text` |
| `storage_path` | `text` | YES | — | Supabase Storage object path (when `content_type = 'file'`) |
| `rich_text_json` | `jsonb` | YES | — | Tiptap JSON content (when `content_type = 'rich_text'`) |
| `file_name` | `text` | YES | — | Original filename |
| `file_size` | `bigint` | YES | — | File size in bytes |
| `mime_type` | `text` | YES | — | MIME type (e.g. `application/pdf`) |
| `created_by` | `uuid` | NO | — | FK → `auth.users.id` |
| `created_at` | `timestamptz` | NO | `now()` | Row creation timestamp |

**Unique constraint:** `(document_id, version_number)`

**Content constraint:** Exactly one of `storage_path` or `rich_text_json` must be set, matching `content_type`.

**RLS policies:**
- All project members can `SELECT`
- `admin` and `architect` roles can `INSERT`
- No `UPDATE` or `DELETE` allowed (versions are immutable)

---

### `document_status_history`
Append-only audit log of every document status transition.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `document_id` | `uuid` | NO | — | FK → `documents.id` (CASCADE delete) |
| `from_status` | `document_status` | YES | — | Previous status (`NULL` for first transition from draft) |
| `to_status` | `document_status` | NO | — | New status |
| `changed_by` | `uuid` | NO | — | FK → `auth.users.id` |
| `note` | `text` | YES | — | Optional reviewer note |
| `created_at` | `timestamptz` | NO | `now()` | Transition timestamp |

**RLS policies:**
- All project members can `SELECT`
- Any project member can `INSERT` (transition enforced at application layer)
- No `UPDATE` or `DELETE` allowed (immutable audit log)

---

### `comments`
Threaded comments anchored to a specific document version.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `document_version_id` | `uuid` | NO | — | FK → `document_versions.id` (CASCADE delete) |
| `parent_id` | `uuid` | YES | — | FK → `comments.id` for thread replies (CASCADE delete) |
| `body` | `text` | NO | — | Comment content (plain text or Markdown) |
| `created_by` | `uuid` | NO | — | FK → `auth.users.id` |
| `created_at` | `timestamptz` | NO | `now()` | Row creation timestamp |
| `updated_at` | `timestamptz` | NO | `now()` | Last edit timestamp |
| `resolved_at` | `timestamptz` | YES | — | When the comment thread was resolved |
| `resolved_by` | `uuid` | YES | — | FK → `auth.users.id` (SET NULL on delete) |

**RLS policies:**
- All project members can `SELECT`
- Any project member can `INSERT`
- Comment author can `UPDATE` their own comments
- Comment author or project `admin` can `DELETE`

---

## Helper Functions

### `is_project_member(p_project_id uuid) → boolean`
Returns `true` if the currently authenticated user is a member of the given project. Used in RLS policies to avoid repeated subqueries.

```sql
select public.is_project_member('project-uuid-here');
```

### `get_user_project_role(p_project_id uuid) → project_role`
Returns the authenticated user's `project_role` within the given project, or `NULL` if not a member. Used in RLS policies to check specific roles.

```sql
select public.get_user_project_role('project-uuid-here');
```

Both functions use `security definer` so they run as the table owner and can read `project_members` without triggering RLS on that table.

---

## Triggers

### `on_auth_user_created`
Fires `AFTER INSERT` on `auth.users`. Calls `public.handle_new_user()` which inserts a corresponding row in `public.profiles`, copying `full_name` and `avatar_url` from `raw_user_meta_data`.

---

## Relationships Diagram

```
auth.users (Supabase managed)
  │
  ├── profiles (1:1, auto-created via trigger)
  │
  └── organizations (created_by)
        │
        └── projects (organization_id)
              │
              ├── project_members (project_id) ──── auth.users (user_id)
              │
              └── documents (project_id)
                    │
                    ├── document_versions (document_id)
                    │     │
                    │     └── comments (document_version_id)
                    │
                    └── document_status_history (document_id)
```

---

## Applying Migrations

```bash
# First-time setup (requires Supabase personal access token)
supabase login
supabase link --project-ref frvgorgoiunskjoptzcp

# Push migrations to the linked Supabase project
supabase db push

# Regenerate TypeScript types after schema changes
supabase gen types typescript --linked > types/database.ts
```

> **Note:** Never apply migrations by running SQL directly in the Supabase dashboard. All schema changes must go through migration files in `supabase/migrations/`.
