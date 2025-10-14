'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
import ToolDrawer, { type ToolDrawerTab } from "@/components/ToolDrawer";
import { ToolEmptyState } from "@/components/ToolDrawerPanel";
// Using inline SSE setup to avoid hook/runtime mismatch issues
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { GitHubRepository, WorkspaceState } from "@/lib/github-types";
import TabBar from "@/components/TabBar";
import { useTabs } from "@/hooks/useTabs";
import NotificationCenter from "@/components/NotificationCenter";
import { useNotifications } from "@/hooks/useNotifications";
import Explorer from "@/components/tools/Explorer";
import SourceControlPanel from "@/components/tools/SourceControl";
import PullRequestPanel from "@/components/tools/PullRequest";
import SearchPanel from "@/components/tools/Search";
import PreviewPanelTool from "@/components/tools/Preview";
import TicketsPanel from "@/components/tools/Tickets";
import WorkflowsPanel from "@/components/tools/Workflows";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import {
  FolderTree,
  GitMerge,
  GitPullRequest,
  Search as SearchIcon,
  Monitor,
  Ticket as TicketIcon,
  Workflow,
  Settings as SettingsIcon,
} from "lucide-react";

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

type ServiceConnectionsState = {
  jiraSiteUrl: string;
  linearWorkspace: string;
};

type UIPreferencesState = {
  enableNotifications: boolean;
  enableToasts: boolean;
};

type PromptMode = 'quick' | 'think' | 'ask';

