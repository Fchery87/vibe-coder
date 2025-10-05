interface ShellCommandResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  executionTime: number;
}

export class ShellExecutor {
  private static instance: ShellExecutor;

  public static getInstance(): ShellExecutor {
    if (!ShellExecutor.instance) {
      ShellExecutor.instance = new ShellExecutor();
    }
    return ShellExecutor.instance;
  }

  /**
   * Execute a shell command in the local environment
   */
  async executeCommand(command: string, cwd?: string): Promise<ShellCommandResult> {
    const startTime = Date.now();

    try {
      // Use fetch to call our local API endpoint that executes shell commands
      const response = await fetch('http://localhost:3001/shell/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          cwd: cwd || process.cwd()
        })
      });

      const result = await response.json();
      const executionTime = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          output: result.output || '',
          exitCode: result.exitCode || 0,
          executionTime
        };
      } else {
        return {
          success: false,
          output: result.output || '',
          error: result.error || 'Command execution failed',
          exitCode: result.exitCode || 1,
          executionTime
        };
      }
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        output: '',
        error: error.message || 'Network error occurred',
        exitCode: 1,
        executionTime
      };
    }
  }

  /**
   * Check if a command exists in the system
   */
  async commandExists(command: string): Promise<boolean> {
    try {
      const result = await this.executeCommand(`which ${command} || where ${command}`);
      return result.success && result.output.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get information about the current environment
   */
  async getEnvironmentInfo(): Promise<{
    platform: string;
    nodeVersion: string;
    npmVersion: string;
    yarnVersion?: string;
    gitVersion?: string;
    currentDirectory: string;
    packageManager: 'npm' | 'yarn' | 'pnpm' | 'unknown';
  }> {
    const [nodeResult, npmResult, yarnResult, gitResult] = await Promise.all([
      this.executeCommand('node --version'),
      this.executeCommand('npm --version'),
      this.executeCommand('yarn --version').catch(() => ({ success: false, output: '' })),
      this.executeCommand('git --version').catch(() => ({ success: false, output: '' }))
    ]);

    // Determine package manager
    let packageManager: 'npm' | 'yarn' | 'pnpm' | 'unknown' = 'unknown';
    if (npmResult.success) {
      packageManager = 'npm';
    } else if (yarnResult.success) {
      packageManager = 'yarn';
    }

    return {
      platform: process.platform,
      nodeVersion: nodeResult.success ? nodeResult.output.trim() : 'unknown',
      npmVersion: npmResult.success ? npmResult.output.trim() : 'not installed',
      yarnVersion: yarnResult.success ? yarnResult.output.trim() : 'not installed',
      gitVersion: gitResult.success ? gitResult.output.trim() : 'not installed',
      currentDirectory: process.cwd(),
      packageManager
    };
  }

  /**
   * Execute multiple commands in sequence
   */
  async executeCommandChain(commands: string[], cwd?: string): Promise<ShellCommandResult[]> {
    const results: ShellCommandResult[] = [];

    for (const command of commands) {
      const result = await this.executeCommand(command, cwd);
      results.push(result);

      // Stop on first failure if it's a critical command
      if (!result.success && command.includes('install')) {
        break;
      }
    }

    return results;
  }

  /**
   * Install npm packages
   */
  async installPackages(packages: string[], dev: boolean = false): Promise<ShellCommandResult> {
    const packageManager = await this.getEnvironmentInfo().then(info => info.packageManager);
    const installCmd = packageManager === 'yarn' ? 'yarn add' : 'npm install';

    const command = dev
      ? `${installCmd} --save-dev ${packages.join(' ')}`
      : `${installCmd} ${packages.join(' ')}`;

    return this.executeCommand(command);
  }

  /**
   * Run npm scripts
   */
  async runScript(scriptName: string): Promise<ShellCommandResult> {
    const packageManager = await this.getEnvironmentInfo().then(info => info.packageManager);
    const command = packageManager === 'yarn' ? `yarn ${scriptName}` : `npm run ${scriptName}`;

    return this.executeCommand(command);
  }

  /**
   * Check if current directory is a git repository
   */
  async isGitRepository(): Promise<boolean> {
    const result = await this.executeCommand('git rev-parse --is-inside-work-tree');
    return result.success;
  }

  /**
   * Get git status
   */
  async getGitStatus(): Promise<ShellCommandResult> {
    return this.executeCommand('git status --porcelain');
  }

  /**
   * Read file contents
   */
  async readFile(filePath: string): Promise<string> {
    try {
      const response = await fetch(`http://localhost:3001/files/read?path=${encodeURIComponent(filePath)}`);
      if (response.ok) {
        const data = await response.json();
        return data.content || '';
      }
      throw new Error('Failed to read file');
    } catch (error: any) {
      throw new Error(`File read failed: ${error.message}`);
    }
  }

  /**
   * Write file contents
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const response = await fetch('http://localhost:3001/files/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: filePath,
          content
        })
      });

      if (!response.ok) {
        throw new Error('Failed to write file');
      }
    } catch (error: any) {
      throw new Error(`File write failed: ${error.message}`);
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(dirPath?: string): Promise<string[]> {
    try {
      const response = await fetch(`http://localhost:3001/files/list?path=${encodeURIComponent(dirPath || '.')}`);
      if (response.ok) {
        const data = await response.json();
        return data.files || [];
      }
      throw new Error('Failed to list directory');
    } catch (error: any) {
      throw new Error(`Directory listing failed: ${error.message}`);
    }
  }
}