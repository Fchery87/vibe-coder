"use client";

export type ShellCommandResult = {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  executionTime: number;
};

interface CommandOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  onData?: (data: string) => void;
  onErrorData?: (data: string) => void;
  signal?: AbortSignal;
}

export class ShellExecutor {
  private static instance: ShellExecutor | null = null;
  private websocket: WebSocket | null = null;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts: number;
  private commandCallbacks: Map<
    string,
    {
      resolve: (result: ShellCommandResult) => void;
      reject: (error: Error) => void;
      options?: CommandOptions;
      startTime: number;
      output: string;
      errorOutput: string;
    }
  > = new Map();

  constructor(
    private baseUrl = 'ws://localhost:3001/shell',
    { reconnectInterval = 3000, maxReconnectAttempts = 5 } = {}
  ) {
    this.reconnectInterval = reconnectInterval;
    this.maxReconnectAttempts = maxReconnectAttempts;
    this.reconnectAttempts = 0;
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  static getInstance() {
    if (!ShellExecutor.instance) {
      ShellExecutor.instance = new ShellExecutor();
    }
    return ShellExecutor.instance;
  }

  private connect() {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      return;
    }

    this.websocket = new WebSocket(this.baseUrl);

    this.websocket.onopen = () => {
      this.reconnectAttempts = 0;
      console.log('ShellExecutor connected');
    };

    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data.commandId) {
          console.warn('Unexpected message format:', data);
          return;
        }

        const commandCallback = this.commandCallbacks.get(data.commandId);
        if (!commandCallback) {
          console.warn('No callback found for command', data.commandId);
          return;
        }

