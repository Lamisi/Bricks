-- ---------------------------------------------------------------------------
-- integrations
-- One row per configured integration (outbound webhook) per project.
-- webhook_secret_enc stores the AES-256-GCM encrypted secret:
--   hex(iv) || ':' || hex(tag) || ':' || hex(ciphertext)
-- ---------------------------------------------------------------------------
create table if not exists integrations (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,
  name          text not null,
  type          text not null default 'webhook_outbound',
  webhook_url   text not null,
  webhook_secret_enc text not null,   -- encrypted secret
  status        text not null default 'active'
                  check (status in ('active', 'inactive')),
  created_by    uuid not null references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- integrations_log
-- Append-only audit trail for every inbound and outbound webhook event.
-- ---------------------------------------------------------------------------
create table if not exists integrations_log (
  id               uuid primary key default gen_random_uuid(),
  integration_id   uuid references integrations(id) on delete set null,
  project_id       uuid not null references projects(id) on delete cascade,
  direction        text not null check (direction in ('inbound', 'outbound')),
  event_type       text not null,
  status           text not null check (status in ('success', 'failed', 'rejected')),
  http_status_code integer,
  destination_url  text,             -- outbound: URL posted to
  source_ip        text,             -- inbound: requester IP
  payload_hash     text,             -- SHA-256 hex of the payload body
  attempt          integer not null default 1,
  error            text,
  created_at       timestamptz not null default now()
);

-- Indexes for common query patterns
create index integrations_project_id_idx    on integrations(project_id);
create index integrations_log_project_idx   on integrations_log(project_id, created_at desc);
create index integrations_log_integ_idx     on integrations_log(integration_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table integrations enable row level security;
alter table integrations_log enable row level security;

-- Project admins can manage integrations
create policy "admins_manage_integrations" on integrations
  for all
  using (
    exists (
      select 1 from project_members
      where project_members.project_id = integrations.project_id
        and project_members.user_id = auth.uid()
        and project_members.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from project_members
      where project_members.project_id = integrations.project_id
        and project_members.user_id = auth.uid()
        and project_members.role = 'admin'
    )
  );

-- Project members can read integration logs for their project
create policy "members_read_integration_logs" on integrations_log
  for select
  using (
    exists (
      select 1 from project_members
      where project_members.project_id = integrations_log.project_id
        and project_members.user_id = auth.uid()
    )
  );
