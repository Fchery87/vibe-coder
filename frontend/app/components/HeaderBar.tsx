'use client';

import { Sparkles, Brain, Server, Cpu, GitPullRequest, Save, Share2, Settings, Activity } from "lucide-react";

type Props = {
  provider: string;
  model: string;
  streaming: boolean;
  thinking: boolean;
  streamingFileCount?: number;
  completedStreamingFiles?: number;
  totalStreamingLines?: number;
  cliActivity?: {
    isActive: boolean;
    currentTask?: string;
  };
  metrics?: { chars?: number; logs?: number; checkpoints?: number; cliFiles?: number };
  onToggleStreaming?: () => void;
  onToggleThinking?: () => void;
  onChangeProvider?: () => void;
  onChangeModel?: () => void;
  onSave?: () => void;
  onPR?: () => void;
  onShare?: () => void;
  onSettings?: () => void;
};

export default function HeaderBar({
  provider,
  model,
  streaming,
  thinking,
  streamingFileCount = 0,
  completedStreamingFiles = 0,
  totalStreamingLines = 0,
  cliActivity,
  metrics = { chars: 0, logs: 0, checkpoints: 0, cliFiles: 0 },
  onToggleStreaming,
  onToggleThinking,
  onChangeProvider,
  onChangeModel,
  onSave,
  onPR,
  onShare,
  onSettings
}: Props) {
  return (
    <header className="topbar">
      {/* Left: Brand */}
      <div className="brand">
        <div className="logo">V</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 'var(--size-h1)', color: 'var(--text)' }}>Vibe Coder</div>
          <div className="muted" style={{ fontSize: 'var(--size-small)', color: 'var(--muted)' }}>AI-powered build & preview workspace</div>
        </div>
      </div>

      {/* Center: Modes + Status */}
      <div className="cluster">
        <button className={`chip ${streaming ? "on" : "off"}`} onClick={onToggleStreaming} type="button">
          <Sparkles className="icon" />
          <span>Streaming Mode</span>
          {streaming && (
            <span className="streaming-dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
          )}
          {streamingFileCount > 0 && (
            <span className="text-[var(--accent-2)] text-[var(--size-small)] font-semibold ml-2">
              {completedStreamingFiles}/{streamingFileCount} files
            </span>
          )}
        </button>
        <button className={`chip ${thinking ? "on" : "off"}`} onClick={onToggleThinking} type="button">
          <Brain className="icon" />
          <span>Thinking Mode</span>
        </button>
        <button className="chip" onClick={onChangeProvider} type="button">
          <Server className="icon" />
          <span>{provider || 'Select Provider'}</span>
        </button>
        <button className="chip" onClick={onChangeModel} type="button">
          <Cpu className="icon" />
          <span>{model || 'Select Model'}</span>
        </button>
        {cliActivity?.isActive && (
          <span className="chip on">
            <Activity className="icon animate-pulse" />
            <span>{cliActivity.currentTask || 'CLI running'}</span>
          </span>
        )}
      </div>

      {/* Right: Actions + Metrics */}
      <div className="cluster">
        <button className="btn" onClick={onSave} type="button">
          <Save className="icon" />
          <span>Save</span>
        </button>
        <button className="btn" onClick={onPR} type="button">
          <GitPullRequest className="icon" />
          <span>PR</span>
        </button>
        <button className="btn" onClick={onShare} type="button">
          <Share2 className="icon" />
          <span>Share</span>
        </button>
        <div className="metrics">
          <span className="muted">chars</span>
          <strong>{metrics.chars ?? 0}</strong>
          <span className="muted">logs</span>
          <strong>{metrics.logs ?? 0}</strong>
          <span className="muted">checkpoints</span>
          <strong>{metrics.checkpoints ?? 0}</strong>
          {(metrics.cliFiles ?? 0) > 0 && (
            <>
              <span className="muted">CLI</span>
              <strong>{metrics.cliFiles}</strong>
            </>
          )}
        </div>
        <button className="btn" onClick={onSettings} type="button">
          <Settings className="icon" />
        </button>
      </div>
    </header>
  );
}
