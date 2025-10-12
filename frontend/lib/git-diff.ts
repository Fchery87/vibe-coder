/**
 * Git Diff Utilities
 * Compare file content and compute changes for Source Control
 */

export interface FileChange {
  path: string;
  status: 'modified' | 'added' | 'deleted';
  additions: number;
  deletions: number;
  oldContent?: string;
  newContent?: string;
  sha?: string; // GitHub SHA for the file (needed for updates)
}

/**
 * Compare two strings and count line changes
 */
export function computeLineDiff(oldContent: string, newContent: string): { additions: number; deletions: number } {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  // Simple line-by-line comparison
  const maxLines = Math.max(oldLines.length, newLines.length);
  let additions = 0;
  let deletions = 0;

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === undefined && newLine !== undefined) {
      // Line added
      additions++;
    } else if (oldLine !== undefined && newLine === undefined) {
      // Line deleted
      deletions++;
    } else if (oldLine !== newLine) {
      // Line modified (count as both deletion and addition)
      deletions++;
      additions++;
    }
  }

  return { additions, deletions };
}

/**
 * Detect changed files by comparing tab content with original GitHub content
 */
export function detectChangedFiles(
  tabs: Array<{ path: string; content: string; originalContent?: string; sha?: string }>,
  originalFiles: Map<string, { content: string; sha: string }>
): FileChange[] {
  const changes: FileChange[] = [];

  for (const tab of tabs) {
    const original = originalFiles.get(tab.path);

    if (!original) {
      // New file (not in GitHub yet)
      changes.push({
        path: tab.path,
        status: 'added',
        additions: tab.content.split('\n').length,
        deletions: 0,
        newContent: tab.content,
      });
    } else if (tab.content !== original.content) {
      // Modified file
      const { additions, deletions } = computeLineDiff(original.content, tab.content);
      changes.push({
        path: tab.path,
        status: 'modified',
        additions,
        deletions,
        oldContent: original.content,
        newContent: tab.content,
        sha: original.sha,
      });
    }
  }

  return changes;
}

/**
 * Format file status for display
 */
export function formatFileStatus(status: FileChange['status']): string {
  switch (status) {
    case 'modified':
      return 'M';
    case 'added':
      return 'A';
    case 'deleted':
      return 'D';
    default:
      return '?';
  }
}

/**
 * Get color class for status
 */
export function getStatusColor(status: FileChange['status']): string {
  switch (status) {
    case 'modified':
      return 'text-yellow-400';
    case 'added':
      return 'text-green-400';
    case 'deleted':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * Validate commit message
 */
export function validateCommitMessage(message: string): { valid: boolean; error?: string } {
  if (!message || message.trim().length === 0) {
    return { valid: false, error: 'Commit message cannot be empty' };
  }

  if (message.trim().length < 3) {
    return { valid: false, error: 'Commit message too short (minimum 3 characters)' };
  }

  if (message.length > 500) {
    return { valid: false, error: 'Commit message too long (maximum 500 characters)' };
  }

  return { valid: true };
}

/**
 * Generate conventional commit suggestions
 */
export const CONVENTIONAL_COMMIT_TYPES = [
  { type: 'feat', description: 'A new feature' },
  { type: 'fix', description: 'A bug fix' },
  { type: 'docs', description: 'Documentation changes' },
  { type: 'style', description: 'Code style changes (formatting, etc.)' },
  { type: 'refactor', description: 'Code refactoring' },
  { type: 'test', description: 'Adding or updating tests' },
  { type: 'chore', description: 'Maintenance tasks' },
  { type: 'perf', description: 'Performance improvements' },
] as const;

/**
 * Format commit message with conventional commit prefix
 */
export function formatConventionalCommit(type: string, scope: string | null, message: string): string {
  if (scope) {
    return `${type}(${scope}): ${message}`;
  }
  return `${type}: ${message}`;
}