        if (data.type === 'output') {
          const text = data.data;
          commandCallback.output += text;
          commandCallback.options?.onData?.(text);
        } else if (data.type === 'error') {
          const text = data.data;
          commandCallback.errorOutput += text;
          commandCallback.options?.onErrorData?.(text);
        } else if (data.type === 'exit') {
          const executionTime = Date.now() - commandCallback.startTime;
          const result: ShellCommandResult = {
            success: data.code === 0,
            output: commandCallback.output,
            error: commandCallback.errorOutput || undefined,
            exitCode: typeof data.code === 'number' ? data.code : 0,
            executionTime,
          };

          commandCallback.resolve(result);
          this.commandCallbacks.delete(data.commandId);
        }
      } catch (error) {
        console.error('Failed to handle websocket message:', error);
      }
    };

    this.websocket.onclose = () => {
      console.log('ShellExecutor disconnected');
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), this.reconnectInterval);
      }
    };

    this.websocket.onerror = (event) => {
      console.warn('ShellExecutor websocket error. Is the backend CLI server running?', event);

      // Fail any in-flight commands so callers can handle the error gracefully.
      this.commandCallbacks.forEach(({ reject }) => {
        reject(new Error('Shell executor connection error. Please ensure the backend CLI server is running.'));
      });
      this.commandCallbacks.clear();

      // Force a reconnect attempt if the socket is still open but errored.
      try {
        this.websocket?.close();
      } catch (closeError) {
        console.warn('ShellExecutor failed to close websocket after error:', closeError);
      }
    };
  }

  private async sendCommand(command: string, options: CommandOptions = {}): Promise<ShellCommandResult> {
    if (this.websocket?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, attempting to reconnect...');
      this.connect();
      throw new Error('Shell executor not connected. Please try again in a moment.');
    }

    const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const payload = {
      type: 'execute',
      commandId,
      command,
      options: {
        cwd: options.cwd,
        env: options.env,
        timeout: options.timeout,
      },
    };

    const startTime = Date.now();

    return new Promise((resolvePromise, rejectPromise) => {
      const timeoutId = options.timeout
        ? setTimeout(() => {
            this.commandCallbacks.delete(commandId);
            rejectPromise(new Error('Command execution timed out'));
          }, options.timeout)
        : undefined;

      const resolve = (result: ShellCommandResult) => {
        if (timeoutId) clearTimeout(timeoutId);
        if (!('executionTime' in result)) {
          resolvePromise({
            ...(result as object),
            executionTime: Date.now() - startTime,
          } as ShellCommandResult);
        } else {
          resolvePromise(result);
        }
      };

      const reject = (error: Error) => {
        if (timeoutId) clearTimeout(timeoutId);
        rejectPromise(error);
      };

      this.commandCallbacks.set(commandId, {
        resolve,
        reject,
        options,
        startTime: Date.now(),
        output: '',
        errorOutput: '',
      });

      this.websocket?.send(JSON.stringify(payload));

      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          this.commandCallbacks.delete(commandId);
          reject(new Error('Command aborted'));
          this.websocket?.send(JSON.stringify({ type: 'abort', commandId }));
        });
      }
    });
  }

  async executeCommand(command: string, options: CommandOptions = {}): Promise<ShellCommandResult> {
    try {
      return await this.sendCommand(command, options);
    } catch (error) {
      throw error;
    }
  }

  async commandExists(command: string): Promise<boolean> {
    try {
      const result = await this.executeCommand(`which ${command} || where ${command}`);
      return result.success && result.output.trim().length > 0;
    } catch {
      return false;
    }
  }

  async getEnvironmentInfo(): Promise<{
    platform: string;
    nodeVersion: string;
    npmVersion: string;
    yarnVersion?: string;
    pnpmVersion?: string;
    gitVersion?: string;
    currentDirectory: string;
    packageManager: 'npm' | 'yarn' | 'pnpm' | 'unknown';
  }> {
    const fallbackResult: ShellCommandResult = {
      success: false,
      output: '',
      error: undefined,
      exitCode: 1,
      executionTime: 0,
    };

    const [nodeResult, npmResult, yarnResult, pnpmResult, gitResult, pwdResult] = await Promise.all([
      this.executeCommand('node --version').catch(() => fallbackResult),
      this.executeCommand('npm --version').catch(() => fallbackResult),
      this.executeCommand('yarn --version').catch(() => fallbackResult),
      this.executeCommand('pnpm --version').catch(() => fallbackResult),
      this.executeCommand('git --version').catch(() => fallbackResult),
      this.executeCommand('pwd').catch(() => fallbackResult),
    ]);

    let packageManager: 'npm' | 'yarn' | 'pnpm' | 'unknown' = 'unknown';
    if (pnpmResult.success) {
      packageManager = 'pnpm';
    } else if (yarnResult.success) {
      packageManager = 'yarn';
    } else if (npmResult.success) {
      packageManager = 'npm';
    }

    const platform =
      typeof navigator !== 'undefined'
        ? ((navigator as any).userAgentData?.platform ?? navigator.platform ?? 'unknown')
        : 'unknown';

    return {
      platform,
      nodeVersion: nodeResult.success ? nodeResult.output.trim() : 'unknown',
      npmVersion: npmResult.success ? npmResult.output.trim() : 'not installed',
      yarnVersion: yarnResult.success ? yarnResult.output.trim() : 'not installed',
      pnpmVersion: pnpmResult.success ? pnpmResult.output.trim() : 'not installed',
      gitVersion: gitResult.success ? gitResult.output.trim() : 'not installed',
      currentDirectory: pwdResult.success ? pwdResult.output.trim() : 'unknown',
      packageManager,
    };
  }

  async executeCommandChain(commands: string[], options: CommandOptions = {}): Promise<ShellCommandResult[]> {
    const results: ShellCommandResult[] = [];

    for (const command of commands) {
      try {
        const result = await this.executeCommand(command, options);
        results.push(result);

        if (!result.success && /install|add|upgrade/.test(command)) {
          break;
        }
      } catch (error) {
        results.push({
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Command failed',
          exitCode: 1,
          executionTime: 0,
        });
        break;
      }
    }

    return results;
  }

  async installPackages(packages: string[], dev: boolean = false): Promise<ShellCommandResult> {
    if (!packages || packages.length === 0) {
      return {
        success: false,
        output: '',
        error: 'No packages specified',
        exitCode: 1,
        executionTime: 0,
      };
    }

    const env = await this.getEnvironmentInfo();
    const manager = env.packageManager;

    let command: string;
    if (manager === 'yarn') {
      command = `yarn add ${dev ? '--dev ' : ''}${packages.join(' ')}`.trim();
    } else if (manager === 'pnpm') {
      command = `pnpm add ${dev ? '--save-dev ' : ''}${packages.join(' ')}`.trim();
    } else {
      command = `npm install ${dev ? '--save-dev ' : ''}${packages.join(' ')}`.trim();
    }

    return this.executeCommand(command);
  }

  async runScript(scriptName: string): Promise<ShellCommandResult> {
    if (!scriptName) {
      return {
        success: false,
        output: '',
        error: 'No script specified',
        exitCode: 1,
        executionTime: 0,
      };
    }

    const env = await this.getEnvironmentInfo();
    const manager = env.packageManager;
    const command = manager === 'yarn' ? `yarn ${scriptName}` : manager === 'pnpm' ? `pnpm ${scriptName}` : `npm run ${scriptName}`;
    return this.executeCommand(command);
  }

  async isGitRepository(): Promise<boolean> {
    try {
      const result = await this.executeCommand('git rev-parse --is-inside-work-tree');
      return result.success;
    } catch {
      return false;
    }
  }

  async getGitStatus(): Promise<ShellCommandResult> {
    return this.executeCommand('git status --porcelain');
  }

  async listDirectory(dirPath: string = '.'): Promise<string[]> {
    try {
      const response = await fetch(`http://localhost:3001/files/list?path=${encodeURIComponent(dirPath)}`);
      if (!response.ok) {
        throw new Error('Failed to list directory');
      }
      const data = await response.json();
      return data.files || [];
    } catch (error: any) {
      throw new Error(`Directory listing failed: ${error.message || error}`);
    }
  }

  async readFile(filePath: string): Promise<string> {
    try {
      const response = await fetch(`http://localhost:3001/files/read?path=${encodeURIComponent(filePath)}`);
      if (!response.ok) {
        throw new Error('Failed to read file');
      }
      const data = await response.json();
      return data.content || '';
    } catch (error: any) {
      throw new Error(`File read failed: ${error.message || error}`);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const response = await fetch('http://localhost:3001/files/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: filePath, content }),
      });

      if (!response.ok) {
        throw new Error('Failed to write file');
      }
    } catch (error: any) {
      throw new Error(`File write failed: ${error.message || error}`);
    }
  }
}
