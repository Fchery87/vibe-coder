/**
 * Pull Request Tool
 * Create and manage pull requests from the app
 * Integrates with Phase 1 DiffViewer and Phase 2 Source Control
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import {
  GitPullRequest,
  Plus,
  Check,
  X,
  Clock,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import ToolDrawerPanel, { ToolEmptyState, ToolLoadingState, ToolErrorState } from '@/components/ToolDrawerPanel';

interface PullRequestProps {
  owner?: string;
  repo?: string;
  branch?: string;
  installationId?: number;
  onNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface PR {
  number: number;
  title: string;
  state: string;
  head: { ref: string; sha: string };
  base: { ref: string };
  user: { login: string; avatar_url: string };
  created_at: string;
  updated_at: string;
  html_url: string;
  draft?: boolean;
  mergeable?: boolean | null;
  mergeable_state?: string;
}

interface CheckStatus {
  state: 'success' | 'pending' | 'failure' | 'none';
  total_count: number;
  checks: Array<{
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    html_url: string | null;
  }>;
}

export default function PullRequest({
  owner,
  repo,
  branch,
  installationId,
  onNotification,
}: PullRequestProps) {
  const [pullRequests, setPullRequests] = useState<PR[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedPR, setSelectedPR] = useState<PR | null>(null);
  const [checkStatus, setCheckStatus] = useState<CheckStatus | null>(null);
  const [relatedRuns, setRelatedRuns] = useState<any[]>([]);
  const [downloadingRunId, setDownloadingRunId] = useState<number | null>(null);
  const [prChecks, setPrChecks] = useState<Record<number, 'success' | 'pending' | 'failure' | 'none'>>({});
  const checksCache = useRef<Map<string, { state: 'success' | 'pending' | 'failure' | 'none'; fetchedAt: number }>>(new Map());
  const CHECK_TTL_MS = 30_000;

  // PR creation form
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');
  const [baseBranch, setBaseBranch] = useState('main');

  // Fetch pull requests
  useEffect(() => {
    if (!owner || !repo || !installationId) return;

    fetchPullRequests();
  }, [owner, repo, installationId]);

  const fetchPullRequests = async () => {
    if (!owner || !repo || !installationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/github/pr?owner=${owner}&repo=${repo}&installation_id=${installationId}`
      );
      const data = await response.json();

      if (data.error) {
        setError(data.message || data.error);
        setPullRequests([]);
      } else {
        setPullRequests(data.prs || []);
        // Clear per-PR checks to be refreshed
        setPrChecks({});
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pull requests');
      setPullRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  // For now: do NOT prefetch checks for all PRs. We'll fetch on expand with TTL caching.

  // Fetch checks for selected PR
  useEffect(() => {
    if (!selectedPR || !owner || !repo || !installationId) {
      setCheckStatus(null);
      setRelatedRuns([]);
      return;
    }

    fetchChecks(selectedPR.head.sha);
    fetchRelatedRuns(selectedPR.head.sha);
  }, [selectedPR, owner, repo, installationId]);

  const fetchChecks = async (ref: string) => {
    if (!owner || !repo || !installationId) return;

    // TTL cache: if fresh, use cached value
    const cached = checksCache.current.get(ref);
    const now = Date.now();
    if (cached && now - cached.fetchedAt < CHECK_TTL_MS) {
      setCheckStatus({ state: cached.state, total_count: 0, checks: [] });
      // Also set badge for the selected PR if we know which is selected
      if (selectedPR) {
        setPrChecks((prev) => ({ ...prev, [selectedPR.number]: cached.state }));
      }
      return;
    }

    try {
      const response = await fetch(
        `/api/github/checks?owner=${owner}&repo=${repo}&ref=${ref}&installationId=${installationId}`
      );
      const data = await response.json();

      if (!data.error) {
        setCheckStatus(data);
        const state = (data && data.state) || 'none';
        checksCache.current.set(ref, { state, fetchedAt: now });
        if (selectedPR) {
          setPrChecks((prev) => ({ ...prev, [selectedPR.number]: state }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch checks:', err);
    }
  };

  const fetchRelatedRuns = async (sha: string) => {
    if (!owner || !repo || !installationId) return;
    try {
      const res = await fetch(`/api/github/runs?owner=${owner}&repo=${repo}&installation_id=${installationId}`);
      const data = await res.json();
      if (!data.error) {
        const runs = (data.runs || []).filter((r: any) => r.head_sha === sha);
        setRelatedRuns(runs);
        // Update badge from latest run outcome if available
        if (selectedPR && runs.length > 0) {
          const latest = runs[0];
          const state: 'success' | 'pending' | 'failure' | 'none' =
            latest.status !== 'completed' ? 'pending' : (latest.conclusion === 'success' ? 'success' : 'failure');
          setPrChecks((prev) => ({ ...prev, [selectedPR.number]: state }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch related runs:', err);
    }
  };

  const downloadLogs = async (runId: number) => {
    if (!owner || !repo || !installationId) return;
    try {
      setDownloadingRunId(runId);
      const url = `/api/github/runs/${runId}/logs?owner=${owner}&repo=${repo}&installation_id=${installationId}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setDownloadingRunId(null);
    }
  };

  const handleCreatePR = async () => {
    if (!owner || !repo || !branch || !installationId) return;
    if (!prTitle.trim()) {
      onNotification?.('PR title is required', 'error');
      return;
    }

    setIsCreatingPR(true);

    try {
      const response = await fetch('/api/github/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          repo,
          head: branch,
          base: baseBranch,
          title: prTitle,
          body: prBody,
          installation_id: installationId,
        }),
      });

      const data = await response.json();

      if (data.error) {
        onNotification?.(data.message || 'Failed to create PR', 'error');
      } else {
        onNotification?.('Pull request created successfully!', 'success');
        setPrTitle('');
        setPrBody('');
        setShowCreateForm(false);
        fetchPullRequests(); // Refresh list
      }
    } catch (err: any) {
      onNotification?.(err.message || 'Failed to create PR', 'error');
    } finally {
      setIsCreatingPR(false);
    }
  };

  // Empty state when not configured
  if (!owner || !repo || !installationId) {
    return (
      <ToolDrawerPanel toolName="Pull Requests">
        <ToolEmptyState
          icon={<GitPullRequest className="w-12 h-12" />}
          title="No Repository Selected"
          description="Select a GitHub repository in Settings to manage pull requests"
          actionLabel="Open Settings"
          onAction={() => {
            console.log('Open settings');
          }}
        />
      </ToolDrawerPanel>
    );
  }

  // Loading state
  if (isLoading && pullRequests.length === 0) {
    return (
      <ToolDrawerPanel toolName="Pull Requests">
        <ToolLoadingState message="Loading pull requests..." />
      </ToolDrawerPanel>
    );
  }

  // Error state
  if (error && pullRequests.length === 0) {
    return (
      <ToolDrawerPanel toolName="Pull Requests">
        <ToolErrorState
          title="Failed to Load Pull Requests"
          message={error}
          onRetry={fetchPullRequests}
        />
      </ToolDrawerPanel>
    );
  }

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'success':
        return <Check className="w-4 h-4 text-green-400" />;
      case 'failure':
        return <X className="w-4 h-4 text-red-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <ToolDrawerPanel toolName="Pull Requests">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold" style={{ fontSize: 'var(--size-h2)' }}>
                Pull Requests
              </h3>
              <p className="text-[var(--size-small)] text-[var(--muted)]">
                {pullRequests.length} open
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchPullRequests}
                className="p-1.5 rounded hover:bg-slate-700/30 transition-colors"
                title="Refresh"
                type="button"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="px-3 py-1.5 text-sm bg-purple-500 hover:bg-purple-600 rounded transition-colors flex items-center gap-1.5"
                type="button"
              >
                <Plus className="w-4 h-4" />
                New PR
              </button>
            </div>
          </div>

          {/* Create PR Form */}
          {showCreateForm && (
            <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-[var(--border)]">
              <input
                type="text"
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                placeholder="PR title..."
                className="w-full px-3 py-2 mb-2 bg-[var(--panel)] border border-[var(--border)] rounded text-sm focus:outline-none focus:border-purple-500"
              />
              <textarea
                value={prBody}
                onChange={(e) => setPrBody(e.target.value)}
                placeholder="Description (optional)..."
                className="w-full px-3 py-2 mb-2 bg-[var(--panel)] border border-[var(--border)] rounded text-sm focus:outline-none focus:border-purple-500 resize-none"
                rows={3}
              />
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-[var(--muted)]">Into:</span>
                <input
                  type="text"
                  value={baseBranch}
                  onChange={(e) => setBaseBranch(e.target.value)}
                  className="flex-1 px-2 py-1 bg-[var(--panel)] border border-[var(--border)] rounded text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreatePR}
                  disabled={isCreatingPR || !prTitle.trim()}
                  className="flex-1 px-3 py-1.5 text-sm bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                  type="button"
                >
                  {isCreatingPR ? 'Creating...' : 'Create PR'}
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-1.5 text-sm hover:bg-slate-700/30 rounded transition-colors"
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PR List */}
        <div className="flex-1 overflow-auto">
          {pullRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <GitPullRequest className="w-12 h-12 text-[var(--muted)] mb-4" />
              <p className="text-sm text-[var(--muted)]">No open pull requests</p>
              <p className="text-xs text-[var(--muted)] mt-1">Create one to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {pullRequests.map((pr) => (
                <div
                  key={pr.number}
                  className={`p-4 hover:bg-slate-700/30 cursor-pointer transition-colors ${
                    selectedPR?.number === pr.number ? 'bg-slate-700/30' : ''
                  }`}
                  onClick={() => setSelectedPR(selectedPR?.number === pr.number ? null : pr)}
                >
                  <div className="flex items-start gap-3">
                    <GitPullRequest className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium truncate">{pr.title}</h4>
                    {/* Overall checks badge */}
                    {prChecks[pr.number] && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] rounded border border-[var(--border)] ${
                          prChecks[pr.number] === 'success'
                            ? 'text-green-400 bg-green-500/10'
                            : prChecks[pr.number] === 'failure'
                            ? 'text-red-400 bg-red-500/10'
                            : prChecks[pr.number] === 'pending'
                            ? 'text-yellow-300 bg-yellow-500/10'
                            : 'text-slate-300 bg-slate-500/10'
                        }`}
                        title={`Checks: ${prChecks[pr.number]}`}
                      >
                        {prChecks[pr.number]}
                      </span>
                    )}
                    {pr.draft && (
                      <span className="px-1.5 py-0.5 text-xs bg-gray-500/20 text-gray-400 rounded">
                        Draft
                      </span>
                    )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                        <span>#{pr.number}</span>
                        <span>"</span>
                        <span>
                          {pr.head.ref} � {pr.base.ref}
                        </span>
                        <span>"</span>
                        <span>{new Date(pr.updated_at).toLocaleDateString()}</span>
                      </div>

                      {/* Expanded PR Details */}
                      {selectedPR?.number === pr.number && (
                        <div className="mt-3 pt-3 border-t border-[var(--border)]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-[var(--muted)]">Status Checks</span>
                            {checkStatus && (
                              <div className="flex items-center gap-1">
                                {getStatusIcon(checkStatus.state)}
                                <span className="text-xs text-[var(--muted)]">
                                  {checkStatus.total_count} checks
                                </span>
                              </div>
                            )}
                          </div>

                          {checkStatus && checkStatus.checks.length > 0 && (
                            <div className="space-y-1 mb-3">
                              {checkStatus.checks.slice(0, 5).map((check) => (
                                <div key={check.id} className="flex items-center gap-2 text-xs">
                                  {getStatusIcon(check.conclusion || check.status)}
                                  <span className="truncate flex-1">{check.name}</span>
                                  {check.html_url && (
                                    <a
                                      href={check.html_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[var(--muted)] hover:text-purple-400"
                                    >
                                      View
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Related Workflow Runs */}
                          <div className="mb-2">
                            <div className="text-xs text-[var(--muted)] mb-1">Related Workflow Runs</div>
                            {relatedRuns.length === 0 ? (
                              <div className="text-xs text-[var(--muted)]">No runs found for this head commit.</div>
                            ) : (
                              <div className="space-y-1">
                                {relatedRuns.slice(0, 5).map((run: any) => (
                                  <div key={run.id} className="flex items-center gap-2 text-xs">
                                    {getStatusIcon(run.conclusion || run.status)}
                                    <a href={run.html_url} target="_blank" rel="noreferrer" className="truncate flex-1 hover:text-purple-400">
                                      {run.name || `Run #${run.run_number}`} ({run.status}{run.conclusion ? ` · ${run.conclusion}` : ''})
                                    </a>
                                    {run.status === 'completed' && run.conclusion !== 'success' && (
                                      <button
                                        type="button"
                                        className="px-2 py-0.5 rounded border border-[var(--border)] hover:bg-slate-700/40"
                                        onClick={(e) => { e.stopPropagation(); downloadLogs(run.id); }}
                                        disabled={downloadingRunId === run.id}
                                        title="Download logs"
                                      >
                                        {downloadingRunId === run.id ? '...' : 'Logs'}
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <a
                            href={pr.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View on GitHub
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ToolDrawerPanel>
  );
}
