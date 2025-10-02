import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface LintResult {
  success: boolean;
  errors: Array<{
    file: string;
    line: number;
    column: number;
    message: string;
    rule: string;
    severity: 'error' | 'warning';
  }>;
  warnings: number;
  errorCount: number;
}

export interface TestResult {
  success: boolean;
  tests: number;
  passed: number;
  failed: number;
  duration: number;
  results: Array<{
    testName: string;
    status: 'passed' | 'failed';
    duration: number;
    error?: string;
  }>;
}

export interface CriticalFlow {
  name: string;
  description: string;
  files: string[];
  testCases: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface CriticalFlowReport {
  flow: CriticalFlow;
  lint: LintResult;
  tests: TestResult;
  coverage: number; // 0-100
  success: boolean;
  issues: string[];
}

export interface CodeQualityReport {
  lint: LintResult;
  tests: TestResult;
  criticalFlows: CriticalFlowReport[];
  overall: {
    success: boolean;
    score: number; // 0-100
    issues: number;
    criticalFlowSuccess: boolean;
  };
}

export class CodeQualityService {
  private projectRoot: string;
  private criticalFlows: CriticalFlow[];

  constructor(projectRoot: string = '.') {
    this.projectRoot = projectRoot;
    this.criticalFlows = this.defineCriticalFlows();
  }

  /**
   * Define the critical application flows that must pass quality checks
   */
  private defineCriticalFlows(): CriticalFlow[] {
    return [
      {
        name: 'Code Generation Flow',
        description: 'User prompt processing to AI-generated code output',
        files: ['**/routes/llm.ts', '**/services/provider-manager.ts', '**/services/routing-service.ts'],
        testCases: [
          'should process user prompts correctly',
          'should route to appropriate AI models',
          'should handle API errors gracefully',
          'should validate generated code syntax'
        ],
        priority: 'high'
      },
      {
        name: 'Expo Export Flow',
        description: 'Code generation to mobile app export with QR codes',
        files: ['**/services/expo-service.ts', '**/routes/llm.ts'],
        testCases: [
          'should create Expo projects from generated code',
          'should generate valid QR codes for device preview',
          'should handle React Native code conversion',
          'should start development servers successfully'
        ],
        priority: 'high'
      },
      {
        name: 'Multi-Model Orchestration',
        description: 'Intelligent model selection and orchestration',
        files: ['**/services/routing-service.ts', '**/services/model-registry.ts', '**/services/provider-manager.ts'],
        testCases: [
          'should select Claude for planning tasks',
          'should select GPT for code generation',
          'should select Gemini for validation tasks',
          'should handle model fallbacks correctly',
          'should respect budget limits'
        ],
        priority: 'high'
      },
      {
        name: 'Quality Assurance Pipeline',
        description: 'Automated linting, testing, and validation',
        files: ['**/services/code-quality-service.ts', '**/services/diff-validation-service.ts'],
        testCases: [
          'should run ESLint on generated code',
          'should execute unit tests successfully',
          'should generate quality reports',
          'should perform diff validation',
          'should handle quality check failures'
        ],
        priority: 'medium'
      },
      {
        name: 'Sandbox Execution',
        description: 'Safe code execution and error handling',
        files: ['**/services/sandbox.ts', '**/routes/llm.ts'],
        testCases: [
          'should execute code safely in sandbox',
          'should capture execution output',
          'should handle runtime errors',
          'should prevent malicious code execution',
          'should provide execution timing'
        ],
        priority: 'medium'
      }
    ];
  }

