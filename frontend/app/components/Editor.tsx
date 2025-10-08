"use client";

import MonacoEditor, { DiffEditor } from "@monaco-editor/react";
import { useState, useEffect } from "react";

interface CodeEditorProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  originalValue?: string; // For diff comparison
}

// Pill decoration helpers
function pillClass(severity: number) {
  // Monaco MarkerSeverity: Error=8, Warning=4, Info=2
  if (severity >= 8) return 'monaco-pill error';
  if (severity >= 4) return 'monaco-pill warn';
  return '';
}

function pillText(severity: number, message: string) {
  const head = (message || '').replace(/\s+/g, ' ').trim().slice(0, 24);
  if (severity >= 8) return head ? `Error: ${head}…` : 'Error';
  if (severity >= 4) return head ? `Warn: ${head}…` : 'Warn';
  return '';
}

function buildPillDecorations(editor: any, monaco: any) {
  const model = editor.getModel();
  if (!model) return [];
  const markers = monaco.editor.getModelMarkers({ resource: model.uri });

  // group markers by line
  const byLine = new Map<number, any[]>();
  for (const m of markers) {
    const line = m.endLineNumber ?? m.startLineNumber ?? 1;
    (byLine.get(line) || byLine.set(line, []).get(line))!.push(m);
  }

  const decorations: any[] = [];
  // Balanced preset: 1 per line, at most 8 per visible viewport
  const viewport = editor.getVisibleRanges();
  let budget = 8;
  for (const r of viewport) {
    for (let line = r.startLineNumber; line <= r.endLineNumber; line++) {
      if (budget <= 0) break;
      const ms = byLine.get(line);
      if (!ms || ms.length === 0) continue;
      ms.sort((a: any, b: any) => b.severity - a.severity);
      const top = ms[0];
      const cls = pillClass(top.severity);
      if (!cls) continue;
      const txt = pillText(top.severity, top.message || '');
      const maxCol = model.getLineMaxColumn(line);
      decorations.push({
        range: new monaco.Range(line, maxCol, line, maxCol),
        options: { after: { content: ` ${txt}`, inlineClassName: cls } },
      });
      budget--;
    }
  }
  return decorations;
}

