'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Folder, RefreshCw } from 'lucide-react';
import { GitHubInstallation, GitHubRepository } from '@/lib/github-types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

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
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');

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

      const repos = data.repositories || [];
      setRepositories(repos);
      if (repos.length === 0) {
        setSelectedRepoId('');
      }
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
    setSelectedRepoId('');
    fetchRepositories(installationId);
  };

  const repoOptions = useMemo(
    () =>
      repositories.map((repo) => ({
        id: repo.id,
        label: repo.name,
      })),
    [repositories],
  );

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
        <Button variant="link" size="sm" className="h-auto px-0 text-blue-400" onClick={fetchInstallations}>
          Retry
        </Button>
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
        <Select
          value={selectedInstallation ? String(selectedInstallation) : undefined}
          onValueChange={(value) => handleInstallationChange(parseInt(value, 10))}
        >
          <SelectTrigger className="min-w-[220px] border-[var(--border)] bg-[var(--panel)] text-[var(--text)]">
            <SelectValue placeholder="Select Installation" />
          </SelectTrigger>
          <SelectContent className="border-[var(--border)] bg-[var(--panel)] text-[var(--text)]">
            {installations.map((inst) => (
              <SelectItem key={inst.id} value={String(inst.id)}>
                {inst.account.login} ({inst.account.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Repository Selector */}
      {selectedInstallation && (
        <Select
          value={selectedRepoId || undefined}
          onValueChange={(value) => {
            setSelectedRepoId(value);
            const repo = repositories.find((r) => r.id === parseInt(value, 10));
            if (repo && selectedInstallation) {
              onRepoSelect(repo, selectedInstallation);
            }
          }}
          disabled={loading || repositories.length === 0}
        >
          <SelectTrigger className="min-w-[220px] border-[var(--border)] bg-[var(--panel)] text-[var(--text)]">
            <SelectValue placeholder={loading ? 'Loading repositories...' : 'Select Repository'} />
          </SelectTrigger>
          <SelectContent className="border-[var(--border)] bg-[var(--panel)] text-[var(--text)]">
            {repoOptions.map((repo) => (
              <SelectItem key={repo.id} value={String(repo.id)}>
                <span className="flex items-center gap-2">
                  <Folder className="h-3 w-3 shrink-0" />
                  {repo.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
