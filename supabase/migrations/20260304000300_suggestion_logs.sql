-- =============================================================================
-- Bricks — Suggestion Logs
-- Migration: 20260304000300_suggestion_logs
-- =============================================================================

create table public.suggestion_logs (
  id                   uuid        primary key default gen_random_uuid(),
  document_id          uuid        not null references public.documents(id) on delete cascade,
  document_version_id  uuid        references public.document_versions(id) on delete set null,
  user_id              uuid        not null references auth.users(id) on delete cascade,
  suggestion_type      text        not null check (suggestion_type in ('missing_section', 'unclear', 'non_compliant')),
  description          text        not null,
  recommended_fix      text        not null,
  action               text        not null check (action in ('accepted', 'dismissed')),
  created_at           timestamptz not null default now()
);

create index suggestion_logs_document_idx on public.suggestion_logs(document_id);
create index suggestion_logs_user_idx     on public.suggestion_logs(user_id);

alter table public.suggestion_logs enable row level security;

-- Users can only read and insert their own logs
create policy "users_read_own_suggestion_logs"
  on public.suggestion_logs for select
  using (user_id = auth.uid());

create policy "users_insert_own_suggestion_logs"
  on public.suggestion_logs for insert
  with check (user_id = auth.uid());
