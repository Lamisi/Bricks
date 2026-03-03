-- =============================================================================
-- Bricks — RBAC policy refinements
-- Migration: 20260303150614_rbac_policies
-- =============================================================================
-- Changes from initial schema:
--
-- 1. document_versions SELECT: carpenters restricted to versions whose
--    parent document status is 'approved' (all other roles see all versions)
--
-- 2. documents UPDATE: civil_engineer added as an actor who can update
--    a document row (for status transitions to 'approved' / 'changes_requested').
--    Field-level restrictions (which columns/values) are enforced in server
--    actions — RLS governs row access only.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tighten document_versions SELECT for carpenters
-- ---------------------------------------------------------------------------
drop policy "document_versions: project member can select" on public.document_versions;

create policy "document_versions: project member can select"
  on public.document_versions for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_versions.document_id
        and (
          -- Admins, architects, and civil engineers see all versions
          public.get_user_project_role(d.project_id) in ('admin', 'architect', 'civil_engineer')
          or
          -- Carpenters only see versions of approved documents
          (
            public.get_user_project_role(d.project_id) = 'carpenter'
            and d.status = 'approved'
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Allow civil_engineer to UPDATE documents (for status transitions)
-- ---------------------------------------------------------------------------
create policy "documents: civil_engineer can update status"
  on public.documents for update
  using (
    public.get_user_project_role(project_id) = 'civil_engineer'
  );
