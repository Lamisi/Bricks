-- =============================================================================
-- Bricks — Initial Schema
-- Migration: 20260303000000_initial_schema
-- =============================================================================
-- Structure:
--   1. Extensions
--   2. Enums
--   3. All table definitions (no policies yet)
--   4. Deferred FK: documents.current_version_id → document_versions.id
--   5. Helper functions
--   6. Trigger: handle_new_user
--   7. Enable RLS on all tables
--   8. All RLS policies (after all tables exist)
--   9. Indexes
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ---------------------------------------------------------------------------
-- 2. Enums
-- ---------------------------------------------------------------------------
create type public.project_role as enum (
  'admin',
  'architect',
  'civil_engineer',
  'carpenter'
);

create type public.document_status as enum (
  'draft',
  'in_review',
  'approved',
  'changes_requested',
  'submitted'
);

create type public.document_content_type as enum (
  'file',
  'rich_text'
);

create type public.language_code as enum (
  'no',
  'en'
);

-- ---------------------------------------------------------------------------
-- 3. Table definitions
-- ---------------------------------------------------------------------------

-- profiles ----------------------------------------------------------------
create table public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  language    public.language_code not null default 'no',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'Extends auth.users with application-level user data.';

-- organizations -----------------------------------------------------------
create table public.organizations (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  slug        text        not null unique,
  logo_url    text,
  created_by  uuid        not null references auth.users(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.organizations is 'Construction firms or architectural practices using Bricks.';

-- projects ----------------------------------------------------------------
create table public.projects (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete cascade,
  name            text        not null,
  description     text,
  location        text,
  status          text        not null default 'active'
                    check (status in ('active', 'archived', 'completed')),
  created_by      uuid        not null references auth.users(id) on delete restrict,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.projects is 'Construction projects belonging to an organization.';

-- project_members ---------------------------------------------------------
create table public.project_members (
  id          uuid                primary key default gen_random_uuid(),
  project_id  uuid                not null references public.projects(id) on delete cascade,
  user_id     uuid                not null references auth.users(id) on delete cascade,
  role        public.project_role not null,
  invited_by  uuid                references auth.users(id) on delete set null,
  created_at  timestamptz         not null default now(),
  unique (project_id, user_id)
);
comment on table public.project_members is 'Membership and role of a user within a project.';

-- documents ---------------------------------------------------------------
create table public.documents (
  id                  uuid                    primary key default gen_random_uuid(),
  project_id          uuid                    not null references public.projects(id) on delete cascade,
  title               text                    not null,
  description         text,
  status              public.document_status  not null default 'draft',
  current_version_id  uuid,                   -- FK added after document_versions is created
  created_by          uuid                    not null references auth.users(id) on delete restrict,
  created_at          timestamptz             not null default now(),
  updated_at          timestamptz             not null default now()
);
comment on table public.documents is 'Document metadata. Status tracks the lifecycle: draft → in_review → approved.';

-- document_versions -------------------------------------------------------
create table public.document_versions (
  id             uuid                          primary key default gen_random_uuid(),
  document_id    uuid                          not null references public.documents(id) on delete cascade,
  version_number integer                       not null,
  content_type   public.document_content_type  not null,
  storage_path   text,
  rich_text_json jsonb,
  file_name      text,
  file_size      bigint,
  mime_type      text,
  created_by     uuid                          not null references auth.users(id) on delete restrict,
  created_at     timestamptz                   not null default now(),
  unique (document_id, version_number),
  constraint content_type_check check (
    (content_type = 'file'      and storage_path is not null and rich_text_json is null)
    or
    (content_type = 'rich_text' and rich_text_json is not null and storage_path is null)
  )
);
comment on table public.document_versions is 'Immutable version snapshot. Approved versions cannot be mutated.';

-- document_status_history -------------------------------------------------
create table public.document_status_history (
  id            uuid                   primary key default gen_random_uuid(),
  document_id   uuid                   not null references public.documents(id) on delete cascade,
  from_status   public.document_status,
  to_status     public.document_status not null,
  changed_by    uuid                   not null references auth.users(id) on delete restrict,
  note          text,
  created_at    timestamptz            not null default now()
);
comment on table public.document_status_history is 'Append-only audit trail of document status transitions.';

-- comments ----------------------------------------------------------------
create table public.comments (
  id                  uuid        primary key default gen_random_uuid(),
  document_version_id uuid        not null references public.document_versions(id) on delete cascade,
  parent_id           uuid        references public.comments(id) on delete cascade,
  body                text        not null,
  created_by          uuid        not null references auth.users(id) on delete restrict,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  resolved_at         timestamptz,
  resolved_by         uuid        references auth.users(id) on delete set null
);
comment on table public.comments is 'Threaded comments on a specific document version.';

-- ---------------------------------------------------------------------------
-- 4. Deferred FK: documents.current_version_id → document_versions.id
-- ---------------------------------------------------------------------------
alter table public.documents
  add constraint documents_current_version_id_fkey
  foreign key (current_version_id)
  references public.document_versions(id)
  on delete set null
  deferrable initially deferred;

-- ---------------------------------------------------------------------------
-- 5. Helper functions
-- ---------------------------------------------------------------------------
create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.get_user_project_role(p_project_id uuid)
returns public.project_role
language sql
security definer
stable
as $$
  select role from public.project_members
  where project_id = p_project_id
    and user_id = auth.uid()
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- 6. Trigger: auto-create profiles row on new auth.users insert
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 7. Enable RLS on all tables
-- ---------------------------------------------------------------------------
alter table public.profiles                enable row level security;
alter table public.organizations           enable row level security;
alter table public.projects                enable row level security;
alter table public.project_members         enable row level security;
alter table public.documents               enable row level security;
alter table public.document_versions       enable row level security;
alter table public.document_status_history enable row level security;
alter table public.comments                enable row level security;

-- ---------------------------------------------------------------------------
-- 8. RLS policies
-- ---------------------------------------------------------------------------

-- profiles -----------------------------------------------------------------
create policy "profiles: owner can select"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: owner can update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- organizations ------------------------------------------------------------
create policy "organizations: members can select"
  on public.organizations for select
  using (
    exists (
      select 1
      from public.projects p
      join public.project_members pm on pm.project_id = p.id
      where p.organization_id = organizations.id
        and pm.user_id = auth.uid()
    )
    or created_by = auth.uid()
  );

create policy "organizations: creator can insert"
  on public.organizations for insert
  with check (created_by = auth.uid());

create policy "organizations: creator can update"
  on public.organizations for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- projects -----------------------------------------------------------------
create policy "projects: members can select"
  on public.projects for select
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = projects.id
        and pm.user_id = auth.uid()
    )
  );

create policy "projects: org creator can insert"
  on public.projects for insert
  with check (created_by = auth.uid());

create policy "projects: admin can update"
  on public.projects for update
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = projects.id
        and pm.user_id = auth.uid()
        and pm.role = 'admin'
    )
  );

