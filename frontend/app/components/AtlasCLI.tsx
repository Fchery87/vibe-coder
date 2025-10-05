'use client';

import { useState, useEffect, useRef } from 'react';
import { ShellExecutor } from '@/services/shellExecutor';

interface CLICommand {
  id: string;
  command: string;
  output: string;
  timestamp: Date;
  type: 'command' | 'response' | 'error' | 'success' | 'info';
  executionTime?: number;
}

interface ThinkEvent {
  kind: 'planning' | 'researching' | 'executing' | 'drafting' | 'user' | 'summary';
  ts: string;
  items?: string[];
  text?: string;
  output?: string;
}

interface AtlasCLIProps {
  onCommand: (command: string) => Promise<void>;
  isGenerating?: boolean;
  generatedCode?: string;
  executionResult?: any;
  sandboxLogs?: any[];
  onFileModified?: (filePath: string, operation: string) => void;
  onCliActivity?: (activity: { isActive: boolean; currentTask?: string; progress?: number }) => void;
}

export default function AtlasCLI({
  onCommand,
  isGenerating,
  generatedCode,
  executionResult,
  sandboxLogs,
  onFileModified,
  onCliActivity
}: AtlasCLIProps) {
  const [commands, setCommands] = useState<CLICommand[]>([
    {
      id: 'atlas-help-1',
      command: 'atlas --help',
      output: `Atlas CLI - AI Code Generator with Real-Time Streaming

🚀 Quick Start:
  Just type what you want to build and press Enter!
  Code streams in REAL-TIME with proper formatting!

💡 Examples:
  "Create a React todo app"
  "Build a weather dashboard"
  "Make a chat component with emoji reactions"
  "Design a login form with validation"
  "Create a simple ping pong game"

⚡ Streaming Features:
  ✓ Real-time code generation
  ✓ Automatic code formatting
  ✓ Multi-file support
  ✓ Line-by-line streaming

🔧 Advanced Commands:
  Type /commands to see all available commands

Ready to build something amazing? Just describe it! ✨`,
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
  const [isThinkMode, setIsThinkMode] = useState(() => {
    // Load thinking mode preference from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('atlasThinkingMode');
      return saved ? JSON.parse(saved) : true; // Default to enabled
    }
    return true;
  });
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shellExecutor = ShellExecutor.getInstance();

  // Auto-scroll to bottom when new commands are added
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [commands]);

  // Toggle thinking mode
  const toggleThinkingMode = () => {
    const newMode = !isThinkMode;
    setIsThinkMode(newMode);
    localStorage.setItem('atlasThinkingMode', JSON.stringify(newMode));

    addCommand(
      'atlas thinking-mode',
      newMode
        ? '✅ Thinking mode enabled - You will see detailed reasoning logs during code generation'
        : '🔕 Thinking mode disabled - Only showing final results',
      'info'
    );
  };

  // Emit function for structured thinking mode logging
  const emitToCLI = ({ kind, ts, items, text, output }: ThinkEvent) => {
    // Skip if thinking mode is disabled
    if (!isThinkMode) {
      console.log(`[Thinking Mode OFF] Skipping ${kind} event`);
      return;
    }

    const timestamp = ts || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    let formattedOutput = '';

    // Color coding for different event types (matching Atlas specification)
    const colors = {
      planning: '\x1b[35m',    // magenta
      researching: '\x1b[36m', // cyan
      executing: '\x1b[32m',   // green
      drafting: '\x1b[33m',    // yellow
      user: '\x1b[34m',        // blue
      summary: '\x1b[37m'      // white
    };

    const color = colors[kind] || '\x1b[37m';
    const reset = '\x1b[0m';
    const kindLabel = kind.charAt(0).toUpperCase() + kind.slice(1);

    // Format with Atlas-style output
    formattedOutput += `${color}[${kindLabel}]${reset} ${timestamp}\n`;

    if (items?.length) {
      items.forEach(item => formattedOutput += `  • ${item}\n`);
    }

    if (text) {
      formattedOutput += `  ${text}\n`;
    }

    if (output) {
      formattedOutput += `\n${output}\n`;
    }

    formattedOutput += '\n';

    // Add to CLI display as a special thinking command
    const thinkingCommand: CLICommand = {
      id: `thinking-${kind}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      command: `[${kindLabel}]`,
      output: formattedOutput.trim(),
      timestamp: new Date(),
      type: 'info'
    };

    setCommands(prev => [...prev, thinkingCommand]);

    // Also log to console for debugging
    console.log(`[${timestamp}] ${kindLabel}:`, { items, text, output });
  };

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
      // Auto-enable thinking mode when code generation starts
      setIsThinkMode(true);

      // Emit planning event for code generation
      emitToCLI({
        kind: 'planning',
        ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        items: [
          'Analyzing prompt requirements and context',
          'Selecting appropriate AI provider and model',
          'Planning code structure and implementation approach',
          'Preparing real-time streaming environment'
        ]
      });

      addCommand('atlas generate "..."', '🤖 Atlas is generating code...', 'info');
    }
  }, [isGenerating]);

  useEffect(() => {
    if (generatedCode && !isGenerating) {
      // Emit summary when code generation completes
      if (isThinkMode) {
        emitToCLI({
          kind: 'summary',
          ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          text: 'Code generation completed successfully',
          output: `Generated ${generatedCode.length} characters of code`
        });

        // Reset thinking mode after completion
        setTimeout(() => {
          setIsThinkMode(false);
        }, 2000); // Small delay to show the summary
      }

      addCommand('atlas generate "..."', `✅ Code generated successfully (${generatedCode.length} characters)`, 'success');
    }
  }, [generatedCode, isGenerating]);

  useEffect(() => {
    if (executionResult) {
      const output = executionResult.success
        ? `✅ Tests passed: ${executionResult.output}`
        : `⚠️ Tests failed: ${executionResult.output} (Code still generated - you can review and fix if needed)`;
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
      // Emit planning event if in think mode
      if (isThinkMode) {
        const planningSteps = [
          'Parsing command structure and arguments',
          'Identifying command type and validation requirements',
          'Preparing execution environment and dependencies',
          'Setting up error handling and logging'
        ];
        emitToCLI({
          kind: 'planning',
          ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          items: planningSteps
        });
      }

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

      addCommand(cmd, `❌ Error: ${error.message}`, 'error', executionTime);
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

    // Check for --think flag
    const thinkIndex = args.findIndex(arg => arg === '--think');
    const hasThinkFlag = thinkIndex !== -1;

    if (hasThinkFlag) {
      setIsThinkMode(true);
      // Remove --think from args for processing
      args.splice(thinkIndex, 1);
    } else {
      setIsThinkMode(false);
    }

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
          // Always use streaming mode for prompts
          console.log('[Atlas CLI] Checking for streaming function:', typeof (window as any).startStreamingSession);
          console.log('[Atlas CLI] Checking for view switch function:', typeof (window as any).switchToEditorView);

          if ((window as any).startStreamingSession) {
            console.log('[Atlas CLI] Starting streaming session with prompt:', cmd);
            // Switch to editor view before starting streaming
            if ((window as any).switchToEditorView) {
              (window as any).switchToEditorView();
              console.log('[Atlas CLI] Switched to editor view');
            }
            // Small delay to ensure editor is rendered
            setTimeout(() => {
              console.log('[Atlas CLI] Calling startStreamingSession after delay');
              if ((window as any).startStreamingSession) {
                (window as any).startStreamingSession(cmd);
                console.log('[Atlas CLI] startStreamingSession called successfully');
              } else {
                console.error('[Atlas CLI] startStreamingSession not available after delay!');
              }
            }, 100);
            addCommand(cmd, '🚀 Generating code with real-time streaming...', 'info');
          } else {
            console.log('[Atlas CLI] Streaming not available, using fallback');
            // Fallback to regular generation if streaming not available
            await onCommand(cmd);
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
          addCommand('atlas generate', '❌ Error: Please provide a prompt. Example: atlas generate "Create a React todo app"', 'error');
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
          addCommand('atlas explain', '❌ Error: Please specify a file. Example: atlas explain @src/App.js', 'error');
          return;
        }
        await onCommand(`Explain the code in ${fileToExplain}. What does this file do?`);
        break;

      case 'refactor':
        const fileToRefactor = subArgs[0];
        if (!fileToRefactor) {
          addCommand('atlas refactor', '❌ Error: Please specify a file. Example: atlas refactor @src/App.js', 'error');
          return;
        }
        await onCommand(`Refactor the code in ${fileToRefactor} to make it more readable and maintainable.`);
        break;

      case 'test':
        const fileToTest = subArgs[0];
        if (!fileToTest) {
          addCommand('atlas test', '❌ Error: Please specify a file. Example: atlas test @src/App.js', 'error');
          return;
        }
        await onCommand(`Add comprehensive unit tests for the code in ${fileToTest}.`);
        break;

      case 'optimize':
        const fileToOptimize = subArgs[0];
        if (!fileToOptimize) {
          addCommand('atlas optimize', '❌ Error: Please specify a file. Example: atlas optimize @src/App.js', 'error');
          return;
        }
        await onCommand(`Optimize the performance of the code in ${fileToOptimize}.`);
        break;

      case 'export':
        const platform = subArgs[0];
        if (!platform) {
          addCommand('atlas export', '❌ Error: Please specify platform. Example: atlas export expo', 'error');
          return;
        }
        if (platform === 'expo') {
          // Trigger expo export
          window.dispatchEvent(new CustomEvent('atlas-export', { detail: 'expo' }));
        } else if (platform === 'flutter') {
          // Trigger flutter export
          window.dispatchEvent(new CustomEvent('atlas-export', { detail: 'flutter' }));
        } else {
          addCommand('atlas export', `❌ Error: Unsupported platform "${platform}". Supported: expo, flutter`, 'error');
        }
        break;

      case 'checkpoint':
        const checkpointName = subArgs.join(' ') || `Checkpoint ${new Date().toLocaleTimeString()}`;
        window.dispatchEvent(new CustomEvent('atlas-checkpoint', { detail: checkpointName }));
        break;

      case 'restore':
        const restoreName = subArgs.join(' ');
        if (!restoreName) {
          addCommand('atlas restore', '❌ Error: Please specify checkpoint name. Example: atlas restore "my-checkpoint"', 'error');
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
        addCommand('atlas ' + subCommand, `❌ Unknown atlas command: ${subCommand}. Type "atlas help" for available commands.`, 'error');
    }
  };

  const getHelpText = () => {
    return `Atlas CLI - Local Autonomous Agent Interface

🚀 Quick Start:
  Just type what you want to build and press Enter!
  All code generation uses REAL-TIME STREAMING by default!

💡 Examples:
  "Create a React todo app"
  "Build a weather dashboard"
  "Make a chat component with emoji reactions"
  "Design a login form with validation"
  "Create a simple ping pong game"

⚡ Code Generation (Streaming Enabled):
  atlas generate <prompt>      Generate code from description
  <any prompt>                 Direct prompts also work!

🔧 Shell Commands:
  env                          Show environment information
  ls [directory]               List files and directories
  cat <file>                   Read and display file contents
  run <script>                 Run npm/yarn scripts (dev, build, test)
  install <packages>           Install npm packages
  git [command]                Execute git commands
  shell <command>              Execute any shell command

🧠 Thinking Mode:
  think / thinking             Toggle thinking mode on/off
  Click the 🧠 button in the header to toggle verbose reasoning logs

🔧 Advanced Commands:
  Type /commands to see all available commands

🎯 Tip: Code is generated line-by-line in real-time with proper formatting!

Ready to build something amazing? Just describe it! ✨`;
  };

  const getCommandsList = () => {
    return `Atlas CLI - All Available Commands

🎯 Natural Language (Primary - Streaming Enabled):
  <any prompt>                Generate code from natural language
  atlas generate <prompt>     Same as above (explicit)

🔧 File Operations:
  atlas explain <file>        Explain code in specified file
  atlas refactor <file>       Refactor code for better maintainability
  atlas test <file>           Generate tests for specified file
  atlas optimize <file>       Optimize code performance

📦 Project Management:
  atlas export <platform>     Export project (expo, flutter)
  atlas checkpoint <name>     Create project checkpoint
  atlas restore <name>        Restore from checkpoint
  atlas quality               Run code quality analysis
  atlas status                Show current project status

💻 Local Shell Operations:
  env                         Show environment information
  ls [directory]              List files and directories
  cat <file>                  Read and display file contents
  run <script>                Run npm/yarn scripts (dev, build, test)
  install <packages>          Install npm packages
  git [command]               Execute git commands (status, add, commit, etc.)
  shell <command>             Execute any shell command

🛠️ Utility Commands:
  atlas clear                 Clear terminal history
  atlas help                  Show quick start guide
  /commands                   Show this commands list
  think / thinking            Toggle thinking mode on/off

🧠 Thinking Mode:
  • Toggle with the 🧠 button in the header
  • Or use: atlas thinking, think, or thinking command
  • See detailed AI reasoning logs during code generation
  • Includes: Planning, Researching, Executing, Drafting, Summary

💡 Pro Tips:
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
      const envDisplay = `🖥️ Environment Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Platform: ${info.platform}
📦 Node.js: ${info.nodeVersion}
📋 NPM: ${info.npmVersion}
🧶 Yarn: ${info.yarnVersion || 'Not installed'}
🔧 Git: ${info.gitVersion || 'Not installed'}
📁 Current Directory: ${info.currentDirectory}
🛠️ Package Manager: ${info.packageManager.toUpperCase()}

💡 Atlas can now execute local shell commands!
Try: npm install, git status, ls, or any shell command`;
      addCommand('env', envDisplay, 'info');
    } catch (error: any) {
      addCommand('env', `❌ Failed to get environment info: ${error.message}`, 'error');
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
        addCommand(`ls ${dirPath}`, `📁 Directory is empty`, 'info');
      } else {
        const fileList = files.map(file => `  📄 ${file}`).join('\n');
        addCommand(`ls ${dirPath}`, `📁 Contents of ${dirPath}:\n${fileList}`, 'info');
      }
    } catch (error: any) {
      addCommand(`ls ${args.join(' ')}`, `❌ Failed to list directory: ${error.message}`, 'error');
    }
  };

  const executeReadFile = async (args: string[]) => {
    if (args.length === 0) {
      addCommand('cat', '❌ Error: Please specify a file to read. Example: cat package.json', 'error');
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
        addCommand(`cat ${filePath}`, `📄 File contents (truncated):\n${content.substring(0, 2000)}...\n\n💡 File is large (${content.length} chars). Showing first 2000 characters.`, 'info');
      } else {
        addCommand(`cat ${filePath}`, `📄 Contents of ${filePath}:\n${content}`, 'info');
      }
    } catch (error: any) {
      addCommand(`cat ${args.join(' ')}`, `❌ Failed to read file: ${error.message}`, 'error');
    }
  };

  const executePackageScript = async (args: string[]) => {
    if (args.length === 0) {
      addCommand('run', '❌ Error: Please specify a script to run. Example: run dev', 'error');
      return;
    }

    try {
      const scriptName = args[0];
      updateCliActivity(true, `Running script: ${scriptName}`, 0);
      addCommand(`run ${scriptName}`, `🚀 Executing script: ${scriptName}...`, 'info');

      const result = await shellExecutor.runScript(scriptName);

      if (result.success) {
        updateCliActivity(false, undefined, 100);
        const modifiedFilesList = extractFilePaths(result.output);
        addCommand(`run ${scriptName}`, `✅ Script completed successfully:\n${result.output}`, 'success');

        // Track any file modifications
        modifiedFilesList.forEach(filePath => {
          trackFileModification(filePath, 'script execution');
        });
      } else {
        updateCliActivity(false);
        addCommand(`run ${scriptName}`, `❌ Script failed:\n${result.error || result.output}`, 'error');
      }
    } catch (error: any) {
      updateCliActivity(false);
      addCommand(`run ${args.join(' ')}`, `❌ Failed to execute script: ${error.message}`, 'error');
    }
  };

  const executePackageInstall = async (args: string[]) => {
    if (args.length === 0) {
      addCommand('install', '❌ Error: Please specify packages to install. Example: install react typescript', 'error');
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

        addCommand(`install ${packages.join(' ')}`, `✅ Packages installed successfully:\n${result.output}`, 'success');

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

        addCommand(`install ${packages.join(' ')}`, `❌ Package installation failed:\n${result.error || result.output}`, 'error');
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

      addCommand(`install ${args.join(' ')}`, `❌ Failed to install packages: ${error.message}`, 'error');
    }
  };

  const executeGitCommand = async (args: string[]) => {
    if (args.length === 0) {
      // Show git status if no args provided
      try {
        const isGitRepo = await shellExecutor.isGitRepository();
        if (!isGitRepo) {
          addCommand('git', '❌ Not a git repository', 'error');
          return;
        }

        const statusResult = await shellExecutor.getGitStatus();
        if (statusResult.success) {
          if (statusResult.output.trim() === '') {
            addCommand('git status', '✅ Working directory clean', 'success');
          } else {
            addCommand('git status', `📊 Git status:\n${statusResult.output}`, 'info');
          }
        } else {
          addCommand('git status', `❌ Failed to get git status: ${statusResult.error}`, 'error');
        }
      } catch (error: any) {
        addCommand('git', `❌ Git command failed: ${error.message}`, 'error');
      }
      return;
    }

    try {
      const gitCmd = args.join(' ');
      const result = await shellExecutor.executeCommand(`git ${gitCmd}`);

      if (result.success) {
        addCommand(`git ${gitCmd}`, `✅ Git command completed:\n${result.output}`, 'success');
      } else {
        addCommand(`git ${gitCmd}`, `❌ Git command failed:\n${result.error || result.output}`, 'error');
      }
    } catch (error: any) {
      addCommand(`git ${args.join(' ')}`, `❌ Git command failed: ${error.message}`, 'error');
    }
  };

  const executeShellCommand = async (args: string[]) => {
    if (args.length === 0) {
      addCommand('shell', '❌ Error: Please specify a shell command to execute. Example: shell npm --version', 'error');
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

        addCommand(`shell ${command}`, `✅ Command completed (${result.executionTime}ms):\n${result.output}`, 'success');

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

        addCommand(`shell ${command}`, `❌ Command failed (${result.executionTime}ms):\n${result.error || result.output}`, 'error');
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

      addCommand(`shell ${args.join(' ')}`, `❌ Shell execution failed: ${error.message}`, 'error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        executeCommand(currentCommand);
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
      case 'response': return '🤖';
      case 'error': return '❌';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      default: return '>';
    }
  };

  const getTypeColor = (type: CLICommand['type']) => {
    switch (type) {
      case 'command': return 'text-green-400';
      case 'response': return 'text-blue-400';
      case 'error': return 'text-red-400';
      case 'success': return 'text-green-400';
      case 'info': return 'text-cyan-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 font-mono" style={{ fontSize: 'var(--code-size)' }}>
      {/* CLI Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700/50 bg-slate-800/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${cliActivity.isActive ? 'bg-blue-400 animate-pulse' : 'bg-green-400'}`}></div>
          <span className="text-green-400 font-bold" style={{ fontSize: 'var(--h3-size)' }}>Atlas CLI</span>
          <span className="text-gray-400 text-small">Genie Agent v1.0</span>
          {cliActivity.isActive && (
            <span className="text-small text-blue-400 bg-blue-400/20 px-2 py-1 rounded">
              {cliActivity.currentTask}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Thinking Mode Toggle */}
          <button
            onClick={toggleThinkingMode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-small font-medium transition-all ${
              isThinkMode
                ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-400/30'
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 border border-gray-600/30'
            }`}
            title={isThinkMode ? 'Click to disable thinking mode' : 'Click to enable thinking mode'}
          >
            <span className="text-base">{isThinkMode ? '🧠' : '💭'}</span>
            <span>Thinking Mode</span>
            <span className={`text-small ${isThinkMode ? 'text-purple-400' : 'text-gray-500'}`}>
              {isThinkMode ? 'ON' : 'OFF'}
            </span>
          </button>

          <div className="flex items-center gap-2 text-small text-gray-400">
            <span>{commands.length} commands</span>
            <span>•</span>
            <span>{modifiedFiles.size} files modified</span>
            <span>•</span>
            <span>{cliActivity.isActive ? 'Executing...' : 'Ready'}</span>
          </div>
        </div>
      </div>

      {/* Modified Files Banner */}
      {modifiedFiles.size > 0 && (
        <div className="p-2 bg-blue-500/20 border-b border-blue-400/30">
          <div className="flex items-center gap-2 text-small">
            <span className="text-blue-400">📁 Files modified by CLI:</span>
            <div className="flex gap-1 flex-wrap">
              {Array.from(modifiedFiles).map(file => (
                <span key={file} className="bg-blue-400/20 text-blue-300 px-2 py-1 rounded text-small">
                  {file}
                </span>
              ))}
            </div>
            <button
              onClick={() => setModifiedFiles(new Set())}
              className="text-gray-400 hover:text-white ml-auto"
              title="Clear file modification indicators"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* CLI Output Area */}
      <div
        ref={outputRef}
        className="flex-1 overflow-auto p-4 space-y-2 min-h-0"
      >
        {commands.map((cmd) => (
          <div key={cmd.id} className="space-y-1">
            {/* Command Input Line */}
            {cmd.type === 'command' && (
              <div className="flex items-start gap-2">
                <span className="text-green-400 flex-shrink-0">$</span>
                <span className="text-gray-200">{cmd.command}</span>
                <span className="text-gray-500 text-small ml-auto flex-shrink-0">
                  {cmd.timestamp.toLocaleTimeString()}
                </span>
              </div>
            )}

            {/* Command Output */}
            {cmd.output && (
              <div className={`ml-4 pl-4 border-l-2 ${getTypeColor(cmd.type)}`}>
                <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {cmd.output}
                </div>
                {cmd.executionTime && (
                  <div className="text-small text-gray-500 mt-1">
                    Completed in {cmd.executionTime}ms
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Current command input */}
        <div className="flex items-start gap-2 sticky bottom-0 bg-slate-900 pb-2">
          <span className="text-green-400 flex-shrink-0">
            {isExecuting ? '>' : '$'}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={currentCommand}
            onChange={(e) => setCurrentCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-0 outline-none text-gray-200 placeholder-gray-500"
            style={{ fontSize: 'var(--code-size)' }}
            placeholder={isExecuting ? "Executing command..." : "Just describe what you want to build..."}
            disabled={isExecuting}
            spellCheck={false}
            autoComplete="off"
          />
          <span className="text-gray-500 text-small flex-shrink-0">
            {currentCommand.length > 0 && `${currentCommand.length} chars`}
          </span>
        </div>
      </div>

      {/* CLI Footer */}
      <div className="p-2 border-t border-slate-700/50 bg-slate-800/30 flex-shrink-0">
        <div className="flex items-center justify-between text-small text-gray-400">
          <span>↑↓ for history • Tab for autocomplete • Full local shell access</span>
          <span>Atlas is ready to execute</span>
        </div>
      </div>
    </div>
  );
}