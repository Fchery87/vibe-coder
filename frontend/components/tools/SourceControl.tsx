/**
 * Source Control Tool
 * Git operations in the sidebar (stage, commit, branch)
 * Integrates with Phase 1 Multi-File Tabs for dirty state tracking
 */

'use client';

import { useState, useMemo } from 'react';
import {
  GitBranch,
  GitCommit,
  GitMerge,
  Plus,
  Check,
  X,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FileText,
} from 'lucide-react';
import ToolDrawerPanel, { ToolEmptyState, ToolLoadingState, ToolErrorState } from '@/components/ToolDrawerPanel';
import { useGitStatus } from '@/hooks/useGitStatus';
import {
  formatFileStatus,
  getStatusColor,
  validateCommitMessage,
  CONVENTIONAL_COMMIT_TYPES,
  formatConventionalCommit,
} from '@/lib/git-diff';

interface SourceControlProps {
  owner?: string;
  repo?: string;
  branch?: string;
  installationId?: number;
  tabs?: Array<{
    id: string;
    path?: string;
    filePath?: string;
    content: string;
    originalContent?: string;
    sha?: string;
    isDirty?: boolean;
  }>;
  onNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function SourceControl({
  owner,
  repo,
  branch = 'main',
  installationId,
  tabs = [],
  onNotification,
}: SourceControlProps) {
  const normalizedTabs = useMemo(
    () =>
      tabs.map((tab) => ({
        ...tab,
        path: tab.path ?? tab.filePath ?? '',
      })),
    [tabs]
  );

  const {
    changedFiles,
    branches,
    currentBranch,
    isLoading,
    error,
    refreshBranches,
    createBranch,
    commitChanges,
    switchBranch,
  } = useGitStatus({ owner, repo, branch, installationId, tabs: normalizedTabs });

  const [commitMessage, setCommitMessage] = useState('');
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [showChangedFiles, setShowChangedFiles] = useState(true);
  const [showConventionalCommits, setShowConventionalCommits] = useState(false);
  const [selectedCommitType, setSelectedCommitType] = useState('');

  // Filter files by status
  const modifiedFiles = useMemo(() => changedFiles.filter((f) => f.status === 'modified'), [changedFiles]);
  const addedFiles = useMemo(() => changedFiles.filter((f) => f.status === 'added'), [changedFiles]);
  const deletedFiles = useMemo(() => changedFiles.filter((f) => f.status === 'deleted'), [changedFiles]);

  // Total stats
  const totalAdditions = useMemo(() => changedFiles.reduce((sum, f) => sum + f.additions, 0), [changedFiles]);
  const totalDeletions = useMemo(() => changedFiles.reduce((sum, f) => sum + f.deletions, 0), [changedFiles]);

  // Validate commit message
  const messageValidation = useMemo(() => validateCommitMessage(commitMessage), [commitMessage]);

  // Empty state when not configured
  if (!owner || !repo || !installationId) {
    return (
      <ToolDrawerPanel toolName="Source Control">
        <ToolEmptyState
          icon={<GitBranch className="w-12 h-12" />}
          title="No Repository Selected"
          description="Select a GitHub repository in Settings to use Source Control"
          actionLabel="Open Settings"
          onAction={() => {
            console.log('Open settings');
          }}
        />
      </ToolDrawerPanel>
    );
  }

  // Error state
  if (error && changedFiles.length === 0) {
    return (
      <ToolDrawerPanel toolName="Source Control">
        <ToolErrorState
          title="Source Control Error"
          message={error}
          onRetry={refreshBranches}
        />
      </ToolDrawerPanel>
    );
  }

  // Handle commit
  const handleCommit = async () => {
    if (!messageValidation.valid || changedFiles.length === 0) {
      return;
    }

    setIsCommitting(true);

    try {
      const success = await commitChanges(commitMessage, changedFiles);

      if (success) {
        onNotification?.(
          `Successfully committed ${changedFiles.length} file(s) to ${currentBranch}`,
          'success'
        );
        setCommitMessage('');
        setSelectedCommitType('');
      } else {
        onNotification?.('Failed to commit changes', 'error');
      }
    } catch (err: any) {
      onNotification?.(err.message || 'Commit failed', 'error');
    } finally {
      setIsCommitting(false);
    }
  };

  // Handle create branch
  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      return;
    }

    const success = await createBranch(currentBranch, newBranchName);

