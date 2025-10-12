'use client';

import { useEffect } from 'react';
import { Command } from 'cmdk';
import {
  FileText,
  Zap,
  Save,
  Download,
  CheckCircle,
  Trash2,
  Palette,
  Settings,
  Search,
  FolderOpen,
  Terminal,
  Code2
} from 'lucide-react';
import type { Tab } from './TabBar';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCommand: (command: string) => void;
  openTabs?: Tab[];
  onTabSelect?: (tabId: string) => void;
  onFileOpen?: (filePath: string) => void;
}

// Command categories
const actionCommands = [
  { id: 'generate', label: 'Generate Code', shortcut: 'Ctrl+G', description: 'Generate code from prompt', icon: Zap },
  { id: 'checkpoint', label: 'Create Checkpoint', shortcut: 'Ctrl+S', description: 'Save current state', icon: Save },
  { id: 'export-expo', label: 'Export to Expo', shortcut: 'Ctrl+E', description: 'Export as React Native app', icon: Download },
  { id: 'export-flutter', label: 'Export to Flutter', shortcut: 'Ctrl+F', description: 'Export as Flutter app', icon: Download },
  { id: 'quality-check', label: 'Run Quality Check', shortcut: 'Ctrl+Q', description: 'Analyze code quality', icon: CheckCircle },
  { id: 'clear-chat', label: 'Clear Chat', shortcut: 'Ctrl+L', description: 'Clear chat history', icon: Trash2 },
  { id: 'toggle-theme', label: 'Toggle Theme', shortcut: '', description: 'Switch between light and dark theme', icon: Palette },
  { id: 'open-settings', label: 'Open Settings', shortcut: '', description: 'Configure Vibe Coder', icon: Settings },
];

// Sample project files for demo (in real app, these would come from backend)
const projectFiles = [
  { path: 'src/App.tsx', name: 'App.tsx', type: 'typescript' },
  { path: 'src/components/Button.tsx', name: 'Button.tsx', type: 'typescript' },
  { path: 'src/components/Card.tsx', name: 'Card.tsx', type: 'typescript' },
  { path: 'src/utils/helpers.ts', name: 'helpers.ts', type: 'typescript' },
  { path: 'src/styles/globals.css', name: 'globals.css', type: 'css' },
  { path: 'package.json', name: 'package.json', type: 'json' },
  { path: 'README.md', name: 'README.md', type: 'markdown' },
  { path: 'public/index.html', name: 'index.html', type: 'html' },
];

export default function CommandPalette({
  isOpen,
  onClose,
  onCommand,
  openTabs = [],
  onTabSelect,
  onFileOpen
}: CommandPaletteProps) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
      <Command className="glass-panel w-full max-w-2xl mx-4 rounded-xl shadow-2xl overflow-hidden border border-slate-700/50">
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-slate-700/50 px-4 py-3">
          <Search className="w-5 h-5 text-gray-400" />
          <Command.Input
            placeholder="Type a command, search files, or switch tabs..."
            className="flex-1 bg-transparent border-0 outline-none text-white placeholder-gray-400 text-base"
            autoFocus
          />
          <kbd className="text-xs text-gray-500 bg-slate-700/50 px-2 py-1 rounded font-mono">
            ESC
          </kbd>
        </div>

        <Command.List className="max-h-96 overflow-auto p-2">
          <Command.Empty className="p-8 text-center text-gray-400">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No results found</p>
          </Command.Empty>

          {/* Open Tabs Section */}
          {openTabs.length > 0 && (
            <Command.Group heading="Open Tabs" className="px-2 py-2">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                <FolderOpen className="w-3 h-3" />
                Open Tabs
              </div>
              {openTabs.map((tab) => (
                <Command.Item
                  key={tab.id}
                  value={`tab-${tab.fileName}`}
                  onSelect={() => {
                    onTabSelect?.(tab.id);
                    onClose();
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors data-[selected=true]:bg-purple-500/20 hover:bg-slate-700/30 group"
                >
                  <Code2 className="w-4 h-4 text-blue-400" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium truncate">{tab.fileName}</span>
                      {tab.isDirty && (
                        <span className="w-2 h-2 rounded-full bg-purple-400" title="Modified" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{tab.filePath}</p>
                  </div>
                  <kbd className="hidden group-data-[selected=true]:block text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded font-mono">
                    ↵
                  </kbd>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Actions Section */}
          <Command.Group heading="Actions" className="px-2 py-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Terminal className="w-3 h-3" />
              Actions
            </div>
            {actionCommands.map((command) => {
              const Icon = command.icon;
              return (
                <Command.Item
                  key={command.id}
                  value={command.label}
                  keywords={[command.description]}
                  onSelect={() => {
                    onCommand(command.id);
                    onClose();
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors data-[selected=true]:bg-purple-500/20 hover:bg-slate-700/30 group"
                >
                  <Icon className="w-4 h-4 text-purple-400" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{command.label}</span>
                      {command.shortcut && (
                        <kbd className="text-xs text-gray-500 bg-slate-700/50 px-2 py-0.5 rounded font-mono">
                          {command.shortcut}
                        </kbd>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{command.description}</p>
                  </div>
                  <kbd className="hidden group-data-[selected=true]:block text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded font-mono">
                    ↵
                  </kbd>
                </Command.Item>
              );
            })}
          </Command.Group>

          {/* Files Section */}
          <Command.Group heading="Files" className="px-2 py-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
              <FileText className="w-3 h-3" />
              Project Files
            </div>
            {projectFiles.map((file) => (
              <Command.Item
                key={file.path}
                value={`file-${file.name} ${file.path}`}
                onSelect={() => {
                  onFileOpen?.(file.path);
                  onClose();
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors data-[selected=true]:bg-purple-500/20 hover:bg-slate-700/30 group"
              >
                <FileText className="w-4 h-4 text-green-400" />
                <div className="flex-1 min-w-0">
                  <span className="text-white font-medium truncate block">{file.name}</span>
                  <p className="text-xs text-gray-400 truncate">{file.path}</p>
                </div>
                <kbd className="hidden group-data-[selected=true]:block text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded font-mono">
                  ↵
                </kbd>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>

        {/* Footer */}
        <div className="border-t border-slate-700/50 bg-slate-800/50 px-4 py-2.5">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="bg-slate-700/50 px-1.5 py-0.5 rounded font-mono">↑</kbd>
                <kbd className="bg-slate-700/50 px-1.5 py-0.5 rounded font-mono">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-slate-700/50 px-1.5 py-0.5 rounded font-mono">↵</kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-slate-700/50 px-1.5 py-0.5 rounded font-mono">ESC</kbd>
                close
              </span>
            </div>
            <span>
              {openTabs.length} tabs • {projectFiles.length} files • {actionCommands.length} actions
            </span>
          </div>
        </div>
      </Command>
    </div>
  );
}
