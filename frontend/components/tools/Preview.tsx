/**
 * Preview Tool
 * Live sandbox preview with device frames
 * Integrates with existing sandbox infrastructure
 */

'use client';

import { useState, useEffect } from 'react';
import { Monitor, Smartphone, Tablet, RefreshCw, Share2, ExternalLink, Eye, AlertCircle } from 'lucide-react';
import ToolDrawerPanel, { ToolEmptyState, ToolErrorState } from '@/components/ToolDrawerPanel';
import { PreviewControls, PreviewLogs, usePreviewLogs } from '@/components/PreviewControls';

interface PreviewProps {
  previewUrl?: string;
  onShare?: (shareUrl: string) => void;
  onNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface DeviceFrame {
  type: DeviceType;
  label: string;
  icon: typeof Monitor;
  width: string;
  height: string;
}

const deviceFrames: DeviceFrame[] = [
  {
    type: 'desktop',
    label: 'Desktop',
    icon: Monitor,
    width: '100%',
    height: '100%',
  },
  {
    type: 'tablet',
    label: 'Tablet',
    icon: Tablet,
    width: '768px',
    height: '1024px',
  },
  {
    type: 'mobile',
    label: 'Mobile',
    icon: Smartphone,
    width: '375px',
    height: '667px',
  },
];

export default function Preview({ previewUrl, onShare, onNotification }: PreviewProps) {
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>('desktop');
  const [iframeKey, setIframeKey] = useState(0);
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  const { logs, addLog, clearLogs } = usePreviewLogs(previewUrl);
  const currentFrame = deviceFrames.find((frame) => frame.type === selectedDevice) || deviceFrames[0];

  // Reload preview
  const handleReload = () => {
    setIframeKey((prev) => prev + 1);
    setIsLoading(true);
    setError(null);
    addLog('info', 'Preview reloaded');
    onNotification?.('Preview reloaded', 'info');
  };

  // Share preview
  const handleShare = async () => {
    if (!previewUrl) {
      onNotification?.('No preview URL available', 'error');
      return;
    }

    setIsSharing(true);
    try {
      // Copy to clipboard
      await navigator.clipboard.writeText(previewUrl);
      onNotification?.('Preview URL copied to clipboard', 'success');
      onShare?.(previewUrl);
    } catch (err) {
      onNotification?.('Failed to copy URL', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  // Open in new tab
  const handleOpenExternal = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
      onNotification?.('Preview opened in new tab', 'info');
    }
  };

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
    addLog('info', 'Preview loaded successfully');
  };

  // Handle iframe error
  const handleIframeError = () => {
    setIsLoading(false);
    setError('Failed to load preview');
    addLog('error', 'Failed to load preview iframe');
  };

  // Empty state when no preview URL
  if (!previewUrl) {
    return (
      <ToolDrawerPanel toolName="Preview">
        <ToolEmptyState
          icon={<Eye className="w-12 h-12" />}
          title="No Preview Available"
          description="Run your code in the sandbox to see a live preview"
          actionLabel="Learn More"
          onAction={() => {
            window.open('https://docs.vibe-coder.dev/sandbox', '_blank', 'noopener,noreferrer');
          }}
        />
      </ToolDrawerPanel>
    );
  }

  return (
    <ToolDrawerPanel toolName="Preview">
      <div className="flex flex-col h-full">
        {/* Controls */}
        <PreviewControls
          previewUrl={previewUrl}
          onReload={handleReload}
          onShare={handleShare}
          onOpenExternal={handleOpenExternal}
          onDeviceChange={setSelectedDevice}
          currentDevice={selectedDevice}
          showLogs={showLogs}
          onToggleLogs={setShowLogs}
        />

        {/* Address Bar */}
        <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--panel)]">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded border border-[var(--border)]">
            <Eye className="w-3 h-3 text-[var(--muted)]" />
            <span className="flex-1 text-xs font-mono text-[var(--muted)] truncate">
              {previewUrl}
            </span>
          </div>
        </div>

        {/* Content Area: Preview or Logs */}
        <div className="flex-1 overflow-auto bg-slate-900/50">
          {showLogs ? (
            <PreviewLogs logs={logs} />
          ) : (
            <div className="p-4 h-full">
              {error ? (
                <div className="flex items-center justify-center h-full">
                  <ToolErrorState message={error} onRetry={handleReload} />
                </div>
              ) : (
                <div
                  className="mx-auto bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300"
                  style={{
                    width: currentFrame.width,
                    height: currentFrame.height,
                    maxWidth: '100%',
                    maxHeight: '100%',
                  }}
                >
                  {/* Browser Chrome */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-200 border-b border-slate-300">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span>
                      <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    </div>
                    <div className="flex-1 px-3 py-1 bg-white rounded text-xs font-mono text-slate-600 truncate">
                      {previewUrl}
                    </div>
                  </div>

                  {/* Iframe Container */}
                  <div className="relative w-full h-[calc(100%-40px)] bg-white">
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                        <RefreshCw className="w-6 h-6 text-purple-500 animate-spin" />
                      </div>
                    )}
                    <iframe
                      key={iframeKey}
                      src={previewUrl}
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                      title="Live Preview"
                      onLoad={handleIframeLoad}
                      onError={handleIframeError}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ToolDrawerPanel>
  );
}
