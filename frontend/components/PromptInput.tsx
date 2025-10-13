'use client';

import { useState } from 'react';

type PromptMode = 'quick' | 'think' | 'ask';

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  mode: PromptMode;
  onModeChange: (mode: PromptMode) => void;
  askEnabled?: boolean;
}

export default function PromptInput({ onSubmit, mode, onModeChange, askEnabled = false }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (prompt.trim() && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onSubmit(prompt);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const suggestions = [
    "Create a React component for user authentication",
    "Build a task management dashboard",
    "Generate a REST API with Express and TypeScript",
    "Create a real-time chat application"
  ];

  const promptModes: Array<{ id: PromptMode; label: string; description: string; disabled?: boolean }> = [
    { id: 'quick', label: 'Quick', description: 'Fast code streaming' },
    { id: 'think', label: 'Think', description: 'Plan + stream code' },
    { id: 'ask', label: 'Ask', description: 'Guidance only', disabled: !askEnabled },
  ];

  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            🚀 AI Code Generation
          </h3>
          <p className="text-sm text-gray-400">
            Describe what you want to build and let AI create it for you
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{prompt.length} chars</span>
            <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full">
              Ctrl+Enter
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {promptModes.map(({ id, label, description, disabled }) => (
              <button
                key={id}
                type="button"
                onClick={() => !disabled && onModeChange(id)}
                disabled={disabled || isSubmitting}
                className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
                  mode === id
                    ? 'border-purple-400 bg-purple-500/20 text-purple-200'
                    : 'border-slate-600/60 text-gray-400 hover:border-purple-400 hover:text-white'
                } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                title={description + (disabled ? ' (Enable Ask Mode in Settings)' : '')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Prompt Input */}
      <div className="mb-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the code you want to generate...

Examples:
• Create a React component for user authentication
• Build a task management dashboard with drag-and-drop
• Generate a REST API with Express and TypeScript
• Create a real-time chat application with WebSocket

💡 Tip: Use @filename to target specific files (e.g., 'Refactor @App.js')"
          className="w-full min-h-[120px] p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
          disabled={isSubmitting}
        />
      </div>

      {/* Quick Suggestions */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 mb-3">Quick suggestions:</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => setPrompt(suggestion)}
              disabled={isSubmitting}
              className="px-3 py-2 text-xs bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg text-gray-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">
          💡 Tip: Be specific about language, framework, and requirements
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setPrompt('')}
            disabled={isSubmitting || !prompt}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Clear
          </button>
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isSubmitting}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Generating...
              </span>
            ) : (
              '🚀 Generate Code'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
