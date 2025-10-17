'use client';

import { useState, useEffect, useRef } from 'react';
import { ShellExecutor } from '@/services/shellExecutor';
import { useWebhookEvents } from '@/hooks/useWebhookEvents';
import { WebhookEvent } from '@/lib/github-types';
import {
  Rocket,
  Lightbulb,
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Terminal,
  GitBranch,
  MessageSquare,
  FileEdit,
  GitPullRequest,
  GitCommit,
  Folder,
  ArrowUpCircle,
  ArrowUpIcon,
  PlusIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";

type PromptMode = 'quick' | 'think' | 'ask';

interface CLICommand {
  id: string;
  command: string;
  output: string;
  timestamp: Date;
  type: 'command' | 'response' | 'error' | 'success' | 'info' | 'answer';
  executionTime?: number;
  icon?: 'push' | 'pr' | 'comment' | 'review' | 'check' | 'info' | 'rocket' | 'lightbulb' | 'folder';
}

interface ThinkEvent {
  kind: 'planning' | 'researching' | 'executing' | 'drafting' | 'user' | 'summary';
  ts: string;
  items?: string[];
  text?: string;
  output?: string;
}

interface AnswerStreamDetail {
  sessionId: string;
  prompt: string;
  chunk?: string;
  type?: string;
  section?: string;
  title?: string;
  items?: string[];
  source?: 'cli' | 'prompt';
  status?: 'complete' | 'error';
  error?: string;
}

interface AtlasCLIProps {
  onCommand: (command: string, options?: { mode?: PromptMode; sessionId?: string; source?: 'cli' | 'prompt' }) => Promise<void>;
  isGenerating?: boolean;
  generatedCode?: string;
  executionResult?: any;
  sandboxLogs?: any[];
  onFileModified?: (filePath: string, operation: string) => void;
  onCliActivity?: (activity: { isActive: boolean; currentTask?: string; progress?: number }) => void;
  githubEnabled?: boolean;
  activeMode: PromptMode;
  onModeChange?: (mode: PromptMode) => void;
  askEnabled?: boolean;
}

export default function AtlasCLI({
  onCommand,
  isGenerating,
  generatedCode,
  executionResult,
  sandboxLogs,
  onFileModified,
  onCliActivity,
  githubEnabled = false,
  activeMode,
  onModeChange,
  askEnabled = false,
}: AtlasCLIProps) {
  const [commands, setCommands] = useState<CLICommand[]>([
    {
      id: 'atlas-help-1',
      command: 'atlas --help',
      output: `Atlas CLI - AI Code Generator with Real-Time Streaming

Quick Start:
  Just type what you want to build and press Enter!
  Code streams in REAL-TIME with proper formatting!

Examples:
  "Create a React todo app"
  "Build a weather dashboard"
  "Make a chat component with emoji reactions"
  "Design a login form with validation"
  "Create a simple ping pong game"

Streaming Features:
  • Real-time code generation
  • Automatic code formatting
  • Multi-file support
  • Line-by-line streaming

Advanced Commands:
  Type /commands to see all available commands

Ready to build something amazing? Just describe it!`,
      timestamp: new Date(),
      type: 'info'
    }
  ]);

  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [environmentInfo, setEnvironmentInfo] = useState<any>(null);
  const [modifiedFiles, setModifiedFiles] = useState<Set<string>>(new Set());
  const [cliActivity, setCliActivity] = useState<{
    isActive: boolean;
    currentTask?: string;
    progress?: number;
  }>({ isActive: false });
  const [isThinkMode, setIsThinkMode] = useState(activeMode === 'think');
  const isThinkModeRef = useRef(isThinkMode); // Track current thinking mode state
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shellExecutor = ShellExecutor.getInstance();
  const answerSessionsRef = useRef<Map<string, { responseId: string }>>(new Map());

  useEffect(() => {
    const next = activeMode === 'think';
    setIsThinkMode(next);
    isThinkModeRef.current = next;
    if (typeof window !== 'undefined') {
      localStorage.setItem('atlasThinkingMode', JSON.stringify(next));
    }
  }, [activeMode]);

  // Poll for webhook events (only if GitHub is enabled)
  const { events: webhookEvents } = useWebhookEvents({
    enabled: githubEnabled,
    pollInterval: 5000,
    limit: 10,
  });

  // Auto-scroll to bottom when new commands are added
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [commands]);

  // Update ref whenever isThinkMode changes
  useEffect(() => {
    isThinkModeRef.current = isThinkMode;
  }, [isThinkMode]);

  // Toggle thinking mode
  const setMode = (nextMode: PromptMode, options: { emitInfo?: boolean } = {}) => {
    if (onModeChange) {
      onModeChange(nextMode);
    } else {
      const nextValue = nextMode === 'think';
      setIsThinkMode(nextValue);
      isThinkModeRef.current = nextValue;
      localStorage.setItem('atlasThinkingMode', JSON.stringify(nextValue));
    }

    if (options.emitInfo) {
      const message =
        nextMode === 'think'
          ? 'Thinking mode enabled - You will see detailed reasoning logs during code generation'
          : nextMode === 'ask'
            ? 'Answer mode enabled - Responses will stream to the CLI without modifying files'
            : 'Thinking mode disabled - Only showing final results';
      addCommand('atlas mode', message, 'info');
    }
  };

  const toggleThinkingMode = () => {
    const nextMode: PromptMode = isThinkModeRef.current ? 'quick' : 'think';
    setMode(nextMode, { emitInfo: true });
  };

  // Emit function for structured thinking mode logging
  const emitToCLI = ({ kind, ts, items, text, output }: ThinkEvent) => {
    if (!isThinkModeRef.current) {
      console.log(`[Thinking Mode OFF] Skipping ${kind} event`);
      return;
    }

    const timestamp = ts || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const kindLabel = kind.charAt(0).toUpperCase() + kind.slice(1);

    let formattedOutput = `${kindLabel}
${timestamp}
`;

    const appendLine = (rawLine: string) => {
      const trimmed = rawLine.trim();
      if (!trimmed) return;
      const bullet = /^(?:\d+\.|[-*])\s+/.test(trimmed) ? trimmed : `- ${trimmed}`;
      formattedOutput += `${bullet}
`;
    };

    items?.forEach(item => appendLine(item));

    if (text && text.trim()) {
      appendLine(text);
    }

    if (output) {
      output.split('\n').forEach(line => appendLine(line));
    }

    formattedOutput = formattedOutput.trimEnd();

    const thinkingCommand: CLICommand = {
      id: `thinking-${kind}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      command: kindLabel,
      output: formattedOutput,
      timestamp: new Date(),
      type: 'info'
    };

    setCommands(prev => [...prev, thinkingCommand]);
    console.log(`[${timestamp}] ${kindLabel}:`, { items, text, output });
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const ensureAnswerEntry = (detail: AnswerStreamDetail) => {
      const { sessionId, prompt, source } = detail;
      if (!sessionId) return null;
      const existing = answerSessionsRef.current.get(sessionId);
      if (existing) {
        return existing.responseId;
      }

      const responseId = `answer-${sessionId}`;
      answerSessionsRef.current.set(sessionId, { responseId });
      setCommands(prev => {
        const next = [...prev];
        if (source !== 'cli') {
          next.push({
            id: `ask-command-${sessionId}`,
            command: prompt,
            output: '',
            timestamp: new Date(),
            type: 'command'
          });
        }
        next.push({
          id: responseId,
          command: 'Answer Mode',
          output: 'Answering...',
          timestamp: new Date(),
          type: 'answer',
          icon: 'lightbulb'
        });
        return next;
      });

      return responseId;
    };

    const startListener = (event: Event) => {
      const detail = (event as CustomEvent<AnswerStreamDetail>).detail;
      if (!detail) return;
      ensureAnswerEntry(detail);
    };

    const chunkListener = (event: Event) => {
      const detail = (event as CustomEvent<AnswerStreamDetail>).detail;
      if (!detail?.sessionId || !detail.chunk) return;
      const session = answerSessionsRef.current.get(detail.sessionId);
      const responseId = session?.responseId || ensureAnswerEntry(detail);
      if (!responseId) return;
      const chunk = detail.chunk;
      setCommands(prev =>
        prev.map(cmd => {
          if (cmd.id !== responseId) return cmd;
          const existingOutput = cmd.output === 'Answering...' ? '' : cmd.output || '';
          return {
            ...cmd,
            output: existingOutput + chunk,
            type: 'answer'
          };
        })
      );
    };

    const completeListener = (event: Event) => {
      const detail = (event as CustomEvent<AnswerStreamDetail>).detail;
      if (!detail?.sessionId) return;
      const session = answerSessionsRef.current.get(detail.sessionId);
      if (!session) return;
      setCommands(prev =>
        prev.map(cmd => {
          if (cmd.id !== session.responseId) return cmd;
          return {
            ...cmd,
            output: (cmd.output || '').replace(/Answering\.\.\.$/, '').trimEnd() + '\n\n✅ Answer complete',
            type: 'answer'
          };
        })
      );
      answerSessionsRef.current.delete(detail.sessionId);
    };

    const errorListener = (event: Event) => {
      const detail = (event as CustomEvent<AnswerStreamDetail>).detail;
      if (!detail?.sessionId) return;
      const session = answerSessionsRef.current.get(detail.sessionId);
      if (!session) return;
      setCommands(prev =>
        prev.map(cmd => {
          if (cmd.id !== session.responseId) return cmd;
          return {
            ...cmd,
            output: `${cmd.output || ''}\n\n❌ ${detail.error || 'Answer mode failed'}`,
            type: 'error'
          };
        })
      );
      answerSessionsRef.current.delete(detail.sessionId);
    };

    window.addEventListener('atlas:answer-start', startListener as EventListener);
    window.addEventListener('atlas:answer-chunk', chunkListener as EventListener);
    window.addEventListener('atlas:answer-complete', completeListener as EventListener);
    window.addEventListener('atlas:answer-error', errorListener as EventListener);

    return () => {
      window.removeEventListener('atlas:answer-start', startListener as EventListener);
      window.removeEventListener('atlas:answer-chunk', chunkListener as EventListener);
      window.removeEventListener('atlas:answer-complete', completeListener as EventListener);
      window.removeEventListener('atlas:answer-error', errorListener as EventListener);
    };
  }, []);

  // Focus input on component mount and load environment info
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }

    // Load environment information
    loadEnvironmentInfo();

    // Expose handler for thinking events from StreamingEditor
    (window as any).handleThinkingEvent = (event: ThinkEvent) => {
      console.log('[AtlasCLI] Received thinking event from StreamingEditor:', event);
      emitToCLI(event);
    };

    // Cleanup
    return () => {
      delete (window as any).handleThinkingEvent;
    };
  }, []);

  // Stream webhook events into CLI
  useEffect(() => {
    if (webhookEvents.length === 0) return;

    const latestEvent = webhookEvents[0];
    const eventId = `webhook-${latestEvent.timestamp}`;

    // Check if we've already logged this event
    if (commands.find(cmd => cmd.id === eventId)) return;

    let message = '';
    let icon: 'push' | 'pr' | 'comment' | 'review' | 'check' | 'info' = 'info';

    switch (latestEvent.type) {
      case 'push':
        icon = 'push';
        message = `Push to ${latestEvent.data.ref} by ${latestEvent.data.sender?.login}`;
        break;
      case 'pull_request':
        icon = 'pr';
        message = `PR #${latestEvent.data.pull_request?.number} ${latestEvent.action} by ${latestEvent.data.sender?.login}`;
        break;
      case 'issue_comment':
        icon = 'comment';
        message = `Comment ${latestEvent.action} on #${latestEvent.data.issue?.number} by ${latestEvent.data.sender?.login}`;
        break;
      case 'pull_request_review_comment':
        icon = 'review';
        message = `Review comment ${latestEvent.action} on PR #${latestEvent.data.pull_request?.number} by ${latestEvent.data.sender?.login}`;
        break;
      case 'check_suite':
      case 'check_run':
        icon = 'check';
        message = `Check ${latestEvent.action} in ${latestEvent.data.repository?.full_name}`;
        break;
    }

    if (message) {
      const cmd: CLICommand = {
        id: eventId,
        command: `[GitHub Webhook] ${latestEvent.type}`,
        output: message,
        timestamp: new Date(latestEvent.timestamp),
        type: 'info',
        icon
      };
      setCommands(prev => [...prev, cmd]);
    }
  }, [webhookEvents]);

  const loadEnvironmentInfo = async () => {
    try {
      const info = await shellExecutor.getEnvironmentInfo();
      setEnvironmentInfo(info);
    } catch (error) {
      console.error('Failed to load environment info:', error);
    }
  };

  // Track CLI activity for editor integration
  const updateCliActivity = (isActive: boolean, currentTask?: string, progress?: number) => {
    setCliActivity({ isActive, currentTask, progress });
    onCliActivity?.({ isActive, currentTask, progress });
  };

  // Track file modifications for editor integration
  const trackFileModification = (filePath: string, operation: string) => {
    setModifiedFiles(prev => new Set([...prev, filePath]));
    onFileModified?.(filePath, operation);

    // Add visual feedback in CLI
    addCommand(`File operation: ${operation}`, `📄 Modified: ${filePath}`, 'info');
  };

  // Extract file paths from command output
  const extractFilePaths = (output: string): string[] => {
    const filePaths: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Look for common file operation patterns
      const fileMatch = line.match(/(?:created|modified|updated|wrote|generated):\s*([^\s]+)/);
      if (fileMatch) {
        filePaths.push(fileMatch[1]);
      }

      // Look for file paths in npm/yarn output
      const npmMatch = line.match(/(?:npm|yarn)\s+(?:install|add|remove).+?([^\s]+\.(js|ts|tsx|jsx|json|md))?/);
      if (npmMatch) {
        filePaths.push(npmMatch[1]);
      }
    }

    return filePaths;
  };

  // Update commands when external state changes
  useEffect(() => {
    if (isGenerating) {
      // Keep thinking mode enabled (don't force it on, respect user's choice)
      // Backend will emit all planning/researching/executing events via streaming API
      addCommand('atlas generate "..."', '🤖 Atlas is generating code...', 'info');
    }
  }, [isGenerating]);

  useEffect(() => {
    if (generatedCode && !isGenerating) {
      // Backend will emit summary via streaming - no need to duplicate
      // Just show success message
      addCommand('atlas generate "..."', `Code generated successfully (${generatedCode.length} characters)`, 'success');
    }
  }, [generatedCode, isGenerating]);

  useEffect(() => {
    if (executionResult) {
      const output = executionResult.success
        ? `Tests passed: ${executionResult.output}`
        : `Tests failed: ${executionResult.output} (Code still generated - you can review and fix if needed)`;
      addCommand('atlas test', output, executionResult.success ? 'success' : 'info');
    }
  }, [executionResult]);

  useEffect(() => {
    if (sandboxLogs && sandboxLogs.length > 0) {
      const latestLog = sandboxLogs[sandboxLogs.length - 1];
      if (latestLog && !commands.find(cmd => cmd.output === latestLog.message)) {
        addCommand('atlas status', `📊 ${latestLog.message}`, latestLog.type);
      }
    }
  }, [sandboxLogs]);

  const addCommand = (command: string, output: string, type: CLICommand['type'], executionTime?: number) => {
    const newCommand: CLICommand = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      command,
      output,
      timestamp: new Date(),
      type,
      executionTime
    };
    setCommands(prev => [...prev, newCommand]);
  };

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return;

    const startTime = Date.now();

    // Add command to history
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);

    // Add command to display
    addCommand(cmd, '', 'command');

    // Set executing state
    setIsExecuting(true);

    try {
      // Backend will emit planning events via streaming API - no need to duplicate here
      // Parse and execute command
      await parseAndExecuteCommand(cmd);
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      // Emit error in think mode
      if (isThinkMode) {
        emitToCLI({
          kind: 'executing',
          ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          text: `Command execution failed: ${error.message}`,
          output: `Execution time: ${executionTime}ms`
        });
      }

      addCommand(cmd, `Error: ${error.message}`, 'error', executionTime);
    } finally {
      setIsExecuting(false);
      setCurrentCommand('');

      // Emit summary if in think mode
      if (isThinkMode) {
        const totalTime = Date.now() - startTime;
        emitToCLI({
          kind: 'summary',
          ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          text: `Command execution completed`,
          output: `Total execution time: ${totalTime}ms`
        });
      }
    }
  };

  const parseAndExecuteCommand = async (cmd: string) => {
    const parts = cmd.trim().split(' ');
    const baseCommand = parts[0];
    const args = parts.slice(1);

    // Check for --think flag (optional override, but don't auto-disable)
    const thinkIndex = args.findIndex(arg => arg === '--think');
    const hasThinkFlag = thinkIndex !== -1;

    if (hasThinkFlag) {
      setMode('think', { emitInfo: true });
      // Remove --think from args for processing
      args.splice(thinkIndex, 1);
    }
    // Don't auto-disable thinking mode - let user control via toggle button

    console.log('[Atlas CLI] Parsing command:', { cmd, baseCommand, args, thinkMode: hasThinkFlag });

    // Emit user event if in think mode
    if (hasThinkFlag) {
      emitToCLI({
        kind: 'user',
        ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: `Command: ${cmd}`
      });
    }

    switch (baseCommand) {
      case 'atlas':
        await handleAtlasCommand(args);
        break;
      case 'clear':
        setCommands([]);
        break;
      case 'help':
        addCommand(cmd, getHelpText(), 'info');
        break;
      case '/commands':
        addCommand(cmd, getCommandsList(), 'info');
        break;
      case 'think':
      case 'thinking':
        toggleThinkingMode();
        break;
      case 'history':
        showCommandHistory();
        break;
      case 'env':
      case 'environment':
        await showEnvironmentInfo();
        break;
      case 'ls':
      case 'dir':
        await executeListDirectory(args);
        break;
      case 'cat':
      case 'read':
        await executeReadFile(args);
        break;
      case 'run':
      case 'npm':
      case 'yarn':
        await executePackageScript(args);
        break;
      case 'install':
      case 'add':
        await executePackageInstall(args);
        break;
      case 'git':
        await executeGitCommand(args);
        break;
      case 'shell':
      case 'exec':
      case 'execute':
        await executeShellCommand(args);
        break;
      default:
        // If command doesn't match any specific atlas subcommand, treat as direct prompt
        if (cmd.length > 2 && !cmd.startsWith('/')) {
          if (activeMode === 'ask') {
            const sessionId = `ask-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            await onCommand(cmd, { mode: 'ask', sessionId, source: 'cli' });
          } else {
            console.log('[Atlas CLI] Checking for streaming function:', typeof (window as any).startStreamingSession);
            console.log('[Atlas CLI] Checking for view switch function:', typeof (window as any).switchToEditorView);

            if ((window as any).startStreamingSession) {
              console.log('[Atlas CLI] Starting streaming session with prompt:', cmd);
              if ((window as any).switchToEditorView) {
                (window as any).switchToEditorView();
                console.log('[Atlas CLI] Switched to editor view');
              }
              setTimeout(() => {
                console.log('[Atlas CLI] Calling startStreamingSession after delay');
                if ((window as any).startStreamingSession) {
                  (window as any).startStreamingSession(cmd);
                  console.log('[Atlas CLI] startStreamingSession called successfully');
                } else {
                  console.error('[Atlas CLI] startStreamingSession not available after delay!');
                }
              }, 100);
              addCommand(cmd, 'dYs? Generating code with real-time streaming...', 'info');
            } else {
              console.log('[Atlas CLI] Streaming not available, using fallback');
              await onCommand(cmd, { mode: activeMode });
            }
          }
        } else if (cmd.startsWith('/')) {
          addCommand(cmd, `Command not found: ${baseCommand}. Type /commands to see all available commands.`, 'error');
        } else {
          addCommand(cmd, `Command not found: ${baseCommand}. Type /help for quick start, or just describe what you want to build!`, 'error');
        }
    }
  };

  const handleAtlasCommand = async (args: string[]) => {
    if (args.length === 0) {
      addCommand('atlas', 'Atlas: Hello! I\'m your autonomous coding assistant. Type "atlas help" for available commands or just describe what you want to build!', 'info');
      return;
    }

    const subCommand = args[0];
    const subArgs = args.slice(1);

    switch (subCommand) {
      case 'generate':
        const prompt = subArgs.join(' ');
        if (!prompt) {
          addCommand('atlas generate', 'Error: Please provide a prompt. Example: atlas generate "Create a React todo app"', 'error');
          return;
        }

        // Emit drafting event if in think mode
        if (isThinkMode) {
          emitToCLI({
            kind: 'drafting',
            ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            text: `Generating code for prompt: "${prompt}"`,
            items: [
              'Analyzing prompt requirements and constraints',
              'Planning code structure and file organization',
              'Preparing streaming session for real-time generation',
              'Setting up editor integration for live updates'
            ]
          });
        }

        // Always use streaming for generate
        if ((window as any).startStreamingSession) {
          console.log('Starting streaming session with prompt:', prompt);

          // Emit executing event for streaming start
          if (isThinkMode) {
            emitToCLI({
              kind: 'executing',
              ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              text: 'Starting real-time code streaming session',
              output: 'Switching to editor view for live code generation'
            });
          }

          // Switch to editor view before starting streaming
          if ((window as any).switchToEditorView) {
            (window as any).switchToEditorView();
          }
          // Small delay to ensure editor is rendered
          setTimeout(() => {
            (window as any).startStreamingSession(prompt);
          }, 100);
          addCommand(`atlas generate "${prompt}"`, '🚀 Generating code with real-time streaming...', 'info');
        } else {
          await onCommand(prompt);
        }
        break;

      case 'explain':
        const fileToExplain = subArgs[0];
        if (!fileToExplain) {
          addCommand('atlas explain', 'Error: Please specify a file. Example: atlas explain @src/App.js', 'error');
          return;
        }
        await onCommand(`Explain the code in ${fileToExplain}. What does this file do?`);
        break;

      case 'refactor':
        const fileToRefactor = subArgs[0];
        if (!fileToRefactor) {
          addCommand('atlas refactor', 'Error: Please specify a file. Example: atlas refactor @src/App.js', 'error');
          return;
        }
        await onCommand(`Refactor the code in ${fileToRefactor} to make it more readable and maintainable.`);
        break;

      case 'test':
        const fileToTest = subArgs[0];
        if (!fileToTest) {
          addCommand('atlas test', 'Error: Please specify a file. Example: atlas test @src/App.js', 'error');
          return;
        }
        await onCommand(`Add comprehensive unit tests for the code in ${fileToTest}.`);
        break;

      case 'optimize':
        const fileToOptimize = subArgs[0];
        if (!fileToOptimize) {
          addCommand('atlas optimize', 'Error: Please specify a file. Example: atlas optimize @src/App.js', 'error');
          return;
        }
        await onCommand(`Optimize the performance of the code in ${fileToOptimize}.`);
        break;

      case 'export':
        const platform = subArgs[0];
        if (!platform) {
          addCommand('atlas export', 'Error: Please specify platform. Example: atlas export expo', 'error');
          return;
        }
        if (platform === 'expo') {
          // Trigger expo export
          window.dispatchEvent(new CustomEvent('atlas-export', { detail: 'expo' }));
        } else if (platform === 'flutter') {
          // Trigger flutter export
          window.dispatchEvent(new CustomEvent('atlas-export', { detail: 'flutter' }));
        } else {
          addCommand('atlas export', `Error: Unsupported platform "${platform}". Supported: expo, flutter`, 'error');
        }
        break;

      case 'checkpoint':
        const checkpointName = subArgs.join(' ') || `Checkpoint ${new Date().toLocaleTimeString()}`;
        window.dispatchEvent(new CustomEvent('atlas-checkpoint', { detail: checkpointName }));
        break;

      case 'restore':
        const restoreName = subArgs.join(' ');
        if (!restoreName) {
          addCommand('atlas restore', 'Error: Please specify checkpoint name. Example: atlas restore "my-checkpoint"', 'error');
          return;
        }
        window.dispatchEvent(new CustomEvent('atlas-restore', { detail: restoreName }));
        break;

      case 'quality':
        window.dispatchEvent(new CustomEvent('atlas-quality-check'));
        break;

      case 'status':
        showProjectStatus();
        break;

      case 'clear':
        setCommands([]);
        break;

      case 'help':
        addCommand('atlas help', getHelpText(), 'info');
        break;

      case 'think':
      case 'thinking':
      case 'thinking-mode':
        toggleThinkingMode();
        break;

      default:
        addCommand('atlas ' + subCommand, `Unknown atlas command: ${subCommand}. Type "atlas help" for available commands.`, 'error');
    }
  };

  const getHelpText = () => {
    return `Atlas CLI - Local Autonomous Agent Interface

Quick Start:
  Just type what you want to build and press Enter!
  All code generation uses REAL-TIME STREAMING by default!

Examples:
  "Create a React todo app"
  "Build a weather dashboard"
  "Make a chat component with emoji reactions"
  "Design a login form with validation"
  "Create a simple ping pong game"

Code Generation (Streaming Enabled):
  atlas generate <prompt>      Generate code from description
  <any prompt>                 Direct prompts also work!

Shell Commands:
  env                          Show environment information
  ls [directory]               List files and directories
  cat <file>                   Read and display file contents
  run <script>                 Run npm/yarn scripts (dev, build, test)
  install <packages>           Install npm packages
  git [command]                Execute git commands
  shell <command>              Execute any shell command

Thinking Mode:
  think / thinking             Toggle thinking mode on/off
  Click the brain button in the header to toggle verbose reasoning logs

Advanced Commands:
  Type /commands to see all available commands

Tip: Code is generated line-by-line in real-time with proper formatting!

Ready to build something amazing? Just describe it!`;
  };

  const getCommandsList = () => {
    return `Atlas CLI - All Available Commands

Natural Language (Primary - Streaming Enabled):
  <any prompt>                Generate code from natural language
  atlas generate <prompt>     Same as above (explicit)

File Operations:
  atlas explain <file>        Explain code in specified file
  atlas refactor <file>       Refactor code for better maintainability
  atlas test <file>           Generate tests for specified file
  atlas optimize <file>       Optimize code performance

Project Management:
  atlas export <platform>     Export project (expo, flutter)
  atlas checkpoint <name>     Create project checkpoint
  atlas restore <name>        Restore from checkpoint
  atlas quality               Run code quality analysis
  atlas status                Show current project status

Local Shell Operations:
  env                         Show environment information
  ls [directory]              List files and directories
  cat <file>                  Read and display file contents
  run <script>                Run npm/yarn scripts (dev, build, test)
  install <packages>          Install npm packages
  git [command]               Execute git commands (status, add, commit, etc.)
  shell <command>             Execute any shell command

Utility Commands:
  atlas clear                 Clear terminal history
  atlas help                  Show quick start guide
  /commands                   Show this commands list
  think / thinking            Toggle thinking mode on/off

Thinking Mode:
  • Toggle with the brain button in the header
  • Or use: atlas thinking, think, or thinking command
  • See detailed AI reasoning logs during code generation
  • Includes: Planning, Researching, Executing, Drafting, Summary

Pro Tips:
  • All code generation uses real-time streaming by default
  • Use @filename to reference specific files
  • Be specific about frameworks and requirements
  • Code appears line-by-line with proper formatting

Examples:
  "Create a React todo app with dark mode"
  "Build a weather app using Vue.js"
  atlas explain @src/components/Button.js
  atlas export expo`;
  };

  const showCommandHistory = () => {
    const historyOutput = commandHistory.length > 0
      ? commandHistory.map((cmd, i) => `${i + 1}  ${cmd}`).join('\n')
      : 'No commands in history';
    addCommand('history', historyOutput, 'info');
  };

  const showProjectStatus = () => {
    const status = `Project Status:
📁 Files: ${commands.length} commands executed
⚡ Code: ${generatedCode?.length || 0} characters generated
🔧 Status: ${isGenerating ? 'Generating...' : 'Ready'}
📊 Logs: ${sandboxLogs?.length || 0} entries

Autonomous Agent: Atlas 🗺️
Mode: Interactive Development
Environment: Local Execution`;
    addCommand('atlas status', status, 'info');
  };

  const showEnvironmentInfo = async () => {
    try {
      if (!environmentInfo) {
        await loadEnvironmentInfo();
      }

      const info = environmentInfo || await shellExecutor.getEnvironmentInfo();
      const envDisplay = `Environment Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Platform: ${info.platform}
Node.js: ${info.nodeVersion}
NPM: ${info.npmVersion}
Yarn: ${info.yarnVersion || 'Not installed'}
Git: ${info.gitVersion || 'Not installed'}
Current Directory: ${info.currentDirectory}
Package Manager: ${info.packageManager.toUpperCase()}

Atlas can now execute local shell commands!
Try: npm install, git status, ls, or any shell command`;
      addCommand('env', envDisplay, 'info');
    } catch (error: any) {
      addCommand('env', `Failed to get environment info: ${error.message}`, 'error');
    }
  };

  const executeListDirectory = async (args: string[]) => {
    try {
      const dirPath = args[0] || '.';

      // Emit researching event if in think mode
      if (isThinkMode) {
        emitToCLI({
          kind: 'researching',
          ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          items: [
            `Scanning directory: ${dirPath}`,
            'Reading file system metadata',
            'Filtering and sorting directory contents',
            'Preparing file list for display'
          ]
        });
      }

      const files = await shellExecutor.listDirectory(dirPath);

      if (files.length === 0) {
        addCommand(`ls ${dirPath}`, `Directory is empty`, 'info');
      } else {
        const fileList = files.map(file => `  ${file}`).join('\n');
        addCommand(`ls ${dirPath}`, `Contents of ${dirPath}:\n${fileList}`, 'info');
      }
    } catch (error: any) {
      addCommand(`ls ${args.join(' ')}`, `Failed to list directory: ${error.message}`, 'error');
    }
  };

  const executeReadFile = async (args: string[]) => {
    if (args.length === 0) {
      addCommand('cat', 'Error: Please specify a file to read. Example: cat package.json', 'error');
      return;
    }

    try {
      const filePath = args[0];

      // Emit researching event if in think mode
      if (isThinkMode) {
        emitToCLI({
          kind: 'researching',
          ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          items: [
            `Reading file: ${filePath}`,
            'Analyzing file content and structure',
            'Checking file size and encoding',
            'Preparing content for display'
          ]
        });
      }

      const content = await shellExecutor.readFile(filePath);

      if (content.length > 2000) {
        addCommand(`cat ${filePath}`, `File contents (truncated):\n${content.substring(0, 2000)}...\n\nFile is large (${content.length} chars). Showing first 2000 characters.`, 'info');
      } else {
        addCommand(`cat ${filePath}`, `Contents of ${filePath}:\n${content}`, 'info');
      }
    } catch (error: any) {
      addCommand(`cat ${args.join(' ')}`, `Failed to read file: ${error.message}`, 'error');
    }
  };

  const executePackageScript = async (args: string[]) => {
    if (args.length === 0) {
      addCommand('run', 'Error: Please specify a script to run. Example: run dev', 'error');
      return;
    }

    try {
      const scriptName = args[0];
      updateCliActivity(true, `Running script: ${scriptName}`, 0);
      addCommand(`run ${scriptName}`, `Executing script: ${scriptName}...`, 'info');

      const result = await shellExecutor.runScript(scriptName);

      if (result.success) {
        updateCliActivity(false, undefined, 100);
        const modifiedFilesList = extractFilePaths(result.output);
        addCommand(`run ${scriptName}`, `Script completed successfully:\n${result.output}`, 'success');

        // Track any file modifications
        modifiedFilesList.forEach(filePath => {
          trackFileModification(filePath, 'script execution');
        });
      } else {
        updateCliActivity(false);
        addCommand(`run ${scriptName}`, `Script failed:\n${result.error || result.output}`, 'error');
      }
    } catch (error: any) {
      updateCliActivity(false);
      addCommand(`run ${args.join(' ')}`, `Failed to execute script: ${error.message}`, 'error');
    }
  };

  const executePackageInstall = async (args: string[]) => {
    if (args.length === 0) {
      addCommand('install', 'Error: Please specify packages to install. Example: install react typescript', 'error');
      return;
    }

    try {
      const packages = args;
      const dev = args.includes('--dev') || args.includes('-D');
      const packagesToInstall = dev ? args.filter(p => p !== '--dev' && p !== '-D') : packages;

      // Emit drafting event if in think mode (package installation involves modifying project files)
      if (isThinkMode) {
        emitToCLI({
          kind: 'drafting',
          ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          text: `Installing packages: ${packagesToInstall.join(', ')}`,
          items: [
            'Updating package.json dependencies',
            'Installing packages via package manager',
            'Updating lock file (package-lock.json/yarn.lock)',
            'Tracking file modifications for editor integration'
          ]
        });
      }

      updateCliActivity(true, `Installing packages: ${packagesToInstall.join(', ')}`, 0);
      addCommand(`install ${packages.join(' ')}`, `📦 Installing packages: ${packagesToInstall.join(', ')}...`, 'info');

      const result = await shellExecutor.installPackages(packagesToInstall, dev);

      if (result.success) {
        updateCliActivity(false, undefined, 100);
        const modifiedFilesList = extractFilePaths(result.output);

        // Emit success in think mode
        if (isThinkMode) {
          emitToCLI({
            kind: 'drafting',
            ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            text: `Package installation completed successfully`,
            output: `${packagesToInstall.length} packages installed`
          });
        }

        addCommand(`install ${packages.join(' ')}`, `Packages installed successfully:\n${result.output}`, 'success');

        // Track package.json and lock file modifications
        trackFileModification('package.json', 'package installation');
        if (environmentInfo?.packageManager === 'npm') {
          trackFileModification('package-lock.json', 'package installation');
        } else if (environmentInfo?.packageManager === 'yarn') {
          trackFileModification('yarn.lock', 'package installation');
        }

        // Track any other file modifications
        modifiedFilesList.forEach(filePath => {
          trackFileModification(filePath, 'package installation');
        });
      } else {
        updateCliActivity(false);

        // Emit failure in think mode
        if (isThinkMode) {
          emitToCLI({
            kind: 'drafting',
            ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            text: `Package installation failed`,
            output: `Failed to install: ${packagesToInstall.join(', ')}`
          });
        }

        addCommand(`install ${packages.join(' ')}`, `Package installation failed:\n${result.error || result.output}`, 'error');
      }
    } catch (error: any) {
      updateCliActivity(false);

      // Emit error in think mode
      if (isThinkMode) {
        emitToCLI({
          kind: 'drafting',
          ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          text: `Package installation error: ${error.message}`,
          output: 'Installation process could not be completed'
        });
      }

      addCommand(`install ${args.join(' ')}`, `Failed to install packages: ${error.message}`, 'error');
    }
  };

  const executeGitCommand = async (args: string[]) => {
    if (args.length === 0) {
      // Show git status if no args provided
      try {
        const isGitRepo = await shellExecutor.isGitRepository();
        if (!isGitRepo) {
          addCommand('git', 'Not a git repository', 'error');
          return;
        }

        const statusResult = await shellExecutor.getGitStatus();
        if (statusResult.success) {
          if (statusResult.output.trim() === '') {
            addCommand('git status', 'Working directory clean', 'success');
          } else {
            addCommand('git status', `Git status:\n${statusResult.output}`, 'info');
          }
        } else {
          addCommand('git status', `Failed to get git status: ${statusResult.error}`, 'error');
        }
      } catch (error: any) {
        addCommand('git', `Git command failed: ${error.message}`, 'error');
      }
      return;
    }

    try {
      const gitCmd = args.join(' ');
      const result = await shellExecutor.executeCommand(`git ${gitCmd}`);

      if (result.success) {
        addCommand(`git ${gitCmd}`, `Git command completed:\n${result.output}`, 'success');
      } else {
        addCommand(`git ${gitCmd}`, `Git command failed:\n${result.error || result.output}`, 'error');
      }
    } catch (error: any) {
      addCommand(`git ${args.join(' ')}`, `Git command failed: ${error.message}`, 'error');
    }
  };

  const executeShellCommand = async (args: string[]) => {
    if (args.length === 0) {
      addCommand('shell', 'Error: Please specify a shell command to execute. Example: shell npm --version', 'error');
      return;
    }

    try {
      const command = args.join(' ');

      // Emit executing event if in think mode
      if (isThinkMode) {
        emitToCLI({
          kind: 'executing',
          ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          text: `Executing shell command: ${command}`,
          items: [
            'Preparing shell environment',
            'Validating command syntax',
            'Setting up execution context',
            'Monitoring for file system changes'
          ]
        });
      }

      updateCliActivity(true, `Executing: ${command}`, 0);
      addCommand(`shell ${command}`, `🔧 Executing: ${command}...`, 'info');

      const result = await shellExecutor.executeCommand(command);

      // Extract file paths from output for tracking
      const modifiedFilesList = extractFilePaths(result.output);

      if (result.success) {
        updateCliActivity(false, undefined, 100);

        // Emit success in think mode
        if (isThinkMode) {
          emitToCLI({
            kind: 'executing',
            ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            text: `Command executed successfully`,
            output: `Exit code: 0, Execution time: ${result.executionTime}ms`
          });
        }

        addCommand(`shell ${command}`, `Command completed (${result.executionTime}ms):\n${result.output}`, 'success');

        // Track any file modifications
        modifiedFilesList.forEach(filePath => {
          trackFileModification(filePath, 'shell command');
        });
      } else {
        updateCliActivity(false);

        // Emit failure in think mode
        if (isThinkMode) {
          emitToCLI({
            kind: 'executing',
            ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            text: `Command execution failed`,
            output: `Exit code: ${result.exitCode || 1}, Execution time: ${result.executionTime}ms`
          });
        }

        addCommand(`shell ${command}`, `Command failed (${result.executionTime}ms):\n${result.error || result.output}`, 'error');
      }
    } catch (error: any) {
      updateCliActivity(false);

      // Emit error in think mode
      if (isThinkMode) {
        emitToCLI({
          kind: 'executing',
          ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          text: `Shell execution failed: ${error.message}`,
          output: 'Command could not be executed'
        });
      }

      addCommand(`shell ${args.join(' ')}`, `Shell execution failed: ${error.message}`, 'error');
    }
  };

  const handleSubmit = () => {
    if (currentCommand.trim() && !isExecuting) {
      executeCommand(currentCommand);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        // Allow Shift+Enter for new line in textarea
        if (!e.shiftKey) {
          e.preventDefault();
          executeCommand(currentCommand);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (commandHistory.length > 0) {
          const newIndex = historyIndex === -1
            ? commandHistory.length - 1
            : Math.max(0, historyIndex - 1);
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex]);
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (historyIndex >= 0) {
          const newIndex = historyIndex + 1;
          if (newIndex < commandHistory.length) {
            setCurrentCommand(commandHistory[newIndex]);
            setHistoryIndex(newIndex);
          } else {
            setCurrentCommand('');
            setHistoryIndex(-1);
          }
        }
        break;

      case 'Tab':
        e.preventDefault();
        // Auto-complete common commands
        const commonCommands = [
          'atlas generate', 'atlas help', 'atlas status', 'atlas export',
          'env', 'ls', 'cat', 'run', 'install', 'git status', 'shell'
        ];
        const matchingCommand = commonCommands.find(cmd => cmd.startsWith(currentCommand));
        if (matchingCommand) {
          setCurrentCommand(matchingCommand + ' ');
        }
        break;
    }
  };

  const getTypeIcon = (type: CLICommand['type']) => {
    switch (type) {
      case 'command': return '$';
      case 'response': return '>';
      case 'error': return '!';
      case 'success': return '✓';
      case 'info': return 'i';
      default: return '>';
    }
  };

  const getTypeColor = (type: CLICommand['type']) => {
    switch (type) {
      case 'command': return 'text-green-400';
      case 'response': return 'text-blue-400';
      case 'error': return 'text-red-400';
      case 'success': return 'text-emerald-400';
      case 'info': return 'text-cyan-400';
      case 'answer': return 'text-blue-300';
      default: return 'text-gray-400';
    }
  };

  const renderIcon = (icon?: string, type?: CLICommand['type']) => {
    const iconClass = "w-4 h-4 flex-shrink-0";

    if (icon) {
      switch (icon) {
        case 'push':
          return <ArrowUpCircle className={`${iconClass} text-purple-400`} />;
        case 'pr':
          return <GitPullRequest className={`${iconClass} text-blue-400`} />;
        case 'comment':
          return <MessageSquare className={`${iconClass} text-green-400`} />;
        case 'review':
          return <FileEdit className={`${iconClass} text-yellow-400`} />;
        case 'check':
          return <CheckCircle2 className={`${iconClass} text-green-400`} />;
        case 'info':
          return <Info className={`${iconClass} text-cyan-400`} />;
        case 'rocket':
          return <Rocket className={`${iconClass} text-orange-400`} />;
        case 'lightbulb':
          return <Lightbulb className={`${iconClass} text-yellow-400`} />;
        case 'folder':
          return <Folder className={`${iconClass} text-blue-400`} />;
        default:
          return null;
      }
    }

    // Fallback based on type
    if (type) {
      switch (type) {
        case 'error':
          return <XCircle className={`${iconClass} text-red-400`} />;
        case 'success':
          return <CheckCircle2 className={`${iconClass} text-green-400`} />;
        case 'info':
          return <Info className={`${iconClass} text-cyan-400`} />;
        case 'command':
          return <Terminal className={`${iconClass} text-green-400`} />;
        case 'answer':
          return <Lightbulb className={`${iconClass} text-blue-300`} />;
        default:
          return null;
      }
    }

    return null;
  };

  const modeOptions: Array<{ id: PromptMode; label: string; hint: string; disabled?: boolean }> = [
    { id: 'quick', label: 'Quick', hint: 'Fast code streaming' },
    { id: 'think', label: 'Think', hint: 'Plan/research with extra logs' },
    { id: 'ask', label: 'Ask', hint: 'Text-only guidance', disabled: !askEnabled }
  ];

  const activityDotClass = [
    'w-2.5 h-2.5 rounded-full',
    cliActivity.isActive ? 'bg-[var(--accent-2)] animate-pulse' : 'bg-[var(--success)]'
  ].join(' ');

  return (
    <div className="panel flex flex-col h-full font-mono overflow-hidden" style={{ fontSize: 'var(--size-code)' }}>
      <header className="flex items-center justify-between gap-[var(--gap-4)] border-b border-[rgba(148,163,184,0.12)] bg-[rgba(17,24,38,0.55)] px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-[var(--gap-3)]">
          <span className={activityDotClass}></span>
          <div className="leading-tight">
            <span className="text-[var(--text)] font-semibold">Atlas CLI</span>
            <div className="text-[var(--muted)] text-[var(--size-small)]">Genie Agent v1.0</div>
          </div>
          {cliActivity.isActive && (
            <span className="chip on flex items-center gap-[var(--gap-2)] text-[var(--size-small)] text-[var(--accent-2)]">
              {cliActivity.currentTask}
            </span>
          )}
        </div>
        <div className="flex items-center gap-[var(--gap-3)]">
          <div className="flex items-center gap-2">
            {modeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  if (option.disabled || activeMode === option.id) return;
                  const emitInfo = option.id === 'think' || option.id === 'quick';
                  setMode(option.id, { emitInfo });
                }}
                disabled={option.disabled}
                className={[
                  'px-3 py-1.5 rounded-full border text-xs transition-colors',
                  activeMode === option.id
                    ? 'border-purple-400 bg-purple-500/20 text-purple-100'
                    : 'border-slate-600/60 text-gray-400 hover:border-purple-400 hover:text-white',
                  option.disabled ? 'opacity-40 cursor-not-allowed hover:border-slate-600/60 hover:text-gray-400' : ''
                ].join(' ')}
                title={option.disabled ? `${option.hint} (Enable Ask Mode in Settings)` : option.hint}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="status-metrics">
            <span><span className="text-[var(--muted)]">commands</span><strong>{commands.length}</strong></span>
            <span><span className="text-[var(--muted)]">files</span><strong>{modifiedFiles.size}</strong></span>
            <span><span className="text-[var(--muted)]">status</span><strong>{cliActivity.isActive ? 'Running' : 'Ready'}</strong></span>
          </div>
        </div>
      </header>

      {modifiedFiles.size > 0 && (
        <div className="border-b border-[rgba(34,211,238,0.2)] bg-[rgba(34,211,238,0.08)] px-4 py-2 flex items-center gap-[var(--gap-2)] text-[var(--size-small)] text-[var(--accent-2)]">
          <span className="font-medium">Modified:</span>
          <div className="flex gap-[var(--gap-2)] flex-wrap">
            {Array.from(modifiedFiles).map(file => (
              <span key={file} className="chip on text-[var(--size-small)] text-[var(--accent-2)] bg-[rgba(34,211,238,0.05)] border-[rgba(34,211,238,0.25)]">
                {file}
              </span>
            ))}
          </div>
          <button
            onClick={() => setModifiedFiles(new Set())}
            className="ml-auto text-[var(--muted)] hover:text-[var(--text)] transition-colors text-[var(--size-small)]"
            type="button"
            title="Clear modified files"
          >
            Clear
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        <div
          ref={outputRef}
          className="flex-1 overflow-auto px-4 py-3 space-y-[var(--gap-2)] scrollbar-thin"
        >
          {commands.map((cmd) => (
            <div key={cmd.id} className="space-y-[var(--gap-1)]">
              {cmd.type === 'command' && (
                <div className="flex items-start gap-[var(--gap-2)]">
                  <span className="text-[var(--accent-2)] flex-shrink-0">$</span>
                  <span className="text-[var(--text)]">{cmd.command}</span>
                  <span className="text-[var(--muted)] text-[var(--size-small)] ml-auto flex-shrink-0">
                    {cmd.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              )}

              {cmd.output && (
                <div className={['ml-4 pl-4 border-l-2', getTypeColor(cmd.type)].join(' ')}>
                  <div className="flex items-start gap-2">
                    {renderIcon(cmd.icon, cmd.type)}
                    <div className="text-[var(--muted)] whitespace-pre-wrap leading-relaxed flex-1">
                      {cmd.output}
                    </div>
                  </div>
                  {cmd.executionTime && (
                    <div className="text-[var(--size-small)] text-[var(--muted)] mt-1">
                      Completed in {cmd.executionTime}ms
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-[rgba(148,163,184,0.12)] bg-[rgba(11,16,32,0.9)] px-4 py-3 shadow-[0_-6px_18px_rgba(8,12,24,0.45)]">
          <InputGroup className="bg-[rgba(15,20,33,0.92)]">
            <InputGroupTextarea
              ref={inputRef}
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isExecuting ? "Executing command..." : "Ask, Search or Chat..."}
              disabled={isExecuting}
              spellCheck={false}
              autoComplete="off"
              rows={1}
              className="min-h-[40px] max-h-[200px] resize-none"
            />
            <InputGroupAddon align="block-end">
              <InputGroupButton
                className="rounded-full"
                size="icon-xs"
                variant="outline"
                disabled={isExecuting}
              >
                <PlusIcon />
              </InputGroupButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <InputGroupButton variant="ghost" disabled={isExecuting}>
                    {activeMode === 'quick' ? 'Quick' : activeMode === 'think' ? 'Think' : 'Ask'}
                  </InputGroupButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="[--radius:0.95rem]"
                  side="top"
                >
                  <DropdownMenuItem onClick={() => onModeChange?.('quick')}>
                    Quick
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onModeChange?.('think')}>
                    Think
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onModeChange?.('ask')}
                    disabled={!askEnabled}
                  >
                    Ask
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <InputGroupText className="ml-auto">
                {currentCommand.length > 0 ? `${currentCommand.length} chars` : ''}
              </InputGroupText>
              <Separator className="!h-4" orientation="vertical" />
              <InputGroupButton
                className="rounded-full"
                disabled={isExecuting || !currentCommand.trim()}
                size="icon-xs"
                variant="default"
                onClick={handleSubmit}
              >
                <ArrowUpIcon />
                <span className="sr-only">Send</span>
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>

      <footer className="px-4 py-2 border-t border-[rgba(148,163,184,0.12)] bg-[rgba(17,24,38,0.6)] text-[var(--size-small)] text-[var(--muted)] flex items-center justify-between">
        <span>Atlas has full local shell access</span>
        <span>{cliActivity.isActive ? 'Working...' : 'Ready'}</span>
      </footer>
    </div>
  );
}
