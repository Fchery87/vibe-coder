'use client';

import {
  X,
  Server,
  Cpu,
  GitBranch,
  Github,
  Settings as SettingsIcon,
  ToggleLeft,
  Link,
  KeyRound,
  Bell,
  BellOff,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { FEATURE_FLAGS, getFeatureFlags, setFeatureFlags, type FeatureFlag } from '@/lib/feature-flags';

const providerOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'xai', label: 'xAI' },
];

const modelsByProvider: Record<string, Array<{ value: string; label: string }>> = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
  ],
  google: [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  ],
  xai: [
    { value: 'grok-4-fast-reasoning', label: 'Grok 4 Fast Reasoning' },
    { value: 'grok-4-fast-non-reasoning', label: 'Grok 4 Fast Non-Reasoning' },
    { value: 'grok-4-0709', label: 'Grok 4 (07-09)' },
    { value: 'grok-code-fast-1', label: 'Grok Code Fast 1' },
    { value: 'grok-3', label: 'Grok 3' },
    { value: 'grok-3-mini', label: 'Grok 3 Mini' },
  ],
};

type ServiceConnections = {
  jiraSiteUrl: string;
  linearWorkspace: string;
};

type UIPreferences = {
  enableNotifications: boolean;
  enableToasts: boolean;
};

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  activeProvider: string;
  selectedModel: string;
  allowFailover: boolean;
  githubEnabled: boolean;
  currentRepo?: string | null;
  currentBranch?: string | null;
  webhooksConnected?: boolean;
  autoRefreshInterval?: number;
  serviceConnections?: ServiceConnections;
  uiPreferences?: UIPreferences;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  onFailoverChange: (enabled: boolean) => void;
  onGitHubEnabledChange: (enabled: boolean) => void;
  onAutoRefreshIntervalChange?: (ms: number) => void;
  onServiceConnectionsChange?: (connections: ServiceConnections) => void;
  onUIPreferencesChange?: (prefs: UIPreferences) => void;
};

const MIN_AUTO_REFRESH = 5000;

