"use client";

import MonacoEditor, { DiffEditor } from "@monaco-editor/react";
import { useState, useEffect } from "react";

interface CodeEditorProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  originalValue?: string; // For diff comparison
}

export default function CodeEditor({ value, onChange, originalValue }: CodeEditorProps) {
  const [viewMode, setViewMode] = useState<'editor' | 'diff'>('editor');
  const [hasChanges, setHasChanges] = useState(false);
  const [changeStats, setChangeStats] = useState({ additions: 0, deletions: 0 });

  // Check if there are changes for diff view
  useEffect(() => {
    if (originalValue && value) {
      setHasChanges(originalValue !== value);

      // Calculate change statistics
      const originalLines = originalValue.split('\n');
      const modifiedLines = value.split('\n');

      // Simple diff calculation (can be enhanced with proper diff algorithm)
      const maxLines = Math.max(originalLines.length, modifiedLines.length);
      let additions = 0;
      let deletions = 0;

      for (let i = 0; i < maxLines; i++) {
        const orig = originalLines[i];
        const mod = modifiedLines[i];

        if (orig === undefined && mod !== undefined) {
          additions++;
        } else if (orig !== undefined && mod === undefined) {
          deletions++;
        } else if (orig !== mod) {
          // Line changed - count as both addition and deletion
          additions++;
          deletions++;
        }
      }

      setChangeStats({ additions, deletions });
    } else {
      setHasChanges(false);
      setChangeStats({ additions: 0, deletions: 0 });
    }
  }, [originalValue, value]);

  const editorOptions = {
    minimap: { enabled: true, size: 'proportional' as const },
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    lineNumbers: 'on' as const,
    roundedSelection: false,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    wordWrap: 'on' as const,
    folding: true,
    lineDecorationsWidth: 10,
    lineNumbersMinChars: 3,
    renderWhitespace: 'selection' as const,
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true
    },
    smoothScrolling: true,
    cursorBlinking: 'smooth' as const,
    contextmenu: true,
    mouseWheelZoom: true,
    colorDecorators: true,
    quickSuggestions: {
      other: true,
      comments: true,
      strings: true
    },
    parameterHints: {
      enabled: true
    },
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on' as const,
    tabCompletion: 'on' as const,
    wordBasedSuggestions: 'currentDocument' as const
  };

  const diffOptions = {
    ...editorOptions,
    renderSideBySide: true,
    ignoreTrimWhitespace: false,
    renderIndicators: true,
    renderMarginRevertIcon: true,
    glyphMargin: true,
    useInlineViewWhenSpaceIsLimited: false
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700/50 bg-slate-800/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Code Editor</h3>
          {hasChanges && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded-full text-xs text-purple-300">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                Modified
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-green-400 flex items-center gap-1">
                  <span>+</span>
                  <span>{changeStats.additions}</span>
                </span>
                <span className="text-red-400 flex items-center gap-1">
                  <span>-</span>
                  <span>{changeStats.deletions}</span>
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('editor')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewMode === 'editor'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => setViewMode('diff')}
            disabled={!hasChanges}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewMode === 'diff'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            Diff View
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 min-h-0 bg-slate-900/80 backdrop-blur-sm">
        {viewMode === 'editor' ? (
          <MonacoEditor
            height="100%"
            defaultLanguage="typescript"
            value={value || "// Generated code will appear here...\n// Start by entering a prompt below!"}
            onChange={onChange}
            theme="vs-dark"
            options={editorOptions}
          />
        ) : (
          <DiffEditor
            height="100%"
            language="typescript"
            original={originalValue || ""}
            modified={value || ""}
            theme="vs-dark"
            options={diffOptions}
          />
        )}
      </div>

      {/* Footer with Stats */}
      <div className="p-2 border-t border-slate-700/50 bg-slate-800/50 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span>{(value || "").split('\n').length} lines</span>
            <span>{(value || "").length} chars</span>
            {hasChanges && (
              <span className="text-purple-400">
                {Math.abs((value || "").length - (originalValue || "").length)} chars changed
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">TypeScript</span>
            <span>•</span>
            <span>UTF-8</span>
          </div>
        </div>
      </div>
    </div>
  );
}
