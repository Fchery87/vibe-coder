'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

interface InlineDiffProps {
  originalCode: string;
  modifiedCode: string;
  filename?: string;
  language?: string;
}

export default function InlineDiff({ originalCode, modifiedCode, filename = 'generated.js', language = 'javascript' }: InlineDiffProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Calculate simple diff stats
  const originalLines = originalCode.split('\n');
  const modifiedLines = modifiedCode.split('\n');
  const additions = modifiedLines.length - originalLines.length;
  const hasChanges = originalCode !== modifiedCode;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(modifiedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!hasChanges) {
    return (
      <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">No code changes</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 glass-panel rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-purple-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-purple-400" />
            )}
            <span className="text-sm font-medium text-white">Code Changes</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">{filename}</span>
            <span className="text-green-400">+{Math.max(0, additions)}</span>
            <span className="text-red-400">-{Math.max(0, -additions)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="p-1 hover:bg-slate-600/50 rounded text-gray-400 hover:text-white transition-colors"
            title="Copy modified code"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Diff Content */}
      {isExpanded && (
        <div className="border-t border-slate-700/50 p-3">
          <div className="bg-slate-900/80 rounded border p-3 max-h-96 overflow-auto">
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
              {modifiedCode}
            </pre>
          </div>

          {/* Simple diff visualization */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="bg-red-500/10 border border-red-400/30 rounded p-3">
              <div className="text-xs text-red-300 mb-2">Original ({originalLines.length} lines)</div>
              <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap max-h-32 overflow-auto">
                {originalCode.length > 200 ? `${originalCode.substring(0, 200)}...` : originalCode}
              </pre>
            </div>

            <div className="bg-green-500/10 border border-green-400/30 rounded p-3">
              <div className="text-xs text-green-300 mb-2">Modified ({modifiedLines.length} lines)</div>
              <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap max-h-32 overflow-auto">
                {modifiedCode.length > 200 ? `${modifiedCode.substring(0, 200)}...` : modifiedCode}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}