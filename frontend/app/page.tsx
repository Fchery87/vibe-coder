'use client';

import { useState, useEffect } from 'react';
import PromptInput from "@/components/PromptInput";
import CodeEditor from "@/components/Editor";
import FileTree from "@/components/FileTree";
import PreviewPanel from "@/components/PreviewPanel";
import CommandPalette from "@/components/CommandPalette";
import AtlasCLI from "@/components/AtlasCLI";
import StreamingEditor from "@/components/StreamingEditor";
import { ToastContainer, useToast } from "@/components/Toast";
import InlineDiff from "@/components/InlineDiff";
import ModelFeedbackLoop from "@/components/ModelFeedbackLoop";
import ThemeToggle from "@/components/ThemeToggle";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import HeaderBar from "@/components/HeaderBar";
import SettingsModal from "@/components/SettingsModal";
import { GitHubRepository, WorkspaceState } from "@/lib/github-types";
import TabBar from "@/components/TabBar";
import { useTabs } from "@/hooks/useTabs";
import NotificationCenter from "@/components/NotificationCenter";
import { useNotifications } from "@/hooks/useNotifications";

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
  const { tabs, activeTabId, activeTab: activeFileTab, openTab, closeTab, selectTab, updateTabContent } = useTabs();
  const {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification
  } = useNotifications();
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
  const [activeProvider, setActiveProvider] = useState<string>('google');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash-lite');
  const [allowFailover, setAllowFailover] = useState<boolean>(false);
  const [isRunningQualityCheck, setIsRunningQualityCheck] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [cliModifiedFiles, setCliModifiedFiles] = useState<Set<string>>(new Set());
  const [cliActivity, setCliActivity] = useState<{
    isActive: boolean;
    currentTask?: string;
    progress?: number;
  }>({ isActive: false });
  const [isStreamingMode, setIsStreamingMode] = useState(true);
  const [streamingFiles, setStreamingFiles] = useState<Array<{ path: string; status: string; content: string }>>([]);

  // GitHub workspace state
  const [githubEnabled, setGithubEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('githubEnabled');
      return saved ? JSON.parse(saved) : false; // Disabled by default
    }
    return false;
  });
  const [githubConnected, setGithubConnected] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);

  const streamingFileCount = streamingFiles.length;
  const completedStreamingFiles = streamingFiles.filter(file => file.status === 'done').length;
  const totalStreamingLines = streamingFiles.reduce((total, file) => total + (file.content ? file.content.split('\n').length : 0), 0);

  // Load provider and model from localStorage on mount
  useEffect(() => {
    const savedProvider = localStorage.getItem('activeProvider');
    const savedModel = localStorage.getItem('selectedModel');

    if (savedProvider) {
      setActiveProvider(savedProvider);
    }
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);

  useEffect(() => {
    if (activeProvider) {
      localStorage.setItem('activeProvider', activeProvider);
    }
  }, [activeProvider]);

  useEffect(() => {
    if (selectedModel) {
      localStorage.setItem('selectedModel', selectedModel);
    }
  }, [selectedModel]);

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
      message: `🚀 Starting code generation with ${activeProvider || 'openai'} model...`,
      timestamp: new Date()
    }]);

    try {
      // Always use single-model mode with selected provider
      const requestBody: any = {
        prompt,
        routingMode: 'single-model',
        activeProvider: activeProvider || 'openai',
        allowFailover: allowFailover
      };

      // Add model if selected
      if (selectedModel) {
        requestBody.model = `${activeProvider}:${selectedModel}`;
      } else if (activeProvider?.toLowerCase() === 'xai') {
        requestBody.model = 'xai:grok-4-fast-reasoning';
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
    // If in streaming mode, start streaming instead of regular generation
    if (isStreamingMode) {
      handleStartStreaming(prompt);
      return;
    }

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
        setActiveTab('chat');
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
        addToast('Chat history cleared', 'success');
        break;
      case 'toggle-theme':
        // Toggle theme by dispatching click on theme toggle button
        const themeToggle = document.querySelector('[data-theme-toggle]') as HTMLElement;
        themeToggle?.click();
        break;
      case 'open-settings':
        setIsSettingsOpen(true);
        break;
    }
  };

  const handleFileSelection = async (filePath: string) => {
    try {
      // For demo purposes, we'll load the index.html file content
      // In a real app, you'd make an API call to read the file
      let content: string;
      let fileName = filePath.split('/').pop() || filePath;

      if (filePath === 'public/index.html') {
        const response = await fetch('/index.html');
        content = await response.text();
      } else {
        // For other files, show a placeholder
        content = `// File: ${filePath}\n// This is a placeholder for ${filePath}\n// In a real implementation, this would load the actual file content\n\nconsole.log('Hello from ${filePath}');`;
      }

      // Open file in a new tab (or switch to existing tab)
      openTab(filePath, content, fileName);
      setActiveTab('editor');
      addToast(`Opened ${filePath}`, 'success');
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

  const handleCliFileModified = (filePath: string, operation: string) => {
    setCliModifiedFiles(prev => new Set([...prev, filePath]));

    // Add actionable notification
    addNotification(
      `File ${operation}: ${filePath}`,
      'info',
      [
        {
          label: 'Open File',
          onClick: () => handleFileSelection(filePath),
          variant: 'primary'
        },
        {
          label: 'View in Tree',
          onClick: () => setIsSidebarCollapsed(false),
          variant: 'secondary'
        }
      ],
      { filePath, operation }
    );

    // Auto-refresh file tree to show changes
    // You could also trigger a file tree refresh here
  };

  const handleCliActivity = (activity: { isActive: boolean; currentTask?: string; progress?: number }) => {
    setCliActivity(activity);

    // Update header to show CLI activity
    if (activity.isActive) {
      addToast(`CLI: ${activity.currentTask}`, 'info');
    }
  };

  const handleStreamingComplete = (files: Array<{ path: string; status: string; content: string }>) => {
    console.log('Streaming completed with files:', files.length, files.map(f => f.path));

    // Keep streaming files for display
    setStreamingFiles(files);

    // Don't exit streaming mode - keep the files visible
    // setIsStreamingMode(false);

    // Notify about completed streaming
    addToast(`Streaming complete: ${files.length} files generated`, 'success');

    // Ensure we're in editor view to show the generated files
    setActiveView('editor');

    // Track file modifications for CLI integration
    files.forEach(file => {
      handleCliFileModified(file.path, 'streaming generation');
    });
  };

  const handleStreamingError = (error: string) => {
    setIsStreamingMode(false);
    addToast(`Streaming error: ${error}`, 'error');
  };

  const handleStartStreaming = (prompt: string) => {
    setIsStreamingMode(true);
    setStreamingFiles([]);
    setActiveView('editor');
  };

  // GitHub handlers
  const handleGitHubConnect = () => {
    setGithubConnected(true);
    addToast('GitHub connected successfully!', 'success');
  };

  const handleGitHubDisconnect = () => {
    setGithubConnected(false);
    setWorkspace(null);
    addToast('GitHub disconnected', 'info');
  };

  const handleRepoSelect = (repo: GitHubRepository, installationId: number) => {
    const newWorkspace: WorkspaceState = {
      owner: repo.owner.login,
      repo: repo.name,
      installationId,
      branch: repo.default_branch,
      baseBranch: repo.default_branch,
    };
    setWorkspace(newWorkspace);
    addToast(`Workspace opened: ${repo.full_name}`, 'success');

    // Log to Atlas CLI
    setSandboxLogs(prev => [...prev, {
      type: 'info',
      message: `📂 Workspace opened: ${repo.full_name} (${repo.default_branch})`,
      timestamp: new Date()
    }]);
  };

  const handleGitHubEnabledChange = (enabled: boolean) => {
    setGithubEnabled(enabled);
    localStorage.setItem('githubEnabled', JSON.stringify(enabled));

    if (!enabled) {
      // Clear GitHub state when disabled
      setGithubConnected(false);
      setWorkspace(null);
      addToast('GitHub integration disabled', 'info');
    } else {
      addToast('GitHub integration enabled', 'success');
    }
  };

  // Expose function to switch to editor view globally for Atlas CLI
  useEffect(() => {
    (window as any).switchToEditorView = () => {
      setActiveView('editor');
    };

    return () => {
      delete (window as any).switchToEditorView;
    };
  }, []);

  // Atlas CLI Event Listeners
  useEffect(() => {
    const handleAtlasExport = (event: any) => {
      if (event.detail === 'expo') {
        exportToExpo();
      } else if (event.detail === 'flutter') {
        exportToFlutter();
      }
    };

    const handleAtlasCheckpoint = (event: any) => {
      createCheckpoint(event.detail, 'Atlas CLI-generated checkpoint');
    };

    const handleAtlasRestore = (event: any) => {
      // Find checkpoint by name and restore
      const checkpoint = checkpoints.find(c => c.name === event.detail);
      if (checkpoint) {
        restoreCheckpoint(checkpoint);
      }
    };

    const handleAtlasQualityCheck = () => {
      runQualityCheck();
    };

    document.addEventListener('atlas-export', handleAtlasExport);
    document.addEventListener('atlas-checkpoint', handleAtlasCheckpoint);
    document.addEventListener('atlas-restore', handleAtlasRestore);
    document.addEventListener('atlas-quality-check', handleAtlasQualityCheck);

    return () => {
      document.removeEventListener('atlas-export', handleAtlasExport);
      document.removeEventListener('atlas-checkpoint', handleAtlasCheckpoint);
      document.removeEventListener('atlas-restore', handleAtlasRestore);
      document.removeEventListener('atlas-quality-check', handleAtlasQualityCheck);
    };
  }, [checkpoints]);

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
          case 'w':
            // Close active tab (Cmd/Ctrl+W)
            e.preventDefault();
            if (activeTabId) {
              closeTab(activeTabId);
            }
            break;
          case 'Tab':
            // Switch between tabs (Cmd/Ctrl+Tab)
            e.preventDefault();
            if (tabs.length > 0) {
              const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
              const nextIndex = e.shiftKey
                ? (currentIndex - 1 + tabs.length) % tabs.length  // Shift+Tab goes backward
                : (currentIndex + 1) % tabs.length;  // Tab goes forward
              selectTab(tabs[nextIndex].id);
            }
            break;
        }
      }

      // Cmd/Ctrl+1-9 to switch to specific tab
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        if (tabs[tabIndex]) {
          selectTab(tabs[tabIndex].id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, closeTab, selectTab]);


  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Header Bar */}
      <HeaderBar
        streaming={isStreamingMode && isGenerating}
        thinking={false}
        streamingFileCount={streamingFileCount}
        completedStreamingFiles={completedStreamingFiles}
        totalStreamingLines={totalStreamingLines}
        cliActivity={cliActivity}
        metrics={{
          chars: generatedCode.length,
          logs: sandboxLogs.length,
          checkpoints: checkpoints.length,
          cliFiles: cliModifiedFiles.size
        }}
        onToggleStreaming={() => setIsStreamingMode(!isStreamingMode)}
        onToggleThinking={() => {}}
        onSave={() => createCheckpoint(`Checkpoint ${new Date().toLocaleTimeString()}`, 'Auto-generated checkpoint')}
        onPR={() => {}}
        onShare={() => {}}
        onSettings={() => setIsSettingsOpen(true)}
        githubEnabled={githubEnabled}
        githubConnected={githubConnected}
        onGitHubConnect={handleGitHubConnect}
        onGitHubDisconnect={handleGitHubDisconnect}
        onRepoSelect={handleRepoSelect}
        unreadNotifications={unreadCount}
        onNotificationsClick={() => setIsNotificationCenterOpen(true)}
      />

      {/* Old header backup - keeping for reference */}
      <header className="panel shadow-panel px-4 py-3 mb-[var(--gap-5)]" style={{ display: 'none' }}>
        <div className="flex flex-wrap items-center gap-[var(--gap-5)] w-full">
          <div className="flex items-center gap-[var(--gap-3)] min-w-[220px]">
            <div className="w-9 h-9 rounded-[var(--radius)] bg-gradient-to-r from-[#7c3aed] to-[#22d3ee] flex items-center justify-center shadow-panel">
              <span className="text-white font-semibold text-sm">V</span>
            </div>
            <div className="leading-tight">
              <h1 className="font-semibold tracking-tight" style={{ fontSize: 'var(--size-h1)' }}>Vibe Coder</h1>
              <p className="text-[var(--muted)]" style={{ fontSize: 'var(--size-small)', lineHeight: '1.2' }}>AI-powered build and review workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-[var(--gap-3)]">
            <span className={["chip flex items-center gap-[var(--gap-2)]", isStreamingMode ? "on" : "off"].join(" ")}>
              {isGenerating && isStreamingMode ? (
                <span className="streaming-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              ) : (
                <span className={["badge-dot", isGenerating ? "" : "off"].filter(Boolean).join(" ")}></span>
              )}
              <span className="font-semibold">Streaming Mode</span>
              {streamingFileCount > 0 && (
                <span className="text-[var(--size-small)] text-[var(--accent-2)] font-semibold">
                  {completedStreamingFiles}/{streamingFileCount} files / {totalStreamingLines} lines
                </span>
              )}
            </span>
            {cliActivity.isActive && (
              <span className="flex items-center gap-[var(--gap-2)] text-[var(--size-small)] text-[var(--accent-2)]">
                <span className="w-2 h-2 rounded-full bg-[var(--accent-2)] animate-pulse"></span>
                {cliActivity.currentTask || 'CLI running'}
              </span>
            )}
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-[var(--gap-4)] min-w-[300px]">
            <div className="surface-tint flex items-center gap-[var(--gap-3)] px-3 py-2 rounded-[var(--radius)] border border-[rgba(148,163,184,0.12)]">
              <div className="flex items-center gap-[var(--gap-2)]">
                <span className="uppercase tracking-[0.08em] text-[var(--size-small)] text-[var(--muted)]">Provider</span>
                <select
                  value={activeProvider}
                  onChange={(e) => {
                    const p = e.target.value;
                    setActiveProvider(p);
                    localStorage.setItem('activeProvider', p);
                    let defaultModel = '';
                    if (p === 'xai') defaultModel = 'grok-4-fast-reasoning';
                    else if (p === 'openai') defaultModel = 'gpt-4o';
                    else if (p === 'anthropic') defaultModel = 'claude-3-5-sonnet-20241022';
                    else if (p === 'google') defaultModel = 'gemini-2.5-pro';
                    setSelectedModel(defaultModel);
                    if (defaultModel) localStorage.setItem('selectedModel', defaultModel);
                  }}
                  className="min-w-[140px]"
                >
                  <option value="">Select</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                  <option value="xai">xAI</option>
                </select>
              </div>

              <div className="flex items-center gap-[var(--gap-2)]">
                <span className="uppercase tracking-[0.08em] text-[var(--size-small)] text-[var(--muted)]">Model</span>
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    const model = e.target.value;
                    setSelectedModel(model);
                    localStorage.setItem('selectedModel', model);
                  }}
                  className="min-w-[160px]"
                >
                  {activeProvider === 'xai' && (
                    <>
                      <option value="grok-4-fast-reasoning">grok-4-fast-reasoning</option>
                      <option value="grok-4-fast-non-reasoning">grok-4-fast-non-reasoning</option>
                      <option value="grok-4-0709">grok-4-0709</option>
                      <option value="grok-code-fast-1">grok-code-fast-1</option>
                      <option value="grok-3">grok-3</option>
                      <option value="grok-3-mini">grok-3-mini</option>
                      <option value="grok-2-vision-1212us-east-1">grok-2-vision-us-east</option>
                      <option value="grok-2-vision-1212eu-west-1">grok-2-vision-eu-west</option>
                    </>
                  )}
                  {activeProvider === 'openai' && (
                    <>
                      <option value="gpt-4o">gpt-4o</option>
                      <option value="gpt-4-turbo">gpt-4-turbo</option>
                      <option value="gpt-4">gpt-4</option>
                      <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                    </>
                  )}
                  {activeProvider === 'anthropic' && (
                    <>
                      <option value="claude-3-5-sonnet-20241022">claude-3.5-sonnet</option>
                      <option value="claude-3-opus-20240229">claude-3-opus</option>
                      <option value="claude-3-sonnet-20240229">claude-3-sonnet</option>
                      <option value="claude-3-haiku-20240307">claude-3-haiku</option>
                      <option value="claude-3-5-haiku-20241022">claude-3.5-haiku</option>
                    </>
                  )}
                  {activeProvider === 'google' && (
                    <>
                      <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                      <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                      <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite</option>
                    </>
                  )}
                  {!activeProvider && <option value="">Select a provider</option>}
                </select>
              </div>

              <button
                onClick={() => setAllowFailover(!allowFailover)}
                className={`chip flex items-center gap-[var(--gap-2)] ${allowFailover ? 'on' : 'off'}`}
                type="button"
              >
                <span className={`badge-dot ${allowFailover ? '' : 'off'}`}>Failover</span>
                <span className="text-[var(--size-small)]">{allowFailover ? 'Enabled' : 'Disabled'}</span>
              </button>
            </div>

            <div className="hidden md:flex items-center gap-[var(--gap-2)]">
              <button
                onClick={() => createCheckpoint(`Checkpoint ${new Date().toLocaleTimeString()}`, 'Auto-generated checkpoint')}
                disabled={isCreatingCheckpoint}
                className="btn"
                title="Create Checkpoint"
              >
                {isCreatingCheckpoint ? '...' : 'Save'}
              </button>

              {checkpoints.length > 0 && (
                <select
                  onChange={(e) => {
                    const checkpointId = e.target.value;
                    const checkpoint = checkpoints.find(c => c.id === checkpointId);
                    if (checkpoint) {
                      restoreCheckpoint(checkpoint);
                    }
                    e.target.value = '';
                  }}
                  className="min-w-[140px]"
                  title="Restore checkpoint"
                >
                  <option value="">Checkpoints</option>
                  {checkpoints.map(checkpoint => (
                    <option key={checkpoint.id} value={checkpoint.id}>
                      {checkpoint.name}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={exportToExpo}
                disabled={isExportingToExpo || !generatedCode}
                className="btn"
                title="Export to Expo"
              >
                {isExportingToExpo ? '...' : 'Expo'}
              </button>

              <button
                onClick={exportToFlutter}
                disabled={isExportingToExpo || !generatedCode}
                className="btn"
                title="Export to Flutter"
              >
                {isExportingToExpo ? '...' : 'Flutter'}
              </button>

              <button
                onClick={runQualityCheck}
                disabled={isRunningQualityCheck || !generatedCode}
                className="btn"
                title="Run quality checks"
              >
                {isRunningQualityCheck ? '...' : 'QA'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-[var(--gap-3)] ml-auto">
            <div className="status-metrics">
              <span><span className="text-[var(--muted)]">chars</span><strong>{generatedCode.length}</strong></span>
              <span><span className="text-[var(--muted)]">logs</span><strong>{sandboxLogs.length}</strong></span>
              <span><span className="text-[var(--muted)]">checkpoints</span><strong>{checkpoints.length}</strong></span>
              {cliModifiedFiles.size > 0 && (
                <span><span className="text-[var(--muted)]">CLI</span><strong>{cliModifiedFiles.size}</strong></span>
              )}
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>


      <main className="flex flex-1 min-h-0 gap-[var(--gap-5)] px-4 pb-[var(--gap-5)]">
        {/* Sidebar Toggle Button - Desktop */}
        <div className={`flex items-center justify-center transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'w-8 bg-slate-800/80' : 'w-6 bg-[var(--panel-alt)]'
        } border-r border-[var(--border)] hidden md:flex`}>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 hover:bg-[rgba(51,65,85,0.5)] rounded transition-colors text-[var(--muted)] hover:text-white touch-manipulation"
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
        <aside className={`border-r border-[var(--border)] transition-all duration-300 ease-in-out flex flex-col ${
          isSidebarCollapsed ? 'w-0 overflow-hidden md:w-0' : 'w-48 lg:w-64'
        } ${isSidebarCollapsed ? 'hidden md:flex' : 'flex'}`}>
          {/* CLI Modified Files Section */}
          {cliModifiedFiles.size > 0 && (
            <div className="px-3 py-3 border-b border-[var(--border)] bg-blue-500/10">
              <h4 className="text-xs font-semibold text-blue-300 mb-2 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CLI Modified ({cliModifiedFiles.size})
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {Array.from(cliModifiedFiles).map(filePath => (
                  <div
                    key={filePath}
                    className="text-xs text-blue-200 bg-blue-500/20 px-2 py-1 rounded cursor-pointer hover:bg-blue-500/30 transition-colors"
                    onClick={() => handleFileSelection(filePath)}
                    title={`Click to open ${filePath}`}
                  >
                    📄 {filePath.split('/').pop()}
                  </div>
                ))}
              </div>
            </div>
          )}

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
          <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-72 max-w-[85vw] glass-panel border-r border-[var(--border)] z-40 md:hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold text-white">Project Files</h3>
              <button
                onClick={() => setIsSidebarCollapsed(true)}
                className="p-2 hover:bg-[rgba(51,65,85,0.5)] rounded transition-colors text-[var(--muted)] hover:text-white touch-manipulation"
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
            {/* Atlas CLI Column */}
            <div className="flex flex-col min-h-0 xl:border-r border-[var(--border)]">
              {/* CLI Header */}
              <div className="p-3 md:p-4 border-b border-[var(--border)] bg-[var(--panel-alt)] flex-shrink-0">
                <h2 className="text-sm md:text-base font-semibold text-white flex items-center gap-2">
                  <svg className="w-4 h-4 md:w-5 md:h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">Atlas CLI</span>
                  <span className="sm:hidden">CLI</span>
                  <span className="text-xs text-green-400 bg-green-400/20 px-2 py-1 rounded-full">Genie Agent</span>
                </h2>
              </div>

              {/* Generation Process - Show during generation */}
              {isGenerating && (
                <div className="px-3 md:px-4 py-2 bg-slate-900/50 backdrop-blur-xl border-b border-[var(--border)]">
                  <ModelFeedbackLoop
                    isActive={isGenerating}
                    onComplete={() => {
                      setIsGenerating(false);
                    }}
                  />
                </div>
              )}

              {/* Atlas CLI Interface */}
              <div className="flex-1 min-h-0">
                <AtlasCLI
                  onCommand={handleChatSubmit}
                  isGenerating={isGenerating}
                  generatedCode={generatedCode}
                  executionResult={executionResult}
                  sandboxLogs={sandboxLogs}
                  onFileModified={handleCliFileModified}
                  onCliActivity={handleCliActivity}
                  githubEnabled={githubEnabled}
                />
              </div>
            </div>

            {/* Editor/Sandbox Column */}
            <div className="flex flex-col min-h-0 xl:border-l border-[var(--border)]">
              {/* Hidden StreamingEditor to keep functions exposed globally - positioned absolutely so it doesn't affect layout */}
              <div style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
                <StreamingEditor
                  onStreamingComplete={handleStreamingComplete}
                  onStreamingError={handleStreamingError}
                  onFileModified={handleCliFileModified}
                  onExitStreaming={() => setIsStreamingMode(false)}
                />
              </div>

              <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'editor' | 'sandbox')} className="flex-1 flex flex-col min-h-0">
                {/* Header with Tabs */}
                <div className="p-3 md:p-4 border-b border-[var(--border)] bg-[var(--panel-alt)] flex-shrink-0">
                  <TabsList className="grid w-full grid-cols-2 mb-2">
                    <TabsTrigger value="editor">Editor</TabsTrigger>
                    <TabsTrigger value="sandbox">Sandbox</TabsTrigger>
                  </TabsList>

                  {/* Streaming Mode Toggle */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsStreamingMode(!isStreamingMode)}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                          isStreamingMode
                            ? 'bg-blue-600 text-white'
                            : 'text-[var(--muted)] hover:text-white hover:bg-[rgba(51,65,85,0.5)]'
                        }`}
                        title="Toggle streaming code generation mode"
                      >
                        {isStreamingMode ? '🔄 Streaming Mode' : '⚡ Streaming Mode'}
                      </button>
                      {isStreamingMode && (
                        <span className="text-xs text-blue-400">Real-time code generation</span>
                      )}
                    </div>
                  </div>

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
                          <span className="text-[var(--muted)]">Tokens:</span>
                          <span className="text-purple-400 font-mono">{runMetadata.tokens.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[var(--muted)]">Cost:</span>
                          <span className="text-green-400 font-mono">${runMetadata.cost.toFixed(4)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[var(--muted)]">Time:</span>
                          <span className="text-blue-400 font-mono">{runMetadata.duration.toFixed(1)}s</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Editor Tab Content */}
                <TabsContent value="editor" className="flex-1 min-h-0 m-0 flex flex-col">
                  {isStreamingMode ? (
                    <StreamingEditor
                      onStreamingComplete={handleStreamingComplete}
                      onStreamingError={handleStreamingError}
                      onFileModified={handleCliFileModified}
                      onExitStreaming={() => setIsStreamingMode(false)}
                    />
                  ) : (
                    <>
                      {/* Tab Bar for open files */}
                      <TabBar
                        tabs={tabs}
                        activeTabId={activeTabId}
                        onTabSelect={selectTab}
                        onTabClose={closeTab}
                      />

                      {/* Code Editor */}
                      <div className="flex-1 min-h-0">
                        <CodeEditor
                          value={
                            activeFileTab?.content ||
                            (isGenerating && !generatedCode
                              ? "// 🤖 AI is generating your code...\n// Please wait while we craft the perfect solution for you!"
                              : generatedCode || "// No file open. Select a file from the tree or generate code.")
                          }
                          onChange={(val) => {
                            if (val !== undefined) {
                              if (activeTabId) {
                                updateTabContent(activeTabId, val);
                              } else {
                                setGeneratedCode(val);
                              }
                            }
                          }}
                          originalValue={activeFileTab?.content || originalGeneratedCode}
                        />
                      </div>
                    </>
                  )}
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
                      <span className="text-[var(--muted)]">Tokens:</span>
                      <span className="text-purple-400 font-mono">{runMetadata.tokens.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[var(--muted)]">Cost:</span>
                      <span className="text-green-400 font-mono">${runMetadata.cost.toFixed(4)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-2 md:p-3 flex-1 overflow-auto min-h-0">
              {sandboxLogs.length === 0 ? (
                <div className="text-[var(--muted)] text-sm font-mono">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-400">$</span>
                    <span className="text-[var(--text)]">Ready for sandbox execution...</span>
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
                      <span className="text-[var(--text)] flex-1">{log.message}</span>
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
      </main>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onCommand={handleCommand}
        openTabs={tabs}
        onTabSelect={selectTab}
        onFileOpen={handleFileSelection}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeProvider={activeProvider}
        selectedModel={selectedModel}
        allowFailover={allowFailover}
        githubEnabled={githubEnabled}
        onProviderChange={(provider) => {
          setActiveProvider(provider);
          localStorage.setItem('activeProvider', provider);
        }}
        onModelChange={(model) => {
          setSelectedModel(model);
          localStorage.setItem('selectedModel', model);
        }}
        onFailoverChange={setAllowFailover}
        onGitHubEnabledChange={handleGitHubEnabledChange}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Notification Center */}
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onClearAll={clearAll}
        onRemove={removeNotification}
      />

      {/* Theme Toggle - Floating */}
      <div className="fixed bottom-4 right-4 z-40">
        <ThemeToggle />
      </div>
    </div>
  );
}
