'use client';

import { useState, useEffect } from 'react';
import { Folder, ChevronDown, AlertCircle, RefreshCw } from 'lucide-react';
import { GitHubInstallation, GitHubRepository } from '@/lib/github-types';

interface RepoPickerProps {
  onRepoSelect: (repo: GitHubRepository, installationId: number) => void;
  isConnected: boolean;
}

export default function RepoPicker({ onRepoSelect, isConnected }: RepoPickerProps) {
  const [installations, setInstallations] = useState<GitHubInstallation[]>([]);
  const [selectedInstallation, setSelectedInstallation] = useState<number | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected) {
      fetchInstallations();
    }
  }, [isConnected]);

  const fetchInstallations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/github/installations');
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setInstallations(data.installations || []);

      if (data.installations && data.installations.length === 1) {
        // Auto-select if only one installation
        setSelectedInstallation(data.installations[0].id);
        fetchRepositories(data.installations[0].id);
      }
    } catch (err: any) {
      console.error('Failed to fetch installations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRepositories = async (installationId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/github/repos?installation_id=${installationId}`);
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setRepositories(data.repositories || []);
    } catch (err: any) {
      console.error('Failed to fetch repos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInstallationChange = (installationId: number) => {
    setSelectedInstallation(installationId);
    setRepositories([]);
    fetchRepositories(installationId);
  };

  const handleRepoSelect = (repo: GitHubRepository) => {
    if (selectedInstallation) {
      onRepoSelect(repo, selectedInstallation);
    }
  };

  if (!isConnected) {
    return null;
  }

  if (loading && installations.length === 0) {
    return (
      <div className="flex items-center gap-2 text-[var(--muted)] text-sm">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Loading installations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-400 text-sm">
        <AlertCircle className="w-4 h-4" />
        <span>{error}</span>
        <button onClick={fetchInstallations} className="text-blue-400 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  if (installations.length === 0) {
    return (
      <div className="text-[var(--muted)] text-sm">
        No GitHub App installations found.{' '}
        <a
          href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'your-app'}/installations/new`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          Install App
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Installation Selector */}
      {installations.length > 1 && (
        <div className="relative">
          <select
            value={selectedInstallation || ''}
            onChange={(e) => handleInstallationChange(parseInt(e.target.value))}
            className="px-3 py-2 bg-[var(--panel-alt)] border border-[var(--border)] rounded-[var(--radius)] text-sm text-[var(--text)] pr-8 appearance-none cursor-pointer"
          >
            <option value="">Select Installation</option>
            {installations.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.account.login} ({inst.account.type})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
        </div>
      )}

      {/* Repository Selector */}
      {selectedInstallation && (
        <div className="relative">
          <select
            onChange={(e) => {
              const repo = repositories.find(r => r.id === parseInt(e.target.value));
              if (repo) handleRepoSelect(repo);
            }}
            className="px-3 py-2 bg-[var(--panel-alt)] border border-[var(--border)] rounded-[var(--radius)] text-sm text-[var(--text)] pr-8 appearance-none cursor-pointer min-w-[200px]"
            disabled={loading || repositories.length === 0}
          >
            <option value="">
              {loading ? 'Loading repos...' : 'Select Repository'}
            </option>
            {repositories.map((repo) => (
              <option key={repo.id} value={repo.id}>
                <Folder className="inline w-3 h-3 mr-1" />
                {repo.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
        </div>
      )}
    </div>
  );
}
