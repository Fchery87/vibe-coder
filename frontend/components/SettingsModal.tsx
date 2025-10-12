'use client';

import { X, Server, Cpu, GitBranch, Github } from 'lucide-react';
import { useState, useEffect } from 'react';

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  activeProvider: string;
  selectedModel: string;
  allowFailover: boolean;
  githubEnabled: boolean;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  onFailoverChange: (enabled: boolean) => void;
  onGitHubEnabledChange: (enabled: boolean) => void;
};

const providerOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'xai', label: 'xAI' }
];

const modelsByProvider: Record<string, Array<{ value: string; label: string }>> = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' }
  ],
  google: [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' }
  ],
  xai: [
    { value: 'grok-4-fast-reasoning', label: 'Grok 4 Fast Reasoning' },
    { value: 'grok-4-fast-non-reasoning', label: 'Grok 4 Fast Non-Reasoning' },
    { value: 'grok-4-0709', label: 'Grok 4 (07-09)' },
    { value: 'grok-code-fast-1', label: 'Grok Code Fast 1' },
    { value: 'grok-3', label: 'Grok 3' },
    { value: 'grok-3-mini', label: 'Grok 3 Mini' }
  ]
};

export default function SettingsModal({
  isOpen,
  onClose,
  activeProvider,
  selectedModel,
  allowFailover,
  githubEnabled,
  onProviderChange,
  onModelChange,
  onFailoverChange,
  onGitHubEnabledChange
}: SettingsModalProps) {
  const [localProvider, setLocalProvider] = useState(activeProvider);
  const [localModel, setLocalModel] = useState(selectedModel);
  const [localFailover, setLocalFailover] = useState(allowFailover);
  const [localGitHubEnabled, setLocalGitHubEnabled] = useState(githubEnabled);

  useEffect(() => {
    setLocalProvider(activeProvider);
    setLocalModel(selectedModel);
    setLocalFailover(allowFailover);
    setLocalGitHubEnabled(githubEnabled);
  }, [activeProvider, selectedModel, allowFailover, githubEnabled, isOpen]);

  const handleProviderChange = (provider: string) => {
    setLocalProvider(provider);
    // Set default model for the provider
    const models = modelsByProvider[provider];
    if (models && models.length > 0) {
      setLocalModel(models[0].value);
    }
  };

  const handleSave = () => {
    onProviderChange(localProvider);
    onModelChange(localModel);
    onFailoverChange(localFailover);
    onGitHubEnabledChange(localGitHubEnabled);
    onClose();
  };

  if (!isOpen) return null;

  const availableModels = modelsByProvider[localProvider] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="panel w-full max-w-2xl mx-4 max-h-[80vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h2 className="text-[var(--size-h1)] font-semibold text-[var(--text)]">Settings</h2>
          <button
            onClick={onClose}
            className="btn p-2"
            type="button"
          >
            <X className="icon" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-6 space-y-6">
          {/* Provider Selection */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[var(--size-body)] font-medium text-[var(--text)]">
              <Server className="icon" />
              Provider
            </label>
            <div className="grid grid-cols-2 gap-3">
              {providerOptions.map((provider) => (
                <button
                  key={provider.value}
                  onClick={() => handleProviderChange(provider.value)}
                  className={`chip ${localProvider === provider.value ? 'on' : 'off'}`}
                  type="button"
                >
                  {provider.label}
                </button>
              ))}
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[var(--size-body)] font-medium text-[var(--text)]">
              <Cpu className="icon" />
              Model
            </label>
            <div className="grid grid-cols-1 gap-2">
              {availableModels.map((model) => (
                <button
                  key={model.value}
                  onClick={() => setLocalModel(model.value)}
                  className={`chip ${localModel === model.value ? 'on' : 'off'} justify-start`}
                  type="button"
                >
                  {model.label}
                </button>
              ))}
            </div>
          </div>

          {/* Failover Toggle */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[var(--size-body)] font-medium text-[var(--text)]">
              <GitBranch className="icon" />
              Failover
            </label>
            <button
              onClick={() => setLocalFailover(!localFailover)}
              className={`chip ${localFailover ? 'on' : 'off'}`}
              type="button"
            >
              {localFailover ? 'Enabled' : 'Disabled'}
            </button>
            <p className="text-[var(--size-small)] text-[var(--muted)]">
              Automatically switch to backup provider if primary fails
            </p>
          </div>

          {/* GitHub Integration Toggle */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[var(--size-body)] font-medium text-[var(--text)]">
              <Github className="icon" />
              GitHub Integration
            </label>
            <button
              onClick={() => setLocalGitHubEnabled(!localGitHubEnabled)}
              className={`chip ${localGitHubEnabled ? 'on' : 'off'}`}
              type="button"
            >
              {localGitHubEnabled ? 'Enabled' : 'Disabled'}
            </button>
            <p className="text-[var(--size-small)] text-[var(--muted)]">
              Enable GitHub OAuth, App integration, and webhooks. Disable this for local development or testing.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-[var(--border)]">
          <button onClick={onClose} className="btn" type="button">
            Cancel
          </button>
          <button onClick={handleSave} className="btn bg-[var(--accent)] text-white border-[var(--accent)]" type="button">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
