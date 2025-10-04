'use client';

import { useState, useEffect } from 'react';
import PromptInput from "@/components/PromptInput";
import CodeEditor from "@/components/Editor";
import FileTree from "@/components/FileTree";
import PreviewPanel from "@/components/PreviewPanel";
import CommandPalette from "@/components/CommandPalette";
import { ToastContainer, useToast } from "@/components/Toast";
import InlineDiff from "@/components/InlineDiff";
import ModelFeedbackLoop from "@/components/ModelFeedbackLoop";
import ThemeToggle from "@/components/ThemeToggle";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ProjectSnapshot {
  id: string;
  name: string;
  description: string;
  timestamp: Date;
  commitHash: string;
  files: any[];
  metadata: any;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Home() {
  const { toasts, addToast, removeToast } = useToast();
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [originalGeneratedCode, setOriginalGeneratedCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [sandboxLogs, setSandboxLogs] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([]);
  const [isCreatingCheckpoint, setIsCreatingCheckpoint] = useState(false);
  const [isExportingToExpo, setIsExportingToExpo] = useState(false);
  const [expoProject, setExpoProject] = useState<{
    success: boolean;
    projectPath: string;
    qrCode?: string;
    qrCodeDataURL?: string;
    devServerUrl?: string;
    error?: string;
  } | null>(null);
  const [routingMode, setRoutingMode] = useState<string>('single-model');
  const [activeProvider, setActiveProvider] = useState<string>('ollama');
  const [selectedModel, setSelectedModel] = useState<string>('codellama');
  const [allowFailover, setAllowFailover] = useState<boolean>(false);
  const [singleModelMode, setSingleModelMode] = useState<boolean>(true);
  const [isRunningQualityCheck, setIsRunningQualityCheck] = useState(false);
  const [qualityReport, setQualityReport] = useState<{
    lint: any;
    tests: any;
    criticalFlows?: any[];
    files?: any[];
    overall: {
      success: boolean;
      score: number;
      issues: number;
      criticalFlowSuccess?: boolean;
    };
  } | null>(null);
  const [runMetadata, setRunMetadata] = useState<{
    tokens: number;
    cost: number;
    duration: number;
    confidence: number;
    model: string;
    startTime: Date;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'chat'>('chat');
  const [activeView, setActiveView] = useState<'editor' | 'sandbox'>('sandbox');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [checkpoints, setCheckpoints] = useState<ProjectSnapshot[]>([]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string; name: string } | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const handleGenerate = async (prompt: string) => {
    const startTime = new Date();
    setIsGenerating(true);

    // Immediately switch to editor view to show generation is starting
    setActiveView('editor');

    // Initialize run metadata
    setRunMetadata({
      tokens: 0,
      cost: 0,
      duration: 0,
      confidence: 0,
      model: activeProvider || 'orchestrated',
      startTime
    });

    // Add initial log
    setSandboxLogs(prev => [...prev, {
      type: 'info',
      message: `🚀 Starting code generation with ${activeProvider || 'orchestrated'} model...`,
      timestamp: new Date()
    }]);

    try {
      const requestBody: any = { prompt, routingMode };

      // If user enabled single-model mode and selected a provider, honor it.
      // Also, when provider is xai, default model to grok-code-fast-1 unless overridden.
      if (singleModelMode && activeProvider) {
        requestBody.activeProvider = activeProvider;
        requestBody.allowFailover = allowFailover;
        if (selectedModel) {
          requestBody.model = `${activeProvider}:${selectedModel}`;
        } else if (activeProvider.toLowerCase() === 'xai' && !requestBody.model) {
          requestBody.model = 'xai:grok-code-fast-1';
        }
      }

      // If not using single-model mode but routingMode is manual, default to xAI fast coder for testing
      if (!singleModelMode && routingMode === 'manual' && !requestBody.model && activeProvider && selectedModel) {
        requestBody.model = `${activeProvider}:${selectedModel}`;
      }

      setSandboxLogs(prev => [...prev, {
        type: 'info',
        message: `📝 Analyzing prompt and planning code structure...`,
        timestamp: new Date()
      }]);

      const res = await fetch('http://localhost:3001/llm/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!res.ok) {
        throw new Error('Failed to generate code');
      }

      const data = await res.json();

      setSandboxLogs(prev => [...prev, {
        type: 'success',
        message: `✅ ${data.metadata?.mock ? 'Demo mode: Using mock response' : 'AI model responded successfully'}`,
        timestamp: new Date()
      }]);
      setGeneratedCode(data.code);
      setOriginalGeneratedCode(data.code); // Store original for diff comparison

      // Update run metadata
      const endTime = new Date();
      const duration = (endTime.getTime() - startTime.getTime()) / 1000;
      setRunMetadata(prev => prev ? {
        ...prev,
        tokens: Math.floor(Math.random() * 2000) + 500, // Mock token count
        cost: Math.random() * 0.1, // Mock cost
        duration,
        confidence: Math.random() * 0.3 + 0.7 // Mock confidence 70-100%
      } : null);

      setSandboxLogs(prev => [...prev, {
        type: 'success',
        message: `📄 Code generated successfully (${data.code.length} characters)`,
        timestamp: new Date()
      }]);

      // Test the generated code in sandbox (skip for mock responses)
      if (data.code && !data.metadata?.mock) {
        setSandboxLogs(prev => [...prev, {
          type: 'info',
          message: `🧪 Running code validation and tests...`,
          timestamp: new Date()
        }]);

        await testGeneratedCode(data.code);
      } else if (data.metadata?.mock) {
        setSandboxLogs(prev => [...prev, {
          type: 'info',
          message: `⏭️ Skipping sandbox tests for demo response`,
          timestamp: new Date()
        }]);
      }

      setSandboxLogs(prev => [...prev, {
        type: 'success',
        message: `🎉 Code generation completed in ${duration.toFixed(1)}s`,
        timestamp: new Date()
      }]);

      // Automatically switch to Editor view after generation
      setActiveView('editor');

    } catch (err: any) {
      console.error('Generation error:', err);
      const endTime = new Date();
      const duration = (endTime.getTime() - startTime.getTime()) / 1000;

      setRunMetadata(prev => prev ? {
        ...prev,
        duration,
        confidence: 0
      } : null);

      setSandboxLogs(prev => [...prev, {
        type: 'error',
        message: `❌ Generation failed: ${err.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const testGeneratedCode = async (code: string) => {
    try {
      const testRes = await fetch('http://localhost:3001/llm/sandbox/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (testRes.ok) {
        const testResult = await testRes.json();
        setExecutionResult({
          success: testResult.passed > 0,
          output: `Tests: ${testResult.passed} passed, ${testResult.failed} failed`,
          executionTime: Math.floor(Math.random() * 100) + 50 // Mock execution time
        });

        // Add test results to logs
        testResult.results.forEach((result: any) => {
          setSandboxLogs(prev => [...prev, {
            type: result.passed ? 'info' : 'error',
            message: `${result.test}: ${result.passed ? 'PASSED' : 'FAILED'}${result.error ? ` - ${result.error}` : ''}`,
            timestamp: new Date()
          }]);
        });
      }
    } catch (err: any) {
      setSandboxLogs(prev => [...prev, {
        type: 'error',
        message: `Sandbox test failed: ${err.message}`,
        timestamp: new Date()
      }]);
    }
  };

  const createCheckpoint = async (name: string, description?: string) => {
    setIsCreatingCheckpoint(true);
    try {
      const res = await fetch('http://localhost:3001/llm/git/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });

      if (!res.ok) {
        throw new Error('Failed to create checkpoint');
      }

      const data = await res.json();
      setSnapshots(prev => [data.snapshot, ...prev.slice(0, 9)]); // Keep last 10 snapshots

      setSandboxLogs(prev => [...prev, {
        type: 'info',
        message: `Checkpoint created: ${name}`,
        timestamp: new Date()
      }]);

      addToast(`Checkpoint "${name}" created successfully!`, 'success');
    } catch (err: any) {
      setSandboxLogs(prev => [...prev, {
        type: 'error',
        message: `Failed to create checkpoint: ${err.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsCreatingCheckpoint(false);
    }
  };

  const restoreCheckpoint = async (snapshot: ProjectSnapshot) => {
    try {
      const res = await fetch('http://localhost:3001/llm/git/snapshot/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot })
      });

      if (!res.ok) {
        throw new Error('Failed to restore checkpoint');
      }

      setSandboxLogs(prev => [...prev, {
        type: 'info',
        message: `Restored to checkpoint: ${snapshot.name}`,
        timestamp: new Date()
      }]);

      // Reload the page to reflect restored state
      window.location.reload();
    } catch (err: any) {
      setSandboxLogs(prev => [...prev, {
        type: 'error',
        message: `Failed to restore checkpoint: ${err.message}`,
        timestamp: new Date()
      }]);
    }
  };

  const exportToExpo = async () => {
    if (!generatedCode) {
      setSandboxLogs(prev => [...prev, {
        type: 'error',
        message: 'No code to export. Generate code first.',
        timestamp: new Date()
      }]);
      return;
    }

    setIsExportingToExpo(true);
    try {
      const projectName = `VibeApp-${Date.now()}`;
      const config = {
        name: projectName,
        slug: projectName.toLowerCase().replace(/[^a-z0-9]/g, ''),
        version: '1.0.0',
        orientation: 'portrait' as const,
        primaryColor: '#8b5cf6' // Purple theme
      };

      const res = await fetch('http://localhost:3001/llm/expo/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: generatedCode, config })
      });

      if (!res.ok) {
        throw new Error('Failed to export to Expo');
      }

      const result = await res.json();

      if (result.success) {
        setExpoProject(result);

        // Start dev server
        const startRes = await fetch('http://localhost:3001/llm/expo/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectPath: result.projectPath })
        });

        const startResult = await startRes.json();

        setSandboxLogs(prev => [...prev, {
          type: 'info',
          message: `Expo project created: ${projectName}`,
          timestamp: new Date()
        }]);

        addToast(`Expo project "${projectName}" created successfully!`, 'success');

        if (startResult.success) {
          // Update expo project with QR code data
          setExpoProject(prev => prev ? { ...prev, ...startResult } : startResult);

          setSandboxLogs(prev => [...prev, {
            type: 'info',
            message: `Dev server started. Scan QR code to preview on device.`,
            timestamp: new Date()
          }]);
        }
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (err: any) {
      setSandboxLogs(prev => [...prev, {
        type: 'error',
        message: `Expo export failed: ${err.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsExportingToExpo(false);
    }
  };

  const exportToFlutter = async () => {
    if (!generatedCode) {
      setSandboxLogs(prev => [...prev, {
        type: 'error',
        message: 'No code to export. Generate code first.',
        timestamp: new Date()
      }]);
      return;
    }

    setIsExportingToExpo(true); // Reuse the same loading state
    try {
      const projectName = `VibeFlutter-${Date.now()}`;
      const config = {
        name: projectName,
        description: 'A Flutter app generated by Vibe Coder',
        version: '1.0.0',
        org: 'com.vibecoder.app',
        primaryColor: '#2196F3' // Blue theme for Flutter
      };

      const res = await fetch('http://localhost:3001/llm/flutter/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: generatedCode, config })
      });

      if (!res.ok) {
        throw new Error('Failed to export to Flutter');
      }

      const result = await res.json();

      if (result.success) {
        setSandboxLogs(prev => [...prev, {
          type: 'info',
          message: `Flutter project created: ${projectName}`,
          timestamp: new Date()
        }]);

        setSandboxLogs(prev => [...prev, {
          type: 'info',
          message: `Project path: ${result.projectPath}`,
          timestamp: new Date()
        }]);

        setSandboxLogs(prev => [...prev, {
          type: 'info',
          message: `Run 'flutter run' in the project directory to start the app.`,
          timestamp: new Date()
        }]);
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (err: any) {
      setSandboxLogs(prev => [...prev, {
        type: 'error',
        message: `Flutter export failed: ${err.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsExportingToExpo(false);
    }
  };

  const runQualityCheck = async () => {
    if (!generatedCode) {
      setSandboxLogs(prev => [...prev, {
        type: 'error',
        message: 'No code to check. Generate code first.',
        timestamp: new Date()
      }]);
      return;
    }

    setIsRunningQualityCheck(true);
    try {
      const files = [{
        path: 'generated.js',
        content: generatedCode
      }];

      const res = await fetch('http://localhost:3001/llm/quality/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files })
      });

      if (!res.ok) {
        throw new Error('Failed to run quality check');
      }

      const report = await res.json();
      setQualityReport(report);

      setSandboxLogs(prev => [...prev, {
        type: report.overall.success ? 'info' : 'error',
        message: `Quality check: ${report.overall.score}/100 (${report.overall.issues} issues)`,
        timestamp: new Date()
      }]);
    } catch (err: any) {
      setSandboxLogs(prev => [...prev, {
        type: 'error',
        message: `Quality check failed: ${err.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsRunningQualityCheck(false);
    }
  };

  const handleChatSubmit = async (prompt: string) => {
    // Add user message to chat
    const userMessage: ChatMessage = {
      role: 'user',
      content: prompt,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);

    // Switch to chat tab
    setActiveTab('chat');

    // Call the existing generate function
    await handleGenerate(prompt);
  };

  const handleCommand = (commandId: string) => {
    switch (commandId) {
      case 'generate':
        // Focus on prompt input
        break;
      case 'checkpoint':
        createCheckpoint(`Checkpoint ${new Date().toLocaleTimeString()}`, 'Auto-generated checkpoint');
        break;
      case 'export-expo':
        exportToExpo();
        break;
      case 'export-flutter':
        exportToFlutter();
        break;
      case 'quality-check':
        runQualityCheck();
        break;
      case 'clear-chat':
        setChatMessages([]);
        break;
      case 'toggle-theme':
        // Theme toggle logic would go here
        break;
    }
  };

  const handleFileSelection = async (filePath: string) => {
    try {
      // For demo purposes, we'll load the index.html file content
      // In a real app, you'd make an API call to read the file
      if (filePath === 'public/index.html') {
        const response = await fetch('/index.html');
        const content = await response.text();
        setSelectedFile({
          path: filePath,
          content: content,
          name: 'index.html'
        });
        setFileContent(content);
        setActiveTab('editor');
        addToast(`Opened ${filePath}`, 'success');
      } else {
        // For other files, show a placeholder
        const placeholderContent = `// File: ${filePath}\n// This is a placeholder for ${filePath}\n// In a real implementation, this would load the actual file content\n\nconsole.log('Hello from ${filePath}');`;
        setSelectedFile({
          path: filePath,
          content: placeholderContent,
          name: filePath.split('/').pop() || filePath
        });
        setFileContent(placeholderContent);
        setActiveTab('editor');
        addToast(`Opened ${filePath}`, 'success');
      }
    } catch (error) {
      console.error('Error loading file:', error);
      addToast(`Failed to load ${filePath}`, 'error');
    }
  };

  const handleFileContextAction = (action: string, filename: string) => {
    const actionPrompts = {
      explain: `Explain the code in @${filename}. What does this file do?`,
      refactor: `Refactor the code in @${filename} to make it more readable and maintainable.`,
      'add-tests': `Add comprehensive unit tests for the code in @${filename}.`,
      optimize: `Optimize the performance of the code in @${filename}.`
    };

    const prompt = actionPrompts[action as keyof typeof actionPrompts];
    if (prompt) {
      handleChatSubmit(prompt);
      addToast(`AI action requested: ${action} for ${filename}`, 'info');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            setIsCommandPaletteOpen(true);
            break;
          case 'g':
            e.preventDefault();
            // Focus prompt input
            break;
          case 's':
            e.preventDefault();
            createCheckpoint(`Checkpoint ${new Date().toLocaleTimeString()}`, 'Auto-generated checkpoint');
            break;
          case 'e':
            e.preventDefault();
            exportToExpo();
            break;
          case 'f':
            e.preventDefault();
            exportToFlutter();
            break;
          case 'q':
            e.preventDefault();
            runQualityCheck();
            break;
          case 'l':
            e.preventDefault();
            setChatMessages([]);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);


  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Modern Glass Header */}
      <header className="backdrop-blur-xl bg-slate-800/50 border-b border-slate-700/50 p-2 md:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xs md:text-sm">V</span>
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">Vibe Coder</h1>
              <p className="text-xs text-gray-400 hidden sm:block">AI-Powered Development Environment</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {isGenerating && (
              <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full border border-purple-400/30">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-purple-300 font-medium">Generating...</span>
              </div>
            )}

            {/* Routing Mode Selector */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-gray-400">Mode:</span>
              <select
                value={routingMode}
                onChange={(e) => {
                  setRoutingMode(e.target.value);
                  if (e.target.value === 'single-model') {
                    setSingleModelMode(true);
                  } else {
                    setSingleModelMode(false);
                  }
                }}
                className="px-2 py-1 bg-slate-700/50 text-gray-300 text-xs rounded border border-slate-600/50"
              >
                <option value="orchestrated">Orchestrated</option>
                <option value="heuristic">Heuristic</option>
                <option value="cost-aware">Cost-Aware</option>
                <option value="manual">Manual</option>
                <option value="single-model">Single-Model</option>
              </select>
            </div>

            {/* Single-Model Mode Controls */}
            {singleModelMode && (
              <div className="hidden md:flex items-center gap-2">
                <span className="text-xs text-gray-400">Provider:</span>
                <select
                  value={activeProvider}
                  onChange={(e) => {
                    const p = e.target.value;
                    setActiveProvider(p);
                    if (p === 'xai') setSelectedModel('grok-code-fast-1');
                    else if (p === 'openai') setSelectedModel('gpt-4o');
                    else if (p === 'anthropic') setSelectedModel('claude-3.5-sonnet');
                    else if (p === 'google') setSelectedModel('gemini-2.5-pro');
                    else setSelectedModel('');
                  }}
                  className="px-2 py-1 bg-slate-700/50 text-gray-300 text-xs rounded border border-slate-600/50"
                >
                  <option value="">Select Provider</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                  <option value="xai">xAI</option>
                </select>

                <span className="text-xs text-gray-400">Model:</span>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="px-2 py-1 bg-slate-700/50 text-gray-300 text-xs rounded border border-slate-600/50"
                >
                  {activeProvider === 'xai' && (
                    <>
                      <option value="grok-code-fast-1">grok-code-fast-1</option>
                      <option value="grok-1.5">grok-1.5</option>
                      <option value="grok-1">grok-1</option>
                    </>
                  )}
                  {activeProvider === 'openai' && (
                    <>
                      <option value="gpt-5">gpt-5</option>
                      <option value="gpt-5-codex">gpt-5-codex</option>
                    </>
                  )}
                  {activeProvider === 'anthropic' && (
                    <>
                      <option value="claude-3-opus">claude-3-opus</option>
                      <option value="claude-3-sonnet">claude-3-sonnet</option>
                      <option value="claude-3-haiku">claude-3-haiku</option>
                      <option value="claude-3.5-sonnet">claude-3.5-sonnet</option>
                      <option value="claude-3.5-sonnet-200k">claude-3.5-sonnet-200k</option>
                      <option value="claude-3.5-haiku">claude-3.5-haiku</option>
                      <option value="claude-3.7">claude-3.7</option>
                      <option value="claude-3.7-sonnet">claude-3.7-sonnet</option>
                      <option value="claude-3.7-haiku">claude-3.7-haiku</option>
                      <option value="claude-2.1">claude-2.1</option>
                      <option value="claude-2.0">claude-2.0</option>
                      <option value="claude-instant-1.2">claude-instant-1.2</option>
                    </>
                  )}
                  {activeProvider === 'google' && (
                    <>
                      <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                      <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                      <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite</option>
                    </>
                  )}
                </select>

                <label className="flex items-center gap-1 text-xs text-gray-400">
                  <input
                    type="checkbox"
                    checked={allowFailover}
                    onChange={(e) => setAllowFailover(e.target.checked)}
                    className="rounded border-slate-600/50"
                  />
                  Failover
                </label>

                {activeProvider && (
                  <span className="text-xs text-purple-400 font-medium flex items-center gap-1">
                    🔒 {activeProvider.toUpperCase()}
                  </span>
                )}
              </div>
            )}

            {/* Checkpoint and Export Controls */}
            <div className="hidden md:flex items-center gap-1 lg:gap-2">
              <button
                onClick={() => createCheckpoint(`Checkpoint ${new Date().toLocaleTimeString()}`, 'Auto-generated checkpoint')}
                disabled={isCreatingCheckpoint}
                className="px-2 lg:px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs rounded border border-blue-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Create Checkpoint"
              >
                {isCreatingCheckpoint ? '...' : '💾'}
              </button>

              {checkpoints.length > 0 && (
                <div className="relative">
                  <select
                    onChange={(e) => {
                      const checkpointId = e.target.value;
                      const checkpoint = checkpoints.find(c => c.id === checkpointId);
                      if (checkpoint) {
                        restoreCheckpoint(checkpoint);
                      }
                      e.target.value = '';
                    }}
                    className="px-2 lg:px-3 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs rounded border border-orange-400/30 appearance-none"
                    title="Rollback"
                  >
                    <option value="">↶</option>
                    {checkpoints.map(checkpoint => (
                      <option key={checkpoint.id} value={checkpoint.id}>
                        {checkpoint.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={exportToExpo}
                disabled={isExportingToExpo || !generatedCode}
                className="px-2 lg:px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs rounded border border-green-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Expo Export"
              >
                {isExportingToExpo ? '...' : '📱'}
              </button>

              <button
                onClick={exportToFlutter}
                disabled={isExportingToExpo || !generatedCode}
                className="px-2 lg:px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs rounded border border-blue-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Flutter Export"
              >
                {isExportingToExpo ? '...' : '🦋'}
              </button>

              <button
                onClick={runQualityCheck}
                disabled={isRunningQualityCheck || !generatedCode}
                className="px-2 lg:px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs rounded border border-purple-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Quality Check"
              >
                {isRunningQualityCheck ? '...' : '✓'}
              </button>
            </div>

            <div className="flex items-center gap-1 lg:gap-2 text-xs text-gray-400">
              <span className="hidden sm:inline">{generatedCode.length} chars</span>
              <span className="sm:hidden">{generatedCode.length}</span>
              <span>•</span>
              <span className="hidden md:inline">{sandboxLogs.length} logs</span>
              <span className="md:hidden">{sandboxLogs.length}</span>
              <span className="hidden lg:inline">•</span>
              <span className="hidden lg:inline">{checkpoints.length} checkpoints</span>
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </header>


      {/* Main Layout - Responsive Grid */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar Toggle Button - Desktop */}
        <div className={`flex items-center justify-center transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'w-8 bg-slate-800/80' : 'w-6 bg-slate-800/50'
        } border-r border-slate-700/50 hidden md:flex`}>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 hover:bg-slate-700/50 rounded transition-colors text-gray-400 hover:text-white touch-manipulation"
            title={isSidebarCollapsed ? "Show Project Files" : "Hide Project Files"}
          >
            {isSidebarCollapsed ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Sidebar Toggle Button */}
        {isSidebarCollapsed && (
          <button
            onClick={() => setIsSidebarCollapsed(false)}
            className="fixed top-20 left-4 z-40 md:hidden glass-panel p-3 rounded-lg shadow-2xl hover:shadow-purple-500/20 transition-all duration-200 touch-manipulation"
            title="Show Project Files"
          >
            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Left Sidebar - File Tree */}
        <aside className={`border-r border-slate-700/50 transition-all duration-300 ease-in-out flex flex-col ${
          isSidebarCollapsed ? 'w-0 overflow-hidden md:w-0' : 'w-48 lg:w-64'
        } ${isSidebarCollapsed ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex-1 min-h-0">
            <FileTree onFileSelect={handleFileSelection} onContextAction={handleFileContextAction} />
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {!isSidebarCollapsed && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarCollapsed(true)}
          />
        )}

        {/* Mobile Sidebar */}
        {!isSidebarCollapsed && (
          <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-72 max-w-[85vw] glass-panel border-r border-slate-700/50 z-40 md:hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
              <h3 className="text-lg font-semibold text-white">Project Files</h3>
              <button
                onClick={() => setIsSidebarCollapsed(true)}
                className="p-2 hover:bg-slate-700/50 rounded transition-colors text-gray-400 hover:text-white touch-manipulation"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <FileTree onFileSelect={handleFileSelection} onContextAction={handleFileContextAction} />
            </div>
          </aside>
        )}

        {/* Main Content - Responsive Layout */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Responsive Layout: Equal-width columns on large screens, stacked on smaller screens */}
          <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 min-h-0 gap-0 xl:gap-0">
            {/* AI Chat Column */}
            <div className="flex flex-col min-h-0 xl:border-r border-slate-700/50">
              {/* AI Chat Header */}
              <div className="p-3 md:p-4 border-b border-slate-700/50 bg-slate-800/50 flex-shrink-0">
                <h2 className="text-sm md:text-base font-semibold text-white flex items-center gap-2">
                  <svg className="w-4 h-4 md:w-5 md:h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="hidden sm:inline">AI Chat</span>
                  <span className="sm:hidden">Chat</span>
                </h2>
              </div>

              {/* Generation Process - Show during generation */}
              {isGenerating && (
                <div className="px-3 md:px-4 py-2 bg-slate-900/50 backdrop-blur-xl border-b border-slate-700/50">
                  <ModelFeedbackLoop
                    isActive={isGenerating}
                    onComplete={() => {
                      setIsGenerating(false);
                    }}
                  />
                </div>
              )}

              {/* Chat Messages Area */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-auto p-3 md:p-4 space-y-3 md:space-y-4 min-h-0">
                  {chatMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 px-4">
                      <div className="text-center max-w-sm">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-6 h-6 md:w-8 md:h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <p className="text-sm md:text-base">Start a conversation with AI</p>
                        <p className="text-xs text-gray-500 mt-1">Describe what you want to build</p>
                      </div>
                    </div>
                  ) : (
                    chatMessages.map((message, index) => (
                      <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-3 md:mb-4`}>
                        <div className={`max-w-[90%] md:max-w-[85%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                          {/* Message Header */}
                          <div className={`flex items-center gap-2 mb-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs ${
                              message.role === 'user'
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-blue-500/20 text-blue-300'
                            }`}>
                              {message.role === 'user' ? (
                                <>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  <span className="hidden sm:inline">You</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  <span className="hidden sm:inline">AI Assistant</span>
                                  <span className="sm:hidden">AI</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Message Bubble */}
                          <div className={`glass-panel p-3 md:p-4 rounded-2xl shadow-lg touch-manipulation ${
                            message.role === 'user'
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                              : 'bg-slate-700/80 text-gray-200 border border-slate-600/50'
                          }`}>
                            <p className="text-sm leading-relaxed">{message.content}</p>

                            {/* View File Button for Assistant Messages */}
                            {message.role === 'assistant' && generatedCode && (
                              <div className="flex items-center justify-end mt-3">
                                <button
                                  onClick={() => setActiveView('editor')}
                                  className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs rounded transition-colors"
                                  title="View generated code in editor"
                                >
                                  View file
                                </button>
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10">
                              <span className="text-xs opacity-70">
                                {message.timestamp.toLocaleTimeString()}
                              </span>
                              {message.role === 'assistant' && (
                                <div className="flex items-center gap-1 text-xs opacity-70">
                                  <span className="hidden sm:inline">Claude</span>
                                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Inline Diff for AI responses with code */}
                          {message.role === 'assistant' && generatedCode && (
                            <InlineDiff
                              originalCode={originalGeneratedCode || ''}
                              modifiedCode={generatedCode}
                              filename="generated.js"
                              language="javascript"
                            />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Chat Input */}
                <div className="border-t border-slate-700/50 p-3 md:p-4 bg-slate-800/50 flex-shrink-0">
                  <PromptInput onSubmit={handleChatSubmit} />
                </div>
              </div>
            </div>

            {/* Editor/Sandbox Column */}
            <div className="flex flex-col min-h-0 xl:border-l border-slate-700/50">
              <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'editor' | 'sandbox')} className="flex-1 flex flex-col min-h-0">
                {/* Header with Tabs */}
                <div className="p-3 md:p-4 border-b border-slate-700/50 bg-slate-800/50 flex-shrink-0">
                  <TabsList className="grid w-full grid-cols-2 mb-2">
                    <TabsTrigger value="editor">Editor</TabsTrigger>
                    <TabsTrigger value="sandbox">Sandbox</TabsTrigger>
                  </TabsList>

                  <div className="flex items-center justify-between">
                    <h2 className="text-sm md:text-base font-semibold text-white flex items-center gap-2">
                      {activeView === 'editor' ? (
                        <>
                          <svg className="w-4 h-4 md:w-5 md:h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="hidden sm:inline">Code Editor</span>
                          <span className="sm:hidden">Editor</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 md:w-5 md:h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span className="hidden sm:inline">Sandbox & Preview</span>
                          <span className="sm:hidden">Sandbox</span>
                        </>
                      )}
                    </h2>

                    {/* Run Metadata Display - Desktop only */}
                    {runMetadata && activeView === 'sandbox' && (
                      <div className="hidden lg:flex items-center gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">Tokens:</span>
                          <span className="text-purple-400 font-mono">{runMetadata.tokens.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">Cost:</span>
                          <span className="text-green-400 font-mono">${runMetadata.cost.toFixed(4)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">Time:</span>
                          <span className="text-blue-400 font-mono">{runMetadata.duration.toFixed(1)}s</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Editor Tab Content */}
                <TabsContent value="editor" className="flex-1 min-h-0 m-0">
                  <CodeEditor
                    value={isGenerating && !generatedCode ? "// 🤖 AI is generating your code...\n// Please wait while we craft the perfect solution for you!" : generatedCode}
                    onChange={(val) => val !== undefined && setGeneratedCode(val)}
                    originalValue={originalGeneratedCode}
                  />
                </TabsContent>

                {/* Sandbox Tab Content */}
                <TabsContent value="sandbox" className="flex-1 min-h-0 m-0">
                  <PreviewPanel
                    generatedCode={generatedCode}
                    sandboxLogs={sandboxLogs}
                    executionResult={executionResult}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Code Editor - Only show when file is selected */}
          {selectedFile && (
            <div className="border-t border-slate-700/50">
              {/* Editor Header */}
              <div className="p-3 border-b border-slate-700/50 bg-slate-800/50 flex items-center justify-between flex-shrink-0">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {selectedFile.name}
                </h2>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-1 hover:bg-slate-700/50 rounded transition-colors text-gray-400 hover:text-white"
                  title="Close Editor"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Editor Content */}
              <div className="h-64 lg:h-80">
                <CodeEditor
                  value={fileContent}
                  onChange={(val) => setFileContent(val || '')}
                  originalValue={selectedFile.content}
                />
              </div>
            </div>
          )}

          {/* Terminal/Console with Status Feedback */}
          <div className="h-32 md:h-40 glass-panel border-t border-white/10 bg-slate-900 transition-all duration-300 ease-in-out flex-shrink-0 flex flex-col">
            <div className="p-2 md:p-3 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xs md:text-sm font-semibold text-white flex items-center gap-2">
                  <svg className="w-3 h-3 md:w-4 md:h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">Terminal & Status</span>
                  <span className="sm:hidden">Status</span>
                </h3>

                {/* Run Metadata Display - Mobile */}
                {runMetadata && (
                  <div className="flex sm:hidden items-center gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">Tokens:</span>
                      <span className="text-purple-400 font-mono">{runMetadata.tokens.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">Cost:</span>
                      <span className="text-green-400 font-mono">${runMetadata.cost.toFixed(4)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-2 md:p-3 flex-1 overflow-auto min-h-0">
              {sandboxLogs.length === 0 ? (
                <div className="text-gray-400 text-sm font-mono">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-400">$</span>
                    <span className="text-gray-300">Ready for sandbox execution...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {sandboxLogs.slice(-6).map((log, index) => (
                    <div key={index} className="text-xs font-mono flex items-start gap-2">
                      <span className="flex-shrink-0">
                        {log.type === 'error' ? '❌' :
                         log.type === 'warn' ? '⚠️' :
                         log.type === 'success' ? '✅' :
                         log.type === 'info' ? 'ℹ️' :
                         '📝'}
                      </span>
                      <span className="text-gray-300 flex-1">{log.message}</span>
                      <span className="text-gray-500 text-xs flex-shrink-0">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onCommand={handleCommand}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
