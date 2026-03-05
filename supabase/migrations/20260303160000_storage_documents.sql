-- =============================================================================
-- Bricks — Storage: documents bucket
-- Migration: 20260303160000_storage_documents
-- =============================================================================
-- Uses EXECUTE for all storage.* references so PostgreSQL does not try to
-- resolve those table names at compile time. During `supabase start` the
-- storage schema does not yet exist; the block detects this and exits early.
-- On `supabase db reset` and on hosted Supabase the storage schema is present
-- and every statement runs normally.
-- =============================================================================

do $$
begin
  -- Exit early if the storage service has not yet created its tables
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'storage' and table_name = 'buckets'
  ) then
    raise notice 'storage.buckets not yet available — skipping (run: supabase db reset)';
    return;
  end if;

  -- Create the private documents bucket
  execute $s$
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'documents',
      'documents',
      false,
      52428800,
      array[
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/svg+xml',
        'image/vnd.dwg',
        'application/acad',
        'application/x-acad',
        'application/dwg',
        'application/x-dwg'
      ]
    )
    on conflict (id) do nothing
  $s$;

  -- Project members can read files in their projects
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'documents bucket: project member can select'
  ) then
    execute $pol$
      create policy "documents bucket: project member can select"
        on storage.objects for select
        using (
          bucket_id = 'documents'
          and public.is_project_member(split_part(name, '/', 2)::uuid)
        )
    $pol$;
  end if;

  -- Only architects and admins can upload
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'documents bucket: architect/admin can insert'
  ) then
    execute $pol$
      create policy "documents bucket: architect/admin can insert"
        on storage.objects for insert
        with check (
          bucket_id = 'documents'
          and public.get_user_project_role(split_part(name, '/', 2)::uuid)
              in ('admin'::public.project_role, 'architect'::public.project_role)
          and auth.uid() is not null
        )
    $pol$;
  end if;

  -- Only architects and admins can delete
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'documents bucket: architect/admin can delete'
  ) then
    execute $pol$
      create policy "documents bucket: architect/admin can delete"
        on storage.objects for delete
        using (
          bucket_id = 'documents'
          and public.get_user_project_role(split_part(name, '/', 2)::uuid)
              in ('admin'::public.project_role, 'architect'::public.project_role)
        )
    $pol$;
  end if;

end;
$$;
