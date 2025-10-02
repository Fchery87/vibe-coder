'use client';

import { useState, useEffect, useRef } from 'react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCommand: (command: string) => void;
}

const commands = [
  { id: 'generate', label: 'Generate Code', shortcut: 'Ctrl+G', description: 'Generate code from prompt' },
  { id: 'checkpoint', label: 'Create Checkpoint', shortcut: 'Ctrl+S', description: 'Save current state' },
  { id: 'export-expo', label: 'Export to Expo', shortcut: 'Ctrl+E', description: 'Export as React Native app' },
  { id: 'export-flutter', label: 'Export to Flutter', shortcut: 'Ctrl+F', description: 'Export as Flutter app' },
  { id: 'quality-check', label: 'Run Quality Check', shortcut: 'Ctrl+Q', description: 'Analyze code quality' },
  { id: 'clear-chat', label: 'Clear Chat', shortcut: 'Ctrl+L', description: 'Clear chat history' },
  { id: 'toggle-theme', label: 'Toggle Theme', shortcut: 'Ctrl+T', description: 'Switch between themes' },
];

export default function CommandPalette({ isOpen, onClose, onCommand }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.description.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            onCommand(filteredCommands[selectedIndex].id);
            onClose();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose, onCommand]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
      <div className="glass-panel w-full max-w-md mx-4 rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a command or search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              className="flex-1 bg-transparent border-0 outline-none text-white placeholder-gray-400"
            />
            <div className="text-xs text-gray-500 bg-slate-700/50 px-2 py-1 rounded">
              ESC
            </div>
          </div>
        </div>

        {/* Commands List */}
        <div className="max-h-80 overflow-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              No commands found
            </div>
          ) : (
            filteredCommands.map((command, index) => (
              <div
                key={command.id}
                className={`p-3 border-b border-slate-700/30 cursor-pointer transition-colors ${
                  index === selectedIndex
                    ? 'bg-purple-500/20 border-purple-400/50'
                    : 'hover:bg-slate-700/30'
                }`}
                onClick={() => {
                  onCommand(command.id);
                  onClose();
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{command.label}</span>
                      <span className="text-xs text-gray-400 bg-slate-700/50 px-2 py-1 rounded">
                        {command.shortcut}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{command.description}</p>
                  </div>
                  {index === selectedIndex && (
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-700/50 bg-slate-800/50">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Use ↑↓ to navigate, Enter to select</span>
            <span>{filteredCommands.length} commands</span>
          </div>
        </div>
      </div>
    </div>
  );
}