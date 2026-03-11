-- =============================================================================
-- Switch embeddings from OpenAI text-embedding-3-small (1536 dims)
-- to Voyage AI voyage-3 (1024 dims)
-- Migration: 20260311000000_voyage_ai_embeddings
-- =============================================================================

-- Drop HNSW index (depends on the vector column type)
drop index if exists public.embeddings_embedding_idx;

-- Clear any existing rows — dimensions are incompatible; all sources must be
-- re-ingested anyway since the embedding model has changed.
truncate table public.embeddings restart identity cascade;

-- Change vector dimension from 1536 → 1024
alter table public.embeddings
  alter column embedding type vector(1024);

-- Update default model label
alter table public.embeddings
  alter column embedding_model set default 'voyage-3';

-- Recreate HNSW index for the new dimension
create index on public.embeddings using hnsw (embedding vector_cosine_ops);

-- Update match_documents RPC to use vector(1024)
create or replace function public.match_documents(
  query_embedding  vector(1024),
  match_count      int     default 5,
  filter_language  text    default null
)
returns table (
  id                     uuid,
  content                text,
  language               text,
  similarity             float,
  knowledge_source_id    uuid,
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

-- Reset knowledge_sources that were left in failed/partial state so they
-- can be re-ingested cleanly with the new model.
update public.knowledge_sources
  set status = 'pending', chunk_count = 0, updated_at = now()
  where status in ('failed', 'partial');
