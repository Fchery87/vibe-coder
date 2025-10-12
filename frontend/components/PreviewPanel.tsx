'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Share2, Copy, Check, ExternalLink, RefreshCw, Eye } from 'lucide-react';

interface PreviewPanelProps {
  generatedCode?: string;
  sandboxLogs?: Array<{
    type: 'log' | 'error' | 'warn' | 'info';
    message: string;
    timestamp: Date;
  }>;
  executionResult?: {
    success: boolean;
    output: string;
    error?: string;
    executionTime: number;
  };
  metadata?: {
    provider?: string;
    model?: string;
    mock?: boolean;
    error?: string;
  };
}

export default function PreviewPanel({ generatedCode, sandboxLogs = [], executionResult, metadata }: PreviewPanelProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const errorCount = sandboxLogs.filter(log => log.type === 'error').length;
  const logCount = sandboxLogs.length;

  const handleShare = async () => {
    if (!generatedCode && !executionResult) {
      alert('No content to share. Generate some code first!');
      return;
    }

    setIsSharing(true);
    try {
      const response = await fetch('http://localhost:3001/preview/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generatedCode,
          sandboxLogs,
          executionResult,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate share link');
      }

      const data = await response.json();
      setShareUrl(data.shareUrl);
    } catch (error) {
      console.error('Error sharing preview:', error);
      alert('Failed to generate share link. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const logSurfaceClass = (type: string) => {
    switch (type) {
      case 'error':
        return 'border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.08)]';
      case 'warn':
        return 'border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.08)]';
      case 'info':
        return 'border-[rgba(34,211,238,0.3)] bg-[rgba(34,211,238,0.08)]';
      default:
        return 'border-[rgba(148,163,184,0.16)] bg-[rgba(11,16,32,0.65)]';
    }
  };

  const logAccentClass = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-[var(--error)]';
      case 'warn':
        return 'text-[var(--warn)]';
      case 'info':
        return 'text-[var(--accent-2)]';
      default:
        return 'text-[var(--muted)]';
    }
  };

  const reloadPreview = () => {
    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement | null;
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  const iframeTemplate = generatedCode
    ? `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Live Preview - Vibe Coder</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body {
                font-family: 'Inter', sans-serif;
                margin: 0;
                padding: 0;
                background:
                  radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
                  radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%),
                  radial-gradient(circle at 40% 80%, rgba(120, 219, 255, 0.1) 0%, transparent 50%),
                  linear-gradient(45deg,
                    rgba(59, 130, 246, 0.05) 25%, transparent 25%,
                    transparent 75%, rgba(59, 130, 246, 0.05) 75%,
                    rgba(59, 130, 246, 0.05) 100%);
                background-size: 20px 20px, 30px 30px, 40px 40px, 20px 20px;
                background-position: 0 0, 10px 10px, 20px 20px, 0 0;
                min-height: 100vh;
              }

              .preview-container {
                padding: 1rem;
                min-height: 100vh;
                position: relative;
              }

              .preview-content {
                position: relative;
                z-index: 1;
                background: rgba(255,255,255,0.02);
                backdrop-filter: blur(1px);
                border-radius: 8px;
                padding: 1rem;
                margin: 0.5rem;
              }

              .floating-elements {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
                overflow: hidden;
              }

              .floating-sphere {
                position: absolute;
                width: 40px;
                height: 40px;
                background: radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent);
                border-radius: 50%;
                animation: float 6s ease-in-out infinite;
              }

              .floating-sphere:nth-child(1) {
                top: 20%;
                left: 10%;
                animation-delay: 0s;
              }

              .floating-sphere:nth-child(2) {
                top: 60%;
                right: 15%;
                animation-delay: 2s;
              }

              @keyframes float {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-15px) rotate(180deg); }
              }
            </style>
          </head>
          <body>
            <div class="floating-elements">
              <div class="floating-sphere"></div>
              <div class="floating-sphere"></div>
            </div>

            <div class="preview-container">
              <div class="preview-content">
                <div id="app"></div>
              </div>
            </div>

            <script>
              document.addEventListener('DOMContentLoaded', function() {
                const interactiveElements = document.querySelectorAll('button, a, input, [role="button"]');
                interactiveElements.forEach(el => {
                  el.addEventListener('mouseenter', function() {
                    this.style.transform = 'scale(1.02)';
                    this.style.transition = 'transform 0.2s ease';
                  });
                  el.addEventListener('mouseleave', function() {
                    this.style.transform = 'scale(1)';
                  });
                });
              });

              try {
                ${generatedCode}
              } catch (error) {
                document.getElementById('app').innerHTML =
                  '<div style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; padding: 12px; color: #fca5a5; font-family: monospace;">' +
                  '<strong>Runtime Error:</strong> ' + error.message +
                  '</div>';
              }
            </script>
          </body>
        </html>`
    : null;

  return (
    <div className="panel flex flex-col h-full overflow-hidden">
      <header className="flex items-center justify-between gap-[var(--gap-4)] border-b border-[rgba(148,163,184,0.12)] bg-[rgba(17,24,38,0.55)] px-4 py-3">
        <div className="space-y-[var(--gap-1)]">
          <h2 className="text-[var(--text)] font-semibold">Sandbox &amp; Preview</h2>
          <p className="text-[var(--muted)] text-[var(--size-small)]">Live rendering, logs, and sandbox insights</p>
        </div>
        <div className="flex items-center gap-[var(--gap-3)]">
          <div className="status-metrics">
            <span><span className="text-[var(--muted)]">logs</span><strong>{logCount}</strong></span>
            <span><span className="text-[var(--muted)]">errors</span><strong>{errorCount}</strong></span>
            {metadata?.provider && (
              <span><span className="text-[var(--muted)]">provider</span><strong>{metadata?.provider}</strong></span>
            )}
          </div>
          <button
            onClick={reloadPreview}
            disabled={!generatedCode}
            className="btn flex items-center gap-[var(--gap-2)]"
            type="button"
            title="Reload preview"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Reload</span>
          </button>
          <button
            onClick={handleShare}
            disabled={isSharing || (!generatedCode && !executionResult)}
            className="btn flex items-center gap-[var(--gap-2)]"
            type="button"
            title="Share preview"
          >
            <Share2 className="w-3 h-3" />
            <span className="hidden sm:inline">{isSharing ? 'Sharing...' : 'Share'}</span>
          </button>
        </div>
      </header>

      {shareUrl && (
        <div className="px-4 py-3 border-b border-[rgba(148,163,184,0.12)] bg-[rgba(11,16,32,0.82)]">
          <div className="flex items-center gap-[var(--gap-3)]">
            <div className="flex-1">
              <p className="text-[var(--size-small)] text-[var(--muted)] mb-[var(--gap-1)]">Shareable preview link</p>
              <p className="text-[var(--size-small)] font-mono bg-[rgba(15,20,33,0.92)] border border-[rgba(148,163,184,0.16)] rounded-[var(--radius)] px-3 py-2 text-[var(--text)] break-all">
                {shareUrl}
              </p>
            </div>
            <div className="flex flex-col gap-[var(--gap-2)]">
              <button onClick={handleCopyLink} className="btn" type="button">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
              <button onClick={() => shareUrl && window.open(shareUrl, '_blank')} className="btn" type="button">
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="preview" className="flex-1 flex flex-col min-h-0 px-4 pb-4 pt-3">
        <TabsList className="mb-[var(--gap-3)]">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="logs">Sandbox Logs</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="flex-1 min-h-0">
          <div className="flex flex-col h-full">
            <div className="flex-1 flex flex-col rounded-[var(--radius)] border border-[rgba(148,163,184,0.16)] bg-[rgba(11,16,32,0.75)] overflow-hidden">
              <div className="flex items-center gap-[var(--gap-3)] border-b border-[rgba(148,163,184,0.12)] bg-[rgba(17,24,38,0.9)] px-4 py-2">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]"></span>
                </div>
                <span className="flex-1 text-[var(--muted)] text-[var(--size-small)] font-mono truncate">sandbox.vibe-coder.dev</span>
                <button
                  onClick={reloadPreview}
                  disabled={!generatedCode}
                  className="btn"
                  type="button"
                  title="Reload preview"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>

              <div className="flex-1 bg-[rgba(9,12,24,0.9)]">
                {iframeTemplate ? (
                  <iframe
                    id="preview-iframe"
                    srcDoc={iframeTemplate}
                    sandbox="allow-scripts allow-same-origin"
                    title="Sandbox Preview"
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="empty-state h-full">
                    <Eye className="w-10 h-10 text-[var(--muted)]" />
                    <h3>Interactive Preview</h3>
                    <p>Generate code to see live output from the sandbox.</p>
                    <a className="btn" href="https://docs.vibe-coder.dev/sandbox" target="_blank" rel="noreferrer">Learn how</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="flex-1 min-h-0">
          <div className="flex flex-col h-full gap-[var(--gap-2)] overflow-auto scrollbar-thin">
            {sandboxLogs.length === 0 ? (
              <div className="empty-state">
                <Eye className="w-10 h-10 text-[var(--muted)]" />
                <h3>No Sandbox Activity</h3>
                <p>Run a command or execute code to populate the log stream.</p>
              </div>
            ) : (
              sandboxLogs.slice(-20).reverse().map((log, index) => (
                <div
                  key={index}
                  className={`rounded-[var(--radius)] border px-3 py-2 ${logSurfaceClass(log.type)}`}
                >
                  <div className="flex items-center justify-between mb-[var(--gap-1)]">
                    <span className={`text-[var(--size-small)] font-semibold ${logAccentClass(log.type)}`}>{log.type.toUpperCase()}</span>
                    <span className="text-[var(--muted)] text-[var(--size-small)]">{log.timestamp.toLocaleTimeString()}</span>
                  </div>
                  <div className="text-[var(--text)] text-[var(--size-small)] whitespace-pre-wrap leading-relaxed">
                    {log.message}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="errors" className="flex-1 min-h-0">
          <div className="flex flex-col h-full gap-[var(--gap-2)] overflow-auto scrollbar-thin">
            {errorCount === 0 ? (
              <div className="empty-state">
                <div className="w-12 h-12 rounded-full bg-[rgba(34,197,94,0.16)] flex items-center justify-center">
                  <Check className="w-6 h-6 text-[var(--success)]" />
                </div>
                <h3>All Clear</h3>
                <p>No errors were detected in the latest sandbox run.</p>
              </div>
            ) : (
              sandboxLogs
                .filter(log => log.type === 'error')
                .slice(-10)
                .reverse()
                .map((log, index) => (
                  <div
                    key={index}
                    className="rounded-[var(--radius)] border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.1)] px-3 py-2"
                  >
                    <div className="flex items-center justify-between mb-[var(--gap-1)]">
                      <span className="text-[var(--error)] text-[var(--size-small)] font-semibold">Error {index + 1}</span>
                      <span className="text-[var(--muted)] text-[var(--size-small)]">{log.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <div className="text-[var(--text)] text-[var(--size-small)] whitespace-pre-wrap leading-relaxed">
                      {log.message}
                    </div>
                  </div>
                ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="flex-1 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--gap-3)] h-full overflow-auto scrollbar-thin">
            <div className="rounded-[var(--radius)] border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.08)] px-4 py-3">
              <p className="text-[var(--muted)] text-[var(--size-small)]">Execution Time</p>
              <p className="text-[var(--text)] text-lg font-semibold">{executionResult?.executionTime ?? 0} ms</p>
            </div>
            <div className="rounded-[var(--radius)] border border-[rgba(124,58,237,0.35)] bg-[rgba(124,58,237,0.12)] px-4 py-3">
              <p className="text-[var(--muted)] text-[var(--size-small)]">Code Length</p>
              <p className="text-[var(--text)] text-lg font-semibold">{generatedCode?.length ?? 0} characters</p>
            </div>
            <div className="rounded-[var(--radius)] border border-[rgba(34,211,238,0.3)] bg-[rgba(34,211,238,0.12)] px-4 py-3">
              <p className="text-[var(--muted)] text-[var(--size-small)]">Result</p>
              <p className="text-[var(--text)] text-lg font-semibold">{executionResult?.success ? 'Success' : 'Failure'}</p>
            </div>
            <div className="rounded-[var(--radius)] border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.12)] px-4 py-3">
              <p className="text-[var(--muted)] text-[var(--size-small)]">Total Logs</p>
              <p className="text-[var(--text)] text-lg font-semibold">{sandboxLogs.length}</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
