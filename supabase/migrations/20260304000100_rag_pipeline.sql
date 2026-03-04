-- =============================================================================
-- RAG Pipeline: knowledge_sources, embeddings, match_documents RPC
-- Migration: 20260304000100_rag_pipeline
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Global admin flag on profiles
--    Set via Supabase dashboard: UPDATE profiles SET is_admin = true WHERE id = '<user_id>';
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_global_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. knowledge_sources — metadata for ingested legal documents / specs
-- ---------------------------------------------------------------------------
create table public.knowledge_sources (
  id           uuid        primary key default gen_random_uuid(),
  title        text        not null,
  description  text,
  source_type  text        not null check (source_type in ('pdf', 'url', 'text')),
  language     public.language_code not null default 'no',
  status       text        not null default 'pending'
                check (status in ('pending', 'processing', 'ready', 'partial', 'failed')),
  file_path    text,
  url          text,
  chunk_count  int         not null default 0,
  created_by   uuid        not null references auth.users(id) on delete restrict,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.knowledge_sources is
  'Legal documents, city codes, and construction specs ingested into the RAG pipeline.';

create index on public.knowledge_sources (status);
create index on public.knowledge_sources (language);

-- ---------------------------------------------------------------------------
-- 3. embeddings — vector chunks from knowledge sources (pgvector)
-- ---------------------------------------------------------------------------
create table public.embeddings (
  id                  uuid        primary key default gen_random_uuid(),
  knowledge_source_id uuid        not null references public.knowledge_sources(id) on delete cascade,
  chunk_index         int         not null,
  content             text        not null,
  language            public.language_code not null,
  embedding           vector(1536),
  embedding_model     text        not null default 'text-embedding-3-small',
  created_at          timestamptz not null default now()
);

comment on table public.embeddings is
  'Chunked text + pgvector embeddings from knowledge_sources.';

-- HNSW index for fast approximate nearest-neighbour search
create index on public.embeddings using hnsw (embedding vector_cosine_ops);
create index on public.embeddings (knowledge_source_id);
create index on public.embeddings (language);

-- ---------------------------------------------------------------------------
-- 4. match_documents RPC — semantic similarity search
-- ---------------------------------------------------------------------------
create or replace function public.match_documents(
  query_embedding  vector(1536),
  match_count      int     default 5,
  filter_language  text    default null
)
returns table (
  id                    uuid,
  content               text,
  language              text,
  similarity            float,
  knowledge_source_id   uuid,
  knowledge_source_title text
)
language sql
stable
as $$
  select
    e.id,
    e.content,
    e.language::text,
    1 - (e.embedding <=> query_embedding) as similarity,
    e.knowledge_source_id,
    ks.title as knowledge_source_title
  from public.embeddings e
  join public.knowledge_sources ks on ks.id = e.knowledge_source_id
  where
    (filter_language is null or e.language::text = filter_language)
    and e.embedding is not null
    and ks.status = 'ready'
  order by e.embedding <=> query_embedding
  limit match_count;
$$;

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------
alter table public.knowledge_sources enable row level security;
alter table public.embeddings        enable row level security;

-- knowledge_sources: any authenticated user can read; only global admins can write
create policy "knowledge_sources: authenticated can select"
  on public.knowledge_sources for select
  using (auth.role() = 'authenticated');

create policy "knowledge_sources: global admin can insert"
  on public.knowledge_sources for insert
  with check (public.is_global_admin());

create policy "knowledge_sources: global admin can update"
  on public.knowledge_sources for update
  using (public.is_global_admin());

create policy "knowledge_sources: global admin can delete"
  on public.knowledge_sources for delete
  using (public.is_global_admin());

-- embeddings: any authenticated user can read; service role (admin client) handles writes
create policy "embeddings: authenticated can select"
  on public.embeddings for select
  using (auth.role() = 'authenticated');
