/**
 * ReviewComment Component
 * Anchored inline comments for DiffViewer integration
 * Shows review comments on specific lines in PR diffs
 */

'use client';

import { useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';

export interface ReviewCommentData {
  id: number;
  path: string;
  line: number;
  side: 'LEFT' | 'RIGHT';
  body: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  html_url: string;
}

interface ReviewCommentProps {
  comment: ReviewCommentData;
  onReply?: (body: string) => void;
}

export function ReviewComment({ comment, onReply }: ReviewCommentProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const handleReply = async () => {
    if (!replyBody.trim() || !onReply) return;

    setIsReplying(true);
    try {
      await onReply(replyBody);
      setReplyBody('');
      setShowReplyForm(false);
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <div className="border-l-2 border-purple-500 pl-3 py-2 my-2 bg-slate-800/30">
      <div className="flex items-start gap-2 mb-2">
        {comment.user.avatar_url && (
          <img
            src={comment.user.avatar_url}
            alt={comment.user.login}
            className="w-6 h-6 rounded-full"
          />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{comment.user.login}</span>
            <span className="text-xs text-[var(--muted)]">
              {new Date(comment.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm text-[var(--text)] whitespace-pre-wrap">{comment.body}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        {!showReplyForm && onReply && (
          <button
            onClick={() => setShowReplyForm(true)}
            className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            type="button"
          >
            Reply
          </button>
        )}
        <a
          href={comment.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--muted)] hover:text-purple-400 transition-colors"
        >
          View on GitHub
        </a>
      </div>

      {showReplyForm && (
        <div className="mt-2">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write a reply..."
            className="w-full px-2 py-1 text-sm bg-[var(--panel)] border border-[var(--border)] rounded focus:outline-none focus:border-purple-500 resize-none"
            rows={2}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleReply}
              disabled={isReplying || !replyBody.trim()}
              className="px-2 py-1 text-xs bg-purple-500 hover:bg-purple-600 disabled:opacity-50 rounded flex items-center gap-1"
              type="button"
            >
              <Send className="w-3 h-3" />
              {isReplying ? 'Replying...' : 'Reply'}
            </button>
            <button
              onClick={() => {
                setShowReplyForm(false);
                setReplyBody('');
              }}
              className="px-2 py-1 text-xs hover:bg-slate-700/30 rounded"
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ReviewCommentThread Component
 * Shows all comments for a specific line
 */
interface ReviewCommentThreadProps {
  comments: ReviewCommentData[];
  onAddComment?: (body: string) => void;
}

export function ReviewCommentThread({ comments, onAddComment }: ReviewCommentThreadProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddComment = async () => {
    if (!commentBody.trim() || !onAddComment) return;

    setIsAdding(true);
    try {
      await onAddComment(commentBody);
      setCommentBody('');
      setShowAddForm(false);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="p-2 bg-slate-900/50 rounded">
      <div className="space-y-2">
        {comments.map((comment) => (
          <ReviewComment key={comment.id} comment={comment} />
        ))}
      </div>

      {!showAddForm && onAddComment && (
        <button
          onClick={() => setShowAddForm(true)}
          className="mt-2 px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--text)] flex items-center gap-1 transition-colors"
          type="button"
        >
          <MessageSquare className="w-3 h-3" />
          Add comment
        </button>
      )}

      {showAddForm && (
        <div className="mt-2">
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Add a comment..."
            className="w-full px-2 py-1 text-sm bg-[var(--panel)] border border-[var(--border)] rounded focus:outline-none focus:border-purple-500 resize-none"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleAddComment}
              disabled={isAdding || !commentBody.trim()}
              className="px-2 py-1 text-xs bg-purple-500 hover:bg-purple-600 disabled:opacity-50 rounded flex items-center gap-1"
              type="button"
            >
              <Send className="w-3 h-3" />
              {isAdding ? 'Adding...' : 'Add comment'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setCommentBody('');
              }}
              className="px-2 py-1 text-xs hover:bg-slate-700/30 rounded"
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
