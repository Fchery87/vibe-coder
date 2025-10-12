/**
 * Tickets Tool
 * Jira/Linear integration for task management
 * Create, view, and manage tickets linked to PRs
 */

'use client';

import { useState, useEffect } from 'react';
import { Plus, Ticket, AlertCircle, Settings, Link as LinkIcon } from 'lucide-react';
import ToolDrawerPanel, { ToolEmptyState, ToolErrorState } from '@/components/ToolDrawerPanel';
import TicketCard from '@/components/TicketCard';
import Skeleton from '@/components/Skeleton';

interface TicketsProps {
  jiraDomain?: string;
  currentPR?: {
    number: number;
    owner: string;
    repo: string;
    html_url: string;
  };
  onNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
      statusCategory: {
        key: string;
        colorName: string;
      };
    };
    issuetype: {
      name: string;
      iconUrl: string;
    };
    priority?: {
      name: string;
      iconUrl: string;
    };
    assignee?: {
      displayName: string;
      avatarUrls: {
        '48x48': string;
      };
    };
    created: string;
    updated: string;
    project: {
      key: string;
      name: string;
    };
  };
}

interface JiraProject {
  key: string;
  name: string;
}

export default function Tickets({ jiraDomain, currentPR, onNotification }: TicketsProps) {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create form state
  const [selectedProject, setSelectedProject] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [linkToPR, setLinkToPR] = useState(true);

  // Selected issue state
  const [selectedIssue, setSelectedIssue] = useState<JiraIssue | null>(null);
  const [issueComments, setIssueComments] = useState<any[]>([]);
  const [issueTransitions, setIssueTransitions] = useState<any[]>([]);

  // Load projects and recent issues
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load projects
      const projectsRes = await fetch('/api/jira/projects');
      const projectsData = await projectsRes.json();

      if (projectsData.needsSetup) {
        setNeedsSetup(true);
        setIsLoading(false);
        return;
      }

      if (projectsData.error) {
        setError(projectsData.message);
        setIsLoading(false);
        return;
      }

      setProjects(projectsData.projects || []);

      // Load recent issues
      const issuesRes = await fetch('/api/jira/issue');
      const issuesData = await issuesRes.json();

      if (issuesData.error) {
        setError(issuesData.message);
      } else {
        setIssues(issuesData.issues || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load Jira data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateIssue = async () => {
    if (!selectedProject || !summary) {
      onNotification?.('Please select a project and enter a summary', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/jira/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectKey: selectedProject,
          summary,
          description,
          issueType: 'Task',
        }),
      });

      const data = await res.json();

      if (data.error) {
        onNotification?.(data.message, 'error');
        return;
      }

      const newIssue = data.issue;

      // Link to PR if requested
      if (linkToPR && currentPR) {
        await fetch('/api/jira/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issueKey: newIssue.key,
            url: currentPR.html_url,
            title: `PR #${currentPR.number}`,
            summary: `Pull Request ${currentPR.owner}/${currentPR.repo}#${currentPR.number}`,
            icon: 'https://github.githubassets.com/favicons/favicon.svg',
          }),
        });
      }

      // Add to list
      setIssues([newIssue, ...issues]);

      // Reset form
      setSummary('');
      setDescription('');
      setShowCreateForm(false);

      onNotification?.(`Issue ${newIssue.key} created successfully`, 'success');
    } catch (err: any) {
      onNotification?.(err.message || 'Failed to create issue', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectIssue = async (issue: JiraIssue) => {
    setSelectedIssue(issue);

    // Load comments
    try {
      const commentsRes = await fetch(`/api/jira/comment?issueKey=${issue.key}`);
      const commentsData = await commentsRes.json();
      if (!commentsData.error) {
        setIssueComments(commentsData.comments || []);
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    }

    // Load transitions
    try {
      const transitionsRes = await fetch(`/api/jira/transitions?issueKey=${issue.key}`);
      const transitionsData = await transitionsRes.json();
      if (!transitionsData.error) {
        setIssueTransitions(transitionsData.transitions || []);
      }
    } catch (err) {
      console.error('Failed to load transitions:', err);
    }
  };

  const handleStatusChange = async (issueKey: string, transitionId: string) => {
    try {
      const res = await fetch('/api/jira/issue', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueKey,
          transitionId,
        }),
      });

      const data = await res.json();

      if (data.error) {
        onNotification?.(data.message, 'error');
        return;
      }

      // Update issue in list
      setIssues(issues.map((i) => (i.key === issueKey ? data.issue : i)));
      setSelectedIssue(data.issue);

      onNotification?.('Status updated successfully', 'success');
    } catch (err: any) {
      onNotification?.(err.message || 'Failed to update status', 'error');
    }
  };

  const handleAddComment = async (issueKey: string, commentBody: string) => {
    try {
      const res = await fetch('/api/jira/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueKey,
          commentBody,
        }),
      });

      const data = await res.json();

      if (data.error) {
        onNotification?.(data.message, 'error');
        return;
      }

      // Add comment to list
      setIssueComments([...issueComments, data.comment]);

      onNotification?.('Comment added successfully', 'success');
    } catch (err: any) {
      onNotification?.(err.message || 'Failed to add comment', 'error');
    }
  };

  // Needs setup state
  if (needsSetup) {
    return (
      <ToolDrawerPanel toolName="Tickets">
        <ToolEmptyState
          icon={<Settings className="w-12 h-12" />}
          title="Jira Not Configured"
          description="Set up your Jira connection to create and manage tickets"
          actionLabel="Setup Guide"
          onAction={() => {
            window.open('https://docs.vibe-coder.dev/jira-setup', '_blank', 'noopener,noreferrer');
          }}
        />
      </ToolDrawerPanel>
    );
  }

  return (
    <ToolDrawerPanel toolName="Tickets">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold" style={{ fontSize: 'var(--size-h2)' }}>
              Jira Tickets
            </h3>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="p-2 hover:bg-slate-700/30 rounded transition-colors"
              type="button"
              title="Create ticket"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <div className="space-y-3 p-3 bg-slate-800/30 rounded-lg border border-[var(--border)]">
              <div>
                <label className="text-xs text-[var(--muted)] block mb-1">
                  Project
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[var(--panel)] border border-[var(--border)] rounded focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select project...</option>
                  {projects.map((project) => (
                    <option key={project.key} value={project.key}>
                      {project.name} ({project.key})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-[var(--muted)] block mb-1">
                  Summary *
                </label>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Brief description of the issue"
                  className="w-full px-3 py-2 text-sm bg-[var(--panel)] border border-[var(--border)] rounded focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--muted)] block mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional detailed description"
                  className="w-full px-3 py-2 text-sm bg-[var(--panel)] border border-[var(--border)] rounded focus:outline-none focus:border-purple-500 resize-none"
                  rows={3}
                />
              </div>

              {currentPR && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="link-to-pr"
                    checked={linkToPR}
                    onChange={(e) => setLinkToPR(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="link-to-pr" className="text-xs text-[var(--muted)] flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" />
                    Link to PR #{currentPR.number}
                  </label>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleCreateIssue}
                  disabled={isCreating || !selectedProject || !summary}
                  className="px-3 py-1.5 text-xs bg-purple-500 hover:bg-purple-600 disabled:opacity-50 rounded"
                  type="button"
                >
                  {isCreating ? 'Creating...' : 'Create Issue'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setSummary('');
                    setDescription('');
                  }}
                  className="px-3 py-1.5 text-xs hover:bg-slate-700/30 rounded"
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Issues List */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <ToolErrorState message={error} onRetry={loadInitialData} />
            </div>
          ) : issues.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <Ticket className="w-12 h-12 text-[var(--muted)] mb-4" />
              <p className="text-sm text-[var(--muted)]">No tickets yet</p>
              <p className="text-xs text-[var(--muted)] mt-1">
                Create a ticket to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => (
                <TicketCard
                  key={issue.key}
                  issue={issue}
                  comments={selectedIssue?.key === issue.key ? issueComments : undefined}
                  transitions={selectedIssue?.key === issue.key ? issueTransitions : undefined}
                  jiraDomain={jiraDomain}
                  onStatusChange={(transitionId) => handleStatusChange(issue.key, transitionId)}
                  onAddComment={(body) => handleAddComment(issue.key, body)}
                  onClick={() => handleSelectIssue(issue)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ToolDrawerPanel>
  );
}
