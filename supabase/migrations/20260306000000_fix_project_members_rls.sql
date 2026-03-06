-- =============================================================================
-- Fix infinite recursion in project_members RLS policy
-- =============================================================================
-- The original "project_members: member can select" policy used a subquery
-- that selected from project_members within a project_members policy, causing
-- PostgreSQL to detect infinite recursion and throw error 42P17.
--
-- Fix: replace the self-referential subquery with the SECURITY DEFINER
-- get_user_project_role() function, which reads project_members directly
-- (bypassing RLS) and therefore breaks the recursion loop.
-- =============================================================================

drop policy "project_members: member can select" on public.project_members;

create policy "project_members: member can select"
  on public.project_members for select
  using (
    public.get_user_project_role(project_id) is not null
  );
