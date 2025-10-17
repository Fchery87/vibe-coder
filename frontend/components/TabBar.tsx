"use client";

import { X } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export interface Tab {
  id: string;
  filePath: string;
  fileName: string;
  content: string;
  isDirty: boolean;
  language?: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  maxVisibleTabs?: number;
}

export default function TabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  maxVisibleTabs = 10
}: TabBarProps) {
  if (tabs.length === 0) {
    return null;
  }

  const handleMiddleClick = (e: React.MouseEvent, tabId: string) => {
    // Middle mouse button (button 1) to close tab
    if (e.button === 1) {
      e.preventDefault();
      onTabClose(tabId);
    }
  };

  const handleCloseClick = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    onTabClose(tabId);
  };

  // Show overflow indicator if too many tabs
  const showOverflow = tabs.length > maxVisibleTabs;
  const visibleTabs = showOverflow ? tabs.slice(0, maxVisibleTabs) : tabs;
  const overflowCount = tabs.length - maxVisibleTabs;

  return (
    <div className="relative border-b border-[var(--border)] bg-[var(--panel-alt)] flex-shrink-0">
      <div className="scroll-fade">
        <ScrollArea className="w-full">
          <div className="flex">
            {visibleTabs.map(tab => (
              <div
                key={tab.id}
                className={`tab-item group flex items-center gap-[var(--gap-2)] px-3 py-2 text-[var(--size-small)] cursor-pointer border-r border-[var(--border)] whitespace-nowrap flex-shrink-0 transition-colors ${
                  activeTabId === tab.id
                    ? 'bg-[var(--bg)] text-white border-b-2 border-b-purple-500'
                    : 'text-[var(--muted)] hover:text-white hover:bg-[rgba(148,163,184,0.05)]'
                }`}
                onClick={() => onTabSelect(tab.id)}
                onMouseDown={(e) => handleMiddleClick(e, tab.id)}
                title={`${tab.filePath}${tab.isDirty ? ' (modified)' : ''}`}
              >
                {/* File icon based on language */}
                <span className="text-xs">
                  {getFileIcon(tab.language || getLanguageFromFileName(tab.fileName))}
                </span>

                {/* File name */}
                <span className="truncate max-w-32 sm:max-w-40">
                  {tab.fileName}
                </span>

                {/* Dirty indicator (unsaved changes) */}
                {tab.isDirty && (
                  <span className="w-2 h-2 rounded-full bg-purple-400" title="Unsaved changes"></span>
                )}

                {/* Close button */}
                <button
                  onClick={(e) => handleCloseClick(e, tab.id)}
                  className="opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded p-0.5 transition-opacity"
                  title="Close (middle-click also works)"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Overflow indicator */}
            {showOverflow && (
              <div
                className="tab-item flex items-center gap-1 px-3 py-2 text-[var(--size-small)] border-r border-[var(--border)] bg-slate-800/50 text-[var(--muted)] cursor-default"
                title={`${overflowCount} more tab${overflowCount > 1 ? 's' : ''}`}
              >
                <span className="text-xs">+{overflowCount}</span>
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}

// Helper function to get file icon emoji based on language
function getFileIcon(language: string): string {
  const iconMap: { [key: string]: string } = {
    'javascript': '📜',
    'typescript': '📘',
    'html': '🌐',
    'css': '🎨',
    'json': '📋',
    'markdown': '📝',
    'python': '🐍',
    'java': '☕',
    'cpp': '⚙️',
    'c': '⚙️',
    'php': '🐘',
    'ruby': '💎',
    'go': '🐹',
    'rust': '🦀',
    'plaintext': '📄'
  };
  return iconMap[language] || '📄';
}

// Helper function to get language from file name
function getLanguageFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const langMap: { [key: string]: string } = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'html': 'html',
    'css': 'css',
    'scss': 'css',
    'json': 'json',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust'
  };
  return langMap[ext || ''] || 'plaintext';
}
