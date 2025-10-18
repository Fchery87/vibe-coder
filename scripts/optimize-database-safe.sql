-- Safe Database Optimization Script for Vibe Coder
-- This version only creates indexes that are safe to run on your current schema
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. CREATE INDEXES (SAFE VERSION)
-- ============================================

-- Note: These will only succeed if the tables/columns exist
-- Errors are normal if tables haven't been created yet

-- Users table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
    END IF;
  END IF;
END$$;

-- Projects table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'projects') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'created_at') THEN
      CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'updated_at') THEN
      CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
    END IF;
  END IF;
END$$;

-- Tasks table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tasks') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'project_id') THEN
      CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'status') THEN
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'created_at') THEN
      CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
    END IF;
  END IF;
END$$;

-- ============================================
-- 2. CHECK WHAT TABLES EXIST
-- ============================================

SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

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
-- 4. CHECK EXISTING INDEXES
-- ============================================

SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
