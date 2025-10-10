'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { parseDiff, Diff, Hunk, Decoration } from 'react-diff-view';
import { diffLines, formatLines } from 'unidiff';
import { ChevronUp, ChevronDown, Columns, List } from 'lucide-react';
import 'react-diff-view/style/index.css';

interface DiffViewerProps {
  oldValue: string;
  newValue: string;
  filename?: string;
  language?: string;
}

type ViewType = 'split' | 'unified';

export default function DiffViewer({
  oldValue,
  newValue,
  filename = 'file.txt',
  language = 'javascript'
}: DiffViewerProps) {
  const [viewType, setViewType] = useState<ViewType>('split');
  const [currentChangeIndex, setCurrentChangeIndex] = useState(0);
  const diffContainerRef = useRef<HTMLDivElement>(null);

  // Generate unified diff format
  const diffText = useMemo(() => {
    if (!oldValue && !newValue) return '';

    const diffResult = diffLines(oldValue || '', newValue || '');
    return formatLines(diffResult, { context: 3 });
  }, [oldValue, newValue]);

  // Parse diff to get hunks
  const files = useMemo(() => {
    if (!diffText) return [];

    try {
      return parseDiff(diffText, { nearbySequences: 'zip' });
    } catch (e) {
      console.error('Failed to parse diff:', e);
      return [];
    }
  }, [diffText]);

  const file = files[0];

  // Calculate stats
  const stats = useMemo(() => {
    if (!file) return { additions: 0, deletions: 0, changes: 0 };

    let additions = 0;
    let deletions = 0;

    file.hunks.forEach(hunk => {
      hunk.changes.forEach(change => {
        if (change.type === 'insert') additions++;
        if (change.type === 'delete') deletions++;
      });
    });

    return { additions, deletions, changes: file.hunks.length };
  }, [file]);

  // Get all change locations for navigation
  const changeLocations = useMemo(() => {
    if (!file) return [];

    const locations: number[] = [];
    file.hunks.forEach(hunk => {
      locations.push(hunk.newStart);
    });

    return locations;
  }, [file]);

  // Jump to next change
  const jumpToNextChange = () => {
    if (changeLocations.length === 0) return;

    const nextIndex = (currentChangeIndex + 1) % changeLocations.length;
    setCurrentChangeIndex(nextIndex);
    scrollToLine(changeLocations[nextIndex]);
  };

  // Jump to previous change
  const jumpToPreviousChange = () => {
    if (changeLocations.length === 0) return;

    const prevIndex = (currentChangeIndex - 1 + changeLocations.length) % changeLocations.length;
    setCurrentChangeIndex(prevIndex);
    scrollToLine(changeLocations[prevIndex]);
  };

  // Scroll to specific line
  const scrollToLine = (lineNumber: number) => {
    if (!diffContainerRef.current) return;

    const lineElement = diffContainerRef.current.querySelector(
      `[data-line-number="${lineNumber}"]`
    );

    if (lineElement) {
      lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Custom token rendering for syntax highlighting
  const renderToken = (token: any, defaultRender: any, i: number) => {
    // Basic syntax highlighting for common patterns
    const className = getTokenClassName(token.value, language);
    return (
      <span key={i} className={className}>
        {token.value}
      </span>
    );
  };

  if (!file || stats.changes === 0) {
    return (
      <div className="panel p-6 text-center">
        <div className="text-gray-400 mb-2">
          <Columns className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No changes to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--panel-alt)] flex-shrink-0">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-white">Diff View</h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">{filename}</span>
            <span className="text-green-400 flex items-center gap-1">
              <span>+{stats.additions}</span>
            </span>
            <span className="text-red-400 flex items-center gap-1">
              <span>-{stats.deletions}</span>
            </span>
            <span className="text-gray-400">
              {stats.changes} change{stats.changes !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Navigation buttons */}
          {changeLocations.length > 0 && (
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={jumpToPreviousChange}
                className="p-1.5 hover:bg-slate-700/50 rounded text-gray-400 hover:text-white transition-colors"
                title="Previous change (Shift+F7)"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-400 px-2">
                {currentChangeIndex + 1}/{changeLocations.length}
              </span>
              <button
                onClick={jumpToNextChange}
                className="p-1.5 hover:bg-slate-700/50 rounded text-gray-400 hover:text-white transition-colors"
                title="Next change (F7)"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-slate-800/50 rounded p-1">
            <button
              onClick={() => setViewType('split')}
              className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                viewType === 'split'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
              }`}
              title="Side by side view"
            >
              <Columns className="w-3 h-3" />
              Split
            </button>
            <button
              onClick={() => setViewType('unified')}
              className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                viewType === 'unified'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
              }`}
              title="Unified view"
            >
              <List className="w-3 h-3" />
              Unified
            </button>
          </div>
        </div>
      </div>

      {/* Diff Content */}
      <div
        ref={diffContainerRef}
        className="flex-1 overflow-auto bg-[var(--bg)] diff-viewer-container"
      >
        <Diff
          key={`${viewType}-${filename}`}
          viewType={viewType}
          diffType={file.type}
          hunks={file.hunks}
          renderToken={renderToken}
          optimizeSelection
          className="diff-viewer"
        >
          {(hunks) =>
            hunks.map((hunk, index) => (
              <Hunk key={`hunk-${index}`} hunk={hunk} />
            ))
          }
        </Diff>
      </div>
    </div>
  );
}

// Helper function to get token className for basic syntax highlighting
function getTokenClassName(value: string, language: string): string {
  // Keywords
  const keywords = [
    'const', 'let', 'var', 'function', 'class', 'if', 'else', 'for', 'while',
    'return', 'import', 'export', 'default', 'from', 'async', 'await', 'try',
    'catch', 'throw', 'new', 'this', 'super', 'extends', 'implements'
  ];

  if (keywords.includes(value.trim())) {
    return 'text-purple-400 font-semibold';
  }

  // Strings
  if (/^['"`].*['"`]$/.test(value.trim())) {
    return 'text-teal-300';
  }

  // Numbers
  if (/^\d+$/.test(value.trim())) {
    return 'text-amber-400';
  }

  // Comments
  if (value.trim().startsWith('//') || value.trim().startsWith('/*')) {
    return 'text-gray-500 italic';
  }

  return 'text-gray-200';
}
