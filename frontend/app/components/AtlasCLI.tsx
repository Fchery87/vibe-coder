'use client';

import { useState, useEffect, useRef } from 'react';

interface CLICommand {
  id: string;
  command: string;
  output: string;
  timestamp: Date;
  type: 'command' | 'response' | 'error' | 'success' | 'info';
  executionTime?: number;
}

interface AtlasCLIProps {
  onCommand: (command: string) => Promise<void>;
  isGenerating?: boolean;
  generatedCode?: string;
  executionResult?: any;
  sandboxLogs?: any[];
}

export default function AtlasCLI({ onCommand, isGenerating, generatedCode, executionResult, sandboxLogs }: AtlasCLIProps) {
  const [commands, setCommands] = useState<CLICommand[]>([
    {
      id: 'atlas-help-1',
      command: 'atlas --help',
      output: `Atlas CLI - Local Autonomous Agent Interface

Quick Start:
  Just type what you want to build and press Enter!
  No need for "atlas generate" - Atlas understands natural language.

Available Commands:
  <your prompt>              Generate code from any prompt
  atlas explain <file>        Explain code in specified file
  atlas refactor <file>       Refactor code for better maintainability
  atlas test <file>          Generate tests for specified file
  atlas optimize <file>       Optimize code performance
  atlas export <platform>     Export project (expo, flutter)
  atlas checkpoint <name>     Create project checkpoint
  atlas restore <name>        Restore from checkpoint
  atlas quality               Run code quality analysis
  atlas clear                 Clear terminal history
  atlas status                Show current project status

Examples:
  "Create a React todo app"
  "Build a weather dashboard"
  "Make a chat component with emoji reactions"
  atlas explain @src/App.js
  atlas export expo

Just type your request and Atlas will start generating!`,
      timestamp: new Date(),
      type: 'info'
    }
  ]);

  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new commands are added
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [commands]);

  // Focus input on component mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Update commands when external state changes
  useEffect(() => {
    if (isGenerating) {
      addCommand('atlas generate "..."', '🤖 Atlas is generating code...', 'info');
    }
  }, [isGenerating]);

  useEffect(() => {
    if (generatedCode && !isGenerating) {
      addCommand('atlas generate "..."', `✅ Code generated successfully (${generatedCode.length} characters)`, 'success');
    }
  }, [generatedCode, isGenerating]);

  useEffect(() => {
    if (executionResult) {
      const output = executionResult.success
        ? `✅ Tests passed: ${executionResult.output}`
        : `❌ Tests failed: ${executionResult.output}`;
      addCommand('atlas test', output, executionResult.success ? 'success' : 'error');
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
      // Parse and execute command
      await parseAndExecuteCommand(cmd);
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      addCommand(cmd, `❌ Error: ${error.message}`, 'error', executionTime);
    } finally {
      setIsExecuting(false);
      setCurrentCommand('');
    }
  };

  const parseAndExecuteCommand = async (cmd: string) => {
    const parts = cmd.trim().split(' ');
    const baseCommand = parts[0];
    const args = parts.slice(1);

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
      case 'history':
        showCommandHistory();
        break;
      default:
        // If command doesn't match any specific atlas subcommand, treat as direct prompt
        if (cmd.length > 2) {
          await onCommand(cmd);
        } else {
          addCommand(cmd, `Command not found: ${baseCommand}. Type 'help' for available commands, or just describe what you want to build!`, 'error');
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
        await onCommand(prompt);
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

      default:
        addCommand('atlas ' + subCommand, `❌ Unknown atlas command: ${subCommand}. Type "atlas help" for available commands.`, 'error');
    }
  };

  const getHelpText = () => {
    return `Atlas CLI - Local Autonomous Agent Interface

Quick Start:
  Just type what you want to build and press Enter!
  No need for "atlas generate" - Atlas understands natural language.

Available Commands:
  <your prompt>              Generate code from any prompt
  atlas explain <file>        Explain code in specified file
  atlas refactor <file>       Refactor code for better maintainability
  atlas test <file>          Generate tests for specified file
  atlas optimize <file>       Optimize code performance
  atlas export <platform>     Export project (expo, flutter)
  atlas checkpoint <name>     Create project checkpoint
  atlas restore <name>        Restore from checkpoint
  atlas quality               Run code quality analysis
  atlas status                Show current project status
  atlas clear                 Clear terminal history
  atlas help                  Show this help message

Examples:
  "Create a React todo app"
  "Build a weather dashboard"
  "Make a chat component with emoji reactions"
  atlas explain @src/App.js
  atlas export expo

Just type your request and Atlas will start generating!`;
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
        const commonCommands = ['atlas generate', 'atlas help', 'atlas status', 'atlas export'];
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
    <div className="flex flex-col h-full bg-slate-900 font-mono text-sm">
      {/* CLI Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700/50 bg-slate-800/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          <span className="text-green-400 font-bold">Atlas CLI</span>
          <span className="text-gray-400 text-xs">Genie Agent v1.0</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{commands.length} commands</span>
          <span>•</span>
          <span>{isExecuting ? 'Executing...' : 'Ready'}</span>
        </div>
      </div>

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
                <span className="text-gray-500 text-xs ml-auto flex-shrink-0">
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
                  <div className="text-xs text-gray-500 mt-1">
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
            placeholder={isExecuting ? "Executing command..." : "Just describe what you want to build..."}
            disabled={isExecuting}
            spellCheck={false}
            autoComplete="off"
          />
          <span className="text-gray-500 text-xs flex-shrink-0">
            {currentCommand.length > 0 && `${currentCommand.length} chars`}
          </span>
        </div>
      </div>

      {/* CLI Footer */}
      <div className="p-2 border-t border-slate-700/50 bg-slate-800/30 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>↑↓ for history • Tab for autocomplete • Just type your request!</span>
          <span>Atlas is ready to build</span>
        </div>
      </div>
    </div>
  );
}