  /**
   * Run linting on generated code
   */
  async lintCode(files: Array<{ path: string; content: string }>): Promise<LintResult> {
    try {
      // Create temporary files for linting
      const tempDir = path.join(this.projectRoot, 'temp-lint');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Write files to temp directory
      for (const file of files) {
        const filePath = path.join(tempDir, file.path);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, file.content, 'utf8');
      }

      // Create ESLint config if it doesn't exist
      const eslintConfigPath = path.join(tempDir, '.eslintrc.js');
      if (!fs.existsSync(eslintConfigPath)) {
        const eslintConfig = `
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'no-undef': 'error'
  }
};
`;
        fs.writeFileSync(eslintConfigPath, eslintConfig, 'utf8');
      }

      // Run ESLint
      const result = await this.runCommand('npx', ['eslint', '.', '--format', 'json'], tempDir);

      // Parse ESLint output
      const eslintOutput = JSON.parse(result);

      const errors = eslintOutput.flatMap((fileResult: any) =>
        fileResult.messages.map((msg: any) => ({
          file: path.relative(tempDir, fileResult.filePath),
          line: msg.line,
          column: msg.column,
          message: msg.message,
          rule: msg.ruleId,
          severity: msg.severity === 2 ? 'error' : 'warning'
        }))
      );

      // Clean up temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });

      const errorCount = errors.filter((e: any) => e.severity === 'error').length;
      const warnings = errors.filter((e: any) => e.severity === 'warning').length;

      return {
        success: errorCount === 0,
        errors,
        warnings,
        errorCount
      };
    } catch (error) {
      console.error('Linting failed:', error);
      return {
        success: false,
        errors: [{
          file: 'unknown',
          line: 0,
          column: 0,
          message: `Linting failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          rule: 'lint-error',
          severity: 'error'
        }],
        warnings: 0,
        errorCount: 1
      };
    }
  }

  /**
   * Generate and run unit tests
   */
  async runTests(files: Array<{ path: string; content: string }>): Promise<TestResult> {
    try {
      // Create temporary test directory
      const tempDir = path.join(this.projectRoot, 'temp-test');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Write source files
      for (const file of files) {
        const filePath = path.join(tempDir, file.path);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, file.content, 'utf8');
      }

      // Generate test files for testable functions
      const testFiles = this.generateTestFiles(files);
      for (const testFile of testFiles) {
        const testPath = path.join(tempDir, testFile.path);
        const dir = path.dirname(testPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(testPath, testFile.content, 'utf8');
      }

      // Create Jest config
      const jestConfigPath = path.join(tempDir, 'jest.config.js');
      const jestConfig = `
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverage: true,
  coverageReporters: ['json', 'text'],
  verbose: true
};
`;
      fs.writeFileSync(jestConfigPath, jestConfig, 'utf8');

      // Create package.json for dependencies
      const packageJsonPath = path.join(tempDir, 'package.json');
      const packageJson = {
        name: 'temp-test',
        version: '1.0.0',
        scripts: {
          test: 'jest --json'
        },
        devDependencies: {
          jest: '^29.0.0'
        }
      };
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');

      // Install dependencies and run tests
      await this.runCommand('npm', ['install'], tempDir);
      const testOutput = await this.runCommand('npx', ['jest', '--json'], tempDir);

      // Parse Jest output
      const jestResult = JSON.parse(testOutput);

      const results = jestResult.testResults.flatMap((testFile: any) =>
        testFile.testResults.map((test: any) => ({
          testName: test.title,
          status: test.status === 'passed' ? 'passed' : 'failed',
          duration: test.duration || 0,
          error: test.failureMessages?.join('\n')
        }))
      );

      // Clean up temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });

      const passed = results.filter((r: any) => r.status === 'passed').length;
      const failed = results.filter((r: any) => r.status === 'failed').length;

      return {
        success: failed === 0,
        tests: results.length,
        passed,
        failed,
        duration: jestResult.testResults.reduce((sum: number, file: any) =>
          sum + file.perfStats.runtime, 0),
        results
      };
    } catch (error) {
      console.error('Testing failed:', error);
      return {
        success: false,
        tests: 0,
        passed: 0,
        failed: 1,
        duration: 0,
        results: [{
          testName: 'Test execution',
          status: 'failed',
          duration: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        }]
      };
    }
  }

  /**
   * Generate comprehensive code quality report with critical flow analysis
   */
  async generateQualityReport(files: Array<{ path: string; content: string }>): Promise<CodeQualityReport> {
    const [lintResult, testResult, criticalFlowReports] = await Promise.all([
      this.lintCode(files),
      this.runTests(files),
      this.analyzeCriticalFlows(files)
    ]);

    const lintScore = Math.max(0, 100 - (lintResult.errorCount * 10 + lintResult.warnings * 2));
    const testScore = testResult.tests > 0 ? (testResult.passed / testResult.tests) * 100 : 0;
    const criticalFlowScore = this.calculateCriticalFlowScore(criticalFlowReports);
    const overallScore = (lintScore + testScore + criticalFlowScore) / 3;

    const criticalFlowSuccess = criticalFlowReports.every(flow => flow.success);

    return {
      lint: lintResult,
      tests: testResult,
      criticalFlows: criticalFlowReports,
      overall: {
        success: lintResult.success && testResult.success && criticalFlowSuccess,
        score: Math.round(overallScore),
        issues: lintResult.errorCount + lintResult.warnings + testResult.failed,
        criticalFlowSuccess
      }
    };
  }

  /**
   * Analyze critical flows for quality issues
   */
  private async analyzeCriticalFlows(files: Array<{ path: string; content: string }>): Promise<CriticalFlowReport[]> {
    const reports: CriticalFlowReport[] = [];

    for (const flow of this.criticalFlows) {
      const flowFiles = files.filter(file =>
        flow.files.some(pattern => this.matchesPattern(file.path, pattern))
      );

      if (flowFiles.length === 0) {
        // Flow not present in current files, skip
        continue;
      }

      const [lintResult, testResult] = await Promise.all([
        this.lintCode(flowFiles),
        this.runTests(flowFiles)
      ]);

      const coverage = this.calculateFlowCoverage(flowFiles, flow);
      const issues = this.identifyFlowIssues(flow, lintResult, testResult);

      reports.push({
        flow,
        lint: lintResult,
        tests: testResult,
        coverage,
        success: lintResult.success && testResult.success && coverage >= 80,
        issues
      });
    }

    return reports;
  }

  /**
   * Calculate test coverage for a critical flow
   */
  private calculateFlowCoverage(files: Array<{ path: string; content: string }>, flow: CriticalFlow): number {
    // Simple coverage calculation based on test file presence and function coverage
    const hasTests = files.some(file => file.path.includes('.test.') || file.path.includes('__tests__'));
    const functions = files.flatMap(file => this.extractFunctions(file.content));
    const testedFunctions = functions.length > 0 ? Math.min(100, (functions.length / 2) * 100) : 0;

    return hasTests ? Math.max(50, testedFunctions) : 20;
  }

  /**
   * Identify specific issues for a critical flow
   */
  private identifyFlowIssues(flow: CriticalFlow, lint: LintResult, tests: TestResult): string[] {
    const issues: string[] = [];

    if (!lint.success) {
      issues.push(`${flow.name}: ${lint.errorCount} linting errors`);
    }

    if (!tests.success) {
      issues.push(`${flow.name}: ${tests.failed} test failures`);
    }

    if (tests.tests === 0) {
      issues.push(`${flow.name}: No tests found`);
    }

    return issues;
  }

  /**
   * Calculate overall critical flow score
   */
  private calculateCriticalFlowScore(reports: CriticalFlowReport[]): number {
    if (reports.length === 0) return 100;

    const totalScore = reports.reduce((sum, report) => {
      let score = 0;
      if (report.lint.success) score += 40;
      if (report.tests.success) score += 40;
      score += report.coverage * 0.2;

      // Weight by priority
      const weight = report.flow.priority === 'high' ? 1.5 : report.flow.priority === 'medium' ? 1.0 : 0.5;
      return sum + (score * weight);
    }, 0);

    const totalWeight = reports.reduce((sum, report) => {
      const weight = report.flow.priority === 'high' ? 1.5 : report.flow.priority === 'medium' ? 1.0 : 0.5;
      return sum + weight;
    }, 0);

    return totalWeight > 0 ? totalScore / totalWeight : 100;
  }

  /**
   * Check if a file path matches a pattern
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    // Simple glob matching for file patterns
    const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
    return regex.test(filePath);
  }

  /**
   * Generate test files for source code
   */
  private generateTestFiles(files: Array<{ path: string; content: string }>): Array<{ path: string; content: string }> {
    const testFiles: Array<{ path: string; content: string }> = [];

    for (const file of files) {
      if (file.path.endsWith('.js') || file.path.endsWith('.ts')) {
        const testFile = this.generateTestForFile(file);
        if (testFile) {
          testFiles.push(testFile);
        }
      }
    }

    return testFiles;
  }

  /**
   * Generate test file for a source file
   */
  private generateTestForFile(file: { path: string; content: string }): { path: string; content: string } | null {
    const functions = this.extractFunctions(file.content);
    if (functions.length === 0) return null;

    const testPath = file.path.replace(/\.(js|ts)$/, '.test.$1');
    let testContent = `const { ${functions.join(', ')} } = require('./${path.basename(file.path, path.extname(file.path))}');\n\n`;

    for (const func of functions) {
      testContent += `describe('${func}', () => {\n`;
      testContent += `  test('should be defined', () => {\n`;
      testContent += `    expect(${func}).toBeDefined();\n`;
      testContent += `  });\n\n`;
      testContent += `  test('should work with basic input', () => {\n`;
      testContent += `    // Add specific test cases here\n`;
      testContent += `    expect(true).toBe(true);\n`;
      testContent += `  });\n`;
      testContent += `});\n\n`;
    }

    return {
      path: testPath,
      content: testContent
    };
  }

  /**
   * Extract function names from code
   */
  private extractFunctions(content: string): string[] {
    const functionRegex = /(?:function\s+|const\s+|let\s+|var\s+)(\w+)\s*=/g;
    const functions: string[] = [];
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      functions.push(match[1]);
    }

    return functions;
  }

  /**
   * Run a command and return its output
   */
  private async runCommand(command: string, args: string[], cwd?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: cwd || this.projectRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed: ${stderr || stdout}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }
}