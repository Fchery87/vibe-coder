'use client';

import { Sparkles, Brain, GitPullRequest, Save, Share2, Settings, Activity, Bell } from "lucide-react";
import GitHubConnect from "./GitHubConnect";
import RepoPicker from "./RepoPicker";
import { GitHubRepository } from "@/lib/github-types";
import { Button } from "@/components/ui/button";

type Props = {
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
  onSave?: () => void;
  onPR?: () => void;
  onShare?: () => void;
  onSettings?: () => void;
  onRepoSelect?: (repo: GitHubRepository, installationId: number) => void;
  githubConnected?: boolean;
  githubEnabled?: boolean;
  onGitHubConnect?: () => void;
  onGitHubDisconnect?: () => void;
  unreadNotifications?: number;
  onNotificationsClick?: () => void;
};

export default function HeaderBar({
  streaming,
  thinking,
  streamingFileCount = 0,
  completedStreamingFiles = 0,
  totalStreamingLines = 0,
  cliActivity,
  metrics = { chars: 0, logs: 0, checkpoints: 0, cliFiles: 0 },
  onToggleStreaming,
  onToggleThinking,
  onSave,
  onPR,
  onShare,
  onSettings,
  onRepoSelect,
  githubConnected = false,
  githubEnabled = false,
  onGitHubConnect,
  onGitHubDisconnect,
  unreadNotifications = 0,
  onNotificationsClick,
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
          <span>Streaming</span>
          {streaming && (
            <span className="streaming-dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
          )}
          {streamingFileCount > 0 && (
            <span className="text-[var(--accent-2)] text-[var(--size-small)] font-semibold ml-2">
              {completedStreamingFiles}/{streamingFileCount}
            </span>
          )}
        </button>
        <button className={`chip ${thinking ? "on" : "off"}`} onClick={onToggleThinking} type="button">
          <Brain className="icon" />
          <span>Thinking</span>
        </button>
        {cliActivity?.isActive && (
          <span className="chip on">
            <Activity className="icon animate-pulse" />
            <span>{cliActivity.currentTask || 'CLI running'}</span>
          </span>
        )}
      </div>

      {/* Right: GitHub + Actions + Metrics */}
      <div className="cluster">
        {githubEnabled && (
          <>
            <GitHubConnect onConnect={onGitHubConnect} onDisconnect={onGitHubDisconnect} />
            {githubConnected && onRepoSelect && (
              <RepoPicker onRepoSelect={onRepoSelect} isConnected={githubConnected} />
            )}
          </>
        )}
        <Button variant="secondary" size="sm" onClick={onSave} type="button" className="min-w-[68px]">
          <Save className="icon" />
          <span>Save</span>
        </Button>
        <Button variant="secondary" size="sm" onClick={onPR} type="button">
          <GitPullRequest className="icon" />
          <span>PR</span>
        </Button>
        <Button variant="secondary" size="sm" onClick={onShare} type="button">
          <Share2 className="icon" />
          <span>Share</span>
        </Button>
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
        <Button
          variant="secondary"
          size="sm"
          className="relative"
          onClick={onNotificationsClick}
          type="button"
          title="Notifications"
        >
          <Bell className="icon" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          )}
        </Button>
        <Button variant="secondary" size="sm" onClick={onSettings} type="button">
          <Settings className="icon" />
        </Button>
      </div>
    </header>
  );
}
