import { SandboxConfig, SandboxResult, SandboxLog, ExecutionContext, SandboxSecurityPolicy, SandboxMetrics } from '../types/sandbox';

export class SandboxService {
  private defaultConfig: SandboxConfig = {
    timeout: 10000, // 10 seconds
    memoryLimit: 50, // 50 MB
    allowNetwork: false,
    allowFileSystem: false,
    allowedModules: ['lodash', 'moment', 'axios'], // Safe modules only
    blockedModules: ['fs', 'path', 'os', 'child_process', 'cluster', 'worker_threads'],
    envVars: {}
  };

  private securityPolicy: SandboxSecurityPolicy = {
    allowNetworkRequests: false,
    allowFileSystemAccess: false,
    allowProcessExecution: false,
    allowEnvironmentAccess: false,
    maxExecutionTime: 10000,
    maxMemoryUsage: 50,
    blockedPatterns: [
      /process\.env/g,
      /require\(['"]fs['"]\)/g,
      /require\(['"]path['"]\)/g,
      /require\(['"]os['"]\)/g,
      /require\(['"]child_process['"]\)/g,
      /eval\s*\(/g,
      /Function\s*\(/g,
      /setTimeout\s*\(/g,
      /setInterval\s*\(/g
    ]
  };

  /**
   * Execute code in a secure sandbox environment
   */
  async executeCode(
    code: string,
    context?: ExecutionContext,
    config?: Partial<SandboxConfig>
  ): Promise<SandboxResult> {
    const startTime = Date.now();
    const logs: SandboxLog[] = [];

    // Merge configurations
    const sandboxConfig = { ...this.defaultConfig, ...config };

    try {
      // Pre-execution security scan
      const securityCheck = this.performSecurityCheck(code);
      if (!securityCheck.allowed) {
        return {
          success: false,
          output: '',
          error: `Security violation: ${securityCheck.reason}`,
          executionTime: Date.now() - startTime,
          logs: [{
            type: 'error',
            message: `Security violation: ${securityCheck.reason}`,
            timestamp: new Date(),
            level: 0
          }]
        };
      }

      // Create secure execution environment
      const result = await this.executeInSandbox(code, context, sandboxConfig, logs);

      return {
        success: result.success,
        output: result.output,
        error: result.error,
        executionTime: Date.now() - startTime,
        logs,
        returnValue: result.returnValue
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logs.push({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown execution error',
        timestamp: new Date(),
        level: 0
      });

      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown execution error',
        executionTime,
        logs
      };
    }
  }

  /**
   * Execute multiple files as a project
   */
  async executeProject(
    files: Array<{ name: string; content: string }>,
    mainFile?: string,
    config?: Partial<SandboxConfig>
  ): Promise<SandboxResult> {
    const startTime = Date.now();
    const logs: SandboxLog[] = [];

    try {
      // Combine all files into a single execution context
      const context: ExecutionContext = {
        files: files.map(f => ({
          name: f.name,
          content: f.content,
          language: this.detectLanguage(f.name)
        })),
        mainFile: mainFile || files[0]?.name
      };

      // For now, execute the main file only
      const mainFileContent = files.find(f => f.name === context.mainFile)?.content;
      if (!mainFileContent) {
        throw new Error('Main file not found');
      }

      return await this.executeCode(mainFileContent, context, config);

    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Project execution failed',
        executionTime: Date.now() - startTime,
        logs
      };
    }
  }

  /**
   * Test generated code for basic functionality
   */
  async testCode(code: string, testCases?: any[]): Promise<{
    passed: number;
    failed: number;
    results: Array<{
      test: string;
      passed: boolean;
      error?: string;
      output?: string;
    }>;
  }> {
    const results = [];

    if (!testCases || testCases.length === 0) {
      // Basic smoke test
      const result = await this.executeCode(`
        try {
          ${code}
          console.log('✓ Code loaded successfully');
        } catch (error) {
          console.error('✗ Code failed to load:', error.message);
          throw error;
        }
      `);

      return {
        passed: result.success ? 1 : 0,
        failed: result.success ? 0 : 1,
        results: [{
          test: 'Code loads without syntax errors',
          passed: result.success,
          error: result.error,
          output: result.output
        }]
      };
    }

    // Execute each test case
    for (const testCase of testCases) {
      const testCode = `
        ${code}

        // Test: ${testCase.name}
        try {
          ${testCase.code}
          console.log('✓ Test passed: ${testCase.name}');
        } catch (error) {
          console.error('✗ Test failed: ${testCase.name} -', error.message);
          throw error;
        }
      `;

      const result = await this.executeCode(testCode);

      results.push({
        test: testCase.name,
        passed: result.success,
        error: result.error,
        output: result.output
      });
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    return { passed, failed, results };
  }

  /**
   * Perform security scan on code before execution
   */
  private performSecurityCheck(code: string): { allowed: boolean; reason?: string } {
    for (const pattern of this.securityPolicy.blockedPatterns || []) {
      if (typeof pattern === 'string') {
        if (code.includes(pattern)) {
          return {
            allowed: false,
            reason: `Blocked pattern detected: ${pattern}`
          };
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(code)) {
          return {
            allowed: false,
            reason: `Blocked pattern detected: ${pattern.source}`
          };
        }
      }
    }

    // Check for dangerous operations
    const dangerousOps = [
      'process.exit',
      'process.kill',
      'global.process',
      'require("fs")',
      'require("child_process")'
    ];

    for (const op of dangerousOps) {
      if (code.includes(op)) {
        return {
          allowed: false,
          reason: `Dangerous operation detected: ${op}`
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Execute code in isolated environment
   */
  private async executeInSandbox(
    code: string,
    context: ExecutionContext | undefined,
    config: SandboxConfig,
    logs: SandboxLog[]
  ): Promise<{
    success: boolean;
    output: string;
    error?: string;
    returnValue?: any;
  }> {
    // Capture console methods
    const originalConsole = { ...console };
    const capturedLogs: string[] = [];

    // Override console methods to capture output
    const mockConsole = {
      log: (...args: any[]) => {
        const message = args.join(' ');
        capturedLogs.push(message);
        logs.push({
          type: 'log',
          message,
          timestamp: new Date(),
          level: 0
        });
      },
      error: (...args: any[]) => {
        const message = args.join(' ');
        capturedLogs.push(`ERROR: ${message}`);
        logs.push({
          type: 'error',
          message,
          timestamp: new Date(),
          level: 0
        });
      },
      warn: (...args: any[]) => {
        const message = args.join(' ');
        capturedLogs.push(`WARN: ${message}`);
        logs.push({
          type: 'warn',
          message,
          timestamp: new Date(),
          level: 0
        });
      },
      info: (...args: any[]) => {
        const message = args.join(' ');
        capturedLogs.push(`INFO: ${message}`);
        logs.push({
          type: 'info',
          message,
          timestamp: new Date(),
          level: 0
        });
      }
    };

    // Apply mock console globally
    Object.assign(console, mockConsole);

    let returnValue: any;
    let executionError: string | undefined;

    try {
      // Create a safe execution function
      const executeFunction = new Function('context', `
        "use strict";

        // Restrict dangerous globals
        const restrictedGlobals = ['process', 'global', 'require', 'import', 'eval', 'Function'];
        restrictedGlobals.forEach(name => {
          if (typeof global[name] !== 'undefined') {
            Object.defineProperty(global, name, {
              get: () => { throw new Error(\`Access to \${name} is restricted\`); },
              set: () => { throw new Error(\`Modification of \${name} is restricted\`); }
            });
          }
        });

        // Execute the provided code
        ${code}

        // If code is a function, execute it
        if (typeof main === 'function') {
          return main(context);
        }

        return undefined;
      `);

      // Execute with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout')), config.timeout);
      });

      const executionPromise = Promise.resolve(executeFunction(context || {}));

      returnValue = await Promise.race([executionPromise, timeoutPromise]);

      return {
        success: true,
        output: capturedLogs.join('\n'),
        returnValue
      };

    } catch (error) {
      executionError = error instanceof Error ? error.message : 'Unknown execution error';

      return {
        success: false,
        output: capturedLogs.join('\n'),
        error: executionError
      };
    } finally {
      // Restore original console
      Object.assign(console, originalConsole);
    }
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();

    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'mjs': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'c'
    };

    return languageMap[ext || ''] || 'plaintext';
  }

  /**
   * Update security policy
   */
  updateSecurityPolicy(policy: Partial<SandboxSecurityPolicy>): void {
    this.securityPolicy = { ...this.securityPolicy, ...policy };
  }

  /**
   * Get current security policy
   */
  getSecurityPolicy(): SandboxSecurityPolicy {
    return { ...this.securityPolicy };
  }

  /**
   * Get sandbox configuration
   */
  getConfig(): SandboxConfig {
    return { ...this.defaultConfig };
  }

  /**
   * Update sandbox configuration
   */
  updateConfig(config: Partial<SandboxConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }
}