export default function SettingsModal({
  isOpen,
  onClose,
  activeProvider,
  selectedModel,
  allowFailover,
  githubEnabled,
  currentRepo = null,
  currentBranch = null,
  webhooksConnected = false,
  autoRefreshInterval = 30000,
  serviceConnections = { jiraSiteUrl: '', linearWorkspace: '' },
  uiPreferences = { enableNotifications: true, enableToasts: true },
  onProviderChange,
  onModelChange,
  onFailoverChange,
  onGitHubEnabledChange,
  onAutoRefreshIntervalChange,
  onServiceConnectionsChange,
  onUIPreferencesChange,
}: SettingsModalProps) {
  const [localProvider, setLocalProvider] = useState(activeProvider);
  const [localModel, setLocalModel] = useState(selectedModel);
  const [localFailover, setLocalFailover] = useState(allowFailover);
  const [localGitHubEnabled, setLocalGitHubEnabled] = useState(githubEnabled);
  const [localAutoRefresh, setLocalAutoRefresh] = useState(autoRefreshInterval);
  const [localFlags, setLocalFlags] = useState(getFeatureFlags());
  const [localServiceConnections, setLocalServiceConnections] =
    useState<ServiceConnections>(serviceConnections);
  const [localUIPreferences, setLocalUIPreferences] = useState<UIPreferences>(uiPreferences);

  useEffect(() => {
    setLocalProvider(activeProvider);
    setLocalModel(selectedModel);
    setLocalFailover(allowFailover);
    setLocalGitHubEnabled(githubEnabled);
    setLocalAutoRefresh(autoRefreshInterval);
    setLocalFlags(getFeatureFlags());
    setLocalServiceConnections(serviceConnections);
    setLocalUIPreferences(uiPreferences);
  }, [
    activeProvider,
    selectedModel,
    allowFailover,
    githubEnabled,
    autoRefreshInterval,
    serviceConnections,
    uiPreferences,
    isOpen,
  ]);

  const handleProviderChange = (provider: string) => {
    setLocalProvider(provider);
    const models = modelsByProvider[provider];
    if (models && models.length > 0) {
      setLocalModel(models[0].value);
    }
  };

  const toggleFlag = (flag: FeatureFlag) => {
    const updated = { ...localFlags, [flag]: !localFlags[flag] } as typeof FEATURE_FLAGS;
    setLocalFlags(updated);
    setFeatureFlags({ [flag]: updated[flag] });
  };

  const handleSave = () => {
    onProviderChange(localProvider);
    onModelChange(localModel);
    onFailoverChange(localFailover);
    onGitHubEnabledChange(localGitHubEnabled);
    onAutoRefreshIntervalChange?.(
      Math.max(MIN_AUTO_REFRESH, Number(localAutoRefresh) || MIN_AUTO_REFRESH),
    );
    onServiceConnectionsChange?.(localServiceConnections);
    onUIPreferencesChange?.(localUIPreferences);
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
          <button onClick={onClose} className="btn p-2" type="button">
            <X className="icon" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              General
            </h3>
          </div>

          {/* Provider Selection */}
          <section className="space-y-3">
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
          </section>

          {/* Model Selection */}
          <section className="space-y-3">
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
          </section>

          {/* Failover Toggle */}
          <section className="space-y-3">
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
              Automatically switch to a backup provider if the primary fails.
            </p>
          </section>

  {/* GitHub Integration */}
          <section className="space-y-3">
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
              Enable GitHub OAuth, App integration, and webhooks. Disable for offline development.
            </p>

            {(currentRepo || currentBranch) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[var(--muted)]">
                {currentRepo && (
                  <div className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] rounded">
                    <Link className="w-3 h-3" />
                    <span>{currentRepo}</span>
                  </div>
                )}
                {currentBranch && (
                  <div className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] rounded">
                    <GitBranch className="w-3 h-3" />
                    <span>{currentBranch}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span
                className={`px-2 py-0.5 text-xs rounded border ${
                  webhooksConnected
                    ? 'border-green-400/40 text-green-300 bg-green-500/10'
                    : 'border-yellow-400/40 text-yellow-200 bg-yellow-500/10'
                }`}
              >
                Webhooks: {webhooksConnected ? 'Connected (SSE)' : 'Not connected'}
              </span>
              <div className="flex items-center gap-2 text-[var(--size-small)] text-[var(--muted)]">
                <span>Auto-refresh (ms):</span>
                <input
                  type="number"
                  min={MIN_AUTO_REFRESH}
                  step={1000}
                  className="input w-28"
                  value={localAutoRefresh}
                  onChange={(e) => setLocalAutoRefresh(Number(e.target.value))}
                  title="Polling interval when webhooks are unavailable"
                />
              </div>
            </div>
          </section>

          {/* Service Connections */}
          <section className="space-y-3">
            <label className="flex items-center gap-2 text-[var(--size-body)] font-medium text-[var(--text)]">
              <KeyRound className="icon" />
              Service Connections
            </label>
            <p className="text-xs text-[var(--muted)]">
              Configure external integrations. Secrets (API tokens/keys) must be stored securely on the
              server (environment variables or vault).
            </p>
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-xs text-[var(--muted)]">Jira Site URL</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://your-domain.atlassian.net"
                  value={localServiceConnections.jiraSiteUrl}
                  onChange={(e) =>
                    setLocalServiceConnections((prev) => ({ ...prev, jiraSiteUrl: e.target.value }))
                  }
                />
                <p className="text-[10px] text-[var(--muted)]">
                  Configure <code>JIRA_API_TOKEN</code> and related secrets on the server only.
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[var(--muted)]">Linear Workspace</label>
                <input
                  type="text"
                  className="input"
                  placeholder="workspace-name"
                  value={localServiceConnections.linearWorkspace}
                  onChange={(e) =>
                    setLocalServiceConnections((prev) => ({ ...prev, linearWorkspace: e.target.value }))
                  }
                />
                <p className="text-[10px] text-[var(--muted)]">
                  Provide <code>LINEAR_API_KEY</code> server-side to authorize Linear requests.
                </p>
              </div>
            </div>
          </section>

          {/* Feature Flags */}
          <section className="space-y-3">
            <label className="flex items-center gap-2 text-[var(--size-body)] font-medium text-[var(--text)]">
              <ToggleLeft className="icon" />
              Feature Flags
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(FEATURE_FLAGS).map((key) => (
                <button
                  key={key}
                  onClick={() => toggleFlag(key as FeatureFlag)}
                  className={`chip ${localFlags[key as FeatureFlag] ? 'on' : 'off'} justify-between`}
                  type="button"
                  title={key}
                >
                  <span>{key}</span>
                  <span className="text-xs">{localFlags[key as FeatureFlag] ? 'On' : 'Off'}</span>
                </button>
              ))}
            </div>
            <p className="text-[var(--size-small)] text-[var(--muted)]">
              Toggles apply instantly and update tool visibility without a reload.
            </p>
          </section>

          {/* UI Preferences */}
          <section className="space-y-3">
            <label className="flex items-center gap-2 text-[var(--size-body)] font-medium text-[var(--text)]">
              <SettingsIcon className="icon" />
              UI Preferences
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setLocalUIPreferences((prev) => ({
                    ...prev,
                    enableNotifications: !prev.enableNotifications,
                  }))
                }
                className={`chip ${localUIPreferences.enableNotifications ? 'on' : 'off'}`}
              >
                <Bell className="w-4 h-4" />
                Notifications {localUIPreferences.enableNotifications ? 'On' : 'Off'}
              </button>
              <button
                type="button"
                onClick={() =>
                  setLocalUIPreferences((prev) => ({ ...prev, enableToasts: !prev.enableToasts }))
                }
                className={`chip ${localUIPreferences.enableToasts ? 'on' : 'off'}`}
              >
                {localUIPreferences.enableToasts ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                Toasts {localUIPreferences.enableToasts ? 'On' : 'Off'}
              </button>
            </div>
            <p className="text-[var(--size-small)] text-[var(--muted)]">
              Control notification center updates and toast popups. Critical errors always display.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-[var(--border)]">
          <button onClick={onClose} className="btn" type="button">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn bg-[var(--accent)] text-white border-[var(--accent)]"
            type="button"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
