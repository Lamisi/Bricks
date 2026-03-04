-- ---------------------------------------------------------------------------
-- Notifications table (in-app notifications triggered by @mentions, etc.)
-- ---------------------------------------------------------------------------

create table public.notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  type        text        not null check (type in ('mention', 'comment_reply', 'status_change')),
  title       text        not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

comment on table public.notifications is 'In-app notifications per user (mentions, replies, status changes).';

create index on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications: user can select own"
  on public.notifications for select
  using (user_id = auth.uid());

-- Only server-side (service role) inserts notifications; no direct client insert
create policy "notifications: user can update own (mark read)"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
