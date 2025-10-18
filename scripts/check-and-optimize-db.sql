-- Check Database Status and Create Missing Indexes
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. CHECK WHAT TABLES EXIST
-- ============================================

SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================
-- 2. CHECK EXISTING INDEXES
-- ============================================

SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================
-- 3. CHECK TABLE SIZES
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
-- 4. CHECK IF PGVECTOR EXTENSION IS ENABLED
-- ============================================

SELECT
  extname,
  extversion
FROM pg_extension
WHERE extname = 'vector';

-- ============================================
-- RESULT INTERPRETATION
-- ============================================

-- If you see NO tables above, you need to run:
--   cd backend && npx prisma db push
--
-- This will create all tables from your Prisma schema
-- including the indexes defined in schema.prisma
--
-- If tables exist but you want additional optimization indexes,
-- uncomment and run the sections below:

-- ============================================
-- OPTIONAL: ADDITIONAL PERFORMANCE INDEXES
-- ============================================

-- Composite index for common query pattern
-- CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status);

-- Composite index for execution queries
-- CREATE INDEX IF NOT EXISTS idx_executions_agent_status ON executions(agent_id, status);

-- Descending indexes for date sorting
-- CREATE INDEX IF NOT EXISTS idx_users_created_at_desc ON users(created_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_projects_updated_at_desc ON projects(updated_at DESC);

-- ============================================
-- ANALYZE TABLES (Run if tables exist)
-- ============================================

-- Uncomment to analyze tables for query planner optimization
-- ANALYZE users;
-- ANALYZE projects;
-- ANALYZE tasks;
-- ANALYZE agents;
-- ANALYZE executions;
-- ANALYZE commits;
-- ANALYZE reviews;
-- ANALYZE code_embeddings;
