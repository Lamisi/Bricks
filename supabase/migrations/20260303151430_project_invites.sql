-- =============================================================================
-- Bricks — Project invites
-- Migration: 20260303151430_project_invites
-- =============================================================================
-- Adds:
--   • project_invites table — single-use, 7-day invite tokens
--   • create_project() SECURITY DEFINER function — bootstraps creator as admin
--     in a single transaction, bypassing the project_members RLS chicken-and-egg
-- =============================================================================

-- ---------------------------------------------------------------------------
-- project_invites
-- ---------------------------------------------------------------------------
create table public.project_invites (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  email       text        not null,
  role        public.project_role not null,
  invited_by  uuid        not null references auth.users(id) on delete restrict,
  token       uuid        not null unique default gen_random_uuid(),
  expires_at  timestamptz not null default (now() + interval '7 days'),
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

comment on table public.project_invites is
  'Single-use invite tokens. Expire after 7 days. Validated via service role.';

create index on public.project_invites (token);
create index on public.project_invites (project_id);

alter table public.project_invites enable row level security;

-- Only admins can create invites for their project
create policy "project_invites: admin can insert"
  on public.project_invites for insert
  with check (
    public.get_user_project_role(project_id) = 'admin'
    and invited_by = auth.uid()
  );

-- Admins can view pending invites for their project
create policy "project_invites: admin can select"
  on public.project_invites for select
  using (
    public.get_user_project_role(project_id) = 'admin'
  );

-- ---------------------------------------------------------------------------
-- create_project()
-- Creates a project and atomically adds the calling user as admin.
-- Uses SECURITY DEFINER to bypass the project_members RLS bootstrapping
-- problem (no members exist yet when the first member row is inserted).
-- ---------------------------------------------------------------------------
create or replace function public.create_project(
  p_organization_id uuid,
  p_name            text,
  p_description     text,
  p_location        text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  -- Insert the project (created_by = calling user via auth.uid())
  insert into public.projects (organization_id, name, description, location, created_by)
  values (p_organization_id, p_name, p_description, p_location, auth.uid())
  returning id into v_project_id;

  -- Add calling user as admin (bypasses project_members RLS bootstrap issue)
  insert into public.project_members (project_id, user_id, role)
  values (v_project_id, auth.uid(), 'admin');

  return v_project_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_organization()
-- Creates an organization for the calling user.
-- ---------------------------------------------------------------------------
create or replace function public.create_organization(
  p_name text,
  p_slug text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  insert into public.organizations (name, slug, created_by)
  values (p_name, p_slug, auth.uid())
  returning id into v_org_id;

  return v_org_id;
end;
$$;
