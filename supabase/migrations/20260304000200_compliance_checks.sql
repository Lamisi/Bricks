-- =============================================================================
-- Bricks — Compliance Checks
-- Migration: 20260304000200_compliance_checks
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. compliance_checks table
-- ---------------------------------------------------------------------------
create table public.compliance_checks (
  id                   uuid        primary key default gen_random_uuid(),
  document_version_id  uuid        not null references public.document_versions(id) on delete cascade,
  status               text        not null default 'pending'
                         check (status in ('pending', 'running', 'complete', 'failed', 'unsupported')),
  model                text,
  duration_ms          integer,
  error                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. compliance_issues table
-- ---------------------------------------------------------------------------
create table public.compliance_issues (
  id                   uuid        primary key default gen_random_uuid(),
  compliance_check_id  uuid        not null references public.compliance_checks(id) on delete cascade,
  severity             text        not null check (severity in ('high', 'medium', 'low')),
  description          text        not null,
  source_reference     text,
  dismissed_at         timestamptz,
  dismissed_by         uuid        references auth.users(id),
  dismiss_reason       text,
  created_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------
create index compliance_checks_version_idx on public.compliance_checks(document_version_id);
create index compliance_issues_check_idx   on public.compliance_issues(compliance_check_id);

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------
alter table public.compliance_checks  enable row level security;
alter table public.compliance_issues  enable row level security;

-- Project members can read compliance_checks for their project's document versions
create policy "project_members_read_compliance_checks"
  on public.compliance_checks for select
  using (
    exists (
      select 1
      from public.document_versions dv
      join public.documents        d  on d.id = dv.document_id
      join public.project_members  pm on pm.project_id = d.project_id
      where dv.id = compliance_checks.document_version_id
        and pm.user_id = auth.uid()
    )
  );

-- Project members can read compliance_issues for checks they can see
create policy "project_members_read_compliance_issues"
  on public.compliance_issues for select
  using (
    exists (
      select 1
      from public.compliance_checks cc
      join public.document_versions dv on dv.id = cc.document_version_id
      join public.documents        d   on d.id = dv.document_id
      join public.project_members  pm  on pm.project_id = d.project_id
      where cc.id = compliance_issues.compliance_check_id
        and pm.user_id = auth.uid()
    )
  );

-- Project admins and architects can dismiss compliance issues (update)
create policy "architects_dismiss_compliance_issues"
  on public.compliance_issues for update
  using (
    exists (
      select 1
      from public.compliance_checks cc
      join public.document_versions dv on dv.id = cc.document_version_id
      join public.documents        d   on d.id = dv.document_id
      join public.project_members  pm  on pm.project_id = d.project_id
      where cc.id = compliance_issues.compliance_check_id
        and pm.user_id = auth.uid()
        and pm.role in ('admin', 'architect')
    )
  )
  with check (
    exists (
      select 1
      from public.compliance_checks cc
      join public.document_versions dv on dv.id = cc.document_version_id
      join public.documents        d   on d.id = dv.document_id
      join public.project_members  pm  on pm.project_id = d.project_id
      where cc.id = compliance_issues.compliance_check_id
        and pm.user_id = auth.uid()
        and pm.role in ('admin', 'architect')
    )
  );

-- Service role (admin client) handles all inserts and updates to checks — no
-- insert policy needed since admin client bypasses RLS.