-- project_members ----------------------------------------------------------
create policy "project_members: member can select"
  on public.project_members for select
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_members.project_id
        and pm.user_id = auth.uid()
    )
  );

create policy "project_members: admin can insert"
  on public.project_members for insert
  with check (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_members.project_id
        and pm.user_id = auth.uid()
        and pm.role = 'admin'
    )
  );

create policy "project_members: admin can update"
  on public.project_members for update
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_members.project_id
        and pm.user_id = auth.uid()
        and pm.role = 'admin'
    )
  );

create policy "project_members: admin can delete"
  on public.project_members for delete
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_members.project_id
        and pm.user_id = auth.uid()
        and pm.role = 'admin'
    )
  );

-- documents ----------------------------------------------------------------
create policy "documents: project member can select"
  on public.documents for select
  using (public.is_project_member(project_id));

create policy "documents: architect or admin can insert"
  on public.documents for insert
  with check (
    public.get_user_project_role(project_id) in ('admin', 'architect')
    and created_by = auth.uid()
  );

create policy "documents: architect or admin can update"
  on public.documents for update
  using (
    public.get_user_project_role(project_id) in ('admin', 'architect')
  );

create policy "documents: admin can delete"
  on public.documents for delete
  using (
    public.get_user_project_role(project_id) = 'admin'
  );

-- document_versions --------------------------------------------------------
create policy "document_versions: project member can select"
  on public.document_versions for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_versions.document_id
        and public.is_project_member(d.project_id)
    )
  );

create policy "document_versions: architect or admin can insert"
  on public.document_versions for insert
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_versions.document_id
        and public.get_user_project_role(d.project_id) in ('admin', 'architect')
    )
    and created_by = auth.uid()
  );

-- document_status_history --------------------------------------------------
create policy "document_status_history: project member can select"
  on public.document_status_history for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_status_history.document_id
        and public.is_project_member(d.project_id)
    )
  );

create policy "document_status_history: member can insert"
  on public.document_status_history for insert
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_status_history.document_id
        and public.is_project_member(d.project_id)
    )
    and changed_by = auth.uid()
  );

-- comments -----------------------------------------------------------------
create policy "comments: project member can select"
  on public.comments for select
  using (
    exists (
      select 1
      from public.document_versions dv
      join public.documents d on d.id = dv.document_id
      where dv.id = comments.document_version_id
        and public.is_project_member(d.project_id)
    )
  );

create policy "comments: project member can insert"
  on public.comments for insert
  with check (
    exists (
      select 1
      from public.document_versions dv
      join public.documents d on d.id = dv.document_id
      where dv.id = comments.document_version_id
        and public.is_project_member(d.project_id)
    )
    and created_by = auth.uid()
  );

create policy "comments: author can update"
  on public.comments for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "comments: author or admin can delete"
  on public.comments for delete
  using (
    created_by = auth.uid()
    or exists (
      select 1
      from public.document_versions dv
      join public.documents d on d.id = dv.document_id
      where dv.id = comments.document_version_id
        and public.get_user_project_role(d.project_id) = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 9. Indexes
-- ---------------------------------------------------------------------------
create index on public.project_members (user_id);
create index on public.project_members (project_id);
create index on public.documents (project_id);
create index on public.documents (status);
create index on public.document_versions (document_id);
create index on public.document_status_history (document_id);
create index on public.comments (document_version_id);
create index on public.comments (parent_id);
