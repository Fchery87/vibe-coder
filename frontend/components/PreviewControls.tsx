/**
 * PreviewControls Component
 * Controls for preview management: reload, share, device selector, logs
 */

'use client';

import { useState, useEffect } from 'react';
import { Monitor, Smartphone, Tablet, RefreshCw, Share2, ExternalLink, Terminal, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface PreviewControlsProps {
  previewUrl: string;
  onReload?: () => void;
  onShare?: () => void;
  onOpenExternal?: () => void;
  onDeviceChange?: (device: 'desktop' | 'tablet' | 'mobile') => void;
  currentDevice?: 'desktop' | 'tablet' | 'mobile';
  showLogs?: boolean;
  onToggleLogs?: (show: boolean) => void;
}

export function PreviewControls({
  previewUrl,
  onReload,
  onShare,
  onOpenExternal,
  onDeviceChange,
  currentDevice = 'desktop',
  showLogs = false,
  onToggleLogs,
}: PreviewControlsProps) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 border-b border-[var(--border)] bg-[var(--panel)]">
      {/* Device Selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onDeviceChange?.('desktop')}
          className={`p-2 rounded transition-colors ${
            currentDevice === 'desktop'
              ? 'bg-purple-500/20 text-purple-400'
              : 'text-[var(--muted)] hover:bg-slate-700/30'
          }`}
          type="button"
          title="Desktop view"
        >
          <Monitor className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDeviceChange?.('tablet')}
          className={`p-2 rounded transition-colors ${
            currentDevice === 'tablet'
              ? 'bg-purple-500/20 text-purple-400'
              : 'text-[var(--muted)] hover:bg-slate-700/30'
          }`}
          type="button"
          title="Tablet view"
        >
          <Tablet className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDeviceChange?.('mobile')}
          className={`p-2 rounded transition-colors ${
            currentDevice === 'mobile'
              ? 'bg-purple-500/20 text-purple-400'
              : 'text-[var(--muted)] hover:bg-slate-700/30'
          }`}
          type="button"
          title="Mobile view"
        >
          <Smartphone className="w-4 h-4" />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {onToggleLogs && (
          <button
            onClick={() => onToggleLogs(!showLogs)}
            className={`p-2 rounded transition-colors ${
              showLogs
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-[var(--muted)] hover:bg-slate-700/30'
            }`}
            type="button"
            title="Toggle logs"
          >
            <Terminal className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onReload}
          className="p-2 text-[var(--muted)] hover:bg-slate-700/30 rounded transition-colors"
          type="button"
          title="Reload preview"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={onShare}
          className="p-2 text-[var(--muted)] hover:bg-slate-700/30 rounded transition-colors"
          type="button"
          title="Share preview"
        >
          <Share2 className="w-4 h-4" />
        </button>
        <button
          onClick={onOpenExternal}
          className="p-2 text-[var(--muted)] hover:bg-slate-700/30 rounded transition-colors"
          type="button"
          title="Open in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface LogEntry {
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: Date;
}

interface PreviewLogsProps {
  logs?: LogEntry[];
  maxLogs?: number;
}

export function PreviewLogs({ logs = [], maxLogs = 50 }: PreviewLogsProps) {
  const displayLogs = logs.slice(-maxLogs).reverse();

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'warn':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-[var(--muted)]" />;
    }
  };

  const getLogStyle = (type: string) => {
    switch (type) {
      case 'error':
        return 'border-red-500/30 bg-red-500/10';
      case 'warn':
        return 'border-yellow-500/30 bg-yellow-500/10';
      case 'info':
        return 'border-blue-500/30 bg-blue-500/10';
      default:
        return 'border-[var(--border)] bg-slate-800/30';
    }
  };

  if (displayLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Terminal className="w-12 h-12 text-[var(--muted)] mb-4" />
        <p className="text-sm text-[var(--muted)]">No logs yet</p>
        <p className="text-xs text-[var(--muted)] mt-1">
          Logs from the preview sandbox will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-[var(--border)] bg-[var(--panel)]">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Preview Logs</h4>
          <span className="text-xs text-[var(--muted)]">
            {displayLogs.length} {displayLogs.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {displayLogs.map((log, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border ${getLogStyle(log.type)} transition-colors`}
          >
            <div className="flex items-start gap-2">
              {getLogIcon(log.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase">
                    {log.type}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-[var(--text)] whitespace-pre-wrap break-words">
                  {log.message}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Hook for managing preview logs with optional WebSocket/SSE integration
 */
export function usePreviewLogs(previewUrl?: string) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!previewUrl) {
      setLogs([]);
      setIsConnected(false);
      return;
    }

    // TODO: Implement WebSocket/SSE connection for real-time logs
    // For now, we'll just mark as connected if we have a URL
    setIsConnected(true);

    // Cleanup
    return () => {
      setIsConnected(false);
    };
  }, [previewUrl]);

  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        type,
        message,
        timestamp: new Date(),
      },
    ]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return {
    logs,
    isConnected,
    addLog,
    clearLogs,
  };
}