export default function CodeEditor({ value, onChange, originalValue }: CodeEditorProps) {
  const [viewMode, setViewMode] = useState<'editor' | 'diff'>('editor');
  const [hasChanges, setHasChanges] = useState(false);
  const [changeStats, setChangeStats] = useState({ additions: 0, deletions: 0 });

  // Define the custom theme on mount
  useEffect(() => {
    // This will ensure the theme is defined when the component mounts
    const defineTheme = () => {
      if (typeof window !== 'undefined' && (window as any).monaco) {
        (window as any).monaco.editor.defineTheme('vibe', vibeTheme);
      }
    };
    defineTheme();
  }, []);

  // Custom theme matching design tokens
  const vibeTheme = {
    base: 'vs-dark' as any,
    inherit: true,
    rules: [
      { token: 'comment', foreground: '94a3b8' },        // slate-400 (muted)
      { token: 'keyword', foreground: 'c4b5fd' },        // purple-300 (reduced saturation)
      { token: 'string', foreground: '5eead4' },         // teal-300
      { token: 'number', foreground: 'fbbf24' },         // amber-400
      { token: 'type', foreground: 'a5b4fc' },           // indigo-300
      { token: 'class', foreground: 'a5b4fc' },          // indigo-300
      { token: 'function', foreground: '93c5fd' },       // blue-300
      { token: 'identifier', foreground: '93c5fd' },     // blue-300
      { token: 'variable', foreground: 'e5e7eb' },       // gray-200
    ],
    colors: {
      'editor.background': '#0f1522',
      'editor.foreground': '#e5e7eb',
      'editor.lineHighlightBackground': '#94a3b80f',
      'editor.selectionBackground': '#7c3aed33',
      'editorCursor.foreground': '#7c3aed',
      'editorWhitespace.foreground': '#1f2937',
      'editorIndentGuide.background': '#1f2937',
      'editorIndentGuide.activeBackground': '#334155',
      'editorLineNumber.foreground': '#475569',
      'editorLineNumber.activeForeground': '#94a3b8',
      'editorGutter.background': '#0b1020',              // slightly darker than editor
      'editorWidget.background': '#111826',
      'editorWidget.border': '#1f2937',
      'editorSuggestWidget.background': '#111826',
      'editorSuggestWidget.border': '#1f2937',
      'editorSuggestWidget.selectedBackground': '#7c3aed22',
      'editorHoverWidget.background': '#111826',
      'editorHoverWidget.border': '#1f2937',
      'editorError.foreground': '#ef4444',
      'editorWarning.foreground': '#f59e0b',
    }
  };

  const vibeLight = {
    base: 'vs' as any,
    inherit: true,
    rules: [
      { token: 'comment', foreground: '64748b' },
      { token: 'keyword', foreground: '7c3aed' },
      { token: 'string', foreground: '0d9488' },
      { token: 'number', foreground: 'd97706' },
      { token: 'type', foreground: '6366f1' },
      { token: 'class', foreground: '6366f1' },
      { token: 'identifier', foreground: '2563eb' },
      { token: 'variable', foreground: '0f172a' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#0f172a',
      'editor.selectionBackground': '#7c3aed22',
      'editor.selectionHighlightBackground': '#7c3aed1a',
      'editor.inactiveSelectionBackground': '#7c3aed14',
      'editorCursor.foreground': '#7c3aed',
      'editor.lineHighlightBackground': '#1f29370a',
      'editorGutter.background': '#f1f5f9',
      'editorLineNumber.foreground': '#64748b',
      'editorLineNumber.activeForeground': '#0f172a',
      'editorWhitespace.foreground': '#e2e8f0',
      'editorIndentGuide.background': '#e2e8f0',
      'editorIndentGuide.activeBackground': '#cbd5e1',
      'editorWidget.background': '#ffffff',
      'editorWidget.border': '#e2e8f0',
      'editorSuggestWidget.background': '#ffffff',
      'editorSuggestWidget.border': '#e2e8f0',
      'editorSuggestWidget.selectedBackground': '#7c3aed22',
      'editorHoverWidget.background': '#ffffff',
      'editorHoverWidget.border': '#e2e8f0',
      'editorError.foreground': '#dc2626',
      'editorWarning.foreground': '#d97706',
      'editorInfo.foreground': '#0284c7',
    },
  };

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
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--panel-alt)] gap-[var(--gap-4)] flex-shrink-0">
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
                : 'text-[var(--muted)] hover:text-white hover:bg-slate-700/50'
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
                : 'text-[var(--muted)] hover:text-white hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            Diff View
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 min-h-0 editor-shell">
        {viewMode === 'editor' ? (
          <MonacoEditor
            height="100%"
            defaultLanguage="typescript"
            value={value || "// Generated code will appear here...\n// Start by entering a prompt below!"}
            onChange={onChange}
            theme="vibe"
            options={editorOptions}
            beforeMount={(monaco) => {
              monaco.editor.defineTheme('vibe', vibeTheme);
              monaco.editor.defineTheme('vibe-light', vibeLight);
            }}
            onMount={(editor, monaco) => {
              // Dynamic theme switching
              const applyTheme = () => {
                const isLight = document.documentElement.classList.contains('light');
                editor.updateOptions({ theme: isLight ? 'vibe-light' : 'vibe' });
              };
              applyTheme();

              // Balanced inline pills
              let currentDecorations: string[] = [];
              const update = () => {
                currentDecorations = editor.deltaDecorations(
                  currentDecorations,
                  buildPillDecorations(editor, monaco)
                );
              };
              update();

              const unsubMarkers = monaco.editor.onDidChangeMarkers(update);

              let raf = 0;
              const unsubScroll = editor.onDidScrollChange(() => {
                if (raf) cancelAnimationFrame(raf);
                raf = requestAnimationFrame(update);
              });

              const unsubContent = editor.onDidChangeModelContent(update);

              const mo = new MutationObserver(applyTheme);
              mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

              editor.onDidDispose(() => {
                unsubMarkers.dispose();
                unsubScroll.dispose();
                unsubContent.dispose();
                mo.disconnect();
              });
            }}
          />
        ) : (
          <DiffEditor
            height="100%"
            language="typescript"
            original={originalValue || ""}
            modified={value || ""}
            theme="vibe"
            options={diffOptions}
            beforeMount={(monaco) => {
              monaco.editor.defineTheme('vibe', vibeTheme);
              monaco.editor.defineTheme('vibe-light', vibeLight);
            }}
            onMount={(editor, monaco) => {
              // Dynamic theme switching
              const applyTheme = () => {
                const isLight = document.documentElement.classList.contains('light');
                monaco.editor.setTheme(isLight ? 'vibe-light' : 'vibe');
              };
              applyTheme();

              // Balanced inline pills for modified editor
              const modifiedEditor = editor.getModifiedEditor();
              let currentDecorations: string[] = [];
              const update = () => {
                currentDecorations = modifiedEditor.deltaDecorations(
                  currentDecorations,
                  buildPillDecorations(modifiedEditor, monaco)
                );
              };
              update();

              const unsubMarkers = monaco.editor.onDidChangeMarkers(update);

              let raf = 0;
              const unsubScroll = modifiedEditor.onDidScrollChange(() => {
                if (raf) cancelAnimationFrame(raf);
                raf = requestAnimationFrame(update);
              });

              const unsubContent = modifiedEditor.onDidChangeModelContent(update);

              const mo = new MutationObserver(applyTheme);
              mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

              modifiedEditor.onDidDispose(() => {
                unsubMarkers.dispose();
                unsubScroll.dispose();
                unsubContent.dispose();
                mo.disconnect();
              });
            }}
          />
        )}
      </div>

      {/* Footer with Stats */}
      <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--panel-alt)] flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
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












