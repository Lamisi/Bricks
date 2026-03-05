-- ---------------------------------------------------------------------------
-- Full-text search on documents
-- Uses the Norwegian tsvector configuration where available, falling back
-- to the simple config so the index still builds even before the language
-- pack is installed in self-hosted deployments.
-- ---------------------------------------------------------------------------

-- 1. Add tsvector column to documents
alter table public.documents
  add column if not exists search_vector tsvector;

-- 2. Populate existing rows
update public.documents
set search_vector = to_tsvector(
  'norwegian',
  coalesce(title, '') || ' ' || coalesce(description, '')
);

-- 3. GIN index for fast FTS lookups
create index if not exists documents_search_vector_idx
  on public.documents using gin(search_vector);

-- 4. Trigger to keep search_vector up to date on INSERT / UPDATE
create or replace function public.update_document_search_vector()
returns trigger
language plpgsql
as $$
begin
  new.search_vector := to_tsvector(
    'norwegian',
    coalesce(new.title, '') || ' ' || coalesce(new.description, '')
  );
  return new;
end;
$$;

drop trigger if exists trg_document_search_vector on public.documents;
create trigger trg_document_search_vector
  before insert or update of title, description
  on public.documents
  for each row execute function public.update_document_search_vector();

-- ---------------------------------------------------------------------------
-- Semantic document search — stores title+description embedding per document
-- ---------------------------------------------------------------------------
create table if not exists public.doc_embeddings (
  document_id  uuid        primary key references public.documents(id) on delete cascade,
  embedding    vector(1536),
  updated_at   timestamptz not null default now()
);

create index if not exists doc_embeddings_vector_idx
  on public.doc_embeddings using hnsw (embedding vector_cosine_ops);

alter table public.doc_embeddings enable row level security;

-- Only service role writes; project members can read via the search RPC (security definer)
create policy "doc_embeddings: members can select"
  on public.doc_embeddings for select
  using (
    exists (
      select 1
      from public.documents d
      join public.project_members pm on pm.project_id = d.project_id
      where d.id = doc_embeddings.document_id
        and pm.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- search_documents RPC — full-text search scoped to caller's memberships
-- ---------------------------------------------------------------------------
create or replace function public.search_documents(
  query_text       text,
  filter_project   uuid    default null,
  filter_status    text    default null,
  filter_date_from date    default null,
  filter_date_to   date    default null,
  result_limit     int     default 20
)
returns table (
  document_id   uuid,
  title         text,
  description   text,
  status        text,
  project_id    uuid,
  project_name  text,
  updated_at    timestamptz,
  rank          float4
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.id               as document_id,
    d.title,
    d.description,
    d.status::text,
    d.project_id,
    p.name             as project_name,
    d.updated_at,
    ts_rank(d.search_vector, websearch_to_tsquery('norwegian', query_text)) as rank
  from public.documents d
  join public.projects p on p.id = d.project_id
  join public.project_members pm
       on pm.project_id = d.project_id and pm.user_id = auth.uid()
  where
    d.search_vector @@ websearch_to_tsquery('norwegian', query_text)
    and (filter_project is null or d.project_id = filter_project)
    and (filter_status  is null or d.status::text = filter_status)
    and (filter_date_from is null or d.updated_at::date >= filter_date_from)
    and (filter_date_to   is null or d.updated_at::date <= filter_date_to)
  order by rank desc, d.updated_at desc
  limit result_limit;
$$;

-- ---------------------------------------------------------------------------
-- search_documents_semantic RPC — pgvector similarity, scoped to memberships
-- ---------------------------------------------------------------------------
create or replace function public.search_documents_semantic(
  query_embedding  vector(1536),
  filter_project   uuid  default null,
  filter_status    text  default null,
  result_limit     int   default 10
)
returns table (
  document_id   uuid,
  title         text,
  description   text,
  status        text,
  project_id    uuid,
  project_name  text,
  updated_at    timestamptz,
  similarity    float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.id               as document_id,
    d.title,
    d.description,
    d.status::text,
    d.project_id,
    p.name             as project_name,
    d.updated_at,
    1 - (de.embedding <=> query_embedding) as similarity
  from public.doc_embeddings de
  join public.documents d on d.id = de.document_id
  join public.projects p on p.id = d.project_id
  join public.project_members pm
       on pm.project_id = d.project_id and pm.user_id = auth.uid()
  where
    de.embedding is not null
    and (filter_project is null or d.project_id = filter_project)
    and (filter_status  is null or d.status::text = filter_status)
  order by de.embedding <=> query_embedding
  limit result_limit;
$$;
