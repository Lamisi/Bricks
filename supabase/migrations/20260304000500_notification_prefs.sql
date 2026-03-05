-- ---------------------------------------------------------------------------
-- Extend notification types to include compliance_complete
-- ---------------------------------------------------------------------------
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('mention', 'comment_reply', 'status_change', 'compliance_complete'));

-- ---------------------------------------------------------------------------
-- Email notification preferences per user (stored as JSONB on profiles)
-- Each key maps to a notification type; true = send email, false = suppress.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists email_prefs jsonb not null default
    '{"status_change":true,"mention":true,"comment_reply":true,"compliance_complete":true}'::jsonb;
