/**
 * TicketCard Component
 * Display card for Jira issue with status, priority, assignee
 */

'use client';

import { useState } from 'react';
import { ExternalLink, MessageSquare, User, ChevronDown, ChevronUp, Send } from 'lucide-react';

interface TicketCardProps {
  issue: {
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
  };
  comments?: Array<{
    id: string;
    author: {
      displayName: string;
      avatarUrls: {
        '48x48': string;
      };
    };
    body: string;
    created: string;
  }>;
  transitions?: Array<{
    id: string;
    name: string;
    to: {
      name: string;
    };
  }>;
  jiraDomain?: string;
  onStatusChange?: (transitionId: string) => void;
  onAddComment?: (body: string) => void;
  onClick?: () => void;
}

export default function TicketCard({
  issue,
  comments = [],
  transitions = [],
  jiraDomain,
  onStatusChange,
  onAddComment,
  onClick,
}: TicketCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusColor = getStatusColor(issue.fields.status.statusCategory.key);
  const issueUrl = jiraDomain
    ? `https://${jiraDomain}/browse/${issue.key}`
    : `#`;

  const handleAddComment = async () => {
    if (!commentBody.trim() || !onAddComment) return;

    setIsSubmitting(true);
    try {
      await onAddComment(commentBody);
      setCommentBody('');
      setShowCommentForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border border-[var(--border)] rounded-lg bg-[var(--panel)] hover:border-purple-500/50 transition-colors">
      {/* Header */}
      <div
        className="p-3 cursor-pointer"
        onClick={() => onClick ? onClick() : setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3">
          {/* Issue Type Icon */}
          {issue.fields.issuetype.iconUrl && (
            <img
              src={issue.fields.issuetype.iconUrl}
              alt={issue.fields.issuetype.name}
              className="w-5 h-5 flex-shrink-0"
            />
          )}

          <div className="flex-1 min-w-0">
            {/* Key and Summary */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-[var(--muted)]">
                    {issue.key}
                  </span>
                  {issue.fields.priority && (
                    <img
                      src={issue.fields.priority.iconUrl}
                      alt={issue.fields.priority.name}
                      className="w-4 h-4"
                      title={issue.fields.priority.name}
                    />
                  )}
                </div>
                <h4 className="text-sm font-medium text-[var(--text)] mb-2">
                  {issue.fields.summary}
                </h4>
              </div>

              {/* External Link */}
              <a
                href={issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-slate-700/30 rounded transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-4 h-4 text-[var(--muted)]" />
              </a>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-3 text-xs">
              {/* Status */}
              <span
                className={`px-2 py-0.5 rounded-full ${statusColor}`}
              >
                {issue.fields.status.name}
              </span>

              {/* Assignee */}
              {issue.fields.assignee && (
                <div className="flex items-center gap-1.5">
                  <img
                    src={issue.fields.assignee.avatarUrls['48x48']}
                    alt={issue.fields.assignee.displayName}
                    className="w-4 h-4 rounded-full"
                  />
                  <span className="text-[var(--muted)]">
                    {issue.fields.assignee.displayName}
                  </span>
                </div>
              )}

              {/* Comments Count */}
              {comments.length > 0 && (
                <div className="flex items-center gap-1 text-[var(--muted)]">
                  <MessageSquare className="w-3 h-3" />
                  <span>{comments.length}</span>
                </div>
              )}

              {/* Expand/Collapse */}
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-[var(--muted)] ml-auto" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[var(--muted)] ml-auto" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[var(--border)] p-3 space-y-3">
          {/* Description */}
          {issue.fields.description && (
            <div>
              <h5 className="text-xs font-semibold mb-1">Description</h5>
              <p className="text-sm text-[var(--muted)] whitespace-pre-wrap">
                {issue.fields.description}
              </p>
            </div>
          )}

          {/* Status Transitions */}
          {transitions.length > 0 && onStatusChange && (
            <div>
              <h5 className="text-xs font-semibold mb-2">Change Status</h5>
              <div className="flex flex-wrap gap-2">
                {transitions.map((transition) => (
                  <button
                    key={transition.id}
                    onClick={() => onStatusChange(transition.id)}
                    className="px-3 py-1 text-xs bg-slate-800/50 hover:bg-purple-500/20 rounded transition-colors"
                    type="button"
                  >
                    {transition.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          {comments.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold mb-2">Comments ({comments.length})</h5>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-2 bg-slate-800/30 rounded border border-[var(--border)]"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <img
                        src={comment.author.avatarUrls['48x48']}
                        alt={comment.author.displayName}
                        className="w-4 h-4 rounded-full"
                      />
                      <span className="text-xs font-medium">
                        {comment.author.displayName}
                      </span>
                      <span className="text-xs text-[var(--muted)] ml-auto">
                        {new Date(comment.created).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text)] whitespace-pre-wrap">
                      {comment.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Comment */}
          {onAddComment && (
            <div>
              {!showCommentForm ? (
                <button
                  onClick={() => setShowCommentForm(true)}
                  className="flex items-center gap-2 text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                  type="button"
                >
                  <MessageSquare className="w-3 h-3" />
                  Add comment
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-[var(--border)] rounded focus:outline-none focus:border-purple-500 resize-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddComment}
                      disabled={isSubmitting || !commentBody.trim()}
                      className="px-3 py-1.5 text-xs bg-purple-500 hover:bg-purple-600 disabled:opacity-50 rounded flex items-center gap-1.5"
                      type="button"
                    >
                      <Send className="w-3 h-3" />
                      {isSubmitting ? 'Adding...' : 'Add comment'}
                    </button>
                    <button
                      onClick={() => {
                        setShowCommentForm(false);
                        setCommentBody('');
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
          )}
        </div>
      )}
    </div>
  );
}

function getStatusColor(statusCategoryKey: string): string {
  switch (statusCategoryKey) {
    case 'done':
      return 'bg-green-500/20 text-green-400 border border-green-500/50';
    case 'indeterminate':
      return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50';
    case 'new':
      return 'bg-blue-500/20 text-blue-400 border border-blue-500/50';
    default:
      return 'bg-slate-500/20 text-slate-400 border border-slate-500/50';
  }
}
