'use client';

import { useEffect } from 'react';
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
  Code2,
} from 'lucide-react';
import type { Tab } from '@/components/TabBar';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCommand: (command: string) => void;
  openTabs?: Tab[];
  onTabSelect?: (tabId: string) => void;
  onFileOpen?: (filePath: string) => void;
}

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
  onFileOpen,
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

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <CommandInput placeholder="Type a command, search files, or switch tabs..." />
        <kbd className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">ESC</kbd>
      </div>

      <CommandList className="px-2 py-2">
        <CommandEmpty className="py-8">
          <div className="flex flex-col items-center gap-3">
            <Search className="h-12 w-12 opacity-30" />
            <p className="text-sm text-muted-foreground">No results found</p>
          </div>
        </CommandEmpty>

        {openTabs.length > 0 && (
          <>
            <CommandGroup
              heading={
                <span className="flex items-center gap-2">
                  <FolderOpen className="h-3 w-3" />
                  Open Tabs
                </span>
              }
            >
              {openTabs.map((tab) => (
                <CommandItem
                  key={tab.id}
                  value={`tab-${tab.fileName}`}
                  onSelect={() => {
                    onTabSelect?.(tab.id);
                    onClose();
                  }}
                  className="group gap-3 rounded-lg px-3 py-2.5"
                >
                  <Code2 className="h-4 w-4 text-blue-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{tab.fileName}</span>
                      {tab.isDirty && <span className="h-2 w-2 rounded-full bg-purple-400" title="Modified" />}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{tab.filePath ?? tab.id}</p>
                  </div>
                  <CommandShortcut className="hidden group-data-[selected=true]:inline-flex">Cmd+Enter</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup
          heading={
            <span className="flex items-center gap-2">
              <Terminal className="h-3 w-3" />
              Actions
            </span>
          }
        >
          {actionCommands.map((command) => {
            const Icon = command.icon;
            return (
              <CommandItem
                key={command.id}
                value={command.label}
                keywords={[command.description]}
                onSelect={() => {
                  onCommand(command.id);
                  onClose();
                }}
                className="group gap-3 rounded-lg px-3 py-2.5"
              >
                <Icon className="h-4 w-4 text-purple-400" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{command.label}</span>
                    {command.shortcut && (
                      <CommandShortcut className="hidden group-data-[selected=true]:inline-flex">
                        {command.shortcut}
                      </CommandShortcut>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{command.description}</p>
                </div>
                {!command.shortcut && (
                  <CommandShortcut className="hidden group-data-[selected=true]:inline-flex">
                    Enter
                  </CommandShortcut>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup
          heading={
            <span className="flex items-center gap-2">
              <FileText className="h-3 w-3" />
              Project Files
            </span>
          }
        >
          {projectFiles.map((file) => (
            <CommandItem
              key={file.path}
              value={`file-${file.name} ${file.path}`}
              onSelect={() => {
                onFileOpen?.(file.path);
                onClose();
              }}
              className="group gap-3 rounded-lg px-3 py-2.5"
            >
              <FileText className="h-4 w-4 text-green-400" />
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{file.name}</span>
                <p className="truncate text-xs text-muted-foreground">{file.path}</p>
              </div>
              <CommandShortcut className="hidden group-data-[selected=true]:inline-flex">Cmd+Enter</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>

      <div className="border-t border-border bg-[var(--panel-alt)] px-4 py-2.5 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">Up</kbd>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">Down</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">ESC</kbd>
              close
            </span>
          </div>
          <span>
            {openTabs.length} tabs / {projectFiles.length} files / {actionCommands.length} actions
          </span>
        </div>
      </div>
    </CommandDialog>
  );
}
