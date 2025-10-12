/**
 * useGitStatus Hook
 * Tracks changed files from open tabs and provides Git operations
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileChange, detectChangedFiles } from '@/lib/git-diff';

interface Tab {
  id: string;
  path: string;
  content: string;
  originalContent?: string;
  sha?: string;
  isDirty?: boolean;
}

interface Branch {
  name: string;
  sha: string;
  protected: boolean;
}

interface UseGitStatusOptions {
  owner?: string;
  repo?: string;
  branch?: string;
  installationId?: number;
  tabs?: Tab[];
}

interface UseGitStatusReturn {
  // State
  changedFiles: FileChange[];
  branches: Branch[];
  currentBranch: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshBranches: () => Promise<void>;
  createBranch: (baseBranch: string, newBranch: string) => Promise<boolean>;
  commitChanges: (message: string, files: FileChange[]) => Promise<boolean>;
  switchBranch: (branch: string) => void;
}

export function useGitStatus({
  owner,
  repo,
  branch = 'main',
  installationId,
  tabs = [],
}: UseGitStatusOptions): UseGitStatusReturn {
  const [changedFiles, setChangedFiles] = useState<FileChange[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState(branch);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect changed files from tabs
  useEffect(() => {
    if (!tabs || tabs.length === 0) {
      setChangedFiles([]);
      return;
    }

    // Build map of original files
    const originalFiles = new Map<string, { content: string; sha: string }>();
    tabs.forEach((tab) => {
      if (tab.originalContent && tab.sha) {
        originalFiles.set(tab.path, {
          content: tab.originalContent,
          sha: tab.sha,
        });
      }
    });

    // Detect changes
    const changes = detectChangedFiles(
      tabs.map((t) => ({
        path: t.path,
        content: t.content,
        originalContent: t.originalContent,
        sha: t.sha,
      })),
      originalFiles
    );

    setChangedFiles(changes);
  }, [tabs]);

  // Fetch branches
  const refreshBranches = useCallback(async () => {
    if (!owner || !repo || !installationId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/github/branch?owner=${owner}&repo=${repo}&installationId=${installationId}`
      );
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setBranches([]);
      } else {
        setBranches(data.branches || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch branches');
      setBranches([]);
    } finally {
      setIsLoading(false);
    }
  }, [owner, repo, installationId]);

  // Create new branch
  const createBranch = useCallback(
    async (baseBranch: string, newBranch: string): Promise<boolean> => {
      if (!owner || !repo || !installationId) {
        setError('Missing repository information');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/github/branch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            owner,
            repo,
            base: baseBranch,
            feature: newBranch,
            installation_id: installationId,
          }),
        });

        const data = await response.json();

        if (data.error) {
          setError(data.error);
          return false;
        }

        // Switch to new branch
        setCurrentBranch(newBranch);

        // Refresh branches list
        await refreshBranches();

        return true;
      } catch (err: any) {
        setError(err.message || 'Failed to create branch');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [owner, repo, installationId, refreshBranches]
  );

  // Commit changes
  const commitChanges = useCallback(
    async (message: string, files: FileChange[]): Promise<boolean> => {
      if (!owner || !repo || !installationId) {
        setError('Missing repository information');
        return false;
      }

      if (files.length === 0) {
        setError('No files to commit');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Commit each file
        for (const file of files) {
          const response = await fetch('/api/github/commit', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              owner,
              repo,
              branch: currentBranch,
              path: file.path,
              content: file.newContent || '',
              message: `${message}\n\nFile: ${file.path}`,
              sha: file.sha, // Required for updates
              installation_id: installationId,
            }),
          });

          const data = await response.json();

          if (data.error) {
            throw new Error(`Failed to commit ${file.path}: ${data.error}`);
          }
        }

        // Clear changed files after successful commit
        setChangedFiles([]);

        return true;
      } catch (err: any) {
        setError(err.message || 'Failed to commit changes');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [owner, repo, currentBranch, installationId]
  );

  // Switch branch
  const switchBranch = useCallback((newBranch: string) => {
    setCurrentBranch(newBranch);
  }, []);

  // Load branches on mount
  useEffect(() => {
    if (owner && repo && installationId) {
      refreshBranches();
    }
  }, [owner, repo, installationId, refreshBranches]);

  return {
    changedFiles,
    branches,
    currentBranch,
    isLoading,
    error,
    refreshBranches,
    createBranch,
    commitChanges,
    switchBranch,
  };
}
