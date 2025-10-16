'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BellOff,
  Cpu,
  GitBranch,
  Github,
  KeyRound,
  Link,
  Server,
  Settings as SettingsIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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

  const flagKeys = useMemo(() => Object.keys(FEATURE_FLAGS) as FeatureFlag[], []);

  useEffect(() => {
    if (!isOpen) return;

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

  const availableModels = modelsByProvider[localProvider] || [];

  useEffect(() => {
    if (availableModels.length === 0) return;
    const firstModel = availableModels[0]?.value;
    if (firstModel && !availableModels.some((model) => model.value === localModel)) {
      setLocalModel(firstModel);
    }
  }, [availableModels, localModel]);

  const handleProviderChange = (provider: string) => {
    setLocalProvider(provider);
    const models = modelsByProvider[provider];
    if (models && models.length > 0) {
      setLocalModel(models[0].value);
    }
  };

  const handleFlagToggle = (flag: FeatureFlag, next: boolean) => {
    const updated = { ...localFlags, [flag]: next } as typeof FEATURE_FLAGS;
    setLocalFlags(updated);
    setFeatureFlags({ [flag]: next });
  };

  const formatFlagLabel = (flag: FeatureFlag) =>
    flag
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (char) => char.toUpperCase());

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] w-full max-w-4xl overflow-hidden border border-[var(--border)] bg-[var(--panel)] text-[var(--text)] sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--size-h1)]">
            <SettingsIcon className="h-5 w-5 text-[var(--accent)]" />
            Workspace Settings
          </DialogTitle>
          <DialogDescription className="text-[var(--muted)]">
            Configure providers, integrations, feature access, and UI preferences for this workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-1 sm:max-h-[65vh]">
          <div className="space-y-8 pb-2">
            {/* General */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                <Server className="h-4 w-4" />
                General
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-[var(--accent-2)]" />
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">Primary Provider</p>
                        <p className="text-xs text-[var(--muted)]">
                          Select the default model provider for new sessions.
                        </p>
                      </div>
                    </div>
                    <Select value={localProvider} onValueChange={handleProviderChange}>
                      <SelectTrigger className="border-[var(--border)] bg-[var(--panel)] text-[var(--text)]">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--border)] bg-[var(--panel)] text-[var(--text)]">
                        {providerOptions.map((provider) => (
                          <SelectItem key={provider.value} value={provider.value}>
                            {provider.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-[var(--accent-2)]" />
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">Model</p>
                        <p className="text-xs text-[var(--muted)]">
                          Refine the default model for the selected provider.
                        </p>
                      </div>
                    </div>
                    <Select value={localModel} onValueChange={setLocalModel}>
                      <SelectTrigger className="border-[var(--border)] bg-[var(--panel)] text-[var(--text)]">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--border)] bg-[var(--panel)] text-[var(--text)]">
                        {availableModels.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-[var(--accent-2)]" />
                      <p className="text-sm font-medium text-[var(--text)]">Automatic failover</p>
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      Switch to a fallback provider if the primary becomes unavailable.
                    </p>
                  </div>
                  <Switch checked={localFailover} onCheckedChange={setLocalFailover} />
                </div>
              </div>
            </section>

            {/* GitHub */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                <Github className="h-4 w-4" />
                GitHub Integration
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[var(--text)]">Enable GitHub features</p>
                    <p className="text-xs text-[var(--muted)]">
                      Toggle OAuth, app integration, and webhook syncs. Disable for offline work.
                    </p>
                  </div>
                  <Switch checked={localGitHubEnabled} onCheckedChange={setLocalGitHubEnabled} />
                </div>

                {(currentRepo || currentBranch) && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {currentRepo && (
                      <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--muted)]">
                        <Link className="h-3 w-3" />
                        <span>{currentRepo}</span>
                      </div>
                    )}
                    {currentBranch && (
                      <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--muted)]">
                        <GitBranch className="h-3 w-3" />
                        <span>{currentBranch}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span
                    className={`rounded-full border px-3 py-1 font-medium ${
                      webhooksConnected
                        ? 'border-green-500/40 bg-green-500/10 text-green-300'
                        : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-200'
                    }`}
                  >
                    Webhooks: {webhooksConnected ? 'Connected (SSE)' : 'Not connected'}
                  </span>
                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <Label htmlFor="auto-refresh" className="text-xs font-medium text-[var(--muted)]">
                      Auto-refresh (ms)
                    </Label>
                    <Input
                      id="auto-refresh"
                      type="number"
                      min={MIN_AUTO_REFRESH}
                      step={1000}
                      value={localAutoRefresh}
                      onChange={(event) => setLocalAutoRefresh(Number(event.target.value))}
                      className="w-28 border-[var(--border)] bg-[var(--panel)] text-right text-[var(--text)]"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Service connections */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                <KeyRound className="h-4 w-4" />
                Service Connections
              </div>
              <p className="text-xs text-[var(--muted)]">
                Configure external integrations. Store API credentials securely on the server—never in the browser.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] p-4">
                  <Label htmlFor="jira-url" className="text-xs text-[var(--muted)]">
                    Jira Site URL
                  </Label>
                  <Input
                    id="jira-url"
                    type="url"
                    placeholder="https://your-domain.atlassian.net"
                    value={localServiceConnections.jiraSiteUrl}
                    onChange={(event) =>
                      setLocalServiceConnections((prev) => ({
                        ...prev,
                        jiraSiteUrl: event.target.value,
                      }))
                    }
                    className="border-[var(--border)] bg-[var(--panel)] text-[var(--text)] placeholder:text-[var(--muted)]"
                  />
                  <p className="text-[10px] text-[var(--muted)]">
                    Configure <code>JIRA_API_TOKEN</code> and related secrets on the server only.
                  </p>
                </div>
                <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] p-4">
                  <Label htmlFor="linear-workspace" className="text-xs text-[var(--muted)]">
                    Linear Workspace
                  </Label>
                  <Input
                    id="linear-workspace"
                    type="text"
                    placeholder="workspace-name"
                    value={localServiceConnections.linearWorkspace}
                    onChange={(event) =>
                      setLocalServiceConnections((prev) => ({
                        ...prev,
                        linearWorkspace: event.target.value,
                      }))
                    }
                    className="border-[var(--border)] bg-[var(--panel)] text-[var(--text)] placeholder:text-[var(--muted)]"
                  />
                  <p className="text-[10px] text-[var(--muted)]">
                    Provide <code>LINEAR_API_KEY</code> server-side to authorize Linear requests.
                  </p>
                </div>
              </div>
            </section>

            {/* Feature flags */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                <SettingsIcon className="h-4 w-4" />
                Feature Flags
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {flagKeys.map((flag) => (
                  <div
                    key={flag}
                    className="flex items-start justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] p-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">{formatFlagLabel(flag)}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {localFlags[flag] ? 'Enabled' : 'Disabled'} for this browser.
                      </p>
                    </div>
                    <Switch
                      checked={localFlags[flag]}
                      onCheckedChange={(checked) => handleFlagToggle(flag, checked)}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-[var(--muted)]">
                Changes apply instantly and update tool visibility without reloading the workspace.
              </p>
            </section>

            {/* UI preferences */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                <SettingsIcon className="h-4 w-4" />
                UI Preferences
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] p-4">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-[var(--accent-2)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">Notifications</p>
                      <p className="text-xs text-[var(--muted)]">
                        Control notification center updates.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={localUIPreferences.enableNotifications}
                    onCheckedChange={(checked) =>
                      setLocalUIPreferences((prev) => ({ ...prev, enableNotifications: checked }))
                    }
                  />
                </div>
                <div className="flex items-start justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--panel-alt)] p-4">
                  <div className="flex items-center gap-2">
                    <BellOff className="h-4 w-4 text-[var(--accent-2)]" />
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">Toasts</p>
                      <p className="text-xs text-[var(--muted)]">
                        Toggle transient toast alerts during runs.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={localUIPreferences.enableToasts}
                    onCheckedChange={(checked) =>
                      setLocalUIPreferences((prev) => ({ ...prev, enableToasts: checked }))
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-[var(--muted)]">
                Critical errors always surface regardless of notification preferences.
              </p>
            </section>
          </div>
        </div>

        <DialogFooter className="flex w-full flex-row items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
