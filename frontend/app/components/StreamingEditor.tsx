'use client';

import { useState, useEffect, useRef } from 'react';
import CodeEditor from '@/components/Editor';

interface StreamingFile {
  path: string;
  content: string;
  status: 'writing' | 'done';
  language: string;
}

interface StreamingEditorProps {
  onStreamingComplete?: (files: StreamingFile[]) => void;
  onStreamingError?: (error: string) => void;
  onFileModified?: (filePath: string, operation: string) => void;
  onExitStreaming?: () => void;
}

export default function StreamingEditor({
  onStreamingComplete,
  onStreamingError,
  onFileModified,
  onExitStreaming
}: StreamingEditorProps) {
  const [files, setFiles] = useState<StreamingFile[]>([]);
  const [activeFile, setActiveFile] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSession, setCurrentSession] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get language from file extension
  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const langMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust'
    };
    return langMap[ext || ''] || 'plaintext';
  };

  // Open a new file tab
  const openTab = (path: string) => {
    setFiles(prev => {
      const existing = prev.find(f => f.path === path);
      if (existing) return prev;

      const newFile: StreamingFile = {
        path,
        content: '',
        status: 'writing',
        language: getLanguageFromPath(path)
      };

      return [...prev, newFile];
    });

    setActiveFile(path);
  };

  // Append content to a file
  const appendToFile = (path: string, text: string) => {
    setFiles(prev => prev.map(file => {
      if (file.path === path) {
        const newContent = file.content + text;
        // Update editor in real-time
        if (path === activeFile) {
          // The editor will be updated via the content prop
        }
        return { ...file, content: newContent };
      }
      return file;
    }));
  };

  // Close a file tab
  const closeTab = (path: string) => {
    setFiles(prev => {
      const updated = prev.map(file =>
        file.path === path ? { ...file, status: 'done' as const } : file
      );

      // If this was the active file, switch to another
      if (path === activeFile) {
        const remaining = updated.filter(f => f.path !== path);
        if (remaining.length > 0) {
          setActiveFile(remaining[0].path);
        }
      }

      return updated;
    });
  };

  // Set active file
  const setActive = (path: string) => {
    if (files.find(f => f.path === path)) {
      setActiveFile(path);
    }
  };

  // Start streaming session (called from parent component)
  const startStreamingSession = async (prompt: string) => {
    console.log('Starting streaming session with prompt:', prompt);
    await startStreaming(prompt);
  };

  // Expose startStreamingSession to parent component
  useEffect(() => {
    // Make startStreamingSession available globally for the Atlas CLI
    (window as any).startStreamingSession = startStreamingSession;
    (window as any).isStreamingActive = () => isStreaming;

    return () => {
      delete (window as any).startStreamingSession;
      delete (window as any).isStreamingActive;
    };
  }, [isStreaming]);

  // Start streaming session
  const startStreaming = async (prompt: string) => {
    if (isStreaming) {
      console.log('Already streaming, ignoring request');
      return;
    }

    console.log('Starting streaming with prompt:', prompt);
    setIsStreaming(true);
    setFiles([]);
    setActiveFile('');

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      console.log('Fetching from /api/generate...');
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
        signal: abortControllerRef.current.signal
      });

      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      let currentPath = '';
      let eventCount = 0;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        console.log('Received chunk:', chunk);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            eventCount++;
            console.log(`Event ${eventCount}:`, data);

            if (data.startsWith('FILE_OPEN ')) {
              currentPath = data.slice(10).trim();
              console.log('Opening file:', currentPath);
              openTab(currentPath);
            } else if (data.startsWith('APPEND ')) {
              const text = data.slice(7);
              if (currentPath) {
                console.log('Appending to', currentPath, ':', text.length, 'characters');
                appendToFile(currentPath, text);
              }
            } else if (data.startsWith('FILE_CLOSE ')) {
              const closedPath = data.slice(11).trim();
              console.log('Closing file:', closedPath);
              closeTab(closedPath);
            } else if (data === 'COMPLETE') {
              console.log('Streaming complete - files generated:', files.length);
              console.log('Files:', files.map(f => ({ path: f.path, contentLength: f.content.length })));

              // Keep streaming active but mark as complete for UI feedback
              setIsStreaming(false);

              // Ensure we have files before calling completion callback
              if (files.length > 0) {
                onStreamingComplete?.(files);
              } else {
                console.warn('No files generated, but streaming completed');
                onStreamingComplete?.([]);
              }
              break;
            } else if (data.startsWith('ERROR ')) {
              const errorMsg = data.slice(6);
              console.error('Streaming error:', errorMsg);
              onStreamingError?.(errorMsg);
              setIsStreaming(false);
              break;
            }
          }
        }
      }

      console.log('Streaming finished naturally');
      setIsStreaming(false);
    } catch (error: any) {
      console.error('Streaming error:', error);
      if (error.name === 'AbortError') {
        console.log('Streaming cancelled by user');
      } else {
        onStreamingError?.(error.message || 'Streaming failed');
      }
      setIsStreaming(false);
    }
  };

  // Cancel streaming
  const cancelStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
  };

  // Get current active file content
  const getActiveFileContent = (): string => {
    const file = files.find(f => f.path === activeFile);
    return file?.content || '// Generated code will appear here...\n// Start streaming to see real-time code generation!';
  };

  // Get current active file for display name
  const getActiveFileDisplayName = (): string => {
    if (!activeFile) return 'No file selected';
    return activeFile.split('/').pop() || activeFile;
  };

  return (
    <div className="streaming-editor h-full flex flex-col">
      {/* Tab Bar */}
      {files.length > 0 && (
        <div className="flex border-b border-slate-700/50 bg-slate-800/30 flex-shrink-0">
          {files.map(file => (
            <div
              key={file.path}
              className={`px-3 py-2 text-sm cursor-pointer border-r border-slate-700/50 flex items-center gap-2 ${
                activeFile === file.path
                  ? 'bg-slate-700/50 text-white border-b-2 border-blue-400'
                  : 'text-gray-300 hover:text-white hover:bg-slate-700/30'
              }`}
              onClick={() => setActive(file.path)}
            >
              <span className="truncate max-w-32">{file.path.split('/').pop()}</span>
              {file.status === 'writing' && (
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              )}
              {file.status === 'done' && (
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Editor Header */}
      {files.length > 0 && (
        <div className="p-3 border-b border-slate-700/50 bg-slate-800/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Streaming Editor
              <span className="text-xs text-blue-400 bg-blue-400/20 px-2 py-1 rounded">
                {getActiveFileDisplayName()}
              </span>
            </h3>
            {files.find(f => f.path === activeFile)?.status === 'writing' && (
              <div className="flex items-center gap-2 px-2 py-1 bg-blue-500/20 rounded-full">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-blue-300">Streaming...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{files.length} file{files.length !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span>{files.filter(f => f.status === 'done').length} complete</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFiles([]);
                  setActiveFile('');
                  setIsStreaming(false);
                }}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white text-xs rounded"
                title="Clear all files and start fresh"
              >
                New Stream
              </button>
              <button
                onClick={() => onExitStreaming?.()}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white text-xs rounded"
                title="Exit streaming mode"
              >
                Exit Stream
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Area */}
      <div className="flex-1 min-h-0">
        {files.length > 0 ? (
          <CodeEditor
            value={getActiveFileContent()}
            onChange={() => {}} // Read-only during streaming
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-lg mb-2">Ready for Streaming Code Generation</p>
              <p className="text-sm mb-2">Use Atlas CLI:</p>
              <div className="bg-slate-800 p-3 rounded text-left font-mono text-sm">
                <div className="text-green-400">$ atlas stream "Create a React todo app"</div>
                <div className="text-gray-400 mt-1">or</div>
                <div className="text-green-400">$ stream "Build a ping pong game"</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Streaming Controls */}
      {isStreaming && (
        <div className="p-3 border-t border-slate-700/50 bg-slate-800/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-blue-300">
              Streaming code... {files.length} file{files.length !== 1 ? 's' : ''} generated
            </span>
          </div>
          <button
            onClick={cancelStreaming}
            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm rounded border border-red-400/30"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}