    if (success) {
      onNotification?.(`Created branch: ${newBranchName}`, 'success');
      setShowBranchDialog(false);
      setNewBranchName('');
    } else {
      onNotification?.('Failed to create branch', 'error');
    }
  };

  // Handle conventional commit type selection
  const handleCommitTypeSelect = (type: string) => {
    setSelectedCommitType(type);
    setShowConventionalCommits(false);

    // If there's already a message, prepend the type
    if (commitMessage && !commitMessage.startsWith(type)) {
      setCommitMessage(formatConventionalCommit(type, null, commitMessage));
    }
  };

  return (
    <ToolDrawerPanel toolName="Source Control">
      <div className="flex flex-col h-full">
        {/* Header - Branch Info */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-purple-400" />
              <span className="font-semibold text-sm">{currentBranch}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={refreshBranches}
                className="p-1.5 rounded hover:bg-slate-700/30 transition-colors"
                title="Refresh"
                type="button"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowBranchDialog(!showBranchDialog)}
                className="p-1.5 rounded hover:bg-slate-700/30 transition-colors"
                title="New Branch"
                type="button"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Create Branch Dialog */}
          {showBranchDialog && (
            <div className="mb-3 p-3 bg-slate-800/50 rounded border border-[var(--border)]">
              <label className="block text-xs text-[var(--muted)] mb-2">New Branch Name</label>
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="feature/my-feature"
                className="w-full px-3 py-2 bg-[var(--panel)] border border-[var(--border)] rounded text-sm focus:outline-none focus:border-purple-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateBranch();
                  if (e.key === 'Escape') setShowBranchDialog(false);
                }}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCreateBranch}
                  className="flex-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-xs transition-colors"
                  type="button"
                  disabled={!newBranchName.trim() || isLoading}
                >
                  Create
                </button>
                <button
                  onClick={() => setShowBranchDialog(false)}
                  className="flex-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors"
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
            <span>{changedFiles.length} changed</span>
            {totalAdditions > 0 && <span className="text-green-400">+{totalAdditions}</span>}
            {totalDeletions > 0 && <span className="text-red-400">-{totalDeletions}</span>}
          </div>
        </div>

        {/* Changed Files */}
        <div className="flex-1 overflow-auto">
          <div className="p-2">
            {/* Section Header */}
            <button
              onClick={() => setShowChangedFiles(!showChangedFiles)}
              className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-700/30 rounded transition-colors"
              type="button"
            >
              {showChangedFiles ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              <span className="text-sm font-medium">
                Changes ({changedFiles.length})
              </span>
            </button>

            {/* File List */}
            {showChangedFiles && (
              <div className="mt-1 space-y-0.5">
                {changedFiles.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                    No changes detected
                  </div>
                ) : (
                  <>
                    {/* Modified Files */}
                    {modifiedFiles.map((file) => (
                      <FileItem key={file.path} file={file} />
                    ))}
                    {/* Added Files */}
                    {addedFiles.map((file) => (
                      <FileItem key={file.path} file={file} />
                    ))}
                    {/* Deleted Files */}
                    {deletedFiles.map((file) => (
                      <FileItem key={file.path} file={file} />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Commit Section */}
        <div className="p-4 border-t border-[var(--border)]">
          {/* Conventional Commits Helper */}
          <div className="mb-2">
            <button
              onClick={() => setShowConventionalCommits(!showConventionalCommits)}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              type="button"
            >
              {showConventionalCommits ? 'Hide' : 'Show'} commit types
            </button>
          </div>

          {showConventionalCommits && (
            <div className="mb-3 grid grid-cols-2 gap-1">
              {CONVENTIONAL_COMMIT_TYPES.map(({ type, description }) => (
                <button
                  key={type}
                  onClick={() => handleCommitTypeSelect(type)}
                  className="px-2 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded text-xs text-left transition-colors"
                  type="button"
                  title={description}
                >
                  <span className="font-mono text-purple-400">{type}</span>
                </button>
              ))}
            </div>
          )}

          {/* Commit Message */}
          <textarea
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Commit message (e.g., feat: add new feature)"
            className="w-full px-3 py-2 bg-[var(--panel)] border border-[var(--border)] rounded text-sm resize-none focus:outline-none focus:border-purple-500"
            rows={3}
            disabled={changedFiles.length === 0}
          />

          {/* Validation Error */}
          {!messageValidation.valid && commitMessage.length > 0 && (
            <div className="mt-2 text-xs text-red-400">{messageValidation.error}</div>
          )}

          {/* Commit Button */}
          <button
            onClick={handleCommit}
            className="w-full mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 rounded font-medium text-sm transition-colors flex items-center justify-center gap-2"
            type="button"
            disabled={
              !messageValidation.valid ||
              changedFiles.length === 0 ||
              isCommitting ||
              isLoading
            }
          >
            {isCommitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Committing...
              </>
            ) : (
              <>
                <GitCommit className="w-4 h-4" />
                Commit {changedFiles.length} file(s)
              </>
            )}
          </button>
        </div>
      </div>
    </ToolDrawerPanel>
  );
}

/**
 * File Item Component
 */
function FileItem({ file }: { file: any }) {
  const statusChar = formatFileStatus(file.status);
  const statusColor = getStatusColor(file.status);

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-700/30 rounded transition-colors">
      <span className={`font-mono text-xs ${statusColor} w-4`}>{statusChar}</span>
      <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
      <span className="text-sm truncate flex-1">{file.path}</span>
      {file.additions > 0 && (
        <span className="text-xs text-green-400">+{file.additions}</span>
      )}
      {file.deletions > 0 && (
        <span className="text-xs text-red-400">-{file.deletions}</span>
      )}
    </div>
  );
}
