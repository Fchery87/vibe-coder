'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Share2, Copy, Check, ExternalLink } from 'lucide-react';

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
}

export default function PreviewPanel({ generatedCode, sandboxLogs = [], executionResult }: PreviewPanelProps) {
  const [isExecuting, setIsExecuting] = useState(false);
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
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy link:', error);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  const getLogVariant = (type: string): "default" | "destructive" | "outline" | "secondary" | "success" | "warning" | "error" | "info" => {
    switch (type) {
      case 'error': return 'error';
      case 'warn': return 'warning';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Custom Chrome Header */}
      <div className="bg-slate-800/80 backdrop-blur-xl border-b border-slate-700/50 p-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Browser Controls */}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>

          {/* URL Bar */}
          <div className="flex-1 mx-4">
            <div className="bg-slate-900/50 border border-slate-600/50 rounded-lg px-3 py-1 flex items-center gap-2">
              <span className="text-green-400 text-xs">🔒</span>
              <span className="text-gray-300 text-sm font-mono">sandbox.vibe-coder.dev</span>
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => {
                    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
                    if (iframe) {
                      iframe.src = iframe.src; // Reload iframe
                    }
                  }}
                  className="p-1 hover:bg-slate-700/50 rounded text-gray-400 hover:text-white transition-colors"
                  title="Reload Preview"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  onClick={handleShare}
                  disabled={isSharing || (!generatedCode && !executionResult)}
                  className="p-1 hover:bg-slate-700/50 rounded text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  title="Share Preview"
                >
                  <Share2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            {isExecuting && (
              <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full border border-purple-400/30">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-purple-300 font-medium">Running...</span>
              </div>
            )}
            {executionResult && (
              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
                executionResult.success
                  ? 'bg-green-500/20 text-green-300 border-green-400/30'
                  : 'bg-red-500/20 text-red-300 border-red-400/30'
              }`}>
                {executionResult.success ? '✓ Live' : '✗ Error'}
              </div>
            )}
          </div>
        </div>

        {/* Share Link Display */}
        {shareUrl && (
          <div className="mt-3">
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <p className="text-sm text-gray-300 mb-1">Shareable Preview Link:</p>
                  <p className="text-xs text-blue-400 break-all font-mono bg-slate-900/50 p-2 rounded">
                    {shareUrl}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50 h-8"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => shareUrl && window.open(shareUrl, '_blank')}
                    className="bg-slate-700/50 border-slate-600/50 text-gray-300 hover:bg-slate-600/50 h-8"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This link expires in 24 hours and can be shared with anyone.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="preview" className="h-full">
          <TabsList className="grid w-full grid-cols-4 mb-2 bg-slate-800/50 mx-2 mt-2">
            <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
            <TabsTrigger value="logs" className="text-xs">Logs ({logCount})</TabsTrigger>
            <TabsTrigger value="errors" className="text-xs">Errors ({errorCount})</TabsTrigger>
            <TabsTrigger value="performance" className="text-xs">Perf</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="h-full mt-0">
            <div className="h-full p-2">
              {/* Live Preview Iframe */}
              {generatedCode ? (
                <div className="h-full bg-slate-900/50 rounded-lg overflow-hidden">
                  {/* Iframe Container */}
                  <div className="h-full">
                    <iframe
                      id="preview-iframe"
                      srcDoc={`
                        <!DOCTYPE html>
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
                              // Add basic interactive enhancements
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
                                  '<div class="bg-red-500/10 border border-red-400/30 rounded-lg p-3 text-red-300 text-sm">' +
                                  '<strong>Runtime Error:</strong> ' + error.message +
                                  '</div>';
                              }
                            </script>
                          </body>
                        </html>
                      `}
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-same-origin"
                      title="Live Preview"
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium mb-2">Interactive Preview</h4>
                    <p className="text-sm">Live sandbox environment will appear here</p>
                    <p className="text-xs text-gray-500 mt-1">Generate code to see live preview</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="logs" className="h-full mt-0">
            <div className="h-full p-2 overflow-auto">
              {sandboxLogs.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium mb-1">No Logs Yet</p>
                  <p className="text-xs">Execute code to see console output here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sandboxLogs.slice(-8).map((log, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        log.type === 'error' ? 'bg-red-500/10 border-red-400/30 text-red-300' :
                        log.type === 'warn' ? 'bg-yellow-500/10 border-yellow-400/30 text-yellow-300' :
                        log.type === 'info' ? 'bg-blue-500/10 border-blue-400/30 text-blue-300' :
                        'bg-slate-700/50 border-slate-600/50 text-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs flex items-center gap-1">
                          {log.type === 'error' ? '❌' :
                           log.type === 'warn' ? '⚠️' :
                           log.type === 'info' ? 'ℹ️' :
                           '📝'} {log.type.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="break-words text-xs">
                        {log.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="errors" className="h-full mt-0">
            <div className="h-full p-2 overflow-auto">
              {errorCount === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium mb-1">No Errors Detected</p>
                  <p className="text-xs">Great job! 🎉</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sandboxLogs
                    .filter(log => log.type === 'error')
                    .slice(-6)
                    .map((log, index) => (
                      <div key={index} className="glass-panel border-red-400/30 bg-red-500/10 p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-sm text-red-300">
                            ❌ Error #{index + 1}
                          </span>
                          <span className="text-xs text-gray-500">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="break-words text-sm text-red-300 mb-3 font-mono">
                          {log.message}
                        </div>
                        <div className="text-xs text-gray-500 italic">
                          💡 Tip: Check your code syntax and variable declarations
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="performance" className="h-full mt-0">
            <div className="h-full p-2 overflow-auto space-y-4">
              {/* Performance Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-panel border-blue-400/30 bg-blue-500/10 p-4 text-center">
                  <div className="text-xl font-bold text-blue-300 mb-1">
                    {executionResult?.executionTime || 0}ms
                  </div>
                  <div className="text-xs text-gray-400">
                    Execution Time
                  </div>
                </div>

                <div className="glass-panel border-purple-400/30 bg-purple-500/10 p-4 text-center">
                  <div className="text-xl font-bold text-purple-300 mb-1">
                    {generatedCode?.length || 0}
                  </div>
                  <div className="text-xs text-gray-400">
                    Code Length
                  </div>
                </div>

                <div className="glass-panel border-green-400/30 bg-green-500/10 p-4 text-center">
                  <div className="text-xl font-bold text-green-300 mb-1">
                    {executionResult?.success ? '✅' : '❌'}
                  </div>
                  <div className="text-xs text-gray-400">
                    Success Rate
                  </div>
                </div>

                <div className="glass-panel border-orange-400/30 bg-orange-500/10 p-4 text-center">
                  <div className="text-xl font-bold text-orange-300 mb-1">
                    {sandboxLogs.length}
                  </div>
                  <div className="text-xs text-gray-400">
                    Log Entries
                  </div>
                </div>
              </div>

              {/* Execution Summary */}
              <div className="glass-panel p-4">
                <h3 className="text-sm font-semibold text-white mb-3">📈 Execution Summary</h3>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>• Status: {executionResult?.success ? 'Successful' : 'Failed'}</div>
                  <div>• Duration: {executionResult?.executionTime || 0}ms</div>
                  <div>• Code Size: {generatedCode?.length || 0} characters</div>
                  <div>• Log Entries: {sandboxLogs.length}</div>
                  <div>• Errors: {sandboxLogs.filter(log => log.type === 'error').length}</div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}