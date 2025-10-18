-- Database Optimization Script for Vibe Coder
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. CREATE INDEXES FOR BETTER QUERY PERFORMANCE
-- ============================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

-- Tasks table indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status);

-- Agents table indexes
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- Executions table indexes (most queried)
CREATE INDEX IF NOT EXISTS idx_executions_agent_id ON executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_created_at ON executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_agent_status ON executions(agent_id, status);

-- Commits table indexes
CREATE INDEX IF NOT EXISTS idx_commits_project_id ON commits(project_id);
CREATE INDEX IF NOT EXISTS idx_commits_created_at ON commits(created_at DESC);

-- Reviews table indexes
CREATE INDEX IF NOT EXISTS idx_reviews_commit_id ON reviews(commit_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

-- Code embeddings indexes (for vector search)
CREATE INDEX IF NOT EXISTS idx_code_embeddings_file_path ON code_embeddings(file_path);
CREATE INDEX IF NOT EXISTS idx_code_embeddings_project_id ON code_embeddings(project_id);

-- ============================================
-- 2. ANALYZE TABLES FOR QUERY PLANNER
-- ============================================

ANALYZE users;
ANALYZE projects;
ANALYZE tasks;
ANALYZE agents;
ANALYZE executions;
ANALYZE commits;
ANALYZE reviews;
ANALYZE code_embeddings;

-- ============================================
-- 3. VACUUM TO RECLAIM SPACE
-- ============================================

-- Note: Run these during low-traffic periods
-- VACUUM ANALYZE users;
-- VACUUM ANALYZE projects;
-- VACUUM ANALYZE tasks;
-- VACUUM ANALYZE executions;

-- ============================================
-- 4. CHECK INDEX USAGE
-- ============================================

-- Run this to see which indexes are being used
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- ============================================
-- 5. FIND SLOW QUERIES
-- ============================================

-- Enable slow query logging (requires admin)
-- ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries >1s

-- View slow queries (if pg_stat_statements is enabled)
-- SELECT
--   query,
--   calls,
--   total_time,
--   mean_time,
--   max_time
-- FROM pg_stat_statements
-- ORDER BY mean_time DESC
-- LIMIT 20;

-- ============================================
-- 6. CHECK TABLE SIZES
-- ============================================

SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;

-- ============================================
-- 7. OPTIMIZE VECTOR SEARCH (pgvector)
-- ============================================

-- Create vector index for faster similarity search
-- Note: This can be slow on large tables
CREATE INDEX IF NOT EXISTS idx_code_embeddings_vector
  ON code_embeddings
  USING ivfflat (embedding extensions.vector_cosine_ops)
  WITH (lists = 100);

-- ============================================
-- 8. RECOMMENDED CONFIGURATION
-- ============================================

-- These would need to be set by Supabase admin
-- But good to know for reference:

-- shared_buffers = 256MB (or 25% of RAM)
-- effective_cache_size = 1GB (or 50% of RAM)
-- work_mem = 4MB (per sort operation)
-- maintenance_work_mem = 64MB
-- random_page_cost = 1.1 (for SSD)
-- effective_io_concurrency = 200

-- ============================================
-- DONE!
-- ============================================

-- Verify indexes were created
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
