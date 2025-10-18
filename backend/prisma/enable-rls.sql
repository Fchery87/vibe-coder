-- Enable Row Level Security (RLS) on all public tables
-- This resolves Supabase security warnings about RLS disabled on public tables
--
-- RLS ensures users can only access their own data through the Supabase API
-- Run this SQL in Supabase SQL Editor

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_embeddings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid()::text = id);

-- ============================================
-- PROJECTS TABLE POLICIES
-- ============================================

-- Users can view their own projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can create their own projects
CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own projects
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Users can delete their own projects
CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid()::text = user_id);

-- ============================================
-- TASKS TABLE POLICIES
-- ============================================

-- Users can view their own tasks
CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can create their own tasks
CREATE POLICY "Users can create own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own tasks
CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Users can delete their own tasks
CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid()::text = user_id);

-- ============================================
-- AGENTS TABLE POLICIES
-- ============================================

-- Everyone can view active agents (they are system-wide)
CREATE POLICY "Anyone can view active agents"
  ON agents FOR SELECT
  USING (is_active = true);

-- Only service role can manage agents
-- (You'll manage agents via backend API with service role key)

-- ============================================
-- EXECUTIONS TABLE POLICIES
-- ============================================

-- Users can view their own executions
CREATE POLICY "Users can view own executions"
  ON executions FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can create their own executions
CREATE POLICY "Users can create own executions"
  ON executions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own executions
CREATE POLICY "Users can update own executions"
  ON executions FOR UPDATE
  USING (auth.uid()::text = user_id);

-- ============================================
-- COMMITS TABLE POLICIES
-- ============================================

-- Users can view commits for their projects
CREATE POLICY "Users can view commits for own projects"
  ON commits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = commits.project_id
      AND projects.user_id = auth.uid()::text
    )
  );

-- Users can create commits for their projects
CREATE POLICY "Users can create commits for own projects"
  ON commits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = commits.project_id
      AND projects.user_id = auth.uid()::text
    )
  );

-- ============================================
-- REVIEWS TABLE POLICIES
-- ============================================

-- Users can view reviews for commits in their projects
CREATE POLICY "Users can view reviews for own projects"
  ON reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM commits
      JOIN projects ON commits.project_id = projects.id
      WHERE commits.id = reviews.commit_id
      AND projects.user_id = auth.uid()::text
    )
  );

-- Users can create reviews for commits in their projects
CREATE POLICY "Users can create reviews for own projects"
  ON reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM commits
      JOIN projects ON commits.project_id = projects.id
      WHERE commits.id = reviews.commit_id
      AND projects.user_id = auth.uid()::text
    )
  );

-- ============================================
-- CODE EMBEDDINGS TABLE POLICIES
-- ============================================

-- Users can view embeddings for their projects
CREATE POLICY "Users can view embeddings for own projects"
  ON code_embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = code_embeddings.project_id
      AND projects.user_id = auth.uid()::text
    )
  );

-- Users can create embeddings for their projects
CREATE POLICY "Users can create embeddings for own projects"
  ON code_embeddings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = code_embeddings.project_id
      AND projects.user_id = auth.uid()::text
    )
  );

-- Users can delete embeddings for their projects
CREATE POLICY "Users can delete embeddings for own projects"
  ON code_embeddings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = code_embeddings.project_id
      AND projects.user_id = auth.uid()::text
    )
  );

-- ============================================
-- VERIFY RLS IS ENABLED
-- ============================================

-- Check RLS status for all tables
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'projects', 'tasks', 'agents', 'executions', 'commits', 'reviews', 'code_embeddings')
ORDER BY tablename;

-- Check all policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
