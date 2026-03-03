-- =============================================================================
-- Bricks — Storage: documents bucket
-- Migration: 20260303160000_storage_documents
-- =============================================================================
-- Adds:
--   • Private "documents" storage bucket (50 MB limit, allowlisted MIME types)
--   • Storage RLS policies scoped to project membership / role
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Create private bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  52428800, -- 50 MB
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
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Storage RLS
-- Path layout: projects/{project_id}/documents/{doc_id}/{version}/{filename}
-- split_part(name, '/', 2) → project_id
-- ---------------------------------------------------------------------------

-- Project members can read files in their projects (needed for signed URL auth)
create policy "documents bucket: project member can select"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and public.is_project_member(split_part(name, '/', 2)::uuid)
  );

-- Only architects and admins can upload
create policy "documents bucket: architect/admin can insert"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and public.get_user_project_role(split_part(name, '/', 2)::uuid)
        in ('admin'::public.project_role, 'architect'::public.project_role)
    and auth.uid() is not null
  );

-- Only architects and admins can delete (e.g. rollback cleanup)
create policy "documents bucket: architect/admin can delete"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and public.get_user_project_role(split_part(name, '/', 2)::uuid)
        in ('admin'::public.project_role, 'architect'::public.project_role)
  );