interface AnswerStreamEventDetail {
  sessionId: string;
  prompt: string;
  chunk?: string;
  type?: string;
  section?: string;
  title?: string;
  items?: any[];
  source?: 'cli' | 'prompt';
  status?: 'complete' | 'error';
  error?: string;
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
  const enableExplorer = useFeatureFlag('enableExplorer');
  const enableSourceControl = useFeatureFlag('enableSourceControl');
  const enablePR = useFeatureFlag('enablePR');
  const enableSearch = useFeatureFlag('enableSearch');
  const enablePreview = useFeatureFlag('enablePreview');
  const enableTickets = useFeatureFlag('enableTickets');
  const enableWorkflows = useFeatureFlag('enableWorkflows');
  const enableAskMode = useFeatureFlag('enableAskMode');
  const enableAskWebSearch = useFeatureFlag('enableAskWebSearch');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [originalGeneratedCode, setOriginalGeneratedCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [sandboxLogs, setSandboxLogs] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([]);
  const [chatMode, setChatMode] = useState<PromptMode>('quick');
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
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  // Webhooks (SSE) + Auto-refresh
  const [webhooksConnected, setWebhooksConnected] = useState(false);
  useEffect(() => {
    try {
      const es = new EventSource('/api/events/sse');
      es.onopen = () => setWebhooksConnected(true);
      es.onerror = () => setWebhooksConnected(false);
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data?.type === 'github' && data.payload) {
            const { event, body } = data.payload;
            window.dispatchEvent(new CustomEvent('github:event', { detail: { event, body } }));
            if (event) {
              window.dispatchEvent(new CustomEvent(`github:${event}`, { detail: body }));
            }
          }
        } catch {}
      };
      return () => es.close();
    } catch {}
  }, []);

  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('autoRefreshIntervalMs');
      return saved ? parseInt(saved, 10) : 30000;
    }
    return 30000;
  });

  useEffect(() => {
    localStorage.setItem('autoRefreshIntervalMs', String(autoRefreshInterval));
  }, [autoRefreshInterval]);

  useAutoRefresh({
    enabled: !webhooksConnected,
    interval: autoRefreshInterval,
    onRefresh: () => {
      try {
        window.dispatchEvent(new CustomEvent('app:auto-refresh'));
        window.dispatchEvent(new CustomEvent('github:auto-refresh'));
      } catch {}
    },
  });

  const [serviceConnections, setServiceConnections] = useState<ServiceConnectionsState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('serviceConnections');
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            jiraSiteUrl: parsed?.jiraSiteUrl || '',
            linearWorkspace: parsed?.linearWorkspace || '',
          };
        }
      } catch {}
    }
    return { jiraSiteUrl: '', linearWorkspace: '' };
  });

  const [uiPreferences, setUIPreferences] = useState<UIPreferencesState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('uiPreferences');
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            enableNotifications: parsed?.enableNotifications !== false,
            enableToasts: parsed?.enableToasts !== false,
          };
        }
      } catch {}
    }
    return { enableNotifications: true, enableToasts: true };
  });

  const [cliModifiedFiles, setCliModifiedFiles] = useState<Set<string>>(new Set());
  const [cliActivity, setCliActivity] = useState<{
    isActive: boolean;
    currentTask?: string;
    progress?: number;
  }>({ isActive: false });
  const [isStreamingMode, setIsStreamingMode] = useState(true);
  const [streamingFiles, setStreamingFiles] = useState<Array<{ path: string; status: string; content: string }>>([]);

  useEffect(() => {
    if (!enableAskMode && chatMode === 'ask') {
      setChatMode('quick');
    }
  }, [enableAskMode, chatMode]);

  useEffect(() => {
    if (chatMode === 'ask' && isStreamingMode) {
      setIsStreamingMode(false);
    } else if (chatMode !== 'ask' && !isStreamingMode) {
      setIsStreamingMode(true);
    }
  }, [chatMode, isStreamingMode]);

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

  const hasRepoConnection = Boolean(
    workspace?.owner && workspace?.repo && workspace?.installationId
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('serviceConnections', JSON.stringify(serviceConnections));
    }
  }, [serviceConnections]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('uiPreferences', JSON.stringify(uiPreferences));
    }
  }, [uiPreferences]);

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

  const emitAnswerEvent = (name: string, detail: AnswerStreamEventDetail) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(name, { detail }));
  };

  const formatAnswerLog = (log: any): string => {
    const rawTitle = log.title || log.section || 'Notes';
    const normalizedTitle = typeof rawTitle === 'string'
      ? rawTitle.replace(/[_-]+/g, ' ')
      : String(rawTitle);
    const heading = normalizedTitle.charAt(0).toUpperCase() + normalizedTitle.slice(1);
    let output = `\n${heading}\n${'-'.repeat(heading.length)}\n`;

    if (typeof log.text === 'string' && log.text.trim().length > 0) {
      output += `${log.text.trim()}\n`;
    }

    if (Array.isArray(log.items) && log.items.length > 0) {
      log.items.forEach((item: any, index: number) => {
        if (typeof item === 'string') {
          const prefix = log.kind === 'steps' ? `${index + 1}.` : '-';
          output += `${prefix} ${item.trim()}\n`;
        } else if (item && typeof item === 'object') {
          const label = item.label || item.title || `Item ${index + 1}`;
          const value = item.value ?? item.text ?? '';
          output += `- ${label}${value ? `: ${value}` : ''}\n`;
        }
      });
    }

    if (Array.isArray(log.commands)) {
      log.commands.forEach((command: string) => {
        output += `  $ ${command}\n`;
      });
    }

    return `${output}\n`;
  };

  const handleAnswerPrompt = async (
    prompt: string,
    options?: { sessionId?: string; source?: 'cli' | 'prompt' }
  ) => {
    const sessionId = options?.sessionId ?? `ask-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const source = options?.source ?? 'prompt';

    emitAnswerEvent('atlas:answer-start', { sessionId, prompt, source });

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          mode: 'answer',
          webSearchEnabled: enableAskWebSearch,
          workspace: workspace
            ? { owner: workspace.owner, repo: workspace.repo, branch: workspace.branch }
            : null,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Answer mode failed');
        emitAnswerEvent('atlas:answer-error', { sessionId, prompt, source, error: errorText });
        addToast('Answer mode failed to respond.', 'error');
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        emitAnswerEvent('atlas:answer-error', { sessionId, prompt, source, error: 'Empty response' });
        addToast('Answer mode returned an empty response.', 'error');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const segments = buffer.split('\n');

        for (let i = 0; i < segments.length - 1; i++) {
          const line = segments[i].trim();
          if (!line.startsWith('data:')) continue;

          const payloadRaw = line.slice(5).trim();
          if (!payloadRaw) continue;

          try {
            const payload = JSON.parse(payloadRaw);
            if (payload.type === 'ANSWER') {
              const chunk = payload.chunk ?? payload.text ?? '';
              if (chunk) {
                emitAnswerEvent('atlas:answer-chunk', {
                  sessionId,
                  prompt,
                  source,
                  chunk,
                  type: 'answer',
                });
              }
            } else if (payload.type === 'LOG') {
              const chunk = formatAnswerLog(payload);
              if (chunk.trim()) {
                emitAnswerEvent('atlas:answer-chunk', {
                  sessionId,
                  prompt,
                  source,
                  chunk,
                  type: 'log',
                  section: payload.section,
                  title: payload.title,
                });
              }
            } else if (payload.type === 'ERROR') {
              const message = payload.message || 'Answer mode encountered an error';
              emitAnswerEvent('atlas:answer-error', { sessionId, prompt, source, error: message });
              addToast(message, 'error');
              return;
            }
          } catch (error) {
            console.warn('[AnswerMode] Failed to parse chunk', error);
          }
        }

        buffer = segments[segments.length - 1];
      }

      emitAnswerEvent('atlas:answer-complete', { sessionId, prompt, source, status: 'complete' });
    } catch (error: any) {
      const message = error?.message || 'Answer mode request failed';
      console.error('[AnswerMode] Streaming failed:', message);
      emitAnswerEvent('atlas:answer-error', { sessionId, prompt, source, error: message });
      addToast(message, 'error');
    }
  };

  const handleChatSubmit = async (
    prompt: string,
    options?: { mode?: PromptMode; sessionId?: string; source?: 'cli' | 'prompt' }
  ) => {
    const mode = options?.mode ?? chatMode;
    const source = options?.source ?? 'prompt';

    if (mode === 'ask') {
      if (!enableAskMode) {
        addToast('Ask mode is disabled. Enable it from Settings to stream guidance.', 'info');
        setChatMode('quick');
        await handleChatSubmit(prompt, { mode: 'quick', sessionId: options?.sessionId, source });
        return;
      }

      await handleAnswerPrompt(prompt, { sessionId: options?.sessionId, source });
      return;
    }

    const shouldStream = mode === 'quick' || mode === 'think' || isStreamingMode;

    if (shouldStream) {
      handleStartStreaming(prompt);
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    setActiveTab('chat');
    await handleGenerate(prompt);
  };

  const handleModeChange = useCallback((mode: PromptMode) => {
    if (mode === 'ask' && !enableAskMode) {
      addToast('Ask mode is disabled. Enable it from Settings to stream guidance.', 'info');
      return;
    }
    setChatMode(mode);
  }, [enableAskMode, addToast]);

  const pushNotification = useCallback(
    (
      message: string,
      type: 'success' | 'error' | 'info' | 'warning' = 'info',
      options?: { toast?: boolean; notification?: boolean }
    ) => {
      const toastAllowed = options?.toast ?? (type === 'error' || uiPreferences.enableToasts);
      const notificationAllowed = options?.notification ?? (type === 'error' || uiPreferences.enableNotifications);

      if (toastAllowed) {
        const toastType = type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info';
        addToast(message, toastType);
      }

      if (notificationAllowed) {
        addNotification(message, type === 'warning' ? 'warning' : type);
      }
    },
    [addNotification, addToast, uiPreferences.enableNotifications, uiPreferences.enableToasts]
  );

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
      // Exit streaming mode when user explicitly opens a file so the editor becomes visible
      if (isStreamingMode) {
        setIsStreamingMode(false);
      }

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
    setIsDrawerCollapsed(false);

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
          onClick: () => setIsDrawerCollapsed(false),
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

  const handleStreamingComplete = async (files: Array<{ path: string; status: string; content: string }>) => {
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

    // Save files to local workspace
    try {
      console.log('[FileTree] Attempting to save files:', files.map(f => f.path));

      const response = await fetch('/api/local-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('[FileTree] ✅ Files saved to workspace:', data.savedFiles);
        addToast(`Saved ${data.savedFiles.length} files to workspace`, 'success');
      } else {
        console.error('[FileTree] ❌ Failed to save files:', data.error);
        addToast(`Failed to save files: ${data.error}`, 'error');
      }
    } catch (err) {
      console.error('[FileTree] ❌ Error saving files to workspace:', err);
      addToast(`Error saving files: ${err}`, 'error');
    }

    // Refresh Explorer/FileTree to show new files
    try {
      window.dispatchEvent(new CustomEvent('github:auto-refresh'));
      window.dispatchEvent(new CustomEvent('filetree:refresh'));
    } catch (err) {
      console.error('Failed to dispatch refresh event:', err);
    }
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

  const drawerTabs: ToolDrawerTab[] = useMemo(() => {
    const drawer: ToolDrawerTab[] = [];

    drawer.push({
      id: 'explorer',
      label: 'Explorer',
      icon: <FolderTree className="w-4 h-4" />, 
      badge: cliModifiedFiles.size > 0 ? (cliModifiedFiles.size > 9 ? '9+' : cliModifiedFiles.size) : undefined,
      content: (
        <div className="flex flex-col h-full">
          {cliModifiedFiles.size > 0 && (
            <div className="px-3 py-3 border-b border-[var(--border)] bg-blue-500/10">
              <h4 className="text-xs font-semibold text-blue-300 mb-2 flex items-center gap-1">
                <FolderTree className="w-3 h-3" />
                CLI Modified ({cliModifiedFiles.size})
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {Array.from(cliModifiedFiles).map((filePath) => (
                  <button
                    key={filePath}
                    type="button"
                    className="w-full text-left text-xs text-blue-200 bg-blue-500/20 px-2 py-1 rounded hover:bg-blue-500/30 transition-colors"
                    onClick={() => handleFileSelection(filePath)}
                  >
                    📄 {filePath.split('/').pop()}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex-1 min-h-0">
            {enableExplorer ? (
              <Explorer
                owner={workspace?.owner}
                repo={workspace?.repo}
                branch={workspace?.branch}
                installationId={workspace?.installationId}
                onFileSelect={(filePath) => {
                  handleFileSelection(filePath);
                  openTab(filePath, '', '');
                }}
              />
            ) : (
              <FileTree onFileSelect={handleFileSelection} onContextAction={handleFileContextAction} />
            )}
          </div>
        </div>
      ),
    });

    drawer.push({
      id: 'source-control',
      label: 'Source Control',
      icon: <GitMerge className="w-4 h-4" />,
      content: enableSourceControl ? (
        hasRepoConnection ? (
          <SourceControlPanel
            owner={workspace?.owner}
            repo={workspace?.repo}
            branch={workspace?.branch}
            installationId={workspace?.installationId}
            tabs={tabs}
            onNotification={(message, type) => pushNotification(message, type)}
          />
        ) : (
          <ToolEmptyState
            title="Connect a Repository"
            description="Select a GitHub repository to view branches, commits, and status."
            actionLabel="Open Settings"
            onAction={() => setIsSettingsOpen(true)}
          />
        )
      ) : (
        <ToolEmptyState
          title="Source Control Disabled"
          description="Enable the Source Control feature flag in Settings to stage, commit, and branch."
          actionLabel="Open Settings"
          onAction={() => setIsSettingsOpen(true)}
        />
      ),
    });

    drawer.push({
      id: 'pull-requests',
      label: 'Pull Requests',
      icon: <GitPullRequest className="w-4 h-4" />,
      content: enablePR ? (
        hasRepoConnection ? (
          <PullRequestPanel
            owner={workspace?.owner}
            repo={workspace?.repo}
            branch={workspace?.branch}
            installationId={workspace?.installationId}
            onNotification={(message, type) => pushNotification(message, type)}
          />
        ) : (
          <ToolEmptyState
            title="Connect a Repository"
            description="Select a GitHub repository to fetch open pull requests."
            actionLabel="Open Settings"
            onAction={() => setIsSettingsOpen(true)}
          />
        )
      ) : (
        <ToolEmptyState
          title="PR Tool Disabled"
          description="Turn on the Pull Request feature flag to create and review GitHub PRs."
          actionLabel="Open Settings"
          onAction={() => setIsSettingsOpen(true)}
        />
      ),
    });

    drawer.push({
      id: 'search',
      label: 'Search',
      icon: <SearchIcon className="w-4 h-4" />,
      content: enableSearch ? (
        hasRepoConnection ? (
          <SearchPanel
            owner={workspace?.owner}
            repo={workspace?.repo}
            installationId={workspace?.installationId}
            onFileSelect={handleFileSelection}
            onNotification={(message, type) => pushNotification(message, type)}
          />
        ) : (
          <ToolEmptyState
            title="Connect a Repository"
            description="Select a GitHub repository to run code search."
            actionLabel="Open Settings"
            onAction={() => setIsSettingsOpen(true)}
          />
        )
      ) : (
        <ToolEmptyState
          title="Search Disabled"
          description="Enable the Search feature flag to query files and code across the repository."
          actionLabel="Open Settings"
          onAction={() => setIsSettingsOpen(true)}
        />
      ),
    });

    drawer.push({
      id: 'preview',
      label: 'Preview',
      icon: <Monitor className="w-4 h-4" />,
      content: enablePreview ? (
        <PreviewPanelTool
          previewUrl={expoProject?.devServerUrl}
          onShare={(url) => pushNotification(`Share URL copied: ${url}`, 'info', { notification: false })}
          onNotification={(message, type) => pushNotification(message, type)}
        />
      ) : (
        <ToolEmptyState
          title="Preview Disabled"
          description="Enable the Preview feature flag to view sandbox output inside the sidebar."
          actionLabel="Open Settings"
          onAction={() => setIsSettingsOpen(true)}
        />
      ),
    });

    drawer.push({
      id: 'tickets',
      label: 'Tickets',
      icon: <TicketIcon className="w-4 h-4" />,
      content: enableTickets ? (
        <TicketsPanel
          jiraDomain={serviceConnections.jiraSiteUrl}
          onNotification={(message, type) => pushNotification(message, type)}
        />
      ) : (
        <ToolEmptyState
          title="Tickets Disabled"
          description="Enable the Tickets feature flag to connect Jira or Linear in the sidebar."
          actionLabel="Open Settings"
          onAction={() => setIsSettingsOpen(true)}
        />
      ),
    });

    drawer.push({
      id: 'workflows',
      label: 'Workflows',
      icon: <Workflow className="w-4 h-4" />,
      content:
        enableWorkflows && hasRepoConnection ? (
          <WorkflowsPanel
            owner={workspace!.owner}
            repo={workspace!.repo}
            installationId={workspace!.installationId!}
          />
        ) : enableWorkflows ? (
          <ToolEmptyState
            title="Workflows Not Connected"
            description="Select a GitHub repository to trigger and monitor Actions workflows."
            actionLabel="Open Settings"
            onAction={() => setIsSettingsOpen(true)}
          />
        ) : (
          <ToolEmptyState
            title="Workflows Disabled"
            description="Enable the Workflows feature flag to trigger and monitor GitHub Actions."
            actionLabel="Open Settings"
            onAction={() => setIsSettingsOpen(true)}
          />
        ),
    });

    drawer.push({
      id: 'settings',
      label: 'Settings',
      icon: <SettingsIcon className="w-4 h-4" />,
      content: (
        <div className="p-4 space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Access project integrations, feature flags, and UI preferences without leaving the workspace.
          </p>
          <button type="button" className="btn" onClick={() => setIsSettingsOpen(true)}>
            Open Settings Modal
          </button>
        </div>
      ),
    });

    return drawer;
  }, [
    cliModifiedFiles,
    enableExplorer,
    enableSourceControl,
    enablePR,
    enableSearch,
    enablePreview,
    enableTickets,
    enableWorkflows,
    hasRepoConnection,
    workspace,
    tabs,
    handleFileSelection,
    openTab,
    handleFileContextAction,
    expoProject,
    pushNotification,
    serviceConnections,
  ]);

  // Expose function to switch to editor view globally for Atlas CLI
  useEffect(() => {
    const handleAtlasUINotification = (e: any) => {
      try {
        const { type, title, message, url, urlLabel } = e.detail || {};
        const toastType: 'success' | 'error' | 'info' =
          type === 'error' ? 'error' : type === 'success' ? 'success' : 'info';
        const text = title ? `${title}${message ? ` – ${message}` : ''}` : message;
        if (!text) return;

        if (toastType === 'error' || uiPreferences.enableToasts) {
          addToast(text, toastType);
        }

        if (toastType === 'error' || uiPreferences.enableNotifications) {
          const actions = url
            ? [
                {
                  label: urlLabel || 'Open',
                  onClick: () => window.open(url, '_blank'),
                  variant: 'primary' as const,
                },
              ]
            : undefined;
          addNotification(text, toastType, actions, { url });
        }
      } catch {}
    };

    (window as any).switchToEditorView = () => {
      setActiveView('editor');
    };

    window.addEventListener('atlas-notification', handleAtlasUINotification as EventListener);
    return () => {
      delete (window as any).switchToEditorView;
      window.removeEventListener('atlas-notification', handleAtlasUINotification as EventListener);
    };
  }, [addToast, addNotification, uiPreferences.enableNotifications, uiPreferences.enableToasts]);

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

      <main className="flex flex-1 min-h-0 gap-[var(--gap-5)] px-4 pb-[var(--gap-5)]">
        <ToolDrawer
          tabs={drawerTabs}
          defaultTab="explorer"
          collapsed={isDrawerCollapsed}
          onCollapsedChange={setIsDrawerCollapsed}
        />

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
                  onCommand={(command, opts) =>
                    handleChatSubmit(command, { ...opts, source: opts?.source ?? 'cli' })
                  }
                  isGenerating={isGenerating}
                  generatedCode={generatedCode}
                  executionResult={executionResult}
                  sandboxLogs={sandboxLogs}
                  onFileModified={handleCliFileModified}
                  onCliActivity={handleCliActivity}
                  githubEnabled={githubEnabled}
                  activeMode={chatMode}
                  onModeChange={handleModeChange}
                  askEnabled={enableAskMode}
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

                  {/* Mode Selection */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {[
                        { id: 'quick', label: 'Quick', hint: 'Fast code streaming', disabled: false },
                        { id: 'think', label: 'Think', hint: 'Plan, research, stream', disabled: false },
                        { id: 'ask', label: 'Ask', hint: 'Guidance streamed to CLI', disabled: !enableAskMode },
                      ].map(({ id, label, hint, disabled }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            if (disabled || chatMode === (id as PromptMode)) return;
                            handleModeChange(id as PromptMode);
                          }}
                          disabled={disabled}
                          className={[
                            'px-3 py-1 text-xs rounded-full border transition-colors',
                            chatMode === (id as PromptMode)
                              ? 'border-purple-400 bg-purple-500/20 text-purple-100'
                              : 'border-slate-700 text-[var(--muted)] hover:border-purple-400 hover:text-white',
                            disabled ? 'opacity-40 cursor-not-allowed' : '',
                          ].filter(Boolean).join(' ')}
                          title={disabled ? `${hint} (Enable Ask Mode in Settings)` : hint}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-[var(--muted)]">
                      {chatMode === 'ask'
                        ? 'Answers stream into the CLI without touching files'
                        : 'Quick and Think stream code updates into the workspace'}
                    </span>
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
        currentRepo={workspace ? `${workspace.owner}/${workspace.repo}` : null}
        currentBranch={workspace?.branch ?? null}
        webhooksConnected={webhooksConnected}
        autoRefreshInterval={autoRefreshInterval}
        serviceConnections={serviceConnections}
        uiPreferences={uiPreferences}
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
        onAutoRefreshIntervalChange={setAutoRefreshInterval}
        onServiceConnectionsChange={setServiceConnections}
        onUIPreferencesChange={setUIPreferences}
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
