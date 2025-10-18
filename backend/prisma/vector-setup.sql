-- Phase 3: Semantic Search Setup
-- Run this SQL in Supabase SQL Editor after enabling pgvector extension

-- 1. Create extensions schema (best practice for security)
CREATE SCHEMA IF NOT EXISTS extensions;

-- 2. Enable pgvector extension in the extensions schema
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 3. Verify extension is enabled and in correct schema
SELECT
  e.extname,
  n.nspname as schema
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE e.extname = 'vector';

-- 4. Create IVFFlat index for fast cosine similarity search
-- This index significantly speeds up vector similarity queries
-- Note: Run AFTER you have at least 1000 embeddings for best performance
CREATE INDEX IF NOT EXISTS code_embeddings_embedding_idx
ON code_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Alternative: Use HNSW for even faster searches (requires pgvector 0.5.0+)
-- CREATE INDEX IF NOT EXISTS code_embeddings_embedding_hnsw_idx
-- ON code_embeddings
-- USING hnsw (embedding vector_cosine_ops);

-- 5. Verify index was created
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'code_embeddings';

-- 6. Example semantic search query
-- Find code chunks similar to a query embedding
/*
SELECT
  id,
  file_path,
  chunk_index,
  content,
  language,
  1 - (embedding <=> '[0.1, 0.2, ...]'::vector) as similarity
FROM code_embeddings
WHERE project_id = 'your-project-id'
  AND language = 'typescript' -- optional filter
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;
*/

-- 7. Performance tips:
-- - Use lists = sqrt(total_rows) for IVFFlat index
-- - Update index after bulk inserts: REINDEX INDEX code_embeddings_embedding_idx;
-- - Monitor query performance: EXPLAIN ANALYZE SELECT ...
-- - For > 1M vectors, consider upgrading to Supabase Pro for better performance

-- 8. Useful maintenance queries

-- Check embedding statistics
SELECT
  COUNT(*) as total_embeddings,
  COUNT(DISTINCT project_id) as total_projects,
  COUNT(DISTINCT file_path) as total_files,
  AVG(LENGTH(content)) as avg_content_length,
  COUNT(DISTINCT language) as languages_count
FROM code_embeddings;

-- Find projects with most embeddings
SELECT
  project_id,
  COUNT(*) as embedding_count,
  COUNT(DISTINCT file_path) as file_count
FROM code_embeddings
GROUP BY project_id
ORDER BY embedding_count DESC;

-- Check index usage (after running some queries)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'code_embeddings';

-- Clean up old embeddings (example: older than 30 days)
-- DELETE FROM code_embeddings
-- WHERE created_at < NOW() - INTERVAL '30 days'
--   AND commit_sha IS NOT NULL; -- only delete if newer version exists
